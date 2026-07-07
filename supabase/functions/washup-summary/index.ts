import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Swap to "claude-sonnet-5" for lower cost; "claude-opus-4-8" for maximum quality.
const MODEL = "claude-opus-4-8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (!session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Require a genuine logged-in user (the anon key passes verify_jwt but is public).
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: authData } = await supabase.auth.getUser(jwt);
    if (!authData?.user) return new Response(JSON.stringify({ error: "Not authorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: session } = await supabase.from("washup_sessions").select("*, candidates(*, interview_plans(plan_data, job_description))").eq("id", session_id).single();
    if (!session) throw new Error("Session not found");
    const { data: notes } = await supabase.from("interview_notes").select("*").eq("candidate_id", session.candidate_id);
    const { data: blindScores } = await supabase.from("washup_blind_scores").select("score").eq("session_id", session_id);

    const plan = session.candidates.interview_plans.plan_data;
    const jd = session.candidates.interview_plans.job_description ?? "";

    const prompt = `Job description:\n${jd}\n\nInterview plan stages:\n${JSON.stringify(plan.stages?.map((s: any) => ({ name: s.name, focus: s.focus, questions: s.questions })) ?? [])}\n\nPanelist notes & scores:\n${JSON.stringify(notes ?? [])}\n\nBlind hire scores (1-5): ${(blindScores ?? []).map((b: any) => b.score).join(", ")}\n\nProduce a wash-up summary by calling the submit_summary tool.`;

    const summaryTool = {
      name: "submit_summary",
      description: "Return the wash-up summary surfacing themes, JD gaps, and discussion points.",
      input_schema: {
        type: "object",
        properties: {
          themes: { type: "array", items: { type: "string" } },
          gaps: { type: "array", items: { type: "string" } },
          discussion_points: { type: "array", items: { type: "string" } },
        },
        required: ["themes", "gaps", "discussion_points"],
      },
    };

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: "You analyse interview wash-up data and surface themes, JD gaps, and discussion points.",
        tools: [summaryTool],
        tool_choice: { type: "tool", name: "submit_summary" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("Anthropic API error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiResp.json();
    const toolUse = (aiJson.content || []).find((b: any) => b.type === "tool_use");
    const summary = toolUse?.input ?? { themes: [], gaps: [], discussion_points: [] };

    await supabase.from("washup_sessions").update({ ai_summary: summary }).eq("id", session_id);

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
