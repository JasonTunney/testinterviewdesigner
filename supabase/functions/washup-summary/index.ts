import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (!session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session } = await supabase.from("washup_sessions").select("*, candidates(*, interview_plans(plan_data, job_description))").eq("id", session_id).single();
    if (!session) throw new Error("Session not found");
    const { data: notes } = await supabase.from("interview_notes").select("*").eq("candidate_id", session.candidate_id);
    const { data: blindScores } = await supabase.from("washup_blind_scores").select("score").eq("session_id", session_id);

    const plan = session.candidates.interview_plans.plan_data;
    const jd = session.candidates.interview_plans.job_description ?? "";

    const prompt = `Job description:\n${jd}\n\nInterview plan stages:\n${JSON.stringify(plan.stages?.map((s: any) => ({ name: s.name, focus: s.focus, questions: s.questions })) ?? [])}\n\nPanelist notes & scores:\n${JSON.stringify(notes ?? [])}\n\nBlind hire scores (1-5): ${(blindScores ?? []).map((b: any) => b.score).join(", ")}\n\nProduce a wash-up summary.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You analyse interview wash-up data and surface themes, JD gaps, and discussion points." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "summary",
            description: "Return wash-up summary",
            parameters: {
              type: "object",
              properties: {
                themes: { type: "array", items: { type: "string" } },
                gaps: { type: "array", items: { type: "string" } },
                discussion_points: { type: "array", items: { type: "string" } },
              },
              required: ["themes", "gaps", "discussion_points"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "summary" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiResp.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const summary = args ? JSON.parse(args) : { themes: [], gaps: [], discussion_points: [] };

    await supabase.from("washup_sessions").update({ ai_summary: summary }).eq("id", session_id);

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
