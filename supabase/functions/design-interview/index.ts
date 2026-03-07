import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert HR consultant and interview process designer. Given a job description, design a comprehensive, best-practice interview process.

Return a JSON object with this exact structure (no markdown, no code fences, just valid JSON):
{
  "jobTitle": "string",
  "department": "string", 
  "summary": "Brief overview of the interview strategy and why these stages were chosen",
  "stages": [
    {
      "id": "stage-1",
      "name": "Stage name",
      "description": "What happens in this stage",
      "duration": "e.g. 30 minutes",
      "rationale": "Why this stage is important and what it evaluates",
      "panelists": [
        { "role": "e.g. Hiring Manager", "reason": "Why this person should be on the panel" }
      ],
      "questions": [
        {
          "question": "The interview question",
          "category": "e.g. Technical, Behavioral, Cultural Fit, Problem Solving",
          "scoringCriteria": [
            { "score": 1, "label": "Poor", "description": "What a 1-score answer looks like" },
            { "score": 2, "label": "Below Average", "description": "..." },
            { "score": 3, "label": "Average", "description": "..." },
            { "score": 4, "label": "Good", "description": "..." },
            { "score": 5, "label": "Excellent", "description": "..." }
          ]
        }
      ]
    }
  ]
}

Design 3-5 stages typically including: Initial Screening, Technical/Skills Assessment, Behavioral Interview, Culture Fit/Team Interview, and Final/Leadership Interview. Include 2-4 questions per stage with full 1-5 scoring rubrics. Be specific to the role described.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Design an interview process for this job:\n\n${jobDescription}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("No content in AI response");

    // Clean and parse JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    const plan = JSON.parse(jsonStr);

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("design-interview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
