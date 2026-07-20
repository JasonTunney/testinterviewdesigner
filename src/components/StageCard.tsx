import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InterviewStage } from "@/types/interview";
import { ChevronDown, ChevronUp, Clock, Users, Pencil, Check, X, MessageSquare, Trash2, Plus, Target, Sparkles, Loader2, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_PANELISTS = 3;
type Person = { id: string; name: string; role_title: string | null };

interface StageCardProps {
  stage: InterviewStage;
  index: number;
  colorClass: string;
  bgColorClass: string;
  onEdit: (stage: InterviewStage) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  readOnly?: boolean;
  planId?: string;
}

const StageCard = ({ stage, index, colorClass, bgColorClass, onEdit, onDelete, canDelete = true, readOnly = false, planId }: StageCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<InterviewStage>(stage);
  const [people, setPeople] = useState<Person[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compInput, setCompInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [presInput, setPresInput] = useState("");

  const addAssessing = () => {
    const v = presInput.trim();
    if (!v || !editData.presentation) return;
    const list = editData.presentation.assessing ?? [];
    if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setEditData({ ...editData, presentation: { ...editData.presentation, assessing: [...list, v] } });
    }
    setPresInput("");
  };

  const removeAssessing = (i: number) => {
    if (!editData.presentation) return;
    const list = [...(editData.presentation.assessing ?? [])];
    list.splice(i, 1);
    setEditData({ ...editData, presentation: { ...editData.presentation, assessing: list } });
  };

  const addCompetency = () => {
    const c = compInput.trim();
    if (!c) return;
    const list = editData.competencies ?? [];
    if (!list.some((x) => x.toLowerCase() === c.toLowerCase())) {
      setEditData({ ...editData, competencies: [...list, c] });
    }
    setCompInput("");
  };

  const removeCompetency = (i: number) => {
    const list = [...(editData.competencies ?? [])];
    list.splice(i, 1);
    setEditData({ ...editData, competencies: list });
  };

  const refine = async () => {
    if (!planId) { toast.error("Refine isn't available here."); return; }
    setRefining(true);
    const { data, error } = await supabase.functions.invoke("refine-stage", {
      body: { planId, stage: { name: editData.name, description: editData.description, competencies: editData.competencies ?? [] } },
    });
    setRefining(false);
    if (error || (data && data.error)) {
      toast.error((data && data.error) || error?.message || "Refine failed");
      return;
    }
    setEditData({
      ...editData,
      panelists: Array.isArray(data.panelists) ? data.panelists : editData.panelists,
      questions: Array.isArray(data.questions) ? data.questions : editData.questions,
    });
    toast.success("Stage refined to match the competencies — review, then save with ✓.");
  };

  useEffect(() => {
    if (!editing || people.length) return;
    supabase.from("people").select("id, name, role_title").order("name").then(({ data }) => {
      setPeople((data ?? []) as Person[]);
    });
  }, [editing, people.length]);

  const addPanelistByPerson = (person: Person) => {
    if (editData.panelists.length >= MAX_PANELISTS) return;
    if (editData.panelists.some((p) => p.person_id === person.id || p.role === person.name)) return;
    setEditData({
      ...editData,
      panelists: [
        ...editData.panelists,
        {
          role: person.name,
          reason: person.role_title ?? "Selected panelist",
          person_id: person.id,
          name: person.name,
        },
      ],
    });
    setPickerOpen(false);
  };

  const removePanelist = (i: number) => {
    const updated = [...editData.panelists];
    updated.splice(i, 1);
    setEditData({ ...editData, panelists: updated });
  };
  const handleSave = () => {
    onEdit(editData);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditData(stage);
    setEditing(false);
  };

  return (
    <div className={`gradient-card rounded-xl border-l-4 ${colorClass} overflow-hidden`}>
      {/* Header */}
      <div
        className="p-5 cursor-pointer flex items-center justify-between"
        onClick={() => !editing && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <span className={`w-8 h-8 rounded-full ${bgColorClass} flex items-center justify-center text-sm font-bold text-primary-foreground`}>
            {index + 1}
          </span>
          <div>
            {editing ? (
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="bg-background/50 text-foreground font-semibold"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="text-foreground font-display font-semibold text-lg">{stage.name}</h3>
            )}
            <div className="flex items-center gap-3 mt-1 text-muted-foreground text-sm">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {stage.duration}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {stage.panelists.length} panelists</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {stage.questions.length} questions</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && !readOnly && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setEditing(true); setExpanded(true); }}
                className="text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          {editing ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSave(); }} className="text-primary hover:text-primary">
                <Check className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Rationale */}
      <div className="px-5 pb-3">
        {editing ? (
          <Textarea
            value={editData.rationale}
            onChange={(e) => setEditData({ ...editData, rationale: e.target.value })}
            className="bg-background/50 text-sm"
            placeholder="Rationale for this stage..."
          />
        ) : (
          <p className="text-muted-foreground text-sm italic">💡 {stage.rationale}</p>
        )}
      </div>

      {/* Competencies assessed */}
      {(editing || (stage.competencies && stage.competencies.length > 0)) && (
        <div className="px-5 pb-3">
          <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-primary" /> Competencies assessed
          </div>
          {editing ? (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(editData.competencies ?? []).length === 0 && (
                  <span className="text-muted-foreground text-xs">No competencies yet — add the ones this stage should assess.</span>
                )}
                {(editData.competencies ?? []).map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary text-foreground text-xs">
                    {c}
                    <button onClick={() => removeCompetency(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={compInput}
                  onChange={(e) => setCompInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetency(); } }}
                  placeholder="Add a competency…"
                  className="h-9 text-sm flex-1 min-w-[160px] bg-background/50"
                />
                <Button size="sm" variant="outline" onClick={addCompetency} className="h-9">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
                <Button size="sm" onClick={refine} disabled={refining} className="h-9 gradient-lime text-primary-foreground">
                  {refining ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  {refining ? "Refining…" : "Refine with AI"}
                </Button>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1.5">
                Edit the competencies, then <span className="text-foreground">Refine with AI</span> to regenerate this stage's questions and panel to match. Review the result, then save with ✓.
              </p>
            </>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {stage.competencies!.map((c, i) => (
                <span key={i} className="px-2 py-1 rounded bg-secondary text-foreground text-xs">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Presentation brief */}
      {(editing || stage.presentation) && (
        <div className="px-5 pb-3">
          <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Presentation className="w-3.5 h-3.5 text-primary" /> Presentation brief
          </div>
          {editing ? (
            editData.presentation ? (
              <div className="space-y-2">
                <Textarea
                  value={editData.presentation.brief}
                  onChange={(e) => setEditData({ ...editData, presentation: { ...editData.presentation!, brief: e.target.value } })}
                  placeholder="The core question or task the candidate is asked to present on…"
                  className="bg-background/50 text-sm"
                />
                <Input
                  value={editData.presentation.format ?? ""}
                  onChange={(e) => setEditData({ ...editData, presentation: { ...editData.presentation!, format: e.target.value } })}
                  placeholder="Format, e.g. 15 min presentation + 10 min Q&A"
                  className="h-9 text-sm bg-background/50"
                />
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Assessing for</div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(editData.presentation.assessing ?? []).map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary text-foreground text-xs">
                        {a}
                        <button onClick={() => removeAssessing(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={presInput}
                      onChange={(e) => setPresInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAssessing(); } }}
                      placeholder="Add what it assesses for…"
                      className="h-9 text-sm flex-1 min-w-[160px] bg-background/50"
                    />
                    <Button size="sm" variant="outline" onClick={addAssessing} className="h-9">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditData({ ...editData, presentation: undefined })} className="h-9 text-muted-foreground hover:text-destructive">
                      Remove brief
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditData({ ...editData, presentation: { brief: "", assessing: [] } })}>
                <Plus className="w-4 h-4 mr-1" /> Add presentation brief
              </Button>
            )
          ) : (
            <div className="bg-background/30 rounded-lg p-3">
              <p className="text-foreground text-sm">{stage.presentation!.brief}</p>
              {stage.presentation!.format && (
                <p className="text-muted-foreground text-xs mt-1">{stage.presentation!.format}</p>
              )}
              {(stage.presentation!.assessing ?? []).length > 0 && (
                <div className="mt-2">
                  <div className="text-[11px] text-muted-foreground mb-1">Assessing for</div>
                  <div className="flex flex-wrap gap-1.5">
                    {stage.presentation!.assessing.map((a, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-secondary text-foreground text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-6">
              {/* Panelists */}
              <div>
                <h4 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Recommended Panelists
                </h4>
                <div className="grid gap-2">
                  {(editing ? editData : stage).panelists.map((p, i) => (
                    <div key={i} className="bg-background/30 rounded-lg p-3 flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground font-medium text-sm">{p.role}</span>
                        <p className="text-muted-foreground text-xs mt-0.5">{p.reason}</p>
                      </div>
                      {editing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePanelist(i)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {editing && (
                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={editData.panelists.length >= MAX_PANELISTS}
                          className="justify-start"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {editData.panelists.length >= MAX_PANELISTS
                            ? `Max ${MAX_PANELISTS} panelists`
                            : `Add panelist (${editData.panelists.length}/${MAX_PANELISTS})`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-72" align="start">
                        <Command>
                          <CommandInput placeholder="Search people…" />
                          <CommandList>
                            <CommandEmpty>No people found. Add them in the People directory.</CommandEmpty>
                            <CommandGroup>
                              {people
                                .filter((person) => !editData.panelists.some((p) => p.person_id === person.id || p.role === person.name))
                                .map((person) => (
                                  <CommandItem
                                    key={person.id}
                                    value={`${person.name} ${person.role_title ?? ""}`}
                                    onSelect={() => addPanelistByPerson(person)}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{person.name}</span>
                                      {person.role_title && (
                                        <span className="text-xs text-muted-foreground">{person.role_title}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              {/* Questions & Scoring */}
              <div>
                <h4 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Interview Questions & Scoring Rubric
                </h4>
                <div className="space-y-4">
                  {(editing ? editData : stage).questions.map((q, qi) => (
                    <div key={qi} className="bg-background/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mb-2 inline-block">
                            {q.category}
                          </span>
                          {editing ? (
                            <Textarea
                              value={editData.questions[qi].question}
                              onChange={(e) => {
                                const updated = [...editData.questions];
                                updated[qi] = { ...updated[qi], question: e.target.value };
                                setEditData({ ...editData, questions: updated });
                              }}
                              className="bg-background/50 text-sm mt-1"
                            />
                          ) : (
                            <p className="text-foreground text-sm font-medium">{q.question}</p>
                          )}
                        </div>
                      </div>
                      {/* Scoring rubric */}
                      <div className="mt-3 space-y-1.5">
                        {q.scoringCriteria.map((sc, si) => (
                          <div key={si} className="flex items-start gap-3 text-xs">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold shrink-0 ${
                              sc.score >= 4 ? "bg-primary/20 text-primary" :
                              sc.score >= 3 ? "bg-stage-2/20 text-stage-2" :
                              sc.score >= 2 ? "bg-stage-3/20 text-stage-3" :
                              "bg-destructive/20 text-destructive"
                            }`}>
                              {sc.score}
                            </span>
                            <div>
                              <span className="text-foreground font-medium">{sc.label}</span>
                              <span className="text-muted-foreground ml-1">— {sc.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StageCard;
