import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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

// Pull a value from a row by any of several accepted header names (case-insensitive).
function pick(row: Record<string, any>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) return String(row[k] ?? "").trim();
  }
  return "";
}

// Parse a skills cell like "Data Analysis:4, SQL (5); Coaching" into [{name, proficiency}].
function parseSkills(raw: string): { name: string; proficiency: number }[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]+/)
    .map((tok) => tok.trim())
    .filter(Boolean)
    .map((tok) => {
      const m = tok.match(/^(.*?)(?:\s*[:(]\s*([1-5])\s*\)?)\s*$/);
      if (m) return { name: m[1].trim(), proficiency: parseInt(m[2], 10) };
      return { name: tok, proficiency: 3 };
    })
    .filter((s) => s.name.length > 0);
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

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin access required" }, 403);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return json({ error: "No file provided" }, 400);

    const buf = new Uint8Array(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const parsed = rows
      .map((r) => ({
        name: pick(r, ["name", "full name", "fullname"]),
        role: pick(r, ["role", "role title", "title", "job title"]),
        email: pick(r, ["email", "e-mail"]),
        skills: parseSkills(pick(r, ["skills", "skill", "associated skills"])),
      }))
      .filter((p) => p.name.length > 0);

    if (parsed.length === 0) {
      return json({ error: "No rows with a Name found. Expected columns: Name, Role, Email (optional), Skills." }, 400);
    }

    // Resolve skill names against the taxonomy (case-insensitive); create any that are missing.
    const { data: existingSkills } = await admin.from("skills").select("id, name");
    const skillMap = new Map<string, string>(); // lower(name) -> id
    (existingSkills ?? []).forEach((s: any) => skillMap.set(s.name.toLowerCase(), s.id));

    const wantedNames = new Set<string>();
    parsed.forEach((p) => p.skills.forEach((s) => wantedNames.add(s.name)));
    const missing = [...wantedNames].filter((n) => !skillMap.has(n.toLowerCase()));
    let createdCount = 0;
    if (missing.length > 0) {
      const { data: inserted } = await admin
        .from("skills")
        .insert(missing.map((name) => ({ name })))
        .select("id, name");
      (inserted ?? []).forEach((s: any) => { skillMap.set(s.name.toLowerCase(), s.id); createdCount++; });
    }

    // OVERWRITE: clear the existing directory (people_skills cascade-deletes).
    await admin.from("people").delete().not("id", "is", null);

    // Insert the new people; PostgREST returns them in insertion order.
    const { data: newPeople, error: insErr } = await admin
      .from("people")
      .insert(parsed.map((p) => ({ name: p.name, role_title: p.role || null, email: p.email || null })))
      .select("id");
    if (insErr) return json({ error: "Failed to insert people: " + insErr.message }, 400);

    // Build and insert people_skills, de-duplicating per person.
    const psRows: { person_id: string; skill_id: string; proficiency: number }[] = [];
    parsed.forEach((p, i) => {
      const personId = (newPeople as any[])[i]?.id;
      if (!personId) return;
      const seen = new Set<string>();
      p.skills.forEach((s) => {
        const skillId = skillMap.get(s.name.toLowerCase());
        if (skillId && !seen.has(skillId)) {
          seen.add(skillId);
          psRows.push({ person_id: personId, skill_id: skillId, proficiency: s.proficiency });
        }
      });
    });
    if (psRows.length > 0) {
      await admin.from("people_skills").insert(psRows);
    }

    return json({
      people_imported: parsed.length,
      skill_links: psRows.length,
      skills_created: createdCount,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
