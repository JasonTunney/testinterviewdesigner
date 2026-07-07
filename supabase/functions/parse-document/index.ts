import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ZipReader, BlobReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Swap to "claude-sonnet-5" for lower cost; "claude-opus-4-8" for maximum quality.
const MODEL = "claude-opus-4-8";

const EXTRACT_PROMPT = "Extract ALL text content from this document exactly as written. Return ONLY the extracted text, preserving formatting and structure. Do not add any commentary or interpretation.";

// Extract text from DOCX by reading the XML inside the zip
async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  const blob = new Blob([arrayBuffer]);
  const reader = new ZipReader(new BlobReader(blob));
  const entries = await reader.getEntries();

  let text = "";
  for (const entry of entries) {
    if (entry.filename === "word/document.xml" && entry.getData) {
      const writer = new TextWriter();
      const xml = await entry.getData(writer);
      // Strip XML tags to get plain text
      text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }
  await reader.close();
  return text;
}

function toBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name?.toLowerCase() || "";
    const mimeType = file.type || "application/octet-stream";

    const isDocx = mimeType.includes("wordprocessingml") || fileName.endsWith(".docx");
    const isDoc = mimeType === "application/msword" || fileName.endsWith(".doc");
    const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
    const isImage = mimeType.startsWith("image/");

    // DOCX: extract text from the ZIP/XML structure directly (no AI needed)
    if (isDocx) {
      const text = await extractDocxText(arrayBuffer);
      if (!text) throw new Error("No text extracted from DOCX");
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Legacy binary .doc can't be reliably parsed — ask the user to convert.
    if (isDoc) {
      return new Response(
        JSON.stringify({ error: "Legacy .doc files aren't supported. Please upload a .docx or .pdf, or paste the text directly." }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!isPdf && !isImage) {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload a .txt, .pdf, .docx, or image file, or paste the text directly." }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const base64 = toBase64(arrayBuffer);

    // PDFs go in a document block; images go in an image block.
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: [contentBlock, { type: "text", text: EXTRACT_PROMPT }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Anthropic API error:", response.status, text);
      throw new Error(`Failed to parse document: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    if (!extractedText) throw new Error("No text extracted from document");

    return new Response(JSON.stringify({ text: extractedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
