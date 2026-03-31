"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  getActivitiesByDate,
  getActivities,
  getToday,
  toLocalDateStr,
  formatDate,
  getStreakFromList,
  getCompletionFromList,
  markReminderSent,
  fireNotification,
  Activity,
} from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

const AddActivity = dynamic(() => import("@/components/AddActivity"), {
  ssr: false,
});
const Timeline = dynamic(() => import("@/components/Timeline"), {
  ssr: false,
});
const WeeklySummary = dynamic(() => import("@/components/WeeklySummary"), {
  ssr: false,
});
const NewDayCelebration = dynamic(() => import("@/components/NewDayCelebration"), {
  ssr: false,
});

function getDateOffset(dateStr: string, offset: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return toLocalDateStr(d);
}

function getShortDay(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function getShortDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").getDate().toString();
}

// Get initial date on client side (safe for SSR since getToday returns "" on server)
function getInitialDate(): string {
  if (typeof window === "undefined") return "";
  return getToday();
}

export default function Home() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [streak, setStreak] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [completion, setCompletion] = useState({ total: 0, done: 0, pct: 0 });
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState("there");

  const refresh = useCallback(async (date?: string) => {
    const d = date || getToday();
    const dayActivities = await getActivitiesByDate(d);
    const all = await getActivities();
    setActivities(dayActivities);
    setAllActivities(all);
    setStreak(getStreakFromList(all));
    setCompletion(getCompletionFromList(dayActivities));
  }, []);

  useEffect(() => {
    setMounted(true);

    // Get user display name if Supabase is configured
    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setDisplayName(
            user.user_metadata?.display_name ||
              user.email?.split("@")[0] ||
              "there"
          );
        }
      });
    }

    // Initial data load
    const d = getToday();
    refresh(d);
  }, [refresh]);

  useEffect(() => {
    if (selectedDate && mounted) refresh(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Reminder checker — runs every 30 seconds
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const today = getToday();

      allActivities.forEach(async (a) => {
        if (
          a.date === today &&
          a.reminder_time &&
          !a.reminder_sent &&
          !a.completed &&
          !a.skipped &&
          a.reminder_time <= currentTime
        ) {
          fireNotification("DayLog Reminder 🔔", `Time for: ${a.text}`);
          await markReminderSent(a.id);
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    checkReminders(); // Run immediately on mount
    return () => clearInterval(interval);
  }, [allActivities]);

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  const today = getToday();
  const isToday = selectedDate === today;

  const dayStrip: string[] = [];
  if (selectedDate) {
    for (let i = -3; i <= 3; i++) {
      const d = getDateOffset(selectedDate, i);
      if (d <= today) dayStrip.push(d);
    }
  }

  if (!mounted) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-top">
            <div>
              <h1 className="app-title">DayLog</h1>
              <p className="app-date">Loading...</p>
            </div>
          </div>
        </header>
        <main className="app-main" />
        <Navbar />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* New day celebration — shows once per day */}
      {isToday && <NewDayCelebration displayName={displayName} />}

      <header className="app-header">
        <div className="header-top">
          <div>
            <h1 className="app-title">DayLog</h1>
            <p className="app-date">
              Hi {displayName} · {formatDate(selectedDate)}
            </p>
          </div>
          <div className="header-actions">
            {streak > 0 && (
              <div className="streak-badge">
                <span className="streak-fire">🔥</span>
                <span className="streak-count">{streak}</span>
              </div>
            )}
            {isSupabaseConfigured && (
              <button
                className="sign-out-btn"
                onClick={handleSignOut}
                title="Sign out"
              >
                ↗
              </button>
            )}
          </div>
        </div>

        {/* Day Navigator Strip */}
        <div className="day-strip">
          <button
            className="day-strip-arrow"
            onClick={() => setSelectedDate(getDateOffset(selectedDate, -7))}
          >
            ‹
          </button>
          <div className="day-strip-days">
            {dayStrip.map((d) => {
              const isActive = d === selectedDate;
              const isTodayDot = d === today;
              return (
                <button
                  key={d}
                  className={`day-strip-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedDate(d)}
                >
                  <span className="day-strip-weekday">{getShortDay(d)}</span>
                  <span className="day-strip-num">{getShortDate(d)}</span>
                  {isTodayDot && !isActive && (
                    <span className="day-strip-today-dot" />
                  )}
                </button>
              );
            })}
          </div>
          {!isToday ? (
            <button
              className="day-strip-arrow"
              onClick={() => {
                const next = getDateOffset(selectedDate, 7);
                setSelectedDate(next > today ? today : next);
              }}
            >
              ›
            </button>
          ) : (
            <div className="day-strip-arrow" style={{ visibility: "hidden" }}>
              ›
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <AddActivity
          onAdd={() => refresh(selectedDate)}
          defaultDate={selectedDate}
        />

        {/* Weekly Summary — only on today's view */}
        {isToday && <WeeklySummary activities={allActivities} />}

        <div className="section-header">
          <h2 className="section-title">
            {isToday ? "Today's Activity" : formatDate(selectedDate)}
          </h2>
          <span className="activity-count">
            {completion.done}/{completion.total} done
          </span>
        </div>

        <Timeline
          activities={activities}
          onChange={() => refresh(selectedDate)}
          showFilter
        />
      </main>

      <Navbar />
    </div>
  );
}
