import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    // Fetch company config from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config } = await supabase
      .from("company_config")
      .select("*")
      .limit(1)
      .single();

    // Build context from config
    let companyContext = "";
    let orgChartBase64 = "";
    let orgChartMime = "";
    if (config) {
      const parts: string[] = [];
      if (config.company_name) parts.push(`Company: ${config.company_name}`);
      if (config.industry) parts.push(`Industry: ${config.industry}`);
      if (config.company_description) parts.push(`About: ${config.company_description}`);
      if (config.company_values) parts.push(`Core Values: ${config.company_values}`);
      if (config.hiring_philosophy) parts.push(`Hiring Philosophy: ${config.hiring_philosophy}`);
      if (config.org_structure) parts.push(`Organisation Structure:\n${config.org_structure}`);
      if (config.competency_framework) parts.push(`Competency Framework: ${config.competency_framework}`);
      if (config.additional_context) parts.push(`Additional Context: ${config.additional_context}`);
      
      // Download and encode org chart if available
      if (config.org_chart_url) {
        try {
          console.log("Fetching org chart from:", config.org_chart_url);
          const chartResp = await fetch(config.org_chart_url);
          if (chartResp.ok) {
            const chartBuffer = await chartResp.arrayBuffer();
            const chartBytes = new Uint8Array(chartBuffer);
            let binary = "";
            const chunkSize = 8192;
            for (let i = 0; i < chartBytes.length; i += chunkSize) {
              binary += String.fromCharCode(...chartBytes.subarray(i, i + chunkSize));
            }
            orgChartBase64 = btoa(binary);
            orgChartMime = chartResp.headers.get("content-type") || "image/png";
            parts.push("An org chart image has been attached below — use it to identify real roles, teams, and reporting lines for panelist recommendations.");
          }
        } catch (e) {
          console.error("Failed to fetch org chart:", e);
        }
      }

      if (parts.length > 0) {
        companyContext = `\n\nIMPORTANT COMPANY CONTEXT - Use this to tailor the interview process:\n${parts.join("\n\n")}`;
      }
    }

    const stageConstraints = config
      ? `Design between ${config.min_stages} and ${config.max_stages} stages. Include ${config.min_questions_per_stage}-${config.max_questions_per_stage} questions per stage. Total interview time across all stages should not exceed ${config.max_interview_duration_minutes} minutes.`
      : "Design 3-5 stages with 2-4 questions per stage.";

    const systemPrompt = `You are an expert HR consultant and interview process designer. Given a job description, design a comprehensive, best-practice interview process.
${companyContext}

CONSTRAINTS:
${stageConstraints}
${config?.competency_framework ? `\nEnsure questions assess these competencies where relevant: ${config.competency_framework}` : ""}
${config?.org_structure ? `\nWhen recommending panelists, refer to actual roles from the organisation structure provided above.` : ""}

Return a JSON object with this exact structure (no markdown, no code fences, just valid JSON):
{
  "jobTitle": "string",
  "department": "string", 
  "summary": "Brief overview of the interview strategy and why these stages were chosen${config?.company_name ? `, tailored for ${config.company_name}` : ""}",
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

Be specific to the role described. Tailor panelist recommendations to the company's actual structure when available.`;

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
