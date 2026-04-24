import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Users, ClipboardList, Star, ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pendingRatings, setPendingRatings] = useState<any[]>([]);
  const [qph, setQph] = useState<{ avg_score: number; rated_hires: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: a } = await supabase
        .from("interview_assignments")
        .select("id, stage_id, scheduled_at, candidates(id, name, short_code, plan_id, status)")
        .eq("user_id", user.id)
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      setAssignments(a ?? []);

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data: r } = await supabase
        .from("candidates")
        .select("id, name, short_code, hire_start_date, hire_ratings(id)")
        .eq("status", "hired")
        .eq("hiring_manager_user_id", user.id)
        .lte("hire_start_date", threeMonthsAgo.toISOString().slice(0, 10));
      setPendingRatings((r ?? []).filter((c: any) => !c.hire_ratings?.length));

      const { data: q } = await supabase
        .from("panelist_qph")
        .select("avg_score, rated_hires")
        .eq("panelist_user_id", user.id)
        .maybeSingle();
      setQph(q as any);
    };
    load();
  }, [user]);

  const openByCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const { data } = await supabase.from("candidates").select("short_code").eq("short_code", trimmed).maybeSingle();
    if (!data) {
      toast.error("Candidate code not found");
      return;
    }
    navigate(`/candidate/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav subtitle="Home" />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-card border border-border rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Hello{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="text-muted-foreground mt-2">Design interviews, capture notes, and run wash-ups.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="gradient-lime text-primary-foreground font-semibold"
              onClick={() => navigate("/design")}>
              <Sparkles className="w-4 h-4 mr-2" /> Design new interview
            </Button>
            <div className="flex gap-2">
              <Input placeholder="Candidate code" value={code} onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && openByCode()} className="w-40" />
              <Button variant="outline" onClick={openByCode}><Search className="w-4 h-4" /></Button>
            </div>
          </div>
        </motion.section>

        <div className="grid md:grid-cols-3 gap-4">
          <Stat icon={<Star className="w-5 h-5 text-primary" />} label="Quality per Hire"
            value={qph?.avg_score ? `${Number(qph.avg_score).toFixed(2)} / 5` : "—"}
            sub={qph?.rated_hires ? `${qph.rated_hires} rated hire${qph.rated_hires === 1 ? "" : "s"}` : "No rated hires yet"} />
          <Stat icon={<ClipboardList className="w-5 h-5 text-primary" />} label="Interviews assigned"
            value={String(assignments.length)} sub="Across all candidates" />
          <Stat icon={<Users className="w-5 h-5 text-primary" />} label="Pending 3-mo ratings"
            value={String(pendingRatings.length)} sub="Hires you manage" />
        </div>

        <Section title="Your interviews">
          {assignments.length === 0 ? (
            <Empty text="No interviews assigned yet." />
          ) : (
            <ul className="space-y-2">
              {assignments.map((a) => (
                <li key={a.id}>
                  <button onClick={() => navigate(`/candidate/${a.candidates.short_code}`)}
                    className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/50 transition flex items-center justify-between">
                    <div>
                      <div className="text-foreground font-medium">{a.candidates.name}</div>
                      <div className="text-muted-foreground text-xs">Stage {a.stage_id} · Code {a.candidates.short_code}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {pendingRatings.length > 0 && (
          <Section title="3-month hire ratings due">
            <ul className="space-y-2">
              {pendingRatings.map((c) => (
                <li key={c.id}>
                  <button onClick={() => navigate(`/candidate/${c.short_code}?rate=1`)}
                    className="w-full text-left p-4 rounded-xl border border-primary/30 bg-primary/5 hover:border-primary/60 transition flex items-center justify-between">
                    <div>
                      <div className="text-foreground font-medium">{c.name}</div>
                      <div className="text-muted-foreground text-xs">Started {c.hire_start_date}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>
    </div>
  );
};

const Stat = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) => (
  <div className="gradient-card border border-border rounded-xl p-5">
    <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
    <div className="text-3xl font-display font-bold text-foreground mt-2">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{sub}</div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="font-display text-xl font-semibold text-foreground mb-3">{title}</h2>
    {children}
  </section>
);

const Empty = ({ text }: { text: string }) => (
  <div className="p-6 border border-dashed border-border rounded-xl text-center text-muted-foreground text-sm">{text}</div>
);

export default Home;
