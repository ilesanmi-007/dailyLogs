"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

const StatsView = dynamic(() => import("@/components/StatsView"), {
  ssr: false,
});

export default function StatsPage() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">DayLog</h1>
        <p className="app-subtitle">Your Stats</p>
      </header>

      <main className="app-main">
        <StatsView />
      </main>

      <Navbar />
    </div>
  );
}
