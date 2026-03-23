import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { InterviewPlan } from "@/types/interview";
import JobDescriptionUpload from "@/components/JobDescriptionUpload";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Settings, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isInterimRole, setIsInterimRole] = useState(false);

  const handleSubmit = useCallback(async (jobDescription: string) => {
    setIsLoading(true);
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
  }, [isInterimRole, navigate]);

  return (
    <div className="min-h-screen bg-background">
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
        </div>
      </nav>

      <main className="px-4 py-10 md:py-16">
        <motion.div key="upload" exit={{ opacity: 0, y: -20 }}>
          <JobDescriptionUpload onSubmit={handleSubmit} isLoading={isLoading} isInterimRole={isInterimRole} onToggleInterim={setIsInterimRole} />
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
