"use client";

import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

const ADMIN_EMAIL = "samsonademola56@gmail.com";

interface UserStats {
  user_id: string;
  email: string;
  total_activities: number;
  completed_activities: number;
  first_activity: string;
  last_activity: string;
}

interface AppStats {
  totalUsers: number;
  totalActivities: number;
  totalCompleted: number;
  completionRate: number;
  activitiesToday: number;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [appStats, setAppStats] = useState<AppStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    await loadAdminData();
    setLoading(false);
  }

  async function loadAdminData() {
    // Fetch all activities (admin policy allows this)
    const { data: activities, error: fetchError } = await supabase
      .from("activities")
      .select("*")
      .order("timestamp", { ascending: false });

    if (fetchError) {
      setError(`Failed to load data: ${fetchError.message}`);
      return;
    }

    if (!activities || activities.length === 0) {
      setAppStats({
        totalUsers: 0,
        totalActivities: 0,
        totalCompleted: 0,
        completionRate: 0,
        activitiesToday: 0,
      });
      setUsers([]);
      return;
    }

    // Compute per-user stats
    const userMap: Record<string, {
      total: number;
      completed: number;
      first: string;
      last: string;
    }> = {};

    const today = new Date().toISOString().split("T")[0];
    let todayCount = 0;

    activities.forEach((a: { user_id: string; completed: boolean; date: string; timestamp: string }) => {
      if (!userMap[a.user_id]) {
        userMap[a.user_id] = { total: 0, completed: 0, first: a.timestamp, last: a.timestamp };
      }
      userMap[a.user_id].total++;
      if (a.completed) userMap[a.user_id].completed++;
      if (a.timestamp < userMap[a.user_id].first) userMap[a.user_id].first = a.timestamp;
      if (a.timestamp > userMap[a.user_id].last) userMap[a.user_id].last = a.timestamp;
      if (a.date === today) todayCount++;
    });

    // Get user emails from auth (we'll use user_id as fallback)
    const userStats: UserStats[] = Object.entries(userMap).map(([uid, stats]) => ({
      user_id: uid,
      email: uid.substring(0, 8) + "...",
      total_activities: stats.total,
      completed_activities: stats.completed,
      first_activity: new Date(stats.first).toLocaleDateString(),
      last_activity: new Date(stats.last).toLocaleDateString(),
    }));

    const totalActivities = activities.length;
    const totalCompleted = activities.filter((a: { completed: boolean }) => a.completed).length;

    setAppStats({
      totalUsers: Object.keys(userMap).length,
      totalActivities,
      totalCompleted,
      completionRate: totalActivities > 0 ? Math.round((totalCompleted / totalActivities) * 100) : 0,
      activitiesToday: todayCount,
    });

    setUsers(userStats.sort((a, b) => b.total_activities - a.total_activities));
  }

  if (loading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-top">
            <div>
              <h1 className="app-title">Admin</h1>
              <p className="app-date">Loading...</p>
            </div>
          </div>
        </header>
        <main className="app-main" />
        <Navbar />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-top">
            <div>
              <h1 className="app-title">Access Denied</h1>
              <p className="app-date">You don&apos;t have admin privileges.</p>
            </div>
          </div>
        </header>
        <main className="app-main">
          <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              This page is only accessible to the app administrator.
            </p>
          </div>
        </main>
        <Navbar />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1 className="app-title">Admin Dashboard</h1>
            <p className="app-date">Manage DayLog</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="glass-card" style={{ padding: "1rem", borderColor: "rgba(239,68,68,0.3)" }}>
            <p style={{ color: "#fca5a5" }}>{error}</p>
          </div>
        )}

        {/* Overview Stats */}
        {appStats && (
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-num">{appStats.totalUsers}</span>
              <span className="admin-stat-label">Total Users</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-num">{appStats.totalActivities}</span>
              <span className="admin-stat-label">Total Activities</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-num">{appStats.completionRate}%</span>
              <span className="admin-stat-label">Completion Rate</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-num">{appStats.activitiesToday}</span>
              <span className="admin-stat-label">Today&apos;s Activities</span>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="section-header" style={{ marginTop: "1.5rem" }}>
          <h2 className="section-title">Users</h2>
          <span className="activity-count">{users.length} registered</span>
        </div>

        <div className="admin-users-list">
          {users.map((user) => (
            <div key={user.user_id} className="admin-user-card">
              <div className="admin-user-info">
                <div className="admin-user-avatar">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="admin-user-id">{user.user_id.substring(0, 12)}...</p>
                  <p className="admin-user-meta">
                    Joined {user.first_activity} · Last active {user.last_activity}
                  </p>
                </div>
              </div>
              <div className="admin-user-stats">
                <div className="admin-user-stat">
                  <span className="admin-user-stat-num">{user.total_activities}</span>
                  <span className="admin-user-stat-label">Activities</span>
                </div>
                <div className="admin-user-stat">
                  <span className="admin-user-stat-num">{user.completed_activities}</span>
                  <span className="admin-user-stat-label">Completed</span>
                </div>
                <div className="admin-user-stat">
                  <span className="admin-user-stat-num">
                    {user.total_activities > 0 ? Math.round((user.completed_activities / user.total_activities) * 100) : 0}%
                  </span>
                  <span className="admin-user-stat-label">Rate</span>
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)" }}>No users yet.</p>
            </div>
          )}
        </div>
      </main>

      <Navbar />
    </div>
  );
}
