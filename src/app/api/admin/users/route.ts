import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET(request: Request) {
  // Check for admin auth token in header
  const authHeader = request.headers.get("x-admin-token");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the requesting user is admin
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);
  if (authError || !user || user.email !== "samsonademola56@gmail.com") {
    return NextResponse.json({ error: "Not admin" }, { status: 403 });
  }

  // Fetch all registered users
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const users = (usersData?.users || []).map((u) => ({
    id: u.id,
    email: u.email || "No email",
    display_name: u.user_metadata?.display_name || u.email?.split("@")[0] || "Unknown",
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
  }));

  return NextResponse.json({ users });
}
