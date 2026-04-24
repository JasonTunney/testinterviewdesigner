import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

const Washup = () => {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!shortCode || !user) return;
    const { data: c } = await supabase.from("candidates").select("*").eq("short_code", shortCode.toUpperCase()).maybeSingle();
    if (!c) { navigate("/"); return; }
    setCandidate(c);
    let { data: s } = await supabase.from("washup_sessions").select("*").eq("candidate_id", c.id).order("created_at", { ascending: false }).maybeSingle();
    if (!s) {
      const { data: created } = await supabase.from("washup_sessions").insert({ candidate_id: c.id }).select().single();
      s = created;
    }
    setSession(s);
    const { data: bs } = await supabase.from("washup_blind_scores").select("*").eq("session_id", s!.id);
    setScores(bs ?? []);
    const mine = (bs ?? []).find((x: any) => x.panelist_user_id === user.id);
    setMyScore(mine?.score ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shortCode, user]);

  const submitScore = async (n: number) => {
    if (!session || !user) return;
    setBusy(true);
    const { error } = await supabase.from("washup_blind_scores").upsert({
      session_id: session.id, panelist_user_id: user.id, score: n,
    }, { onConflict: "session_id,panelist_user_id" });
    setBusy(false);
    if (error) toast.error(error.message); else { setMyScore(n); toast.success("Blind score submitted"); load(); }
  };

  const closeAndSummarize = async () => {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from("washup_sessions").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", session.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    const { data, error: fnErr } = await supabase.functions.invoke("washup-summary", { body: { session_id: session.id } });
    setBusy(false);
    if (fnErr) toast.error(fnErr.message); else { toast.success("Wash-up closed"); load(); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const isClosed = session?.status === "closed";
  const summary = session?.ai_summary;

  return (
    <div className="min-h-screen bg-background">
      <AppNav subtitle="Wash-up" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="gradient-card border border-border rounded-2xl p-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Wash-up · {candidate?.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
            {isClosed ? <><Unlock className="w-3 h-3" /> Closed — notes & scores visible</> : <><Lock className="w-3 h-3" /> Open — scores are blind</>}
          </p>
        </div>

        <div className="gradient-card border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold text-foreground mb-2">Your blind hire score</h2>
          <p className="text-muted-foreground text-sm mb-3">1 = strong don't hire · 5 = strong hire</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} disabled={busy || isClosed} onClick={() => submitScore(n)}
                className={`w-12 h-12 rounded-lg border ${myScore === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>{n}</button>
            ))}
          </div>
        </div>

        {isClosed && summary && (
          <div className="gradient-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-display font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI summary</h2>
            {Array.isArray(summary.themes) && (
              <div><h3 className="text-sm font-semibold text-foreground mb-1">Common themes</h3>
                <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">{summary.themes.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
            )}
            {Array.isArray(summary.gaps) && (
              <div><h3 className="text-sm font-semibold text-foreground mb-1">Gaps vs JD</h3>
                <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">{summary.gaps.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
            )}
            {Array.isArray(summary.discussion_points) && (
              <div><h3 className="text-sm font-semibold text-foreground mb-1">Discussion points</h3>
                <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">{summary.discussion_points.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Blind scores</h3>
              <div className="text-muted-foreground text-sm">Avg: {(scores.reduce((s, x) => s + x.score, 0) / Math.max(scores.length, 1)).toFixed(2)} from {scores.length} panelists</div>
            </div>
          </div>
        )}

        {!isClosed && (
          <Button disabled={busy} onClick={closeAndSummarize} className="gradient-lime text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-1" /> Close wash-up & generate AI summary
          </Button>
        )}
      </main>
    </div>
  );
};

export default Washup;
