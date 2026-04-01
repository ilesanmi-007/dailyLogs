// Types and data helpers — works with Supabase OR localStorage fallback

import { supabase, isSupabaseConfigured } from "./supabase";

export interface Activity {
  id: string;
  text: string;
  category: string;
  tags: string[];
  timestamp: string;
  date: string;
  completed: boolean;
  skipped: boolean;
  skip_reason?: string;
  reminder_time?: string; // HH:mm format, e.g. "14:30"
  reminder_sent?: boolean;
  user_id?: string;
}

export const CATEGORIES = [
  { name: "Work", color: "#6366f1", emoji: "💼" },
  { name: "Personal", color: "#ec4899", emoji: "🏠" },
  { name: "Health", color: "#10b981", emoji: "💪" },
  { name: "Learning", color: "#f59e0b", emoji: "📚" },
  { name: "Creative", color: "#8b5cf6", emoji: "🎨" },
  { name: "Social", color: "#06b6d4", emoji: "👥" },
];

// ===== localStorage helpers (fallback) =====
const STORAGE_KEY = "daily-tracker-activities";

function getLocalActivities(): Activity[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return (JSON.parse(data) as Activity[]).map((a) => ({
    ...a,
    completed: a.completed ?? false,
    skipped: a.skipped ?? false,
  }));
}

function saveLocalActivities(activities: Activity[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

// ===== CRUD Operations =====

export async function getActivities(): Promise<Activity[]> {
  if (!isSupabaseConfigured) return getLocalActivities();

  // Always filter by current user to prevent seeing other users' data
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false });
  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
  return data || [];
}

export async function addActivity(
  activity: Omit<Activity, "id" | "user_id">
): Promise<Activity | null> {
  if (!isSupabaseConfigured) {
    const newActivity: Activity = { ...activity, id: crypto.randomUUID() };
    const all = getLocalActivities();
    all.unshift(newActivity);
    saveLocalActivities(all);
    return newActivity;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("activities")
    .insert({ ...activity, user_id: user?.id })
    .select()
    .single();
  if (error) {
    console.error("Error adding activity:", error);
    return null;
  }
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities().filter((a) => a.id !== id);
    saveLocalActivities(all);
    return;
  }
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) console.error("Error deleting activity:", error);
}

export async function toggleActivity(id: string, currentCompleted?: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities();
    const idx = all.findIndex((a) => a.id === id);
    if (idx !== -1) {
      all[idx].completed = !all[idx].completed;
      saveLocalActivities(all);
    }
    return true;
  }

  // Get current user to ensure RLS match
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("Toggle failed: no authenticated user");
    return false;
  }

  // If current state is provided, use it directly (avoids extra SELECT)
  if (currentCompleted !== undefined) {
    const { error } = await supabase
      .from("activities")
      .update({ completed: !currentCompleted })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("Error toggling activity:", error);
      return false;
    }
    return true;
  }

  // Fallback: fetch current state first
  const { data, error: fetchError } = await supabase
    .from("activities")
    .select("completed")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchError) {
    console.error("Error fetching activity for toggle:", fetchError);
    return false;
  }
  if (data) {
    const { error } = await supabase
      .from("activities")
      .update({ completed: !data.completed })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("Error toggling activity:", error);
      return false;
    }
  }
  return true;
}

export async function skipActivity(id: string, reason: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities();
    const idx = all.findIndex((a) => a.id === id);
    if (idx !== -1) {
      all[idx].skipped = true;
      all[idx].skip_reason = reason;
      all[idx].completed = false;
      saveLocalActivities(all);
    }
    return;
  }

  const { error } = await supabase
    .from("activities")
    .update({ skipped: true, skip_reason: reason, completed: false })
    .eq("id", id);
  if (error) console.error("Error skipping activity:", error);
}

export async function unskipActivity(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities();
    const idx = all.findIndex((a) => a.id === id);
    if (idx !== -1) {
      all[idx].skipped = false;
      all[idx].skip_reason = undefined;
      saveLocalActivities(all);
    }
    return;
  }

  const { error } = await supabase
    .from("activities")
    .update({ skipped: false, skip_reason: null })
    .eq("id", id);
  if (error) console.error("Error unskipping activity:", error);
}

export async function getActivitiesByDate(date: string): Promise<Activity[]> {
  if (!isSupabaseConfigured) {
    return getLocalActivities().filter((a) => a.date === date);
  }

  // Always filter by current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("timestamp", { ascending: false });
  if (error) {
    console.error("Error fetching activities by date:", error);
    return [];
  }
  return data || [];
}

