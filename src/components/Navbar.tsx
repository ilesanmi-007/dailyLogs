"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "samsonademola56@gmail.com";

const navItems = [
  { href: "/", label: "Today", icon: "📝" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/stats", label: "Stats", icon: "📊" },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email === ADMIN_EMAIL) {
          setIsAdmin(true);
        }
      });
    }

    // Capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Only show banner if not already dismissed
      const dismissed = sessionStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Track when app is actually installed
    const installHandler = () => {
      if (isSupabaseConfigured) {
        supabase.auth.updateUser({
          data: { pwa_installed: true, pwa_installed_at: new Date().toISOString() },
        });
      }
    };
    window.addEventListener("appinstalled", installHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  const allItems = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: "⚙️" }]
    : navItems;

  return (
    <>
      {/* Install App Banner */}
      {showInstallBanner && (
        <div className="install-banner">
          <div className="install-banner-content">
            <span className="install-banner-text">
              📱 Install DayLog as an app
            </span>
            <div className="install-banner-actions">
              <button className="install-banner-btn" onClick={handleInstall}>
                Install
              </button>
              <button className="install-banner-dismiss" onClick={dismissBanner}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="app-footer">
        <span className="footer-text">Built by <strong>Ilesanmi</strong></span>
      </footer>
      <nav className="navbar">
        {allItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? "active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
