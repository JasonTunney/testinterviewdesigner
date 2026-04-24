import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Loader2, Save, Sparkles, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { InterviewPlan } from "@/types/interview";

type NoteEntry = { score: number | null; notes: string };
// keyed by `${stageId}::${questionIndex}` ; questionIndex -1 = overall stage
type NotesMap = Record<string, NoteEntry>;

const keyFor = (stageId: string, qIdx: number) => `${stageId}::${qIdx}`;

const Candidate = () => {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const showRate = params.get("rate") === "1";

  const [candidate, setCandidate] = useState<any>(null);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [notes, setNotes] = useState<NotesMap>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
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
      const map: NotesMap = {};
      (n ?? []).forEach((row: any) => {
        map[keyFor(row.stage_id, row.question_index ?? -1)] = { score: row.score, notes: row.notes ?? "" };
      });
      setNotes(map);
      setLoading(false);
    })();
  }, [shortCode, user, navigate]);

  const updateNote = (stageId: string, qIdx: number, patch: Partial<NoteEntry>) => {
    const k = keyFor(stageId, qIdx);
    setNotes((prev) => ({
      ...prev,
      [k]: { score: prev[k]?.score ?? null, notes: prev[k]?.notes ?? "", ...patch },
    }));
  };

  const saveEntry = async (stageId: string, qIdx: number) => {
    if (!candidate || !user) return;
    const k = keyFor(stageId, qIdx);
    setSavingKey(k);
    const n = notes[k] ?? { score: null, notes: "" };
    const { error } = await supabase.from("interview_notes").upsert({
      candidate_id: candidate.id,
      stage_id: stageId,
      panelist_user_id: user.id,
      question_index: qIdx,
      score: n.score,
      notes: n.notes,
    }, { onConflict: "candidate_id,stage_id,panelist_user_id,question_index" });
    setSavingKey(null);
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

  const ScoreButtons = ({ stageId, qIdx }: { stageId: string; qIdx: number }) => {
    const current = notes[keyFor(stageId, qIdx)]?.score ?? null;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => updateNote(stageId, qIdx, { score: n })}
            className={`w-8 h-8 rounded text-sm border transition-colors ${
              current === n
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav subtitle={`Candidate · ${candidate.short_code}`} />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-card border border-border rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
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

        <Tabs defaultValue={plan.stages[0]?.id} className="w-full">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1">
            {plan.stages.map((stage, i) => {
              const hasAny = Object.keys(notes).some((k) => k.startsWith(`${stage.id}::`) && (notes[k].notes || notes[k].score));
              return (
                <TabsTrigger key={stage.id} value={stage.id} className="data-[state=active]:bg-background">
                  <span className="text-xs font-medium mr-2 text-muted-foreground">{i + 1}</span>
                  {stage.name}
                  {hasAny && <CheckCircle2 className="w-3 h-3 ml-2 text-primary" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {plan.stages.map((stage) => (
            <TabsContent key={stage.id} value={stage.id} className="mt-4 space-y-4">
              <div className="gradient-card border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground">{stage.name}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{stage.description}</p>
                    <p className="text-muted-foreground text-xs mt-2">{stage.duration} min</p>
                  </div>
                </div>
              </div>

              {(stage.questions ?? []).map((q, qIdx) => {
                const k = keyFor(stage.id, qIdx);
                return (
                  <div key={qIdx} className="gradient-card border border-border rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">
                          Q{qIdx + 1} · {q.category}
                        </p>
                        <p className="text-foreground font-medium">{q.question}</p>
                      </div>
                      <ScoreButtons stageId={stage.id} qIdx={qIdx} />
                    </div>

                    {q.scoringCriteria?.length > 0 && (
                      <details className="mb-3 text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Scoring criteria
                        </summary>
                        <ul className="mt-2 space-y-1 pl-4">
                          {q.scoringCriteria.map((s) => (
                            <li key={s.score} className="text-muted-foreground">
                              <span className="text-foreground font-medium">{s.score} – {s.label}:</span> {s.description}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    <Textarea
                      rows={3}
                      placeholder="Notes for this question…"
                      value={notes[k]?.notes ?? ""}
                      onChange={(e) => updateNote(stage.id, qIdx, { notes: e.target.value })}
                      className="mb-3"
                    />
                    <Button size="sm" onClick={() => saveEntry(stage.id, qIdx)} disabled={savingKey === k}>
                      {savingKey === k ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                );
              })}

              {(() => {
                const overallKey = keyFor(stage.id, -1);
                const overallUnlocked = (stage.questions ?? []).some((_, qIdx) => {
                  const e = notes[keyFor(stage.id, qIdx)];
                  return e && e.score != null && (e.notes ?? "").trim().length > 0;
                });
                return (
                  <div className={`gradient-card border rounded-2xl p-6 transition-opacity ${overallUnlocked ? "border-border" : "border-border/50 opacity-60"}`}>
                    <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">Overall</p>
                        <p className="text-foreground font-medium">Overall stage notes & score</p>
                        {!overallUnlocked && (
                          <p className="text-muted-foreground text-xs mt-1">
                            Save a score and notes for at least one question to unlock.
                          </p>
                        )}
                      </div>
                      <div className={overallUnlocked ? "" : "pointer-events-none"}>
                        <ScoreButtons stageId={stage.id} qIdx={-1} />
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Overall impression for this stage…"
                      value={notes[overallKey]?.notes ?? ""}
                      onChange={(e) => updateNote(stage.id, -1, { notes: e.target.value })}
                      disabled={!overallUnlocked}
                      className="mb-3"
                    />
                    <Button
                      size="sm"
                      onClick={() => saveEntry(stage.id, -1)}
                      disabled={!overallUnlocked || savingKey === overallKey}
                    >
                      {savingKey === overallKey ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                );
              })()}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default Candidate;
