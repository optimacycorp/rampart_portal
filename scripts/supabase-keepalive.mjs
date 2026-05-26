import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  const cwd = process.cwd();
  for (const fileName of [".env.local", ".env"]) {
    loadEnvFile(path.join(cwd, fileName));
  }
}

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--project-slug") {
      result.projectSlug = argv[index + 1];
      index += 1;
    } else if (arg === "--write-storage") {
      result.writeStorage = true;
    } else if (arg === "--json") {
      result.json = true;
    }
  }

  return result;
}

function toBoolean(value) {
  return /^(1|true|yes|on)$/i.test(`${value ?? ""}`.trim());
}

function summarizeError(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || JSON.stringify(error);
}

async function main() {
  loadLocalEnv();

  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectSlug = args.projectSlug || process.env.SUPABASE_KEEPALIVE_PROJECT_SLUG || null;
  const shouldWriteStorage =
    args.writeStorage || toBoolean(process.env.SUPABASE_KEEPALIVE_STORAGE_WRITE);
  const keepaliveSource = process.env.SUPABASE_KEEPALIVE_SOURCE || "racknerd-cron";
  const storageProbeBucket = process.env.SUPABASE_KEEPALIVE_STORAGE_BUCKET || "exports";
  const retentionDays = Number(process.env.SUPABASE_KEEPALIVE_RETENTION_DAYS || "45");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load .env.local or export the variables before running."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const results = [];
  let hadCriticalFailure = false;
  let targetProject = null;

  async function probe(name, fn, { optional = false } = {}) {
    const probeStartedAt = Date.now();

    try {
      const detail = await fn();
      results.push({
        name,
        status: "ok",
        durationMs: Date.now() - probeStartedAt,
        detail
      });
      return detail;
    } catch (error) {
      const detail = summarizeError(error);
      results.push({
        name,
        status: optional ? "warning" : "error",
        durationMs: Date.now() - probeStartedAt,
        detail
      });

      if (!optional) {
        hadCriticalFailure = true;
      }

      return null;
    }
  }

  await probe("projects-read", async () => {
    let query = supabase.from("projects").select("id, slug, name", { count: "exact" }).limit(5);

    if (projectSlug) {
      query = query.eq("slug", projectSlug);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    targetProject = data?.[0] ?? null;

    return {
      requestedProjectSlug: projectSlug,
      count,
      sample: data?.[0] ?? null
    };
  });

  const projectScopedTables = [
    "documents",
    "reviewer_comments",
    "field_points",
    "culverts",
    "access_logs",
    "evidence_photos",
    "meeting_transcripts",
    "lidar_scans",
    "project_plans",
    "project_tasks",
    "document_chunks"
  ];

  for (const tableName of projectScopedTables) {
    await probe(`${tableName}-read`, async () => {
      let query = supabase.from(tableName).select("*", { count: "exact" }).limit(1);

      if (targetProject?.id) {
        query = query.eq("project_id", targetProject.id);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        table: tableName,
        projectScoped: Boolean(targetProject?.id),
        count,
        sampleKeys: data?.[0] ? Object.keys(data[0]).slice(0, 8) : []
      };
    }, { optional: tableName === "project_tasks" || tableName === "document_chunks" });
  }

  await probe("auth-admin-read", async () => {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (error) {
      throw error;
    }

    return {
      userCount: data?.users?.length ?? 0,
      sampleEmail: data?.users?.[0]?.email ?? null
    };
  }, { optional: true });

  let bucketNames = [];

  await probe("storage-buckets-read", async () => {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    bucketNames = (data ?? []).map((bucket) => bucket.name);

    return {
      bucketCount: bucketNames.length,
      buckets: bucketNames
    };
  });

  const expectedBuckets = [
    "project-documents",
    "field-photos",
    "lidar-scans",
    "exports",
    "meeting-media",
    "project-plans"
  ];

  for (const bucketName of expectedBuckets) {
    await probe(`storage-list-${bucketName}`, async () => {
      const { data, error } = await supabase.storage.from(bucketName).list("", {
        limit: 5,
        sortBy: { column: "name", order: "asc" }
      });

      if (error) {
        throw error;
      }

      return {
        bucket: bucketName,
        availableInBucketList: bucketNames.includes(bucketName),
        itemCountReturned: data?.length ?? 0
      };
    }, { optional: !bucketNames.includes(bucketName) });
  }

  await probe("keepalive-heartbeat-write", async () => {
    const payload = {
      source: keepaliveSource,
      status: hadCriticalFailure ? "degraded" : "ok",
      details: {
        host: os.hostname(),
        node: process.version,
        projectSlug: projectSlug ?? targetProject?.slug ?? null,
        startedAt: startedAt.toISOString()
      }
    };

    const { error: insertError } = await supabase
      .from("system_keepalive_events")
      .insert(payload);

    if (insertError) {
      throw insertError;
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const { error: cleanupError } = await supabase
      .from("system_keepalive_events")
      .delete()
      .lt("ran_at", cutoff);

    if (cleanupError) {
      throw cleanupError;
    }

    return {
      source: keepaliveSource,
      retentionDays
    };
  }, { optional: true });

  if (shouldWriteStorage) {
    await probe("storage-write-delete-probe", async () => {
      const objectPath = `keepalive/${keepaliveSource}/${startedAt.toISOString().slice(0, 10)}.json`;
      const body = Buffer.from(
        JSON.stringify(
          {
            source: keepaliveSource,
            host: os.hostname(),
            ranAt: startedAt.toISOString()
          },
          null,
          2
        ),
        "utf8"
      );

      const { error: uploadError } = await supabase.storage
        .from(storageProbeBucket)
        .upload(objectPath, body, {
          contentType: "application/json",
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: removeError } = await supabase.storage
        .from(storageProbeBucket)
        .remove([objectPath]);

      if (removeError) {
        throw removeError;
      }

      return {
        bucket: storageProbeBucket,
        objectPath
      };
    }, { optional: true });
  }

  const summary = {
    source: keepaliveSource,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    projectSlug: projectSlug ?? targetProject?.slug ?? null,
    hadCriticalFailure,
    results
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Supabase keepalive summary (${summary.startedAt})`);
    for (const result of results) {
      console.log(
        `- [${result.status.toUpperCase()}] ${result.name} (${result.durationMs}ms): ${
          typeof result.detail === "string" ? result.detail : JSON.stringify(result.detail)
        }`
      );
    }
  }

  process.exit(hadCriticalFailure ? 1 : 0);
}

main().catch((error) => {
  console.error("Supabase keepalive failed", error);
  process.exit(1);
});
