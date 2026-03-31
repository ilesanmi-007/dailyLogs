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
  }));
}

function saveLocalActivities(activities: Activity[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

// ===== CRUD Operations =====

export async function getActivities(): Promise<Activity[]> {
  if (!isSupabaseConfigured) return getLocalActivities();

  const { data, error } = await supabase
    .from("activities")
    .select("*")
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

export async function toggleActivity(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = getLocalActivities();
    const idx = all.findIndex((a) => a.id === id);
    if (idx !== -1) {
      all[idx].completed = !all[idx].completed;
      saveLocalActivities(all);
    }
    return;
  }

  const { data } = await supabase
    .from("activities")
    .select("completed")
    .eq("id", id)
    .single();
  if (data) {
    const { error } = await supabase
      .from("activities")
      .update({ completed: !data.completed })
      .eq("id", id);
    if (error) console.error("Error toggling activity:", error);
  }
}

export async function getActivitiesByDate(date: string): Promise<Activity[]> {
  if (!isSupabaseConfigured) {
    return getLocalActivities().filter((a) => a.date === date);
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
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
  return new Date().toISOString().split("T")[0];
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
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

export function getStreakFromList(activities: Activity[]): number {
  const days = [...new Set(activities.map((a) => a.date))].sort().reverse();
  if (days.length === 0) return 0;

  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
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
    const dateStr = d.toISOString().split("T")[0];
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
