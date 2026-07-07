import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { InterviewPlan, InterviewStage } from "@/types/interview";
import InterviewPipeline from "@/components/InterviewPipeline";
import CandidatesPanel from "@/components/CandidatesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Link2, Check, Lock, Loader2, Briefcase, UserCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generatePDF } from "@/utils/pdfGenerator";

const Plan = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [publisherName, setPublisherName] = useState("");

  // Requisition workspace
  const [req, setReq] = useState<any>(null);
  const [rating, setRating] = useState<any>(null);
  const [hiredName, setHiredName] = useState("");
  const [hiredEmail, setHiredEmail] = useState("");
  const [hireStart, setHireStart] = useState("");
  const [rateScore, setRateScore] = useState(3);
  const [rateComment, setRateComment] = useState("");

  const loadReq = useCallback(async () => {
    if (!id) return;
    const { data: r } = await supabase.from("requisitions").select("*").eq("plan_id", id).maybeSingle();
    setReq(r);
    if (r) {
      setHiredName(r.hired_name ?? "");
      setHiredEmail(r.hired_email ?? "");
      setHireStart(r.hire_start_date ?? "");
      const { data: hr } = await supabase.from("hire_ratings").select("*").eq("requisition_id", r.id).maybeSingle();
      setRating(hr);
      if (hr) { setRateScore(hr.score); setRateComment(hr.comment ?? ""); }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchPlan = async () => {
      const { data, error } = await supabase
        .from("interview_plans")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Kit not found");
        navigate("/");
        return;
      }
      setPlan(data.plan_data as unknown as InterviewPlan);
      setStatus(data.status ?? "draft");
      await loadReq();
      setLoading(false);
    };
    fetchPlan();
  }, [id, navigate, loadReq]);

  const recordHire = async () => {
    if (!req || !hiredName.trim() || !hireStart) { toast.error("Enter the hire's name and start date"); return; }
    const { error } = await supabase.from("requisitions").update({
      hired_name: hiredName.trim(),
      hired_email: hiredEmail.trim() || null,
      hire_start_date: hireStart,
      status: "filled",
    }).eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Hire recorded");
    loadReq();
  };

  const submitRating = async () => {
    if (!req || !user) return;
    const { error } = await supabase.from("hire_ratings").upsert({
      requisition_id: req.id, rated_by_user_id: user.id, score: rateScore, comment: rateComment || null,
    }, { onConflict: "requisition_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Hire rating saved");
    loadReq();
  };

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
        {req && (
          <div className="max-w-4xl mx-auto mb-6 gradient-card border border-border rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-secondary"><Briefcase className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="text-foreground font-display font-semibold text-lg">{req.job_title}</div>
                <div className="text-muted-foreground text-xs">Requisition {req.requisition_id}</div>
              </div>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full capitalize ${
              req.status === "filled" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            }`}>{req.status}{req.hired_name ? ` · ${req.hired_name}` : ""}</span>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <InterviewPipeline plan={plan} onEditStage={handleEditStage} onDeleteStage={handleDeleteStage} readOnly={isSubmitted} planId={id} />
        </motion.div>

        {req && (
          <div className="max-w-4xl mx-auto mt-10 gradient-card border border-border rounded-2xl p-6">
            <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Record hire
            </h3>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Hired person's name" value={hiredName} onChange={(e) => setHiredName(e.target.value)} className="flex-1 min-w-[180px]" />
              <Input placeholder="Email (optional)" value={hiredEmail} onChange={(e) => setHiredEmail(e.target.value)} className="flex-1 min-w-[180px]" />
              <Input type="date" value={hireStart} onChange={(e) => setHireStart(e.target.value)} className="min-w-[150px]" />
              <Button onClick={recordHire} className="gradient-lime text-primary-foreground">
                {req.status === "filled" ? "Update hire" : "Mark filled"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs mt-2">
              Records who was hired for this requisition and starts the 3-month Quality-per-Hire clock.
            </p>
          </div>
        )}

        {req && req.status === "filled" && (
          <div className="max-w-4xl mx-auto mt-6 gradient-card border border-primary/40 rounded-2xl p-6">
            <h3 className="font-display font-semibold text-lg text-foreground mb-1 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> 3-month hire rating
            </h3>
            <p className="text-muted-foreground text-sm mb-3">
              How is this hire performing? This score credits every panelist on this requisition's kit.
            </p>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRateScore(n)}
                  className={`w-10 h-10 rounded-lg border ${rateScore === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>{n}</button>
              ))}
            </div>
            <Textarea placeholder="Optional comment" value={rateComment} onChange={(e) => setRateComment(e.target.value)} className="mb-3" />
            <Button onClick={submitRating} className="gradient-lime text-primary-foreground">
              {rating ? "Update rating" : "Submit rating"}
            </Button>
          </div>
        )}

        {id && req && <CandidatesPanel requisitionId={req.id} planId={id} />}
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
