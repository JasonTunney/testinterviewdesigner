import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Upload, Loader2, Key, Building2, Users, ListChecks, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CompanyConfig {
  id: string;
  company_name: string;
  company_description: string;
  company_values: string;
  industry: string;
  org_structure: string;
  org_chart_url: string;
  hiring_philosophy: string;
  min_stages: number;
  max_stages: number;
  min_questions_per_stage: number;
  max_questions_per_stage: number;
  max_interview_duration_minutes: number;
  competency_framework: string;
  additional_context: string;
}

interface SettingsFormProps {
  password: string;
}

const SettingsForm = ({ password }: SettingsFormProps) => {
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ password, action: "read" }),
        }
      );
      if (!resp.ok) throw new Error("Failed to fetch config");
      const data = await resp.json();
      setConfig(data);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { id, ...rest } = config;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ password, action: "update", config: rest }),
        }
      );
      if (!resp.ok) throw new Error("Failed to save");
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            password,
            action: "change_password",
            config: { newPassword },
          }),
        }
      );
      if (!resp.ok) throw new Error("Failed");
      toast.success("Password changed! Use the new password next time.");
      setShowPasswordChange(false);
      setNewPassword("");
    } catch {
      toast.error("Failed to change password");
    }
  };

  const handleOrgChartUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileName = `org-chart-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadErr } = await supabase.storage
        .from("org-charts")
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("org-charts")
        .getPublicUrl(fileName);

      setConfig((prev) =>
        prev ? { ...prev, org_chart_url: urlData.publicUrl } : prev
      );
      toast.success("Org chart uploaded!");
    } catch {
      toast.error("Failed to upload org chart");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) return null;

  const update = (field: keyof CompanyConfig, value: any) =>
    setConfig((prev) => (prev ? { ...prev, [field]: value } : prev));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Interview <span className="text-gradient-lime">Configuration</span>
        </h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gradient-lime text-primary-foreground font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save Settings
        </Button>
      </div>

      {/* Company Context */}
      <Section icon={<Building2 className="w-5 h-5 text-primary" />} title="Company Context">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Company Name">
            <Input value={config.company_name || ""} onChange={(e) => update("company_name", e.target.value)} className="bg-background/50 text-foreground" placeholder="e.g. So Energy" />
          </Field>
          <Field label="Industry">
            <Input value={config.industry || ""} onChange={(e) => update("industry", e.target.value)} className="bg-background/50 text-foreground" placeholder="e.g. Energy / Utilities" />
          </Field>
        </div>
        <Field label="Company Description">
          <Textarea value={config.company_description || ""} onChange={(e) => update("company_description", e.target.value)} className="bg-background/50 text-foreground" placeholder="Brief description of what your company does..." rows={3} />
        </Field>
        <Field label="Company Values">
          <Textarea value={config.company_values || ""} onChange={(e) => update("company_values", e.target.value)} className="bg-background/50 text-foreground" placeholder="List your core company values..." rows={3} />
        </Field>
        <Field label="Hiring Philosophy">
          <Textarea value={config.hiring_philosophy || ""} onChange={(e) => update("hiring_philosophy", e.target.value)} className="bg-background/50 text-foreground" placeholder="What does your company believe about good hiring? e.g. 'We prioritise culture add over culture fit'" rows={3} />
        </Field>
      </Section>

      {/* Org Structure */}
      <Section icon={<Users className="w-5 h-5 text-primary" />} title="Organisation Structure">
        <Field label="Org Structure Description">
          <Textarea value={config.org_structure || ""} onChange={(e) => update("org_structure", e.target.value)} className="bg-background/50 text-foreground" placeholder="Describe your business hierarchy, departments, reporting lines, team sizes..." rows={5} />
        </Field>
        <Field label="Org Chart Upload">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleOrgChartUpload(file);
                }}
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-muted transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Upload Org Chart"}
              </span>
            </label>
            {config.org_chart_url && (
              <a href={config.org_chart_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">
                View current chart
              </a>
            )}
          </div>
        </Field>
      </Section>

      {/* Process Constraints */}
      <Section icon={<ListChecks className="w-5 h-5 text-primary" />} title="Process Constraints">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Minimum Stages">
            <Input type="number" min={1} max={10} value={config.min_stages} onChange={(e) => update("min_stages", parseInt(e.target.value) || 1)} className="bg-background/50 text-foreground" />
          </Field>
          <Field label="Maximum Stages">
            <Input type="number" min={1} max={10} value={config.max_stages} onChange={(e) => update("max_stages", parseInt(e.target.value) || 5)} className="bg-background/50 text-foreground" />
          </Field>
          <Field label="Min Questions per Stage">
            <Input type="number" min={1} max={10} value={config.min_questions_per_stage} onChange={(e) => update("min_questions_per_stage", parseInt(e.target.value) || 2)} className="bg-background/50 text-foreground" />
          </Field>
          <Field label="Max Questions per Stage">
            <Input type="number" min={1} max={10} value={config.max_questions_per_stage} onChange={(e) => update("max_questions_per_stage", parseInt(e.target.value) || 4)} className="bg-background/50 text-foreground" />
          </Field>
        </div>
        <Field label="Max Total Interview Duration (minutes)">
          <Input type="number" min={30} max={600} value={config.max_interview_duration_minutes} onChange={(e) => update("max_interview_duration_minutes", parseInt(e.target.value) || 300)} className="bg-background/50 text-foreground" />
        </Field>
      </Section>

      {/* Competency Framework */}
      <Section icon={<Sparkles className="w-5 h-5 text-primary" />} title="Competency Framework">
        <Field label="Competencies & Skills">
          <Textarea value={config.competency_framework || ""} onChange={(e) => update("competency_framework", e.target.value)} className="bg-background/50 text-foreground" placeholder="List specific competencies, skills, or behaviours you want assessed. e.g. 'Leadership, Problem Solving, Technical Depth, Collaboration, Growth Mindset'" rows={4} />
        </Field>
      </Section>

      {/* Additional Context */}
      <Section icon={<FileText className="w-5 h-5 text-primary" />} title="Additional Context">
        <Field label="Anything else the AI should know">
          <Textarea value={config.additional_context || ""} onChange={(e) => update("additional_context", e.target.value)} className="bg-background/50 text-foreground" placeholder="Any additional guidelines, preferences, or context..." rows={4} />
        </Field>
      </Section>

      {/* Password Management */}
      <Section icon={<Key className="w-5 h-5 text-primary" />} title="Security">
        {!showPasswordChange ? (
          <Button variant="outline" size="sm" onClick={() => setShowPasswordChange(true)} className="text-muted-foreground border-border">
            Change Settings Password
          </Button>
        ) : (
          <div className="flex items-center gap-3 max-w-sm">
            <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background/50 text-foreground" />
            <Button onClick={handleChangePassword} className="gradient-lime text-primary-foreground shrink-0">Save</Button>
            <Button variant="ghost" onClick={() => setShowPasswordChange(false)} className="text-muted-foreground shrink-0">Cancel</Button>
          </div>
        )}
      </Section>
    </motion.div>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="gradient-card rounded-xl border border-border p-6 space-y-4">
    <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
      {icon} {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm text-muted-foreground">{label}</label>
    {children}
  </div>
);

export default SettingsForm;
