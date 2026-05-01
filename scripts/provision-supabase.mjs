import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API_BASE = "https://api.supabase.com/v1";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectName = process.env.SUPABASE_NEW_PROJECT_NAME ?? "myinventoryapp-web-v1";
const region = process.env.SUPABASE_REGION ?? "us-east-1";
const dbPass = process.env.SUPABASE_DB_PASSWORD ?? randomPassword();

if (!token) {
  throw new Error("Missing SUPABASE_ACCESS_TOKEN.");
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path} failed (${response.status}): ${text}`,
    );
  }

  return body;
}

function randomPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%*-_=+";
  let output = "";
  for (let index = 0; index < 28; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

function upsertEnv(file, values) {
  let text = readFileSync(file, "utf8");
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    text = pattern.test(text)
      ? text.replace(pattern, line)
      : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(file, text);
}

async function listOrganizations() {
  const orgs = await api("/organizations");
  if (!Array.isArray(orgs) || orgs.length === 0) {
    throw new Error("No Supabase organizations are available for this token.");
  }
  return orgs;
}

async function createProject(organizationId) {
  return api("/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: organizationId,
      name: projectName,
      region,
      db_pass: dbPass,
    }),
  });
}

async function waitForProject(ref) {
  for (let attempt = 1; attempt <= 80; attempt += 1) {
    const project = await api(`/projects/${ref}`);
    const status = project.status ?? "unknown";
    console.log(`Project ${ref} status: ${status}`);

    if (["ACTIVE_HEALTHY", "ACTIVE", "RUNNING"].includes(status)) {
      return project;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 15_000));
  }

  throw new Error(`Timed out waiting for project ${ref} to become active.`);
}

async function runSql(ref, query) {
  return api(`/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({
      query,
      read_only: false,
    }),
  });
}

async function getLegacyKeys(ref) {
  const candidates = [
    `/projects/${ref}/api-keys/legacy`,
    `/projects/${ref}/api-keys`,
  ];

  for (const path of candidates) {
    try {
      const result = await api(path);
      const keys = Array.isArray(result) ? result : result?.api_keys;
      if (Array.isArray(keys)) {
        return keys;
      }
    } catch (error) {
      console.warn(`Could not read ${path}: ${error.message}`);
    }
  }

  throw new Error("Could not read project API keys from the Management API.");
}

function pickKey(keys, role) {
  const key = keys.find(
    (candidate) =>
      candidate.name === role ||
      candidate.role === role ||
      candidate.api_key?.includes(role) ||
      candidate.key?.includes(role),
  );

  return key?.api_key ?? key?.key ?? key?.value;
}

async function setNetlifyEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    const args = ["env:set", key, value, "--context", "production", "--force"];
    if (["SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"].includes(key)) {
      args.push("--secret");
    }
    execFileSync("netlify", args, {
      cwd: resolve("web"),
      stdio: "inherit",
    });
  }
}

const orgs = await listOrganizations();
const organization = orgs[0];
const organizationId = organization.id ?? organization.slug;

console.log(`Using Supabase organization: ${organization.name ?? organizationId}`);
console.log(`Creating new project: ${projectName} (${region})`);

const created = await createProject(organizationId);
const ref = created.ref;

if (!ref) {
  throw new Error(`Create project response did not include a ref: ${JSON.stringify(created)}`);
}

await waitForProject(ref);

console.log("Applying v7 migration...");
const migration = readFileSync("My_Inventory_App_v7_migration.sql", "utf8");
await runSql(ref, migration);

console.log("Fetching project API keys...");
const keys = await getLegacyKeys(ref);
const anonKey = pickKey(keys, "anon");
const serviceRoleKey = pickKey(keys, "service_role");

if (!anonKey || !serviceRoleKey) {
  throw new Error(`Missing anon/service_role keys in API response: ${JSON.stringify(keys)}`);
}

const envValues = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_DB_PASSWORD: dbPass,
  SUPABASE_PROJECT_REF: ref,
};

upsertEnv(resolve("web/.env.local"), envValues);
await setNetlifyEnv(envValues);

console.log("Done.");
console.log(`Project ref: ${ref}`);
console.log(`Project URL: https://${ref}.supabase.co`);
console.log("Updated web/.env.local and Netlify production env vars.");
