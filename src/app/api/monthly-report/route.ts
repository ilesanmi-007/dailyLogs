import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// This endpoint is called by Vercel Cron on the 1st of each month
// It sends a simple monthly summary email to each user

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const cronSecret = process.env.CRON_SECRET || "";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  if (!resendApiKey) {
    return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 });
  }

  // Create admin Supabase client with service role key
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Get the previous month's date range
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const monthName = firstDayLastMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const startDate = firstDayLastMonth.toISOString().split("T")[0];
  const endDate = lastDayLastMonth.toISOString().split("T")[0];

  // Fetch all activities for last month
  const { data: activities, error: fetchError } = await supabaseAdmin
    .from("activities")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Group by user_id
  const userActivities: Record<string, typeof activities> = {};
  (activities || []).forEach((a) => {
    if (!userActivities[a.user_id]) userActivities[a.user_id] = [];
    userActivities[a.user_id].push(a);
  });

  // Fetch user emails from auth
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const userEmails: Record<string, string> = {};
  (usersData?.users || []).forEach((u) => {
    if (u.email) userEmails[u.id] = u.email;
  });

  const results: { email: string; status: string }[] = [];

  // Send email to each user
  for (const [userId, acts] of Object.entries(userActivities)) {
    const email = userEmails[userId];
    if (!email) continue;

    const total = acts.length;
    const completed = acts.filter((a) => a.completed).length;
    const skipped = acts.filter((a) => a.skipped).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeDays = new Set(acts.map((a) => a.date)).size;

    // Build simple summary email
    const htmlBody = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; background: #0f0f1a; color: #eeeef3; padding: 2rem; border-radius: 16px;">
        <h1 style="font-size: 1.5rem; margin: 0 0 0.25rem; background: linear-gradient(135deg, #a78bfa, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">DayLog</h1>
        <p style="color: #a0a0b8; margin: 0 0 1.5rem; font-size: 0.85rem;">Your ${monthName} Summary</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #a78bfa;">${total}</div>
            <div style="font-size: 0.7rem; color: #55556a; text-transform: uppercase; letter-spacing: 0.05em;">Activities</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #10b981;">${completionRate}%</div>
            <div style="font-size: 0.7rem; color: #55556a; text-transform: uppercase; letter-spacing: 0.05em;">Completed</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #6366f1;">${activeDays}</div>
            <div style="font-size: 0.7rem; color: #55556a; text-transform: uppercase; letter-spacing: 0.05em;">Active Days</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1rem; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #f59e0b;">${skipped}</div>
            <div style="font-size: 0.7rem; color: #55556a; text-transform: uppercase; letter-spacing: 0.05em;">Skipped</div>
          </div>
        </div>

        <p style="color: #a0a0b8; font-size: 0.85rem; line-height: 1.6; margin-bottom: 1.5rem;">
          ${completionRate >= 80 ? "Amazing work! You crushed it this month. Keep the momentum going!" :
            completionRate >= 50 ? "Solid month! You're making good progress. Let's aim even higher next month!" :
            "Every step counts. A new month is a fresh start — you've got this!"}
        </p>

        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://mydaylylog.vercel.app'}"
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6366f1); color: #fff; padding: 0.65rem 1.5rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.85rem;">
            View Full Stats
          </a>
        </div>

        <p style="color: #55556a; font-size: 0.65rem; text-align: center; margin-top: 1.5rem;">
          Built by Ilesanmi
        </p>
      </div>
    `;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DayLog <onboarding@resend.dev>",
          to: email,
          subject: `Your DayLog Summary for ${monthName}`,
          html: htmlBody,
        }),
      });

      const result = await res.json();
      results.push({ email, status: res.ok ? "sent" : result.message || "failed" });
    } catch (err) {
      results.push({ email, status: `error: ${err}` });
    }
  }

  return NextResponse.json({
    month: monthName,
    usersSent: results.length,
    results,
  });
}
