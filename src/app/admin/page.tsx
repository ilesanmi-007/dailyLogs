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
  pwa_installed?: boolean;
}

interface UserActivityStats {
  total: number;
  completed: number;
  skipped: number;
}

interface SignupEntry {
  date: string;
  count: number;
  users: string[];
}

interface AppStats {
  totalUsers: number;
  totalActivities: number;
  totalCompleted: number;
  completionRate: number;
  activitiesToday: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  pwaInstalls: number;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [userActivityMap, setUserActivityMap] = useState<Record<string, UserActivityStats>>({});
  const [appStats, setAppStats] = useState<AppStats | null>(null);
  const [signupTimeline, setSignupTimeline] = useState<SignupEntry[]>([]);
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

          // Build signup timeline and stats
          const now = new Date();
          const todayStr = now.toISOString().split("T")[0];
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          let signupsToday = 0;
          let signupsThisWeek = 0;
          let signupsThisMonth = 0;

          const dateMap: Record<string, string[]> = {};

          data.users.forEach((u: RegisteredUser) => {
            const createdDate = new Date(u.created_at);
            const dateKey = createdDate.toISOString().split("T")[0];
            const name = u.display_name || u.email.split("@")[0];

            if (!dateMap[dateKey]) dateMap[dateKey] = [];
            dateMap[dateKey].push(name);

            if (dateKey === todayStr) signupsToday++;
            if (createdDate >= weekAgo) signupsThisWeek++;
            if (createdDate >= monthStart) signupsThisMonth++;
          });

          // Create sorted timeline (last 30 days)
          const timeline: SignupEntry[] = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split("T")[0];
            timeline.push({
              date: key,
              count: dateMap[key]?.length || 0,
              users: dateMap[key] || [],
            });
          }
          setSignupTimeline(timeline);

          setAppStats({
            totalUsers: data.users.length,
            totalActivities,
            totalCompleted,
            completionRate: totalActivities > 0 ? Math.round((totalCompleted / totalActivities) * 100) : 0,
            activitiesToday: todayCount,
            signupsToday,
            signupsThisWeek,
            signupsThisMonth,
            pwaInstalls: data.pwaInstalls || 0,
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
          signupsToday: 0,
          signupsThisWeek: 0,
          signupsThisMonth: 0,
          pwaInstalls: 0,
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
            <div className="admin-stat-card">
              <span className="admin-stat-num">{appStats.pwaInstalls}</span>
              <span className="admin-stat-label">App Installs</span>
            </div>
          </div>
        )}

        {/* Signup Tracker */}
        {appStats && (
          <div className="signup-tracker">
            <div className="section-header" style={{ marginTop: "1.5rem" }}>
              <h2 className="section-title">Signup Tracker</h2>
              <span className="activity-count">Last 30 days</span>
            </div>

            <div className="signup-summary-row">
              <div className="signup-summary-item">
                <span className="signup-summary-num">{appStats.signupsToday}</span>
                <span className="signup-summary-label">Today</span>
              </div>
              <div className="signup-summary-item">
                <span className="signup-summary-num">{appStats.signupsThisWeek}</span>
                <span className="signup-summary-label">This Week</span>
              </div>
              <div className="signup-summary-item">
                <span className="signup-summary-num">{appStats.signupsThisMonth}</span>
                <span className="signup-summary-label">This Month</span>
              </div>
              <div className="signup-summary-item">
                <span className="signup-summary-num">{appStats.totalUsers}</span>
                <span className="signup-summary-label">All Time</span>
              </div>
            </div>

            <div className="signup-chart">
              {signupTimeline.map((entry) => {
                const maxCount = Math.max(...signupTimeline.map((e) => e.count), 1);
                const heightPct = entry.count > 0 ? Math.max((entry.count / maxCount) * 100, 8) : 0;
                const isToday = entry.date === new Date().toISOString().split("T")[0];
                const dayLabel = new Date(entry.date + "T12:00:00").toLocaleDateString("en", { weekday: "narrow" });
                const dateNum = new Date(entry.date + "T12:00:00").getDate();
                const showLabel = dateNum === 1 || dateNum % 5 === 0 || isToday;
                return (
                  <div
                    key={entry.date}
                    className={`signup-chart-bar-wrap ${isToday ? "is-today" : ""}`}
                    title={`${entry.date}: ${entry.count} signup${entry.count !== 1 ? "s" : ""}${entry.users.length > 0 ? "\n" + entry.users.join(", ") : ""}`}
                  >
                    <div className="signup-chart-bar-container">
                      {entry.count > 0 && (
                        <div
                          className="signup-chart-bar"
                          style={{ height: `${heightPct}%` }}
                        >
                          <span className="signup-chart-count">{entry.count}</span>
                        </div>
                      )}
                    </div>
                    {showLabel && (
                      <span className="signup-chart-label">
                        {isToday ? "Today" : `${dayLabel}${dateNum}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recent signups list */}
            {registeredUsers.filter((u) => {
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return new Date(u.created_at) >= weekAgo;
            }).length > 0 && (
              <div className="signup-recent">
                <p className="signup-recent-title">Recent Signups (7 days)</p>
                {registeredUsers
                  .filter((u) => {
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return new Date(u.created_at) >= weekAgo;
                  })
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((u) => (
                    <div key={u.id} className="signup-recent-item">
                      <div className="signup-recent-dot" />
                      <div>
                        <span className="signup-recent-name">{u.display_name}</span>
                        <span className="signup-recent-date">
                          {new Date(u.created_at).toLocaleDateString("en", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
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
                    <p className="admin-user-id">
                      {user.display_name}
                      {user.pwa_installed && (
                        <span className="pwa-badge" title="Installed PWA">📱</span>
                      )}
                    </p>
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
