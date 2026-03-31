"use client";

import { useState } from "react";
import { Activity, CATEGORIES, deleteActivity, toggleActivity, formatTime } from "@/lib/store";

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

  const handleToggle = async (id: string) => {
    await toggleActivity(id);
    onChange();
  };

  const usedCategories = [...new Set(activities.map((a) => a.category))];
  const filteredActivities = activeFilter
    ? activities.filter((a) => a.category === activeFilter)
    : activities;

  const done = activities.filter((a) => a.completed).length;
  const total = activities.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="timeline-wrapper">
      <div className="progress-section">
        <div className="progress-info">
          <span className="progress-text">
            {done} of {total} done
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
          return (
            <div
              key={activity.id}
              className={`timeline-item ${activity.completed ? "is-done" : ""}`}
            >
              <div className="timeline-line">
                <button
                  className={`check-btn ${activity.completed ? "checked" : ""}`}
                  onClick={() => handleToggle(activity.id)}
                  style={{
                    borderColor: activity.completed ? cat.color : undefined,
                    backgroundColor: activity.completed ? cat.color : undefined,
                  }}
                  title={activity.completed ? "Mark as not done" : "Mark as done"}
                >
                  {activity.completed && (
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
                </button>
                {i < filteredActivities.length - 1 && (
                  <div className="timeline-connector" />
                )}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-time">
                    {formatTime(activity.timestamp)}
                    {showDate && (
                      <span className="timeline-date"> · {activity.date}</span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDelete(activity.id)}
                    className="delete-btn"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
                <p className={`timeline-text ${activity.completed ? "done-text" : ""}`}>
                  {activity.text}
                </p>
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
