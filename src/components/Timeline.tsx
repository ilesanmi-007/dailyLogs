"use client";

import { useState } from "react";
import {
  Activity,
  CATEGORIES,
  deleteActivity,
  toggleActivity,
  skipActivity,
  unskipActivity,
  setReminder,
  clearReminder,
  formatTime,
  getToday,
} from "@/lib/store";

interface Props {
  activities: Activity[];
  onChange: () => void;
  showDate?: boolean;
  showFilter?: boolean;
}

export default function Timeline({
  activities,
  onChange,
  showDate = false,
  showFilter = false,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [skipModalId, setSkipModalId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [reminderEditId, setReminderEditId] = useState<string | null>(null);
  const [reminderEditTime, setReminderEditTime] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (activities.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <p>No activities logged yet</p>
        <p className="empty-sub">Start tracking your day!</p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    await deleteActivity(id);
    onChange();
  };

  const handleToggle = async (id: string, currentCompleted: boolean) => {
    if (togglingId === id) return; // Prevent double-tap
    setTogglingId(id);
    try {
      const success = await toggleActivity(id, currentCompleted);
      if (success) {
        onChange();
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleSkipSubmit = async () => {
    if (!skipModalId || !skipReason.trim()) return;
    await skipActivity(skipModalId, skipReason.trim());
    setSkipModalId(null);
    setSkipReason("");
    onChange();
  };

  const handleUnskip = async (id: string) => {
    await unskipActivity(id);
    onChange();
  };

  const handleSetReminder = async (id: string, time: string) => {
    await setReminder(id, time);
    setReminderEditId(null);
    setReminderEditTime("");
    onChange();
  };

  const handleClearReminder = async (id: string) => {
    await clearReminder(id);
    setReminderEditId(null);
    onChange();
  };

  const usedCategories = [...new Set(activities.map((a) => a.category))];
  const filteredActivities = activeFilter
    ? activities.filter((a) => a.category === activeFilter)
    : activities;

  const done = activities.filter((a) => a.completed).length;
  const skipped = activities.filter((a) => a.skipped).length;
  const total = activities.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="timeline-wrapper">
      <div className="progress-section">
        <div className="progress-info">
          <span className="progress-text">
            {done} of {total} done
            {skipped > 0 && (
              <span className="skipped-count"> · {skipped} skipped</span>
            )}
          </span>
          <span className={`progress-pct ${pct === 100 ? "complete" : ""}`}>
            {pct === 100 ? "All done! ✨" : `${pct}%`}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {showFilter && usedCategories.length > 1 && (
        <div className="filter-row">
          <button
            className={`filter-chip ${activeFilter === null ? "active" : ""}`}
            onClick={() => setActiveFilter(null)}
          >
            All
          </button>
          {usedCategories.map((catName) => {
            const cat = CATEGORIES.find((c) => c.name === catName);
            if (!cat) return null;
            const count = activities.filter((a) => a.category === catName).length;
            return (
              <button
                key={catName}
                className={`filter-chip ${activeFilter === catName ? "active" : ""}`}
                onClick={() =>
                  setActiveFilter(activeFilter === catName ? null : catName)
                }
                style={
                  activeFilter === catName
                    ? { borderColor: cat.color, backgroundColor: cat.color + "18" }
                    : undefined
                }
              >
                {cat.emoji} {cat.name}
                <span className="filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="timeline">
        {filteredActivities.map((activity, i) => {
          const cat =
            CATEGORIES.find((c) => c.name === activity.category) || CATEGORIES[0];
          const isSkipped = activity.skipped;
          const isDone = activity.completed;
          return (
            <div
              key={activity.id}
              className={`timeline-item ${isDone ? "is-done" : ""} ${isSkipped ? "is-skipped" : ""}`}
            >
              <div className="timeline-line">
                <button
                  className={`check-btn ${isDone ? "checked" : ""} ${isSkipped ? "skipped-check" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSkipped) return;
                    handleToggle(activity.id, activity.completed);
                  }}
                  style={{
                    borderColor: isDone ? cat.color : isSkipped ? "#f59e0b" : undefined,
                    backgroundColor: isDone ? cat.color : isSkipped ? "#f59e0b" : undefined,
                  }}
                  title={isDone ? "Mark as not done" : isSkipped ? "Skipped" : "Mark as done"}
                >
                  {isDone && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isSkipped && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 3L9 9M9 3L3 9"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
                {i < filteredActivities.length - 1 && (
                  <div className="timeline-connector" />
                )}
              </div>
              <div
                className="timeline-content"
                onClick={() => {
                  if (!isSkipped) handleToggle(activity.id, activity.completed);
                }}
                style={{ cursor: isSkipped ? "default" : "pointer" }}
              >
                <div className="timeline-header">
                  <span className="timeline-time">
                    {formatTime(activity.timestamp)}
                    {showDate && (
                      <span className="timeline-date"> · {activity.date}</span>
                    )}
                  </span>
                  <div className="timeline-actions" onClick={(e) => e.stopPropagation()}>
                    {!isDone && !isSkipped && (
                      <button
                        onClick={() => {
                          setSkipModalId(activity.id);
                          setSkipReason("");
                        }}
                        className="skip-btn"
                        title="Skip with reason"
                      >
                        Skip
                      </button>
                    )}
                    {isSkipped && (
                      <button
                        onClick={() => handleUnskip(activity.id)}
                        className="unskip-btn"
                        title="Undo skip"
                      >
                        Undo
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="delete-btn"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <p className={`timeline-text ${isDone ? "done-text" : ""} ${isSkipped ? "skipped-text" : ""}`}>
                  {activity.text}
                </p>
                {isSkipped && activity.skip_reason && (
                  <div className="skip-reason-display">
                    <span className="skip-reason-label">Reason:</span> {activity.skip_reason}
                  </div>
                )}
                <div className="timeline-meta">
                  <span
                    className="timeline-category"
                    style={{
                      backgroundColor: cat.color + "18",
                      color: cat.color,
                    }}
                  >
                    {cat.emoji} {cat.name}
                  </span>
                  {activity.tags.map((tag) => (
                    <span key={tag} className="timeline-tag">
                      #{tag}
                    </span>
                  ))}
                  {isSkipped && (
                    <span className="timeline-skipped-badge">Skipped</span>
                  )}
                  {/* Reminder badge */}
                  {activity.reminder_time && !isDone && !isSkipped && activity.date === getToday() && (
                    <span
                      className={`timeline-reminder-badge ${activity.reminder_sent ? "sent" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setReminderEditId(reminderEditId === activity.id ? null : activity.id);
                        setReminderEditTime(activity.reminder_time || "");
                      }}
                    >
                      🔔 {activity.reminder_time}
                    </span>
                  )}
                  {/* Add reminder button for today's tasks without one */}
                  {!activity.reminder_time && !isDone && !isSkipped && activity.date === getToday() && (
                    <button
                      className="timeline-add-reminder"
                      onClick={(e) => {
                        e.stopPropagation();
                        const now = new Date();
                        now.setHours(now.getHours() + 1);
                        const hh = now.getHours().toString().padStart(2, "0");
                        const mm = now.getMinutes().toString().padStart(2, "0");
                        setReminderEditId(activity.id);
                        setReminderEditTime(`${hh}:${mm}`);
                      }}
                    >
                      🔔
                    </button>
                  )}
                </div>
                {/* Inline reminder editor */}
                {reminderEditId === activity.id && (
                  <div className="reminder-edit-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="time"
                      value={reminderEditTime}
                      onChange={(e) => setReminderEditTime(e.target.value)}
                      className="reminder-edit-input"
                    />
                    <button
                      className="reminder-edit-save"
                      onClick={() => handleSetReminder(activity.id, reminderEditTime)}
                      disabled={!reminderEditTime}
                    >
                      Set
                    </button>
                    {activity.reminder_time && (
                      <button
                        className="reminder-edit-clear"
                        onClick={() => handleClearReminder(activity.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Skip Reason Modal */}
      {skipModalId && (
        <div className="skip-modal-overlay" onClick={() => setSkipModalId(null)}>
          <div className="skip-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="skip-modal-title">Why are you skipping this?</h3>
            <textarea
              className="skip-modal-input"
              placeholder="e.g. Ran out of time, got postponed to tomorrow..."
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              autoFocus
              rows={3}
            />
            <div className="skip-modal-quick">
              {["No time", "Postponed", "Not needed", "Blocked"].map((reason) => (
                <button
                  key={reason}
                  className="skip-quick-btn"
                  onClick={() => setSkipReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="skip-modal-actions">
              <button
                className="skip-modal-cancel"
                onClick={() => setSkipModalId(null)}
              >
                Cancel
              </button>
              <button
                className="skip-modal-submit"
                onClick={handleSkipSubmit}
                disabled={!skipReason.trim()}
              >
                Skip Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
