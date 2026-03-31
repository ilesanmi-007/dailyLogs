"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [otp, setOtp] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
          },
        });
        if (error) throw error;
        setShowVerify(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });

      if (error) throw error;

      // Verification successful — user is now logged in automatically
      setSuccess("Account verified! Logging you in...");
      // The auth state listener in AuthProvider will pick up the session
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      setSuccess("A new code has been sent to your email!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Screen
  if (showVerify) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">DayLog</div>
          <div className="auth-verify-section">
            <span className="auth-verify-icon">🔐</span>
            <h2 className="auth-verify-title">Verify your email</h2>
            <p className="auth-verify-desc">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.
            </p>

            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="auth-field">
                <label>Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                    setOtp(val);
                  }}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="otp-input"
                  autoFocus
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}
              {success && <div className="auth-success">{success}</div>}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || otp.length !== 6}
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>

            <div className="auth-verify-footer">
              <span className="auth-footer-text">Didn&apos;t get the code?</span>
              <button
                className="auth-switch-btn"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend code
              </button>
            </div>

            <button
              className="auth-switch-btn"
              onClick={() => {
                setShowVerify(false);
                setIsLogin(true);
                setOtp("");
                setError("");
                setSuccess("");
              }}
              style={{ marginTop: "0.5rem" }}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">DayLog</div>
        <p className="auth-tagline">
          {isLogin ? "Welcome back" : "Start tracking your days"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required={!isLogin}
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isLogin
              ? "Log in"
              : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button
            className="auth-switch-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
