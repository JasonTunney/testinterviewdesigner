import { motion } from "framer-motion";
import { InterviewPlan, InterviewStage } from "@/types/interview";
import StageCard from "./StageCard";
import { ArrowDown } from "lucide-react";

interface InterviewPipelineProps {
  plan: InterviewPlan;
  onEditStage: (stageId: string, stage: InterviewStage) => void;
}

const stageColors = [
  "border-stage-1 shadow-[0_0_20px_-5px_hsl(72,100%,50%,0.3)]",
  "border-stage-2 shadow-[0_0_20px_-5px_hsl(160,70%,45%,0.3)]",
  "border-stage-3 shadow-[0_0_20px_-5px_hsl(200,80%,50%,0.3)]",
  "border-stage-4 shadow-[0_0_20px_-5px_hsl(270,70%,55%,0.3)]",
  "border-stage-5 shadow-[0_0_20px_-5px_hsl(330,70%,50%,0.3)]",
];

const stageBgColors = [
  "bg-stage-1",
  "bg-stage-2",
  "bg-stage-3",
  "bg-stage-4",
  "bg-stage-5",
];

const InterviewPipeline = ({ plan, onEditStage }: InterviewPipelineProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl font-display font-bold mb-2">{plan.jobTitle}</h2>
        <p className="text-muted-foreground">{plan.department}</p>
        <p className="text-foreground/80 mt-4 max-w-2xl mx-auto">{plan.summary}</p>
      </motion.div>

      {/* Stage count badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center mb-8"
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-lime text-primary-foreground font-semibold text-sm">
          {plan.stages.length} Interview Stages
        </span>
      </motion.div>

      {/* Pipeline */}
      <div className="space-y-2">
        {plan.stages.map((stage, index) => (
          <div key={stage.id}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              <StageCard
                stage={stage}
                index={index}
                colorClass={stageColors[index % stageColors.length]}
                bgColorClass={stageBgColors[index % stageBgColors.length]}
                onEdit={(updated) => onEditStage(stage.id, updated)}
              />
            </motion.div>
            {index < plan.stages.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.15 + 0.1 }}
                className="flex justify-center py-1"
              >
                <ArrowDown className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewPipeline;
