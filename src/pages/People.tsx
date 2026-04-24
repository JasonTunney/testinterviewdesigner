import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const People = () => {
  const [people, setPeople] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  const load = async () => {
    const { data: p } = await supabase
      .from("people")
      .select("*, people_skills(skill_id, proficiency, skills(name))")
      .order("name");
    setPeople(p ?? []);
    const { data: s } = await supabase.from("skills").select("*").order("name");
    setSkills(s ?? []);
  };
  useEffect(() => { load(); }, []);

  const addPerson = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("people").insert({
      name: name.trim(),
      role_title: role.trim() || null,
      email: email.trim() || null,
    });
    if (error) toast.error(error.message);
    else { setName(""); setRole(""); setEmail(""); load(); }
  };

  const addSkill = async () => {
    if (!skillName.trim()) return;
    const { error } = await supabase.from("skills").insert({
      name: skillName.trim(),
      description: skillDesc.trim() || null,
    });
    if (error) toast.error(error.message);
    else { setSkillName(""); setSkillDesc(""); load(); }
  };

  const assignSkill = async (personId: string, skillId: string, proficiency = 3) => {
    const { error } = await supabase.from("people_skills").upsert(
      { person_id: personId, skill_id: skillId, proficiency },
      { onConflict: "person_id,skill_id" },
    );
    if (error) toast.error(error.message); else load();
  };

  const setProficiency = async (personId: string, skillId: string, proficiency: number) => {
    const { error } = await supabase.from("people_skills").upsert(
      { person_id: personId, skill_id: skillId, proficiency },
      { onConflict: "person_id,skill_id" },
    );
    if (error) toast.error(error.message); else load();
  };

  const removeSkill = async (personId: string, skillId: string) => {
    const { error } = await supabase
      .from("people_skills")
      .delete()
      .eq("person_id", personId)
      .eq("skill_id", skillId);
    if (error) toast.error(error.message); else load();
  };

  const removePerson = async (id: string) => {
    if (!confirm("Remove this person?")) return;
    await supabase.from("people").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav subtitle="People & Skills" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="gradient-card border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Add person
          </h2>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[160px]" />
            <Input placeholder="Role title" value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 min-w-[160px]" />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-[160px]" />
            <Button onClick={addPerson} className="gradient-lime text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            New people start with no skills. Assign skills individually from the directory below.
          </p>
        </section>

        <section className="gradient-card border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold text-foreground mb-3">Skills library</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <Input
              placeholder="New skill name"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Input
              placeholder="Description (optional)"
              value={skillDesc}
              onChange={(e) => setSkillDesc(e.target.value)}
              className="flex-[2] min-w-[240px]"
            />
            <Button onClick={addSkill} className="gradient-lime text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </div>
          <p className="text-muted-foreground text-xs mb-3">
            {skills.length} skill{skills.length === 1 ? "" : "s"} in the taxonomy.
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 30).map((s) => (
              <span key={s.id} className="px-2 py-1 rounded bg-secondary text-foreground text-xs" title={s.description ?? ""}>
                {s.name}
              </span>
            ))}
            {skills.length > 30 && (
              <span className="px-2 py-1 text-muted-foreground text-xs">+{skills.length - 30} more</span>
            )}
            {skills.length === 0 && <p className="text-muted-foreground text-sm">No skills yet.</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display font-semibold text-foreground">Directory</h2>
          {people.length === 0 && <p className="text-muted-foreground text-sm">No people yet.</p>}
          {people.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              skills={skills}
              pickerOpen={pickerOpenFor === p.id}
              onPickerOpenChange={(o) => { setPickerOpenFor(o ? p.id : null); setPickerQuery(""); }}
              pickerQuery={pickerQuery}
              setPickerQuery={setPickerQuery}
              onAssign={(skillId) => assignSkill(p.id, skillId)}
              onSetProficiency={(skillId, prof) => setProficiency(p.id, skillId, prof)}
              onRemoveSkill={(skillId) => removeSkill(p.id, skillId)}
              onRemovePerson={() => removePerson(p.id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
};

const PersonCard = ({
  person, skills, pickerOpen, onPickerOpenChange, pickerQuery, setPickerQuery,
  onAssign, onSetProficiency, onRemoveSkill, onRemovePerson,
}: any) => {
  const assigned = (person.people_skills ?? []) as any[];
  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.skill_id)), [assigned]);
  const available = useMemo(
    () => skills.filter((s: any) =>
      !assignedIds.has(s.id) &&
      (pickerQuery.trim() === "" || s.name.toLowerCase().includes(pickerQuery.toLowerCase()))
    ),
    [skills, assignedIds, pickerQuery],
  );

  return (
    <div className="gradient-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-foreground font-medium">{person.name}</div>
          <div className="text-muted-foreground text-xs">
            {person.role_title ?? "—"} · {person.email ?? "—"}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemovePerson}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {assigned.length === 0 && (
          <p className="text-muted-foreground text-xs">No skills assigned yet.</p>
        )}
        {assigned.map((ps: any) => {
          const skill = skills.find((s: any) => s.id === ps.skill_id);
          if (!skill) return null;
          return (
            <div key={ps.skill_id} className="flex items-center gap-2">
              <span className="text-foreground text-sm flex-1 truncate" title={skill.description ?? ""}>
                {skill.name}
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => onSetProficiency(ps.skill_id, n)}
                    className={`w-7 h-7 rounded text-xs border ${
                      ps.proficiency === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:bg-secondary"
                    }`}
                  >{n}</button>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={() => onRemoveSkill(ps.skill_id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <Popover open={pickerOpen} onOpenChange={onPickerOpenChange}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add skill
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search skills…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <ScrollArea className="h-72">
              <div className="p-1">
                {available.length === 0 && (
                  <p className="text-muted-foreground text-xs px-3 py-4 text-center">
                    {skills.length === assigned.length ? "All skills assigned." : "No matching skills."}
                  </p>
                )}
                {available.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => { onAssign(s.id); onPickerOpenChange(false); }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-secondary"
                  >
                    <div className="text-foreground text-sm">{s.name}</div>
                    {s.description && (
                      <div className="text-muted-foreground text-xs line-clamp-2">{s.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default People;
