import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import {
  businessInput,
  businessResponse,
  type BusinessInput,
  type BusinessReport,
} from "./business-types";
import { publicUrl } from "../opportunities/retrieval";
const run = promisify(execFile);
const state = globalThis as typeof globalThis & {
  businessResearch?: { nextRun: number; reports: Map<string, BusinessReport> };
};
const cache: { nextRun: number; reports: Map<string, BusinessReport> } =
  (state.businessResearch ??= {
    nextRun: 0,
    reports: new Map<string, BusinessReport>(),
  });
export function businessWebsite(value: string) {
  try {
    return publicUrl(value).href;
  } catch {
    return null;
  }
}
export function websiteKey(value: string) {
  const u = new URL(value);
  return (
    u.hostname.toLowerCase().replace(/^www\./, "") +
    u.pathname.replace(/\/$/, "")
  );
}
export async function runBusinessReader(input: BusinessInput) {
  // Fixed executable/script, enumerated args, shell disabled. Child never receives DATABASE_URL or AI credentials.
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const key of [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE",
    "SSL_CERT_FILE",
  ])
    if (process.env[key]) env[key] = process.env[key];
  const result = await run(
    "python",
    [
      path.join(process.cwd(), "scripts", "discover-businesses.py"),
      input.area,
      input.trade,
    ],
    {
      cwd: process.cwd(),
      env,
      shell: false,
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 512 * 1024,
    },
  );
  return JSON.parse(result.stdout);
}
export async function discoverBusinesses(
  raw: unknown,
  reader = runBusinessReader,
) {
  const input = businessInput.parse(raw);
  if (Date.now() < cache.nextRun)
    throw new Error("Wait 60 seconds between business discovery runs.");
  cache.nextRun = Date.now() + 60000;
  const data = businessResponse.parse(await reader(input));
  // Catalogue tags are assertions, not independent website/contact verification.
  data.businesses = data.businesses.map((b) => ({
    ...b,
    websites: b.websites.map(businessWebsite).filter((s): s is string => !!s),
  }));
  const report: BusinessReport = {
    ...data,
    input,
    checkedAt: new Date().toISOString(),
    token: randomUUID(),
  };
  for (const [key, r] of cache.reports)
    if (Date.now() - Date.parse(r.checkedAt) > 600000)
      cache.reports.delete(key);
  if (cache.reports.size >= 3)
    cache.reports.delete(cache.reports.keys().next().value!);
  cache.reports.set(report.token, report);
  return report;
}
export function selectedBusiness(token: string, id: string) {
  const report = cache.reports.get(token);
  const business = report?.businesses.find((b) => b.id === id);
  if (
    !report ||
    !business ||
    Date.now() - Date.parse(report.checkedAt) > 600000
  )
    throw new Error(
      "Run business discovery again; the selected source snapshot has expired.",
    );
  if (business.status && /closed/i.test(business.status))
    throw new Error(
      "This source marks the business closed. Research manually.",
    );
  return { report, business };
}
