"use client";

import { useState, useMemo, useCallback } from "react";

const GREETINGS = [
  "Fresh day, fresh start!",
  "New day, new wins!",
  "Today is yours to conquer!",
  "Rise & shine — let's go!",
  "A brand new chapter begins!",
  "Make today count!",
  "Good vibes only today!",
  "Ready to crush it?",
  "Your day starts now!",
  "Let's make it happen!",
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function shouldShowCelebration(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    const lastCelebration = sessionStorage.getItem("daylog-last-celebration");
    if (lastCelebration !== todayKey) {
      sessionStorage.setItem("daylog-last-celebration", todayKey);
      return true;
    }
  } catch {
    // sessionStorage unavailable
  }
  return false;
}

// Pre-computed confetti data (module-level, avoids Math.random in render)
function buildParticles() {
  const colors = ["#7c3aed", "#a78bfa", "#f59e0b", "#10b981", "#ec4899", "#06b6d4", "#fff"];
  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: (i * 3.33 + (i % 7) * 9.1) % 100,
    delay: (i * 0.027) % 0.8,
    duration: 1.5 + ((i * 0.37) % 1.5),
    size: 4 + ((i * 1.3) % 6),
    heightRatio: 0.5 + ((i * 0.17) % 0.5),
    color: colors[i % colors.length],
    rotation: (i * 51.4) % 360,
    drift: -20 + ((i * 5.7) % 40),
  }));
}

const PARTICLES = buildParticles();

function pickGreeting(): string {
  // Use day-of-year as seed so it's deterministic per day
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return GREETINGS[dayOfYear % GREETINGS.length];
}

export default function NewDayCelebration({ displayName }: { displayName: string }) {
  const [visible, setVisible] = useState(shouldShowCelebration);
  const greeting = useMemo(() => pickGreeting(), []);
  const timeGreeting = useMemo(() => getTimeGreeting(), []);

  // Auto-dismiss timer
  useMemo(() => {
    if (visible && typeof window !== "undefined") {
      setTimeout(() => setVisible(false), 4500);
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="celebration-overlay" onClick={handleDismiss}>
      <div className="celebration-container">
        {/* Confetti particles */}
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="confetti-particle"
            style={{
              left: `${p.x}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              width: `${p.size}px`,
              height: `${p.size * p.heightRatio}px`,
              backgroundColor: p.color,
            }}
          />
        ))}

        {/* Main card */}
        <div className="celebration-card">
          <div className="celebration-glow" />

          <div className="celebration-emoji-row">
            <span className="celebration-emoji bounce-1">🌅</span>
            <span className="celebration-emoji bounce-2">✨</span>
            <span className="celebration-emoji bounce-3">🚀</span>
          </div>

          <h2 className="celebration-greeting">
            {timeGreeting}, {displayName}!
          </h2>

          <p className="celebration-message">{greeting}</p>

          <div className="celebration-date-pill">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>

          <p className="celebration-tap">tap anywhere to start your day</p>
        </div>
      </div>
    </div>
  );
}
