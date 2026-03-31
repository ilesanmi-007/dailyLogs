"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

const CalendarView = dynamic(() => import("@/components/CalendarView"), {
  ssr: false,
});

export default function CalendarPage() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">DayLog</h1>
        <p className="app-subtitle">Calendar View</p>
      </header>

      <main className="app-main">
        <CalendarView />
      </main>

      <Navbar />
    </div>
  );
}
