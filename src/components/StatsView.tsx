"use client";

import { useEffect, useState } from "react";
import { getActivities, getStatsFromList, CATEGORIES } from "@/lib/store";

export default function StatsView() {
  const [stats, setStats] = useState<ReturnType<typeof getStatsFromList> | null>(null);

  useEffect(() => {
    getActivities().then((activities) => {
      setStats(getStatsFromList(activities));
    });
  }, []);

  if (!stats) return null;

  const maxBarValue = Math.max(...stats.last7Days.map((d) => d.total), 1);

  const topTags = Object.entries(stats.tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="stats-container">
      <div className="stats-cards">
        <div className="stat-card highlight-card">
          <div className="stat-number">{stats.completionRate}%</div>
          <div className="stat-label">✅ Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.streak}</div>
          <div className="stat-label">🔥 Day Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {stats.totalCompleted}
            <span className="stat-of">/{stats.totalActivities}</span>
          </div>
          <div className="stat-label">✅ Done / Logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.avgPerDay}</div>
          <div className="stat-label">⚡ Avg Per Day</div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">Last 7 Days</h3>
        <div className="bar-chart">
          {stats.last7Days.map((day, i) => (
            <div key={i} className="bar-col">
              <div className="bar-value">
                {day.total ? `${day.done}/${day.total}` : ""}
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill-bg"
                  style={{ height: `${(day.total / maxBarValue) * 100}%` }}
                />
                <div
                  className="bar-fill bar-fill-done"
                  style={{ height: `${(day.done / maxBarValue) * 100}%` }}
                />
              </div>
              <div className="bar-label">{day.date}</div>
            </div>
          ))}
        </div>
        <div className="bar-legend">
          <span className="legend-item"><span className="legend-dot legend-dot-total" /> Logged</span>
          <span className="legend-item"><span className="legend-dot legend-dot-done" /> Done</span>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">By Category</h3>
        <div className="category-breakdown">
          {CATEGORIES.map((cat) => {
            const data = stats.categoryCounts[cat.name] || { total: 0, done: 0 };
            const pct = stats.totalActivities > 0 ? (data.total / stats.totalActivities) * 100 : 0;
            const donePct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
            return (
              <div key={cat.name} className="cat-bar-row">
                <div className="cat-bar-label">
                  <span>{cat.emoji} {cat.name}</span>
                  <span className="cat-bar-count">
                    {data.done}/{data.total}
                    {data.total > 0 && <span className="cat-bar-pct"> ({donePct}%)</span>}
                  </span>
                </div>
                <div className="cat-bar-track">
                  <div
                    className="cat-bar-fill"
                    style={{ width: `${pct}%`, backgroundColor: cat.color, opacity: 0.3 }}
                  />
                  <div
                    className="cat-bar-fill cat-bar-fill-done"
                    style={{
                      width: `${(data.done / Math.max(stats.totalActivities, 1)) * 100}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {topTags.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Top Tags</h3>
          <div className="top-tags">
            {topTags.map(([tag, count]) => (
              <span key={tag} className="top-tag">
                #{tag} <span className="top-tag-count">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {stats.totalActivities === 0 && (
        <div className="empty-state" style={{ marginTop: "2rem" }}>
          <div className="empty-icon">📊</div>
          <p>No data yet</p>
          <p className="empty-sub">Start logging activities to see your stats!</p>
        </div>
      )}
    </div>
  );
}
