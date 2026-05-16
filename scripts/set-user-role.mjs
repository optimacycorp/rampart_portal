import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

loadEnvFile();

const email = readArg("--email") ?? readArg("--user-id");
const role = readArg("--role");
const validRoles = new Set(["owner", "audit", "engineer", "surveyor", "collaborator", "viewer"]);

if (!email || !role) {
  console.error("Usage: npm run set-user-role -- --email user@example.com --role owner");
  process.exit(1);
}

if (!validRoles.has(role)) {
  console.error(`Invalid role '${role}'. Expected one of: ${Array.from(validRoles).join(", ")}`);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findUserByEmail(targetEmail) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((entry) => entry.email?.toLowerCase() === targetEmail.toLowerCase());

    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

const user = await findUserByEmail(email);

if (!user) {
  console.error(`No auth user found for ${email}.`);
  process.exit(1);
}

const { error } = await supabase.from("profiles").upsert({
  id: user.id,
  full_name: user.user_metadata?.full_name ?? user.email ?? email,
  role,
  organization: user.user_metadata?.organization ?? null
});

if (error) {
  console.error("Failed to update profile role:", error.message);
  process.exit(1);
}

console.log(`Updated ${email} to role ${role}.`);
