import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

function normalizeString(value) {
  return `${value ?? ""}`.trim();
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ADDRESS_FIXTURES = [
  {
    canonical: "3245 Rampart Range Rd, Colorado Springs, CO 80919",
    city: "Colorado Springs",
    state: "CO",
    zip: "80919"
  },
  {
    canonical: "30 E Pikes Peak Ave, Colorado Springs, CO 80903",
    city: "Colorado Springs",
    state: "CO",
    zip: "80903"
  },
  {
    canonical: "1675 W Garden of the Gods Rd, Colorado Springs, CO 80907",
    city: "Colorado Springs",
    state: "CO",
    zip: "80907"
  },
  {
    canonical: "101 W Costilla St, Colorado Springs, CO 80903",
    city: "Colorado Springs",
    state: "CO",
    zip: "80903"
  },
  {
    canonical: "565 Space Center Dr, Colorado Springs, CO 80915",
    city: "Colorado Springs",
    state: "CO",
    zip: "80915"
  },
  {
    canonical: "1 Olympic Plaza, Colorado Springs, CO 80909",
    city: "Colorado Springs",
    state: "CO",
    zip: "80909"
  },
  {
    canonical: "231 N Tejon St, Colorado Springs, CO 80903",
    city: "Colorado Springs",
    state: "CO",
    zip: "80903"
  },
  {
    canonical: "101 N Cascade Ave, Colorado Springs, CO 80903",
    city: "Colorado Springs",
    state: "CO",
    zip: "80903"
  }
];

function makeMessyAddressInput(fixture) {
  const variants = [
    fixture.canonical,
    fixture.canonical.toLowerCase(),
    fixture.canonical.replaceAll(",", ""),
    fixture.canonical
      .replace("Road", "Rd")
      .replace("Avenue", "Ave")
      .replace("Street", "St")
      .replace("Drive", "Dr"),
    fixture.canonical.replace("Colorado Springs", "COS"),
    `${fixture.canonical.split(",")[0]} ${fixture.city} ${fixture.state}`,
    `${fixture.canonical.split(",")[0]} ${fixture.zip}`,
    `${fixture.canonical.split(",")[0].replaceAll(" ", "  ")} ${fixture.city} ${fixture.state} ${fixture.zip}`,
    fixture.canonical.replaceAll("o", "").replaceAll("O", ""),
    fixture.canonical.replace("Colorado Springs", "Colorado Spgs")
  ];

  return randomItem(variants);
}

async function postJson(url, body, sharedSecret) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sharedSecret}`,
      "x-caller-system": "racknerd-address-cron"
    },
    body: JSON.stringify(body)
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

async function main() {
  loadLocalEnv();

  const baseUrl = normalizeString(process.env.ADDRESS_API_BASE_URL || "http://127.0.0.1:3005");
  const sharedSecret = normalizeString(process.env.ADDRESS_API_SHARED_SECRET);

  if (!sharedSecret) {
    console.error("ADDRESS_API_SHARED_SECRET is required.");
    process.exit(1);
  }

  const fixture = randomItem(ADDRESS_FIXTURES);
  const searchQuery = makeMessyAddressInput(fixture);
  const runStartedAt = new Date().toISOString();

  const searchUrl = `${baseUrl.replace(/\/$/, "")}/api/address/search`;
  const validateUrl = `${baseUrl.replace(/\/$/, "")}/api/address/validate`;

  const searchResponse = await postJson(
    searchUrl,
    {
      query: searchQuery,
      limit: randomInt(3, 6)
    },
    sharedSecret
  );

  await sleep(randomInt(250, 1250));

  const validateInput =
    searchResponse.payload?.candidates?.[0]?.formatted ||
    fixture.canonical;

  const validateResponse = await postJson(
    validateUrl,
    {
      input: validateInput
    },
    sharedSecret
  );

  const summary = {
    startedAt: runStartedAt,
    baseUrl,
    canonicalFixture: fixture.canonical,
    searchQuery,
    searchStatus: searchResponse.status,
    searchCandidateCount: searchResponse.payload?.candidates?.length ?? 0,
    validateInput,
    validateStatus: validateResponse.status,
    validatedAddress: validateResponse.payload?.formatted ?? null
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!searchResponse.ok || !validateResponse.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Address API exercise failed", error);
  process.exit(1);
});
