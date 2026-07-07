import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Swap to "claude-sonnet-5" for lower cost; "claude-opus-4-8" for maximum quality.
const MODEL = "claude-opus-4-8";

// Tool schema that forces Claude to return a structurally valid interview plan.
const planTool = {
  name: "submit_interview_plan",
  description: "Return the designed interview process as structured data.",
  input_schema: {
    type: "object",
    properties: {
      jobTitle: { type: "string" },
      department: { type: "string" },
      summary: { type: "string", description: "Overview of the interview strategy and why these stages were chosen." },
      stages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "e.g. stage-1" },
            name: { type: "string" },
            description: { type: "string" },
            duration: { type: "string", description: "e.g. 30 minutes" },
            rationale: { type: "string" },
            competencies: {
              type: "array",
              description: "The key competencies this stage assesses (e.g. 'Stakeholder management', 'SQL proficiency').",
              items: { type: "string" },
            },
            panelists: {
              type: "array",
              description: "People recommended for this stage's panel. Only real people from AVAILABLE PANELISTS may appear here. Empty array if no suitable person exists.",
              items: {
                type: "object",
                properties: {
                  person_id: { type: "string", description: "The exact person_id copied verbatim from AVAILABLE PANELISTS." },
                  name: { type: "string", description: "The person's name, exactly as listed." },
                  role: { type: "string", description: "The person's role/title, exactly as listed in the directory." },
                  reason: { type: "string", description: "Why this specific person fits this stage." },
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
          required: ["id", "name", "description", "duration", "rationale", "competencies", "panelists", "questions"],
        },
      },
    },
    required: ["jobTitle", "department", "summary", "stages"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, isInterimRole, jobTitle } = await req.json();
    const roleTitle = (jobTitle ?? "").trim();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Fetch company config from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Require a genuine logged-in user (the anon key passes verify_jwt but is public).
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: authData } = await supabase.auth.getUser(jwt);
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("company_config")
      .select("*")
      .limit(1)
      .single();

    // Build context from config
    let companyContext = "";
    if (config) {
      const parts: string[] = [];
      if (config.company_name) parts.push(`Company: ${config.company_name}`);
      if (config.industry) parts.push(`Industry: ${config.industry}`);
      if (config.company_description) parts.push(`About: ${config.company_description}`);
      if (config.company_values) parts.push(`Core Values: ${config.company_values}`);
      if (config.hiring_philosophy) parts.push(`Hiring Philosophy: ${config.hiring_philosophy}`);
      if (config.competency_framework) parts.push(`Competency Framework: ${config.competency_framework}`);
      if (config.additional_context) parts.push(`Additional Context: ${config.additional_context}`);

      if (parts.length > 0) {
        companyContext = `\n\nIMPORTANT COMPANY CONTEXT - Use this to tailor the interview process:\n${parts.join("\n\n")}`;
      }
    }

    // Fetch people + their skills from the directory to use as the panelist pool
    const { data: allPeople } = await supabase
      .from("people")
      .select("id, name, role_title, people_skills(proficiency, skills(name))");

    // Rule: never recommend anyone whose job title is the same as the role being
    // recruited for — exclude those peers from the pool entirely.
    const people = (allPeople ?? []).filter(
      (p: any) => !roleTitle || (p.role_title ?? "").trim().toLowerCase() !== roleTitle.toLowerCase(),
    );

    let peopleContext = "";
    if (people && people.length > 0) {
      const lines = people.map((p: any) => {
        const skills = (p.people_skills || [])
          .map((ps: any) => ps.skills?.name ? `${ps.skills.name} (${ps.proficiency}/5)` : null)
          .filter(Boolean)
          .join(", ");
        return `- person_id: ${p.id} | ${p.name}${p.role_title ? ` | ${p.role_title}` : ""}${skills ? ` | Skills: ${skills}` : ""}`;
      }).join("\n");
      peopleContext = `\n\nAVAILABLE PANELISTS — you may ONLY recommend panelists from this exact list. Copy the person_id verbatim into each panelist you recommend:\n${lines}\n\nPANELIST RULES (strict):\n- Never invent a person, and never invent or suggest a job role/title that is not represented in this list.\n- For each stage, choose the most suitable people from the list based on their role and skills.\n- If no one in the list is a good fit for a stage, return an EMPTY panelists array for that stage and explain the gap in that stage's rationale. Do NOT fabricate a panelist to fill the gap.\n\nPANEL COMPOSITION RULES (apply to every stage):\n- A talent/recruiter screening stage (a first-round screen run by the Talent or Recruitment team) must have EXACTLY ONE interviewer.\n- Never place two people with the same job title on the same stage's panel — every panelist on a given stage must have a distinct job title.\n- Do not recommend anyone whose job title is the same as the role being recruited for${roleTitle ? ` (${roleTitle})` : ""}; such peers have already been excluded from the list above.`;
    } else {
      peopleContext = `\n\nThe People directory is EMPTY. Return an empty panelists array for every stage, and note in the summary that team members must be added to the People directory before panels can be recommended. Do NOT invent panelists or job roles.`;
    }

    const stageConstraints = isInterimRole
      ? "This is an interim or internal role. Design exactly 1 interview stage. Include 3-5 comprehensive questions covering the most critical competencies for the role."
      : config
        ? `Design between ${config.min_stages} and ${config.max_stages} stages. Include ${config.min_questions_per_stage}-${config.max_questions_per_stage} questions per stage. Total interview time across all stages should not exceed ${config.max_interview_duration_minutes} minutes.`
        : "Design 3-5 stages with 2-4 questions per stage.";

    const systemPrompt = `You are an expert HR consultant and interview process designer. Given a job description, design a comprehensive, best-practice interview process and return it by calling the submit_interview_plan tool.
${companyContext}
${peopleContext}

CONSTRAINTS:
${stageConstraints}
${config?.competency_framework ? `\nEnsure questions assess these competencies where relevant: ${config.competency_framework}` : ""}

Panelist recommendations must follow the PANELIST RULES above exactly — only real people from the directory, never invented people or roles.

For each stage, list the key competencies it assesses in the "competencies" array, and make sure the questions and recommended panelists directly target those competencies.

For each question, provide a full 1-5 scoring rubric (score 1 through 5, each with a label and a description of what that answer looks like). Be specific to the role described.`;

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
        system: systemPrompt,
        tools: [planTool],
        tool_choice: { type: "tool", name: "submit_interview_plan" },
        messages: [
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
      if (response.status === 529) {
        return new Response(JSON.stringify({ error: "The AI service is temporarily overloaded. Please try again shortly." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("Anthropic API error:", response.status, text);
      throw new Error("AI request failed");
    }

    const data = await response.json();
    const toolUse = (data.content || []).find((b: any) => b.type === "tool_use");

    if (!toolUse) throw new Error("No interview plan in AI response");

    return new Response(JSON.stringify(toolUse.input), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("design-interview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
