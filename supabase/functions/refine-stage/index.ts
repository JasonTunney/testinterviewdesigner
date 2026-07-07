import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Swap to "claude-sonnet-5" for lower cost; "claude-opus-4-8" for maximum quality.
const MODEL = "claude-opus-4-8";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Returns refined questions + panelists for a single stage.
const stageTool = {
  name: "submit_refined_stage",
  description: "Return the refined interview questions and recommended panelists for this stage.",
  input_schema: {
    type: "object",
    properties: {
      panelists: {
        type: "array",
        description: "People recommended for this stage's panel. Only real people from AVAILABLE PANELISTS may appear here. Empty array if no suitable person exists.",
        items: {
          type: "object",
          properties: {
            person_id: { type: "string", description: "The exact person_id copied verbatim from AVAILABLE PANELISTS." },
            name: { type: "string" },
            role: { type: "string", description: "The person's role/title, exactly as listed in the directory." },
            reason: { type: "string", description: "Why this person fits the competencies this stage assesses." },
          },
          required: ["person_id", "name", "role", "reason"],
        },
      },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            category: { type: "string", description: "e.g. Technical, Behavioral, Cultural Fit, Problem Solving" },
            scoringCriteria: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  score: { type: "integer" },
                  label: { type: "string" },
                  description: { type: "string" },
                },
                required: ["score", "label", "description"],
              },
            },
          },
          required: ["question", "category", "scoringCriteria"],
        },
      },
    },
    required: ["panelists", "questions"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const { planId, stage } = await req.json();
    if (!planId || !stage) return json({ error: "planId and stage are required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require a genuine logged-in user (the anon key passes verify_jwt but is public).
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: authData } = await supabase.auth.getUser(jwt);
    if (!authData?.user) return json({ error: "Not authorized" }, 401);

    // Job description + company context for this kit.
    const { data: planRow } = await supabase
      .from("interview_plans").select("job_description").eq("id", planId).maybeSingle();
    const jobDescription = planRow?.job_description ?? "";

    const { data: config } = await supabase.from("company_config").select("*").limit(1).single();
    let companyContext = "";
    if (config) {
      const parts: string[] = [];
      if (config.company_name) parts.push(`Company: ${config.company_name}`);
      if (config.industry) parts.push(`Industry: ${config.industry}`);
      if (config.company_values) parts.push(`Core Values: ${config.company_values}`);
      if (config.hiring_philosophy) parts.push(`Hiring Philosophy: ${config.hiring_philosophy}`);
      if (config.competency_framework) parts.push(`Competency Framework: ${config.competency_framework}`);
      if (parts.length) companyContext = `\n\nCOMPANY CONTEXT:\n${parts.join("\n")}`;
    }

    const { data: people } = await supabase
      .from("people")
      .select("id, name, role_title, people_skills(proficiency, skills(name))");

    let peopleContext = "";
    if (people && people.length > 0) {
      const lines = people.map((p: any) => {
        const skills = (p.people_skills || [])
          .map((ps: any) => ps.skills?.name ? `${ps.skills.name} (${ps.proficiency}/5)` : null)
          .filter(Boolean).join(", ");
        return `- person_id: ${p.id} | ${p.name}${p.role_title ? ` | ${p.role_title}` : ""}${skills ? ` | Skills: ${skills}` : ""}`;
      }).join("\n");
      peopleContext = `\n\nAVAILABLE PANELISTS — you may ONLY recommend panelists from this exact list; copy the person_id verbatim:\n${lines}\n\nPANELIST RULES (strict): never invent a person or a job role. Prefer people whose skills match the competencies this stage assesses. If nobody fits, return an empty panelists array.`;
    } else {
      peopleContext = `\n\nThe People directory is EMPTY. Return an empty panelists array and do NOT invent panelists or roles.`;
    }

    const competencies: string[] = Array.isArray(stage.competencies) ? stage.competencies : [];

    const systemPrompt = `You are an expert interview designer. Refine a single interview stage of a hiring process so that its questions and panel precisely assess the competencies the hiring manager has specified.
${companyContext}
${peopleContext}

STAGE: ${stage.name}${stage.description ? ` — ${stage.description}` : ""}
COMPETENCIES THIS STAGE MUST ASSESS:
${competencies.length ? competencies.map((c) => `- ${c}`).join("\n") : "- (none specified; infer the most relevant competencies from the stage name and job description)"}

Produce, via the submit_refined_stage tool:
1. A focused set of interview questions that directly assess these competencies, each with a full 1-5 scoring rubric (score 1 through 5, each with a label and a description of what that answer looks like).
2. Recommended panelists chosen ONLY from AVAILABLE PANELISTS whose skills best match these competencies (follow the PANELIST RULES exactly).`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        tools: [stageTool],
        tool_choice: { type: "tool", name: "submit_refined_stage" },
        messages: [
          { role: "user", content: `Job description:\n\n${jobDescription}\n\nRefine the "${stage.name}" stage for the competencies listed above.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      const text = await response.text();
      console.error("Anthropic API error:", response.status, text);
      throw new Error("AI request failed");
    }

    const data = await response.json();
    const toolUse = (data.content || []).find((b: any) => b.type === "tool_use");
    if (!toolUse) throw new Error("No refined stage in AI response");

    return json(toolUse.input);
  } catch (e) {
    console.error("refine-stage error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
