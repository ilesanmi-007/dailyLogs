"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface LocalActivity {
  id: string;
  text: string;
  category: string;
  tags: string[];
  timestamp: string;
  date: string;
  completed: boolean;
}

const STORAGE_KEY = "daily-tracker-activities";

export default function MigratePage() {
  const [status, setStatus] = useState<string>("idle");
  const [localCount, setLocalCount] = useState<number>(0);
  const [migrated, setMigrated] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [...prev, msg]);
  };

  useEffect(() => {
    // Check how many activities are in localStorage
    let cancelled = false;
    const data = localStorage.getItem(STORAGE_KEY);
    if (data && !cancelled) {
      const activities = JSON.parse(data) as LocalActivity[];
      setLocalCount(activities.length); // eslint-disable-line react-hooks/set-state-in-effect
    }
    return () => { cancelled = true; };
  }, []);

  const handleMigrate = async () => {
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Add your env vars and restart.");
      return;
    }

    setStatus("signing_in");
    addLog("Signing in...");

    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "samsonademola56@gmail.com",
      password: "samson3451",
    });

    if (authError) {
      // If sign in fails, try signing up
      addLog("Sign in failed, trying to create account...");
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: "samsonademola56@gmail.com",
        password: "samson3451",
        options: {
          data: { display_name: "Ilesanmi" },
        },
      });

      if (signUpError) {
        setError(`Auth failed: ${signUpError.message}`);
        setStatus("error");
        return;
      }

      if (!signUpData.user) {
        setError("Account created but email confirmation may be required. Check your email and come back.");
        setStatus("error");
        return;
      }

      addLog(`Account created for ${signUpData.user.email}`);
    } else {
      addLog(`Signed in as ${authData.user?.email}`);
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Could not get user after authentication.");
      setStatus("error");
      return;
    }

    addLog(`User ID: ${user.id}`);

    // Read localStorage activities
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setError("No local activities found to migrate.");
      setStatus("error");
      return;
    }

    const localActivities = JSON.parse(raw) as LocalActivity[];
    addLog(`Found ${localActivities.length} activities in localStorage`);

    setStatus("migrating");

    // Insert in batches of 20
    let successCount = 0;
    const batchSize = 20;

    for (let i = 0; i < localActivities.length; i += batchSize) {
      const batch = localActivities.slice(i, i + batchSize).map((a) => ({
        text: a.text,
        category: a.category,
        tags: a.tags,
        timestamp: a.timestamp,
        date: a.date,
        completed: a.completed ?? false,
        user_id: user.id,
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from("activities")
        .insert(batch)
        .select();

      if (insertError) {
        addLog(`Error on batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        successCount += insertedData?.length || 0;
        setMigrated(successCount);
        addLog(`Migrated batch ${Math.floor(i / batchSize) + 1}: ${insertedData?.length || 0} activities`);
      }
    }

    addLog(`Migration complete! ${successCount}/${localActivities.length} activities migrated.`);
    setStatus("done");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)",
      padding: "2rem",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "2.5rem",
        maxWidth: "600px",
        width: "100%",
        backdropFilter: "blur(20px)",
      }}>
        <h1 style={{ color: "#fff", fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          🔄 Data Migration
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "2rem" }}>
          Migrate your local activities to your Supabase cloud account
        </p>

        <div style={{
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}>
          <p style={{ color: "#a5b4fc", margin: 0 }}>
            📦 Found <strong style={{ color: "#fff" }}>{localCount}</strong> activities in localStorage
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}>
            <p style={{ color: "#fca5a5", margin: 0 }}>{error}</p>
          </div>
        )}

        {status === "done" && (
          <div style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}>
            <p style={{ color: "#6ee7b7", margin: 0 }}>
              ✅ Successfully migrated <strong>{migrated}</strong> activities!
            </p>
          </div>
        )}

        {status !== "done" && (
          <button
            onClick={handleMigrate}
            disabled={status !== "idle" || localCount === 0}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "12px",
              border: "none",
              background: status === "idle" && localCount > 0
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: status === "idle" && localCount > 0 ? "pointer" : "not-allowed",
              marginBottom: "1.5rem",
            }}
          >
            {status === "idle" ? "Start Migration" :
             status === "signing_in" ? "Signing in..." :
             status === "migrating" ? `Migrating... (${migrated}/${localCount})` :
             "Processing..."}
          </button>
        )}

        {status === "done" && (
          <Link
            href="/"
            style={{
              display: "block",
              textAlign: "center",
              width: "100%",
              padding: "1rem",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to DayLog →
          </Link>
        )}

        {logMessages.length > 0 && (
          <div style={{
            marginTop: "1.5rem",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "12px",
            padding: "1rem",
            maxHeight: "250px",
            overflowY: "auto",
          }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Migration Log
            </p>
            {logMessages.map((msg, i) => (
              <p key={i} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", margin: "0.25rem 0", fontFamily: "monospace" }}>
                → {msg}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
