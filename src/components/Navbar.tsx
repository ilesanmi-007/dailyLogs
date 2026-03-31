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

export default function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email === ADMIN_EMAIL) {
          setIsAdmin(true);
        }
      });
    }
  }, []);

  const allItems = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: "⚙️" }]
    : navItems;

  return (
    <>
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
