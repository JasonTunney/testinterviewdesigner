import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface JobDescriptionUploadProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const JobDescriptionUpload = ({ onSubmit, isLoading }: JobDescriptionUploadProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    setJobDescription(text);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

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
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">Drop a job description file here</p>
            <p className="text-muted-foreground text-sm">or paste the text below</p>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".txt,.pdf,.doc,.docx"
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
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex justify-center"
      >
        <Button
          size="lg"
          disabled={!jobDescription.trim() || isLoading}
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
