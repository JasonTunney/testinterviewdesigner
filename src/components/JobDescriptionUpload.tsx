import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobDescriptionUploadProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  isInterimRole: boolean;
  onToggleInterim: (value: boolean) => void;
}

const SUPPORTED_TEXT_TYPES = ["text/plain"];

const JobDescriptionUpload = ({ onSubmit, isLoading, isInterimRole, onToggleInterim }: JobDescriptionUploadProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFileUpload = async (file: File) => {
    // Plain text files can be read directly
    if (SUPPORTED_TEXT_TYPES.includes(file.type) || file.name.endsWith(".txt")) {
      const text = await file.text();
      setJobDescription(text);
      return;
    }

    // For PDF, DOCX, and other binary formats, use the parse edge function
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.text) {
        setJobDescription(data.text);
        toast.success("Document parsed successfully!");
      } else {
        throw new Error("No text extracted from document");
      }
    } catch (err: any) {
      console.error("File parsing error:", err);
      toast.error(err.message || "Failed to parse document. Try pasting the text instead.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const isProcessing = isLoading || parsing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-display font-bold mb-4"
        >
          Interview Process <span className="text-gradient-lime">Designer</span>
        </motion.h1>
        <p className="text-muted-foreground text-lg">
          Upload a job description and let AI design your best-practice interview process
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className={`gradient-card border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
          dragActive ? "border-primary glow-lime" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="p-4 rounded-full bg-secondary">
            {parsing ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">
              {parsing ? "Parsing document..." : "Drop a job description file here"}
            </p>
            <p className="text-muted-foreground text-sm">
              Supports .txt, .pdf, .doc, .docx — or paste the text below
            </p>
          </div>
          <label className={`cursor-pointer ${parsing ? "pointer-events-none opacity-50" : ""}`}>
            <input
              type="file"
              className="hidden"
              accept=".txt,.pdf,.doc,.docx"
              disabled={parsing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-muted transition-colors">
              <FileText className="w-4 h-4" /> Browse files
            </span>
          </label>
        </div>

        <Textarea
          placeholder="Paste your job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="min-h-[200px] bg-background/50 border-border text-foreground placeholder:text-muted-foreground resize-none"
          disabled={parsing}
        />
      </motion.div>

      {/* Interim/Internal toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-4 flex items-center justify-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border"
      >
        <Switch
          id="interim-toggle"
          checked={isInterimRole}
          onCheckedChange={onToggleInterim}
        />
        <Label htmlFor="interim-toggle" className="text-foreground text-sm cursor-pointer">
          Interim / Internal role <span className="text-muted-foreground">(single-stage process)</span>
        </Label>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex justify-center"
      >
        <Button
          size="lg"
          disabled={!jobDescription.trim() || isProcessing}
          onClick={() => onSubmit(jobDescription)}
          className="gradient-lime text-primary-foreground font-semibold text-lg px-8 py-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Designing Interview Process...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Design Interview Process
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default JobDescriptionUpload;
