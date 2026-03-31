"use client";

import { useState } from "react";
import { Activity, getWeeklySummary, generateAIReport, AIReportSection, CATEGORIES } from "@/lib/store";

interface Props {
  activities: Activity[];
}

export default function WeeklySummary({ activities }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSections, setReportSections] = useState<AIReportSection[]>([]);
  const [generating, setGenerating] = useState(false);

  const summary = getWeeklySummary(activities);

  if (summary.total === 0) return null;

  const topCat = summary.topCategory
    ? CATEGORIES.find((c) => c.name === summary.topCategory!.name)
    : null;

  // Motivational message
  let message = "";
  if (summary.pct >= 80) message = "Crushing it this week! 🔥";
  else if (summary.pct >= 60) message = "Solid progress! Keep going 💪";
  else if (summary.pct >= 40) message = "Good start, you've got this! ✨";
  else if (summary.total > 0) message = "Every step counts 🌱";

  const handleGenerateReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showReport) {
      setShowReport(false);
      return;
    }
    setGenerating(true);
    // Simulate brief "thinking" delay for effect
    setTimeout(() => {
      const sections = generateAIReport(activities);
      setReportSections(sections);
      setGenerating(false);
      setShowReport(true);
    }, 800);
  };

  return (
    <div className="weekly-summary">
      <div className="weekly-summary-header" onClick={() => setExpanded(!expanded)}>
        <div className="weekly-summary-left">
          <span className="weekly-summary-label">This Week</span>
          <span className="weekly-summary-msg">{message}</span>
        </div>
        <div className="weekly-summary-right">
          <span className="weekly-summary-pct">{summary.pct}%</span>
          <span className={`weekly-summary-arrow ${expanded ? "open" : ""}`}>›</span>
        </div>
      </div>

      {/* Mini progress bar always visible */}
      <div className="weekly-mini-bar" onClick={() => setExpanded(!expanded)}>
        <div className="weekly-mini-fill" style={{ width: `${summary.pct}%` }} />
      </div>

      {expanded && (
        <div className="weekly-summary-details">
          <div className="weekly-detail-grid">
            <div className="weekly-detail">
              <span className="weekly-detail-num">{summary.done}</span>
              <span className="weekly-detail-label">Done</span>
            </div>
            <div className="weekly-detail">
              <span className="weekly-detail-num">{summary.total}</span>
              <span className="weekly-detail-label">Logged</span>
            </div>
            <div className="weekly-detail">
              <span className="weekly-detail-num">{summary.activeDays}/{summary.daysSoFar}</span>
              <span className="weekly-detail-label">Days Active</span>
            </div>
            {summary.skipped > 0 && (
              <div className="weekly-detail">
                <span className="weekly-detail-num">{summary.skipped}</span>
                <span className="weekly-detail-label">Skipped</span>
              </div>
            )}
          </div>

          {(summary.mostActiveDay || topCat) && (
            <div className="weekly-insights">
              {summary.mostActiveDay && (
                <p className="weekly-insight">
                  Most active on <strong>{summary.mostActiveDay}</strong> ({summary.mostActiveCount} activities)
                </p>
              )}
              {topCat && (
                <p className="weekly-insight">
                  Top focus: {topCat.emoji} <strong>{topCat.name}</strong> ({summary.topCategory!.count})
                </p>
              )}
            </div>
          )}

          {/* AI Report Button */}
          <button
            className={`ai-report-btn ${showReport ? "active" : ""}`}
            onClick={handleGenerateReport}
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="ai-report-spinner" />
                Analyzing your week...
              </>
            ) : showReport ? (
              <>✦ Hide AI Report</>
            ) : (
              <>✦ Get AI Report</>
            )}
          </button>

          {/* AI Report */}
          {showReport && reportSections.length > 0 && (
            <div className="ai-report">
              <div className="ai-report-header">
                <span className="ai-report-badge">✦ AI</span>
                <span className="ai-report-title">Weekly Performance Report</span>
              </div>
              {reportSections.map((section, i) => (
                <div key={i} className={`ai-report-section ai-report-${section.type}`}>
                  <div className="ai-report-section-header">
                    <span className="ai-report-icon">{section.icon}</span>
                    <span className="ai-report-section-title">{section.title}</span>
                  </div>
                  <p className="ai-report-body">{section.body}</p>
                </div>
              ))}
              <p className="ai-report-footer">
                Based on {summary.total} activities across {summary.daysSoFar} days
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
