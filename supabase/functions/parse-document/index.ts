import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ZipReader, BlobReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name?.toLowerCase() || "";
    const mimeType = file.type || "application/octet-stream";
    
    const isDocx = mimeType.includes("wordprocessingml") || fileName.endsWith(".docx");
    const isDoc = mimeType === "application/msword" || fileName.endsWith(".doc");

    // For DOCX: extract text from the ZIP/XML structure directly
    if (isDocx) {
      const text = await extractDocxText(arrayBuffer);
      if (!text) throw new Error("No text extracted from DOCX");
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For DOC (old binary format) or other binary files: use Gemini vision with PDF mime
    // For PDF and images: use Gemini vision
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    // For .doc files, we can't easily parse them, so attempt with Gemini as PDF
    const sendMime = isDoc ? "application/pdf" : mimeType;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text content from this document exactly as written. Return ONLY the extracted text, preserving formatting and structure. Do not add any commentary or interpretation.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${sendMime};base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`Failed to parse document: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

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
