import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify the caller from their JWT.
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    // Only admins may provision accounts.
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin access required" }, 403);

    const { email, password, full_name, role } = await req.json();
    if (!email || !password) return json({ error: "Email and a temporary password are required" }, 400);
    if (String(password).length < 8) return json({ error: "Temporary password must be at least 8 characters" }, 400);

    // Create the account, pre-confirmed so the new user can sign in immediately.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });
    if (createErr) return json({ error: createErr.message }, 400);

    // The handle_new_user trigger already created the profile + 'interviewer' role.
    // Grant an elevated role only if explicitly requested.
    if (role && role !== "interviewer" && ["admin", "hiring_manager"].includes(role)) {
      await admin.from("user_roles").insert({ user_id: created.user!.id, role });
    }

    return json({ user: { id: created.user!.id, email: created.user!.email } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
