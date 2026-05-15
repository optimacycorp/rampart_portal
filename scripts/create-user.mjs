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
const password = readArg("--password");
const role = readArg("--role") ?? "viewer";
const fullName = readArg("--full-name") ?? "";
const organization = readArg("--organization") ?? "";
const validRoles = new Set(["owner", "audit", "engineer", "surveyor", "collaborator", "viewer"]);

if (!email || !password) {
  console.error(
    "Usage: npm run create-user -- --email user@example.com --password 'StrongPass123!' --role audit --full-name 'User Name' --organization 'Org'"
  );
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

const { data: userData, error: userError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true
});

if (userError || !userData.user) {
  console.error("Failed to create user:", userError?.message ?? "Unknown error");
  process.exit(1);
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: userData.user.id,
  full_name: fullName || email,
  role,
  organization: organization || null
});

if (profileError) {
  console.error("User created but profile upsert failed:", profileError.message);
  process.exit(1);
}

console.log(`Created user ${email} with role ${role}.`);