// ===== Utility Functions =====

export function getToday(): string {
  return toLocalDateStr(new Date());
}

/** Convert a Date to local YYYY-MM-DD string (avoids UTC shift from toISOString) */
export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ===== Stats (computed from a fetched list) =====

export function getCompletionFromList(activities: Activity[]) {
  const total = activities.length;
  const done = activities.filter((a) => a.completed).length;
  const skipped = activities.filter((a) => a.skipped).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, skipped, pct };
}

export function getStreakFromList(activities: Activity[]): number {
  const days = [...new Set(activities.map((a) => a.date))].sort().reverse();
  if (days.length === 0) return 0;

  const today = getToday();
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < days.length - 1; i++) {
    const current = new Date(days[i] + "T12:00:00");
    const prev = new Date(days[i + 1] + "T12:00:00");
    const diff = (current.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ===== Reminders =====

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getNotificationPermission(): string {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function setReminder(id: string, time: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities();
    const idx = all.findIndex((a) => a.id === id);
    if (idx !== -1) {
      all[idx].reminder_time = time;
      all[idx].reminder_sent = false;
      saveLocalActivities(all);
    }
    return;
  }

  const { error } = await supabase
    .from("activities")
    .update({ reminder_time: time, reminder_sent: false })
    .eq("id", id);
  if (error) console.error("Error setting reminder:", error);
}

export async function clearReminder(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities();
    const idx = all.findIndex((a) => a.id === id);
    if (idx !== -1) {
      all[idx].reminder_time = undefined;
      all[idx].reminder_sent = undefined;
      saveLocalActivities(all);
    }
    return;
  }

  const { error } = await supabase
    .from("activities")
    .update({ reminder_time: null, reminder_sent: null })
    .eq("id", id);
  if (error) console.error("Error clearing reminder:", error);
}

export async function markReminderSent(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities();
    const idx = all.findIndex((a) => a.id === id);
    if (idx !== -1) {
      all[idx].reminder_sent = true;
      saveLocalActivities(all);
    }
    return;
  }

  const { error } = await supabase
    .from("activities")
    .update({ reminder_sent: true })
    .eq("id", id);
  if (error) console.error("Error marking reminder sent:", error);
}

export async function fireNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // Prefer service worker notification (works on mobile + background)
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "daylog-reminder",
      } as NotificationOptions);
      return;
    }
  } catch {
    // SW not available, fall through to Notification constructor
  }

  // Fallback: direct Notification constructor (desktop only)
  try {
    new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "daylog-reminder",
    });
  } catch {
    console.log("Notification not supported in this context");
  }
}

// ===== Weekly Stats =====

export function getWeeklySummary(activities: Activity[]) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weekActivities = activities.filter((a) => {
    const d = new Date(a.date + "T12:00:00");
    return d >= monday && d <= now;
  });

  const total = weekActivities.length;
  const done = weekActivities.filter((a) => a.completed).length;
  const skipped = weekActivities.filter((a) => a.skipped).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Most active day this week
  const dayCounts: Record<string, number> = {};
  weekActivities.forEach((a) => {
    dayCounts[a.date] = (dayCounts[a.date] || 0) + 1;
  });
  const mostActiveDate = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const mostActiveDay = mostActiveDate
    ? new Date(mostActiveDate[0] + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })
    : null;
  const mostActiveCount = mostActiveDate ? mostActiveDate[1] : 0;

  // Top category this week
  const catCounts: Record<string, number> = {};
  weekActivities.forEach((a) => {
    catCounts[a.category] = (catCounts[a.category] || 0) + 1;
  });
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  // Days active this week
  const activeDays = new Set(weekActivities.map((a) => a.date)).size;
  const daysSoFar = mondayOffset + 1;

  return {
    total,
    done,
    skipped,
    pct,
    activeDays,
    daysSoFar,
    mostActiveDay,
    mostActiveCount,
    topCategory: topCategory ? { name: topCategory[0], count: topCategory[1] } : null,
  };
}

// ===== AI Performance Report =====

export interface AIReportSection {
  icon: string;
  title: string;
  body: string;
  type: "positive" | "neutral" | "tip";
}

