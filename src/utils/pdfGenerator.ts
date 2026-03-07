import jsPDF from "jspdf";
import { InterviewPlan } from "@/types/interview";

export const generatePDF = (plan: InterviewPlan, publisherName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPage = () => {
    doc.addPage();
    y = 20;
  };

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      addPage();
    }
  };

  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageWidth, 45, "F");
  doc.setFillColor(200, 255, 0);
  doc.rect(0, 42, pageWidth, 3, "F");

  doc.setTextColor(200, 255, 0);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Interview Process Plan", margin, 28);

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(10);
  doc.text(`${plan.jobTitle} — ${plan.department}`, margin, 37);

  y = 55;

  // Publisher & date
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Published by: ${publisherName}`, margin, y);
  doc.text(`Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, pageWidth - margin, y, { align: "right" });
  y += 10;

  // Summary
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(plan.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 10;

  // Stages
  plan.stages.forEach((stage, index) => {
    checkPage(50);

    // Stage header
    doc.setFillColor(30, 30, 30);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");
    doc.setTextColor(200, 255, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Stage ${index + 1}: ${stage.name}`, margin + 5, y + 9);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(`Duration: ${stage.duration}`, pageWidth - margin - 5, y + 9, { align: "right" });
    y += 20;

    // Rationale
    checkPage(15);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const rationaleLines = doc.splitTextToSize(`Rationale: ${stage.rationale}`, contentWidth - 10);
    doc.text(rationaleLines, margin + 5, y);
    y += rationaleLines.length * 4.5 + 8;

    // Panelists
    checkPage(20);
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Recommended Panelists", margin + 5, y);
    y += 6;

    stage.panelists.forEach((p) => {
      checkPage(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`• ${p.role}`, margin + 8, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      const reasonLines = doc.splitTextToSize(p.reason, contentWidth - 20);
      doc.text(reasonLines, margin + 12, y + 4);
      y += 4 + reasonLines.length * 4 + 3;
    });
    y += 4;

    // Questions
    checkPage(20);
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Interview Questions & Scoring Rubric", margin + 5, y);
    y += 7;

    stage.questions.forEach((q, qi) => {
      checkPage(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const qLines = doc.splitTextToSize(`Q${qi + 1} [${q.category}]: ${q.question}`, contentWidth - 15);
      doc.text(qLines, margin + 8, y);
      y += qLines.length * 4.5 + 3;

      q.scoringCriteria.forEach((sc) => {
        checkPage(8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const scLine = doc.splitTextToSize(`  ${sc.score}/5 — ${sc.label}: ${sc.description}`, contentWidth - 25);
        doc.text(scLine, margin + 12, y);
        y += scLine.length * 3.5 + 1.5;
      });
      y += 4;
    });
    y += 6;
  });

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }

  doc.save(`interview-plan-${plan.jobTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`);
};
