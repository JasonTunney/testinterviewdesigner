import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InterviewPlan, InterviewStage } from "@/types/interview";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import JobDescriptionUpload from "@/components/JobDescriptionUpload";
import InterviewPipeline from "@/components/InterviewPipeline";
import { generatePDF } from "@/utils/pdfGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, RotateCcw, Settings, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publisherName, setPublisherName] = useState("");
  const [showPdfDialog, setShowPdfDialog] = useState(false);

  const [lastJobDescription, setLastJobDescription] = useState("");

  const [isInterimRole, setIsInterimRole] = useState(false);

  const handleSubmit = useCallback(async (jobDescription: string) => {
    setIsLoading(true);
    setLastJobDescription(jobDescription);
    try {
      const { data, error } = await supabase.functions.invoke("design-interview", {
        body: { jobDescription, isInterimRole },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const planData = data as InterviewPlan;

      const { data: inserted, error: insertError } = await supabase.from("interview_plans").insert({
        job_title: planData.jobTitle,
        department: planData.department,
        summary: planData.summary,
        job_description: jobDescription,
        plan_data: planData as any,
      }).select("id").single();

      if (insertError) throw insertError;

      toast.success("Interview process designed! Redirecting...");
      navigate(`/plan/${inserted.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate interview plan");
    } finally {
      setIsLoading(false);
    }
  }, [isInterimRole]);

  const handleEditStage = useCallback((stageId: string, updatedStage: InterviewStage) => {
    if (!plan) return;
    setPlan({
      ...plan,
      stages: plan.stages.map((s) => (s.id === stageId ? updatedStage : s)),
    });
    toast.success("Stage updated");
  }, [plan]);

  const handleDeleteStage = useCallback((stageId: string) => {
    if (!plan || plan.stages.length <= 1) return;
    setPlan({
      ...plan,
      stages: plan.stages.filter((s) => s.id !== stageId),
    });
    toast.success("Stage removed");
  }, [plan]);

  const handleSavePDF = () => {
    if (!plan || !publisherName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    generatePDF(plan, publisherName);
    setShowPdfDialog(false);
    toast.success("PDF downloaded!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-xl text-foreground">SO</span>
          <span className="text-muted-foreground text-sm">Interview Designer</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/history")}
            className="text-muted-foreground hover:text-foreground"
          >
            <History className="w-4 h-4 mr-1" /> History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4 mr-1" /> Settings
          </Button>
        {plan && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlan(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> New
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPdfDialog(true)}
              className="text-primary hover:text-primary"
            >
              <Download className="w-4 h-4 mr-1" /> Save PDF
            </Button>
          </>
        )}
        </div>
      </nav>

      <main className="px-4 py-10 md:py-16">
        <AnimatePresence mode="wait">
          {!plan ? (
            <motion.div key="upload" exit={{ opacity: 0, y: -20 }}>
              <JobDescriptionUpload onSubmit={handleSubmit} isLoading={isLoading} isInterimRole={isInterimRole} onToggleInterim={setIsInterimRole} />
            </motion.div>
          ) : (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <InterviewPipeline plan={plan} onEditStage={handleEditStage} onDeleteStage={handleDeleteStage} />
            </motion.div>
          )}
        </AnimatePresence>
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

export default Index;
