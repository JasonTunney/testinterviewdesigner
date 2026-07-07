import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Clock, Briefcase, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InterviewPlan } from "@/types/interview";
import InterviewPipeline from "@/components/InterviewPipeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StoredPlan {
  id: string;
  job_title: string;
  department: string | null;
  summary: string | null;
  job_description: string | null;
  plan_data: InterviewPlan;
  created_at: string;
}

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StoredPlan | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (data) {
        setAuthorized(true);
        fetchPlans();
      }
      setChecking(false);
    })();
  }, [user]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("interview_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans((data as unknown as StoredPlan[]) || []);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-xl text-foreground">SO</span>
            <span className="text-muted-foreground text-sm">Plan History</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPlan(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
          </Button>
        </nav>
        <main className="px-4 py-10">
          <div className="max-w-4xl mx-auto mb-4">
            <p className="text-muted-foreground text-sm">
              Generated on {new Date(selectedPlan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <InterviewPipeline plan={selectedPlan.plan_data} onEditStage={() => {}} onDeleteStage={() => {}} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-xl text-foreground">SO</span>
          <span className="text-muted-foreground text-sm">Plan History</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </nav>

      <main className="px-4 py-10 max-w-4xl mx-auto">
        {checking ? (
          <p className="text-muted-foreground text-center">Checking access...</p>
        ) : !authorized ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="p-4 rounded-full bg-secondary w-fit mx-auto mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Plan History</h1>
            <p className="text-muted-foreground mb-6">
              This area is restricted to admins. Ask an administrator to grant you access.
            </p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-2xl font-display font-bold mb-6">Generated Interview Plans</h1>
            {loading ? (
              <p className="text-muted-foreground">Loading plans...</p>
            ) : plans.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No plans generated yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan, i) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="gradient-card border border-border rounded-xl p-5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div>
                      <h3 className="text-foreground font-display font-semibold">{plan.job_title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-muted-foreground text-sm">
                        {plan.department && <span>{plan.department}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(plan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span>{plan.plan_data.stages?.length || 0} stages</span>
                      </div>
                    </div>
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default History;
