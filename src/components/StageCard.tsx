import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InterviewStage } from "@/types/interview";
import { ChevronDown, ChevronUp, Clock, Users, Pencil, Check, X, MessageSquare, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

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
}

const StageCard = ({ stage, index, colorClass, bgColorClass, onEdit, onDelete, canDelete = true, readOnly = false }: StageCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<InterviewStage>(stage);
  const [people, setPeople] = useState<Person[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!editing || people.length) return;
    supabase.from("people").select("id, name, role_title").order("name").then(({ data }) => {
      setPeople((data ?? []) as Person[]);
    });
  }, [editing, people.length]);

  const addPanelistByPerson = (person: Person) => {
    if (editData.panelists.length >= MAX_PANELISTS) return;
    if (editData.panelists.some((p) => p.role === person.name)) return;
    setEditData({
      ...editData,
      panelists: [
        ...editData.panelists,
        { role: person.name, reason: person.role_title ?? "Selected panelist" },
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
                    <div key={i} className="bg-background/30 rounded-lg p-3 flex justify-between items-start">
                      <div>
                        {editing ? (
                          <Input
                            value={editData.panelists[i].role}
                            onChange={(e) => {
                              const updated = [...editData.panelists];
                              updated[i] = { ...updated[i], role: e.target.value };
                              setEditData({ ...editData, panelists: updated });
                            }}
                            className="bg-background/50 text-sm font-medium mb-1"
                          />
                        ) : (
                          <span className="text-foreground font-medium text-sm">{p.role}</span>
                        )}
                        <p className="text-muted-foreground text-xs mt-0.5">{p.reason}</p>
                      </div>
                    </div>
                  ))}
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
