import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import robotsParser from "robots-parser";
import { load } from "cheerio";

export class ResearchError extends Error {}
export const RESEARCH_AGENT = "HassanOSResearch";
const restricted = [
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "upwork.com",
  "fiverr.com",
  "indeed.com",
  "glassdoor.com",
  "reddit.com",
  "wellfound.com",
  "yelp.com",
];
type Address = { address: string; family: number };
export type PageResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
};
export type RetrievalDependencies = {
  resolve: (host: string) => Promise<Address[]>;
  read: (
    url: URL,
    address: Address,
    signal: AbortSignal,
    maxBytes: number,
    kind: "robots" | "page",
  ) => Promise<PageResponse>;
};
export function publicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ResearchError("Invalid URL. Use manual research.");
  }
  const host = url.hostname.toLowerCase();
  if (
    value.length > 2048 ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    isIP(host.replace(/^\[|\]$/g, "")) ||
    !host.includes(".") ||
    /\.$|\.(localhost|local|internal|home|lan|test|invalid)$/.test(host) ||
    restricted.some(
      (domain) => host === domain || host.endsWith("." + domain),
    ) ||
    [...url.searchParams.keys()].some((k) =>
      /token|password|secret|authorization|signature|credential|^auth$|^api[_-]?key$|^sig$/i.test(
        k,
      ),
    )
  )
    throw new ResearchError(
      "Unsupported or restricted URL. Enter public evidence manually; no automated access will be attempted.",
    );
  url.hash = "";
  return url;
}
export function isPublicAddress(address: string) {
  try {
    const ip = ipaddr.parse(address);
    // IPv4-mapped IPv6, transition/tunnel ranges, private, local, multicast and reserved ranges are denied.
    return (
      !address.includes("%") &&
      ip.range() === "unicast" &&
      (ip.kind() !== "ipv6" || (ip.toByteArray()[0] & 0xe0) === 0x20)
    );
  } catch {
    return false;
  }
}
const restriction =
  /\b(noarchive|nosnippet|noai|noimageai|noindex|nofollow|none)\b/i;
