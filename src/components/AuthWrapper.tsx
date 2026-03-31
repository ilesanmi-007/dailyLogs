"use client";

import { isSupabaseConfigured } from "@/lib/supabase";
import AuthProvider, { useAuth } from "./AuthProvider";
import AuthScreen from "./AuthScreen";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Skip auth entirely when Supabase isn't configured (localStorage mode)
  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">DayLog</div>
          <p className="auth-tagline">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip AuthProvider entirely when Supabase isn't configured
  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
