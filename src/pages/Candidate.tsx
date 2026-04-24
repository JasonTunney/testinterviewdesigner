import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Loader2, Save, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { InterviewPlan } from "@/types/interview";

const Candidate = () => {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const showRate = params.get("rate") === "1";

  const [candidate, setCandidate] = useState<any>(null);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [notes, setNotes] = useState<Record<string, { score: number | null; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rateScore, setRateScore] = useState(3);
  const [rateComment, setRateComment] = useState("");

  useEffect(() => {
    if (!shortCode || !user) return;
    (async () => {
      const { data: c } = await supabase.from("candidates").select("*").eq("short_code", shortCode.toUpperCase()).maybeSingle();
      if (!c) { toast.error("Not found"); navigate("/"); return; }
      setCandidate(c);
      const { data: p } = await supabase.from("interview_plans").select("plan_data").eq("id", c.plan_id).maybeSingle();
      if (p) setPlan(p.plan_data as unknown as InterviewPlan);
      const { data: n } = await supabase.from("interview_notes").select("*").eq("candidate_id", c.id).eq("panelist_user_id", user.id);
      const map: Record<string, { score: number | null; notes: string }> = {};
      (n ?? []).forEach((row: any) => { map[row.stage_id] = { score: row.score, notes: row.notes ?? "" }; });
      setNotes(map);
      setLoading(false);
    })();
  }, [shortCode, user, navigate]);

  const updateNote = (stageId: string, patch: Partial<{ score: number | null; notes: string }>) => {
    setNotes((prev) => ({ ...prev, [stageId]: { score: prev[stageId]?.score ?? null, notes: prev[stageId]?.notes ?? "", ...patch } }));
  };

  const saveStage = async (stageId: string) => {
    if (!candidate || !user) return;
    setSaving(true);
    const n = notes[stageId] ?? { score: null, notes: "" };
    const { error } = await supabase.from("interview_notes").upsert({
      candidate_id: candidate.id, stage_id: stageId, panelist_user_id: user.id,
      question_index: 0, score: n.score, notes: n.notes,
    }, { onConflict: "candidate_id,stage_id,panelist_user_id,question_index" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const submitRating = async () => {
    if (!candidate || !user) return;
    const { error } = await supabase.from("hire_ratings").insert({
      candidate_id: candidate.id, rated_by_user_id: user.id, score: rateScore, comment: rateComment,
    });
    if (error) toast.error(error.message); else { toast.success("Rating submitted"); navigate("/"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!candidate || !plan) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppNav subtitle={`Candidate · ${candidate.short_code}`} />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-card border border-border rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{candidate.name}</h1>
            <p className="text-muted-foreground text-sm">{plan.jobTitle} · code {candidate.short_code}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/plan/${candidate.plan_id}`)}>View plan</Button>
            <Button className="gradient-lime text-primary-foreground" onClick={() => navigate(`/candidate/${candidate.short_code}/washup`)}>
              <Sparkles className="w-4 h-4 mr-1" /> Wash-up
            </Button>
          </div>
        </motion.div>

        {showRate && (
          <div className="gradient-card border border-primary/40 rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> 3-month hire rating
            </h2>
            <p className="text-muted-foreground text-sm mb-4">How happy are you with this hire so far?</p>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRateScore(n)}
                  className={`w-10 h-10 rounded-lg border ${rateScore === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>{n}</button>
              ))}
            </div>
            <Textarea placeholder="Optional comment" value={rateComment} onChange={(e) => setRateComment(e.target.value)} className="mb-3" />
            <Button onClick={submitRating} className="gradient-lime text-primary-foreground">Submit rating</Button>
          </div>
        )}

        {plan.stages.map((stage) => (
          <div key={stage.id} className="gradient-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold text-foreground">{stage.name}</h3>
                <p className="text-muted-foreground text-xs">{stage.duration} min</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => updateNote(stage.id, { score: n })}
                    className={`w-8 h-8 rounded text-sm border ${notes[stage.id]?.score === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>{n}</button>
                ))}
              </div>
            </div>
            <Textarea rows={4} placeholder="Your notes for this stage…"
              value={notes[stage.id]?.notes ?? ""}
              onChange={(e) => updateNote(stage.id, { notes: e.target.value })} className="mb-3" />
            <Button size="sm" onClick={() => saveStage(stage.id)} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Candidate;
