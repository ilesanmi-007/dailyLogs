"use client";

import { useState, useEffect, useCallback } from "react";
import { getActivities, getActivitiesByDate, formatDate, Activity, CATEGORIES } from "@/lib/store";
import Timeline from "./Timeline";

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [allActivities, setAllActivities] = useState<Activity[]>([]);

  const loadActivities = useCallback(async () => {
    const activities = await getActivities();
    setAllActivities(activities);
    setActivityDates(new Set(activities.map((a) => a.date)));
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (selectedDate) {
      getActivitiesByDate(selectedDate).then(setSelectedActivities);
    }
  }, [selectedDate]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDateStr = (day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const refresh = async () => {
    if (selectedDate) {
      const acts = await getActivitiesByDate(selectedDate);
      setSelectedActivities(acts);
    }
    await loadActivities();
  };

  return (
    <div className="calendar-container">
      <div className="calendar-nav">
        <button onClick={prevMonth} className="cal-nav-btn">←</button>
        <h2 className="cal-month">
          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <button onClick={nextMonth} className="cal-nav-btn">→</button>
      </div>

      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="cal-header">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="cal-cell empty" />;
          const dateStr = getDateStr(day);
          const hasActivity = activityDates.has(dateStr);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;

          const dayActivities = hasActivity
            ? allActivities.filter((a) => a.date === dateStr)
            : [];
          const uniqueCats = [...new Set(dayActivities.map((a) => a.category))];
          const catColors = uniqueCats.map(
            (name) => CATEGORIES.find((c) => c.name === name)?.color || "#6366f1"
          );

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${hasActivity ? "has-activity" : ""}`}
            >
              <span className="cal-day-num">{day}</span>
              {hasActivity && (
                <div className="cal-dots">
                  {catColors.slice(0, 3).map((color, idx) => (
                    <span key={idx} className="cal-dot" style={{ backgroundColor: color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="cal-detail">
          <h3 className="cal-detail-title">{formatDate(selectedDate)}</h3>
          <Timeline activities={selectedActivities} onChange={refresh} />
        </div>
      )}
    </div>
  );
}
