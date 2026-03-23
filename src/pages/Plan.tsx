import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { InterviewPlan, InterviewStage } from "@/types/interview";
import InterviewPipeline from "@/components/InterviewPipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Link2, Check, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF } from "@/utils/pdfGenerator";

const Plan = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [publisherName, setPublisherName] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchPlan = async () => {
      const { data, error } = await supabase
        .from("interview_plans")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Plan not found");
        navigate("/");
        return;
      }
      setPlan(data.plan_data as unknown as InterviewPlan);
      setStatus(data.status ?? "draft");
      setLoading(false);
    };
    fetchPlan();
  }, [id, navigate]);

  const savePlan = useCallback(async (updatedPlan: InterviewPlan) => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("interview_plans")
      .update({ plan_data: updatedPlan as any })
      .eq("id", id);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Failed to save changes");
    }
  }, [id]);

  const handleEditStage = useCallback((stageId: string, updatedStage: InterviewStage) => {
    if (!plan || status === "submitted") return;
    const updatedPlan = {
      ...plan,
      stages: plan.stages.map((s) => (s.id === stageId ? updatedStage : s)),
    };
    setPlan(updatedPlan);
    savePlan(updatedPlan);
    toast.success("Stage updated & saved");
  }, [plan, status, savePlan]);

  const handleDeleteStage = useCallback((stageId: string) => {
    if (!plan || plan.stages.length <= 1 || status === "submitted") return;
    const updatedPlan = {
      ...plan,
      stages: plan.stages.filter((s) => s.id !== stageId),
    };
    setPlan(updatedPlan);
    savePlan(updatedPlan);
    toast.success("Stage removed & saved");
  }, [plan, status, savePlan]);

  const handleSubmit = async () => {
    if (!id) return;
    const { error } = await supabase
      .from("interview_plans")
      .update({ status: "submitted" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to submit");
      return;
    }
    setStatus("submitted");
    toast.success("Interview plan submitted and locked!");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/plan/${id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSavePDF = () => {
    if (!plan || !publisherName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    generatePDF(plan, publisherName);
    setShowPdfDialog(false);
    toast.success("PDF downloaded!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) return null;

  const isSubmitted = status === "submitted";

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-xl text-foreground">SO</span>
          <span className="text-muted-foreground text-sm">Interview Designer</span>
        </div>
        <div className="flex items-center gap-2">
          {isSubmitted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Lock className="w-3 h-3" /> Submitted
            </span>
          )}
          {saving && (
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-muted-foreground hover:text-foreground"
          >
            {linkCopied ? <Check className="w-4 h-4 mr-1" /> : <Link2 className="w-4 h-4 mr-1" />}
            {linkCopied ? "Copied!" : "Share Link"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPdfDialog(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          {!isSubmitted && (
            <Button
              size="sm"
              onClick={handleSubmit}
              className="gradient-lime text-primary-foreground font-semibold"
            >
              <Check className="w-4 h-4 mr-1" /> Submit Plan
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
      </nav>

      <main className="px-4 py-10 md:py-16">
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center"
          >
            <p className="text-foreground font-medium flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              This plan has been submitted and is now locked for editing.
            </p>
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <InterviewPipeline plan={plan} onEditStage={handleEditStage} onDeleteStage={handleDeleteStage} readOnly={isSubmitted} />
        </motion.div>
      </main>

      {/* PDF Save Dialog */}
      <AnimatePresence>
        {showPdfDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPdfDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="gradient-card border border-border rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-foreground font-display font-semibold text-lg mb-4">Save as PDF</h3>
              <label className="text-muted-foreground text-sm mb-2 block">Publisher Name</label>
              <Input
                placeholder="Your name"
                value={publisherName}
                onChange={(e) => setPublisherName(e.target.value)}
                className="bg-background/50 text-foreground mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowPdfDialog(false)} className="text-muted-foreground">
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePDF}
                  className="gradient-lime text-primary-foreground font-semibold"
                >
                  <Download className="w-4 h-4 mr-1" /> Download PDF
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Plan;
