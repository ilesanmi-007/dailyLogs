"use client";

import { useState, useEffect } from "react";

const SPARKLES = [
  { emoji: "✨", delay: 0, x: 20, y: 30 },
  { emoji: "🌟", delay: 0.15, x: 70, y: 20 },
  { emoji: "⭐", delay: 0.3, x: 45, y: 15 },
  { emoji: "💫", delay: 0.1, x: 85, y: 35 },
  { emoji: "✨", delay: 0.25, x: 15, y: 50 },
  { emoji: "🌟", delay: 0.4, x: 60, y: 45 },
  { emoji: "⭐", delay: 0.2, x: 35, y: 55 },
  { emoji: "💫", delay: 0.35, x: 80, y: 50 },
  { emoji: "✨", delay: 0.05, x: 50, y: 25 },
  { emoji: "🌟", delay: 0.45, x: 25, y: 40 },
];

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

export default function NewDayCelebration({ displayName }: { displayName: string }) {
  const [show, setShow] = useState(false);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    // Check if we already showed the celebration today
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    const lastCelebration = sessionStorage.getItem("daylog-last-celebration");

    if (lastCelebration !== todayKey) {
      setShow(true);
      sessionStorage.setItem("daylog-last-celebration", todayKey);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setShow(false), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="celebration-overlay" onClick={() => setShow(false)}>
      <div className="celebration-container">
        {/* Floating sparkles */}
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            className="celebration-sparkle"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              animationDelay: `${s.delay}s`,
            }}
          >
            {s.emoji}
          </span>
        ))}

        {/* Main content */}
        <div className="celebration-content">
          <div className="celebration-sun">🌅</div>
          <h2 className="celebration-greeting">{getTimeGreeting()}, {displayName}!</h2>
          <p className="celebration-message">{greeting}</p>
          <div className="celebration-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
