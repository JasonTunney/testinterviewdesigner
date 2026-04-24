import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";

const People = () => {
  const [people, setPeople] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [skillName, setSkillName] = useState("");

  const load = async () => {
    const { data: p } = await supabase.from("people").select("*, people_skills(skill_id, proficiency, skills(name))").order("name");
    setPeople(p ?? []);
    const { data: s } = await supabase.from("skills").select("*").order("name");
    setSkills(s ?? []);
  };
  useEffect(() => { load(); }, []);

  const addPerson = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("people").insert({ name: name.trim(), role_title: role.trim() || null, email: email.trim() || null });
    if (error) toast.error(error.message); else { setName(""); setRole(""); setEmail(""); load(); }
  };
  const addSkill = async () => {
    if (!skillName.trim()) return;
    const { error } = await supabase.from("skills").insert({ name: skillName.trim() });
    if (error) toast.error(error.message); else { setSkillName(""); load(); }
  };
  const setProficiency = async (personId: string, skillId: string, proficiency: number) => {
    const { error } = await supabase.from("people_skills").upsert({ person_id: personId, skill_id: skillId, proficiency }, { onConflict: "person_id,skill_id" });
    if (error) toast.error(error.message); else load();
  };
  const removePerson = async (id: string) => {
    if (!confirm("Remove this person?")) return;
    await supabase.from("people").delete().eq("id", id); load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav subtitle="People & Skills" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="gradient-card border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Add person</h2>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[160px]" />
            <Input placeholder="Role title" value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 min-w-[160px]" />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-[160px]" />
            <Button onClick={addPerson} className="gradient-lime text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </section>

        <section className="gradient-card border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold text-foreground mb-3">Skills library</h2>
          <div className="flex gap-2 mb-3">
            <Input placeholder="New skill" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
            <Button onClick={addSkill} className="gradient-lime text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => <span key={s.id} className="px-2 py-1 rounded bg-secondary text-foreground text-xs">{s.name}</span>)}
            {skills.length === 0 && <p className="text-muted-foreground text-sm">No skills yet.</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display font-semibold text-foreground">Directory</h2>
          {people.length === 0 && <p className="text-muted-foreground text-sm">No people yet.</p>}
          {people.map((p) => (
            <div key={p.id} className="gradient-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-foreground font-medium">{p.name}</div>
                  <div className="text-muted-foreground text-xs">{p.role_title ?? "—"} · {p.email ?? "—"}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removePerson(p.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              {skills.length > 0 && (
                <div className="space-y-2">
                  {skills.map((s) => {
                    const ps = p.people_skills?.find((x: any) => x.skill_id === s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-foreground text-sm w-40 truncate">{s.name}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} onClick={() => setProficiency(p.id, s.id, n)}
                              className={`w-7 h-7 rounded text-xs border ${ps?.proficiency === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>{n}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default People;
