"use client";

import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

const ADMIN_EMAIL = "samsonademola56@gmail.com";

interface RegisteredUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  last_sign_in: string;
}

interface UserActivityStats {
  total: number;
  completed: number;
  skipped: number;
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
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [userActivityMap, setUserActivityMap] = useState<Record<string, UserActivityStats>>({});
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
    // Fetch activities (admin can see all via RLS policy)
    const { data: activities, error: fetchError } = await supabase
      .from("activities")
      .select("*")
      .order("timestamp", { ascending: false });

    if (fetchError) {
      setError(`Failed to load activities: ${fetchError.message}`);
    }

    // Compute per-user activity stats
    const activityMap: Record<string, UserActivityStats> = {};
    const today = new Date().toISOString().split("T")[0];
    let todayCount = 0;

    (activities || []).forEach((a: { user_id: string; completed: boolean; skipped: boolean; date: string }) => {
      if (!activityMap[a.user_id]) {
        activityMap[a.user_id] = { total: 0, completed: 0, skipped: 0 };
      }
      activityMap[a.user_id].total++;
      if (a.completed) activityMap[a.user_id].completed++;
      if (a.skipped) activityMap[a.user_id].skipped++;
      if (a.date === today) todayCount++;
    });

    setUserActivityMap(activityMap);

    const totalActivities = (activities || []).length;
    const totalCompleted = (activities || []).filter((a: { completed: boolean }) => a.completed).length;

    // Fetch registered users from API
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      try {
        const res = await fetch("/api/admin/users", {
          headers: { "x-admin-token": token },
        });
        const data = await res.json();
        if (data.users) {
          setRegisteredUsers(data.users);
          setAppStats({
            totalUsers: data.users.length,
            totalActivities,
            totalCompleted,
            completionRate: totalActivities > 0 ? Math.round((totalCompleted / totalActivities) * 100) : 0,
            activitiesToday: todayCount,
          });
        }
      } catch {
        // Fallback: count users from activities
        const uniqueUsers = new Set((activities || []).map((a: { user_id: string }) => a.user_id));
        setAppStats({
          totalUsers: uniqueUsers.size,
          totalActivities,
          totalCompleted,
          completionRate: totalActivities > 0 ? Math.round((totalCompleted / totalActivities) * 100) : 0,
          activitiesToday: todayCount,
        });
      }
    }
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
          <span className="activity-count">{registeredUsers.length} registered</span>
        </div>

        <div className="admin-users-list">
          {registeredUsers.map((user) => {
            const stats = userActivityMap[user.id] || { total: 0, completed: 0, skipped: 0 };
            const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            return (
              <div key={user.id} className="admin-user-card">
                <div className="admin-user-info">
                  <div className="admin-user-avatar">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="admin-user-id">{user.display_name}</p>
                    <p className="admin-user-meta">
                      {user.email} · Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                    {user.last_sign_in && (
                      <p className="admin-user-meta">
                        Last seen {new Date(user.last_sign_in).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="admin-user-stats">
                  <div className="admin-user-stat">
                    <span className="admin-user-stat-num">{stats.total}</span>
                    <span className="admin-user-stat-label">Activities</span>
                  </div>
                  <div className="admin-user-stat">
                    <span className="admin-user-stat-num">{stats.completed}</span>
                    <span className="admin-user-stat-label">Completed</span>
                  </div>
                  <div className="admin-user-stat">
                    <span className="admin-user-stat-num">{stats.skipped}</span>
                    <span className="admin-user-stat-label">Skipped</span>
                  </div>
                  <div className="admin-user-stat">
                    <span className="admin-user-stat-num">{rate}%</span>
                    <span className="admin-user-stat-label">Rate</span>
                  </div>
                </div>
              </div>
            );
          })}

          {registeredUsers.length === 0 && (
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