function permittedType(headers: IncomingHttpHeaders, kind: "robots" | "page") {
  const contentType = String(headers["content-type"] || "").toLowerCase();
  const mime = contentType.split(";")[0].trim();
  if (
    !(kind === "robots"
      ? mime === "text/plain"
      : ["text/html", "application/xhtml+xml", "text/plain"].includes(mime))
  )
    throw new ResearchError(
      "Unsupported content type. Use manual entry for this source.",
    );
  if (
    /charset\s*=/.test(contentType) &&
    !/charset\s*=\s*["']?(utf-8|us-ascii)(?:["']|\s|;|$)/.test(contentType)
  )
    throw new ResearchError("Unsupported page encoding; use manual entry.");
  if (headers["content-encoding"] && headers["content-encoding"] !== "identity")
    throw new ResearchError(
      "Compressed responses are not supported; use manual entry.",
    );
  if (restriction.test(String(headers["x-robots-tag"] || "")))
    throw new ResearchError(
      "Source restrictions prevent storing an excerpt. Use manual research.",
    );
}
async function pinnedRead(
  url: URL,
  address: Address,
  signal: AbortSignal,
  maxBytes: number,
  kind: "robots" | "page",
): Promise<PageResponse> {
  return new Promise((resolve, reject) => {
    // Connect directly to the validated IP; preserve Host and TLS identity. No second DNS lookup or pooled connection.
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      {
        protocol: url.protocol,
        hostname: address.address,
        family: address.family,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        servername: url.hostname,
        rejectUnauthorized: true,
        agent: false,
        method: "GET",
        path: url.pathname + url.search,
        signal,
        headers: {
          Host: url.host,
          "User-Agent": `${RESEARCH_AGENT}/1.0 (single-page operator-requested research)`,
          Accept:
            kind === "robots"
              ? "text/plain"
              : "text/html, application/xhtml+xml, text/plain",
          "Accept-Encoding": "identity",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status !== 200) {
          response.destroy();
          resolve({ status, headers: response.headers, body: "" });
          return;
        }
        try {
          permittedType(response.headers, kind);
          if (Number(response.headers["content-length"] || 0) > maxBytes)
            throw new ResearchError(
              "Source exceeds the response-size limit. Use manual entry.",
            );
        } catch (e) {
          response.destroy();
          reject(e);
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            response.destroy();
            reject(
              new ResearchError(
                "Source exceeds the response-size limit. Use manual entry.",
              ),
            );
          } else chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}
const defaults: RetrievalDependencies = {
  resolve: (host) => lookup(host, { all: true, verbatim: true }),
  read: pinnedRead,
};
export function extractExcerpt(
  html: string,
  contentType: string,
  hint: string,
) {
  if (contentType.startsWith("text/plain"))
    return html.replace(/\s+/g, " ").trim().slice(0, 4000);
  const $ = load(html);
  if (
    $("meta[name]")
      .toArray()
      .some(
        (el) =>
          ["robots", "hassanosresearch"].includes(
            ($(el).attr("name") || "").toLowerCase(),
          ) && restriction.test($(el).attr("content") || ""),
      ) ||
    $(
      'input[type="password"],.g-recaptcha,iframe[src*="captcha"],form[action*="login"]',
    ).length ||
    /verify (?:that )?you are human|checking your browser|enable javascript and cookies to continue/i.test(
      $("body").text(),
    )
  )
    throw new ResearchError(
      "Page is restricted, login-gated, or challenged. Use manual entry.",
    );
  $(
    'script,style,noscript,nav,footer,header,form,svg,iframe,template,[hidden],[aria-hidden="true"]',
  ).remove();
  const root = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");
  const blocks = root
    .find("h1,h2,h3,p,li")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 30);
  const words = [
    ...new Set(hint.toLowerCase().match(/[a-z]{4,}/g) ?? []),
  ].slice(0, 20);
  const relevant = words.length
    ? blocks.filter((t) => words.some((w) => t.toLowerCase().includes(w)))
    : [];
  const text =
    (relevant.length ? relevant : blocks).join("\n\n") ||
    root.text().replace(/\s+/g, " ").trim();
  return text.slice(0, 4000);
}
export async function retrievePublicPage(
  value: string,
  hint = "",
  deps: RetrievalDependencies = defaults,
) {
  const signal = AbortSignal.timeout(15000);
  async function get(raw: string, kind: "robots" | "page") {
    const url = publicUrl(raw);
    let abort: () => void = () => {};
    const timeout = new Promise<never>((_, reject) => {
      abort = () =>
        reject(new ResearchError("Research timed out. Use manual entry."));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    let addresses: Address[];
    try {
      addresses = await Promise.race([deps.resolve(url.hostname), timeout]);
    } finally {
      signal.removeEventListener("abort", abort);
    }
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
      throw new ResearchError(
        "Source resolves to an internal, reserved, or unsupported address. Use manual research.",
      );
    signal.throwIfAborted();
    const page = await deps.read(url, addresses[0], signal, 512 * 1024, kind);
    if (page.status === 200) permittedType(page.headers, kind);
    if (Buffer.byteLength(page.body) > 512 * 1024)
      throw new ResearchError("Source exceeds the response-size limit.");
    return page;
  }
  const robotsCache = new Map<string, string>();
  async function allowed(url: URL) {
    if (!robotsCache.has(url.origin)) {
      let location = `${url.origin}/robots.txt`;
      let body = "";
      let done = false;
      for (let i = 0; i <= 5; i++) {
        const response = await get(location, "robots");
        if (
          [301, 302, 303, 307, 308].includes(response.status) &&
          response.headers.location
        ) {
          const next = publicUrl(
            new URL(response.headers.location, location).href,
          );
          if (location.startsWith("https:") && next.protocol !== "https:")
            throw new ResearchError(
              "HTTPS robots downgrade refused. Use manual entry.",
            );
          location = next.href;
          continue;
        }
        if ([404, 410].includes(response.status)) {
          done = true;
          break;
        }
        if (response.status !== 200)
          throw new ResearchError(
            "Robots rules are unavailable or access is restricted. Use manual entry.",
          );
        body = response.body;
        done = true;
        break;
      }
      if (!done)
        throw new ResearchError("Too many robots redirects. Use manual entry.");
      robotsCache.set(url.origin, body);
    }
    const robots = robotsParser(
      `${url.origin}/robots.txt`,
      robotsCache.get(url.origin)!,
    );
    if (
      robots.isAllowed(url.href, RESEARCH_AGENT) === false ||
      (robots.getCrawlDelay(RESEARCH_AGENT) ?? 0) > 0
    )
      throw new ResearchError(
        "Robots rules restrict retrieval. Use manual entry.",
      );
  }
  try {
    let url = publicUrl(value);
    for (let i = 0; i <= 3; i++) {
      await allowed(url);
      const page = await get(url.href, "page");
      if (
        [301, 302, 303, 307, 308].includes(page.status) &&
        page.headers.location
      ) {
        const next = publicUrl(new URL(page.headers.location, url).href);
        if (url.protocol === "https:" && next.protocol !== "https:")
          throw new ResearchError("HTTPS downgrade refused. Use manual entry.");
        url = next;
        continue;
      }
      if (page.status !== 200)
        throw new ResearchError(
          `Source returned HTTP ${page.status}. Use manual entry; no bypass will be attempted.`,
        );
      const excerpt = extractExcerpt(
        page.body,
        String(page.headers["content-type"]).toLowerCase(),
        hint,
      );
      if (excerpt.length < 40)
        throw new ResearchError(
          "No useful static public text found. Use manual entry.",
        );
      return { sourceUrl: url.href, retrievedAt: new Date(), excerpt };
    }
    throw new ResearchError("Too many page redirects. Use manual entry.");
  } catch (e) {
    if (e instanceof ResearchError) throw e;
    throw new ResearchError(
      "Public retrieval failed or timed out. Use manual entry; no workaround was attempted.",
    );
  }
}
