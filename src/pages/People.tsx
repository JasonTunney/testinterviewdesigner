import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Search, X, ShieldCheck, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const genPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const People = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  // New-login form (admins only)
  const [luName, setLuName] = useState("");
  const [luEmail, setLuEmail] = useState("");
  const [luPassword, setLuPassword] = useState("");
  const [luRole, setLuRole] = useState("interviewer");
  const [luBusy, setLuBusy] = useState(false);

  // Bulk people upload (admins only)
  const [bulkBusy, setBulkBusy] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const createLogin = async () => {
    if (!luEmail.trim() || !luPassword) return;
    setLuBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email: luEmail.trim(), password: luPassword, full_name: luName.trim() || null, role: luRole },
    });
    setLuBusy(false);
    if (error || (data && data.error)) {
      toast.error((data && data.error) || error?.message || "Could not create user");
    } else {
      toast.success(`Login created for ${luEmail.trim()} — share the temporary password with them.`);
      setLuName(""); setLuEmail(""); setLuPassword(""); setLuRole("interviewer");
    }
  };

  const bulkUpload = async (file: File) => {
    if (!confirm("This will REPLACE the entire People directory with the contents of this file. Continue?")) return;
    setBulkBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const { data, error } = await supabase.functions.invoke("bulk-upload-people", { body: fd });
    setBulkBusy(false);
    if (error || (data && data.error)) {
      toast.error((data && data.error) || error?.message || "Upload failed");
    } else {
      toast.success(
        `Imported ${data.people_imported} people, ${data.skill_links} skill links` +
        (data.skills_created ? `, ${data.skills_created} new skills added to the taxonomy` : "") + ".",
      );
      load();
    }
  };

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
        {isAdmin && (
          <section className="gradient-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Team access
            </h2>
            <p className="text-muted-foreground text-xs mb-3">
              Create a login for a new team member. They sign in with the temporary password below and can change it later. Admins only.
            </p>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Full name" value={luName} onChange={(e) => setLuName(e.target.value)} className="flex-1 min-w-[150px]" />
              <Input type="email" placeholder="Email" value={luEmail} onChange={(e) => setLuEmail(e.target.value)} className="flex-1 min-w-[180px]" />
              <div className="flex gap-1 flex-1 min-w-[200px]">
                <Input placeholder="Temp password" value={luPassword} onChange={(e) => setLuPassword(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" onClick={() => setLuPassword(genPassword())}>Generate</Button>
              </div>
              <select
                value={luRole}
                onChange={(e) => setLuRole(e.target.value)}
                className="rounded-md border border-border bg-card text-foreground text-sm px-3"
              >
                <option value="interviewer">Interviewer</option>
                <option value="hiring_manager">Hiring manager</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={createLogin} disabled={luBusy || !luEmail.trim() || luPassword.length < 8}
                className="gradient-lime text-primary-foreground">
                <UserPlus className="w-4 h-4 mr-1" />{luBusy ? "Creating…" : "Create login"}
              </Button>
            </div>

            <div className="mt-5 pt-5 border-t border-border">
              <h3 className="text-foreground font-medium text-sm mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Bulk import directory
              </h3>
              <p className="text-muted-foreground text-xs mb-3">
                Upload an Excel file with columns <span className="text-foreground">Name</span>, <span className="text-foreground">Role</span>, <span className="text-foreground">Email</span> (optional), and <span className="text-foreground">Skills</span> (comma-separated, optionally <span className="text-foreground">Skill:4</span> for proficiency).
                This <span className="text-foreground font-medium">replaces the entire directory</span>. Skills not in the taxonomy are added automatically.
              </p>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={bulkBusy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) bulkUpload(f); e.target.value = ""; }}
                />
                <span className={`inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${bulkBusy ? "opacity-50 pointer-events-none" : ""}`}>
                  <Upload className="w-4 h-4" />{bulkBusy ? "Importing…" : "Choose Excel file"}
                </span>
              </label>
            </div>
          </section>
        )}

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