export function generateAIReport(activities: Activity[]): AIReportSection[] {
  const report: AIReportSection[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // This week
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // Last week
  const lastMonday = new Date(monday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(monday);
  lastSunday.setDate(lastSunday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);

  const thisWeek = activities.filter((a) => new Date(a.date + "T12:00:00") >= monday);
  const lastWeek = activities.filter((a) => {
    const d = new Date(a.date + "T12:00:00");
    return d >= lastMonday && d <= lastSunday;
  });

  const twDone = thisWeek.filter((a) => a.completed).length;
  const twTotal = thisWeek.length;
  const twPct = twTotal > 0 ? Math.round((twDone / twTotal) * 100) : 0;
  const twSkipped = thisWeek.filter((a) => a.skipped).length;

  const lwDone = lastWeek.filter((a) => a.completed).length;
  const lwTotal = lastWeek.length;
  const lwPct = lwTotal > 0 ? Math.round((lwDone / lwTotal) * 100) : 0;

  // 1. Overall verdict
  if (twTotal === 0) {
    report.push({
      icon: "📋",
      title: "Fresh Start",
      body: "No activities logged this week yet. Start logging to get personalized insights and track your progress!",
      type: "neutral",
    });
    return report;
  }

  if (twPct >= 80) {
    report.push({
      icon: "🏆",
      title: "Outstanding Week",
      body: `You've completed ${twDone} of ${twTotal} tasks (${twPct}%). You're operating at a high level — consistency like this compounds into real results.`,
      type: "positive",
    });
  } else if (twPct >= 50) {
    report.push({
      icon: "📈",
      title: "Building Momentum",
      body: `${twDone} of ${twTotal} tasks done (${twPct}%). You're past the halfway mark. Focus on finishing the remaining ${twTotal - twDone - twSkipped} open tasks to hit your stride.`,
      type: "positive",
    });
  } else {
    report.push({
      icon: "🌱",
      title: "Room to Grow",
      body: `${twDone} of ${twTotal} tasks completed so far (${twPct}%). That's okay — awareness is the first step. Try tackling your highest-priority task first thing tomorrow.`,
      type: "tip",
    });
  }

  // 2. Week-over-week comparison
  if (lwTotal > 0) {
    const diff = twPct - lwPct;
    const volumeDiff = twTotal - lwTotal;
    if (diff > 10) {
      report.push({
        icon: "🚀",
        title: "Trending Up",
        body: `Your completion rate is up ${diff} points compared to last week (${lwPct}% → ${twPct}%). ${volumeDiff > 0 ? `You also logged ${volumeDiff} more activities — scaling up and delivering.` : "Keep this energy going!"}`,
        type: "positive",
      });
    } else if (diff < -10) {
      report.push({
        icon: "📉",
        title: "Slight Dip",
        body: `Completion rate dropped from ${lwPct}% to ${twPct}% this week. ${twTotal > lwTotal ? "You're logging more tasks — which is great — but some are going unfinished. Consider being more selective." : "A slower week can be a chance to recharge. Focus on quality over quantity."}`,
        type: "tip",
      });
    } else {
      report.push({
        icon: "⚖️",
        title: "Steady Pace",
        body: `Completion rate is holding steady at ${twPct}% (was ${lwPct}% last week). Consistency is a superpower — you're maintaining your rhythm.`,
        type: "neutral",
      });
    }
  }

  // 3. Category balance analysis
  const catCounts: Record<string, { total: number; done: number }> = {};
  thisWeek.forEach((a) => {
    if (!catCounts[a.category]) catCounts[a.category] = { total: 0, done: 0 };
    catCounts[a.category].total++;
    if (a.completed) catCounts[a.category].done++;
  });

  const categories = Object.entries(catCounts).sort((a, b) => b[1].total - a[1].total);
  if (categories.length >= 2) {
    const top = categories[0];
    const topPct = Math.round((top[1].done / top[1].total) * 100);
    const catEmoji = CATEGORIES.find((c) => c.name === top[0])?.emoji || "📌";

    if (categories.length === 1) {
      report.push({
        icon: "🎯",
        title: "Single Focus",
        body: `All your activities are in ${catEmoji} ${top[0]}. Consider diversifying across areas like health or learning to maintain balance.`,
        type: "tip",
      });
    } else {
      const neglected = categories.filter((c) => Math.round((c[1].done / c[1].total) * 100) < 40);
      if (neglected.length > 0) {
        const neg = neglected[0];
        const negEmoji = CATEGORIES.find((c) => c.name === neg[0])?.emoji || "📌";
        report.push({
          icon: "⚡",
          title: "Focus Area",
          body: `${catEmoji} ${top[0]} is your strongest area at ${topPct}% completion. But ${negEmoji} ${neg[0]} needs attention — only ${Math.round((neg[1].done / neg[1].total) * 100)}% done. Try scheduling ${neg[0]} tasks earlier in the day when energy is higher.`,
          type: "tip",
        });
      } else {
        report.push({
          icon: "🎨",
          title: "Well Balanced",
          body: `Great category spread this week across ${categories.length} areas. ${catEmoji} ${top[0]} leads with ${top[1].total} activities. A balanced approach helps prevent burnout.`,
          type: "positive",
        });
      }
    }
  }

  // 4. Skip pattern analysis
  if (twSkipped > 0) {
    const skipReasons: Record<string, number> = {};
    thisWeek.filter((a) => a.skipped && a.skip_reason).forEach((a) => {
      skipReasons[a.skip_reason!] = (skipReasons[a.skip_reason!] || 0) + 1;
    });

    const topReason = Object.entries(skipReasons).sort((a, b) => b[1] - a[1])[0];
    const skipPct = Math.round((twSkipped / twTotal) * 100);

    if (skipPct > 30) {
      report.push({
        icon: "🤔",
        title: "Skip Pattern Detected",
        body: `${twSkipped} tasks skipped (${skipPct}% of total).${topReason ? ` Top reason: "${topReason[0]}" (${topReason[1]}x).` : ""} This suggests you might be overloading your day. Try planning fewer, more intentional tasks.`,
        type: "tip",
      });
    } else {
      report.push({
        icon: "↪️",
        title: "Some Skips",
        body: `${twSkipped} task${twSkipped > 1 ? "s" : ""} skipped this week.${topReason ? ` Most common reason: "${topReason[0]}".` : ""} A few skips are normal — it means you're being honest with yourself rather than just deleting tasks.`,
        type: "neutral",
      });
    }
  }

  // 5. Time pattern analysis
  const hourCounts: Record<number, number> = {};
  thisWeek.forEach((a) => {
    const h = new Date(a.timestamp).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (peakHour) {
    const hour = parseInt(peakHour[0]);
    const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const timeStr = hour === 0 ? "midnight" : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`;

    report.push({
      icon: "🕐",
      title: "Peak Activity Time",
      body: `You're most active around ${timeStr}. ${period === "morning" ? "Early bird! Morning productivity often leads to stronger days." : period === "afternoon" ? "Afternoon executor — you build momentum as the day progresses." : "Night owl energy! Just make sure late logging doesn't cut into rest."}`,
      type: "neutral",
    });
  }

  // 6. Actionable recommendation
  const openTasks = thisWeek.filter((a) => !a.completed && !a.skipped);
  if (openTasks.length > 0) {
    const oldest = openTasks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
    report.push({
      icon: "💡",
      title: "Next Step",
      body: `You have ${openTasks.length} open task${openTasks.length > 1 ? "s" : ""}. Start with "${oldest.text}" — it's been waiting the longest. Completing it will give you momentum for the rest.`,
      type: "tip",
    });
  } else if (twTotal > 0 && twDone === twTotal - twSkipped) {
    report.push({
      icon: "✅",
      title: "All Clear",
      body: "Every task this week is either completed or accounted for. You're fully on top of things. Time to plan ahead for next week!",
      type: "positive",
    });
  }

  return report;
}

export function getStatsFromList(activities: Activity[]) {
  const totalActivities = activities.length;
  const totalCompleted = activities.filter((a) => a.completed).length;
  const totalDays = new Set(activities.map((a) => a.date)).size;
  const streak = getStreakFromList(activities);
  const completionRate =
    totalActivities > 0
      ? Math.round((totalCompleted / totalActivities) * 100)
      : 0;

  const categoryCounts: Record<string, { total: number; done: number }> = {};
  activities.forEach((a) => {
    if (!categoryCounts[a.category])
      categoryCounts[a.category] = { total: 0, done: 0 };
    categoryCounts[a.category].total++;
    if (a.completed) categoryCounts[a.category].done++;
  });

  const tagCounts: Record<string, number> = {};
  activities.forEach((a) => {
    a.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const last7Days: { date: string; total: number; done: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = toLocalDateStr(d);
    const dayActivities = activities.filter((a) => a.date === dateStr);
    last7Days.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      total: dayActivities.length,
      done: dayActivities.filter((a) => a.completed).length,
    });
  }

  return {
    totalActivities,
    totalCompleted,
    totalDays,
    streak,
    completionRate,
    categoryCounts,
    tagCounts,
    last7Days,
    avgPerDay: totalDays > 0 ? Math.round(totalActivities / totalDays) : 0,
  };
}
