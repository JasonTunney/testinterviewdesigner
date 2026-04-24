import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, UserPlus, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props { planId: string; }

const CandidatesPanel = ({ planId }: Props) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase.from("candidates").select("*").eq("plan_id", planId).order("created_at", { ascending: false });
    setCandidates(data ?? []);
  };

  useEffect(() => { load(); }, [planId]);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("candidates").insert({ plan_id: planId, name: name.trim(), email: email.trim() || null }).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added — code ${data.short_code}`);
    setName(""); setEmail("");
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied`);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 gradient-card border border-border rounded-2xl p-6">
      <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" /> Candidates
      </h3>
      <div className="flex gap-2 mb-4">
        <Input placeholder="Candidate name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={add} disabled={busy || !name.trim()} className="gradient-lime text-primary-foreground">Add</Button>
      </div>
      {candidates.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">No candidates yet. Add one to generate a shareable code.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <div className="text-foreground font-medium">{c.name}</div>
                <div className="text-muted-foreground text-xs">{c.email ?? "—"} · status: {c.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 rounded bg-secondary text-foreground text-sm font-mono">{c.short_code}</code>
                <Button size="sm" variant="ghost" onClick={() => copyCode(c.short_code)}><Copy className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/candidate/${c.short_code}`)}><ExternalLink className="w-4 h-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CandidatesPanel;
