import { load } from "cheerio";
import { z } from "zod";
import type { DiscoveryInput, Finding, Availability } from "./types";
export type HnComment = {
  id: string;
  parentId: string;
  publishedAt: string;
  html: string;
  author: string | null;
  deleted?: boolean;
};
export function plainPost(html: string) {
  const $ = load(html);
  $("script,style,iframe,svg").remove();
  $("p,br,li").each((_, el) => {
    $(el).prepend("\n");
  });
  return $.root()
    .text()
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
const vocabulary = {
  automation:
    /\b(automat\w*|workflow\w*|crm|schedul\w*|appointment\w*|zapier|n8n|airtable|spreadsheet\w*|lead (?:handling|management)|administrative|integrat\w*)\b/i,
  software:
    /\b(software|web\s*app\w*|website|saas|full.?stack|frontend|front.end|react|mobile\s*app\w*|application|developer|engineer)\b/i,
  backend:
    /\b(backend|back.end|api\w*|database\w*|postgres\w*|cloud|integrat\w*|server\w*)\b/i,
  security:
    /\b(security|pentest\w*|penetration|vulnerability|application audit|secure)\b/i,
};
export function availability(
  text: string,
  publishedAt: string,
  today: string,
): Availability {
  if (
    /(?:\[closed\]|\b(?:position (?:is )?filled|request (?:is )?closed|no longer (?:hiring|looking)|not hiring|project (?:is )?cancelled|hiring (?:is )?closed|closed request)\b)/i.test(
      text,
    )
  )
    return "closed";
  const deadline =
    /\b(?:deadline|apply by|expires?)\s*:?\s*(\d{4}-\d{2}-\d{2})\b/i.exec(
      text,
    )?.[1];
  if (deadline && z.iso.date().safeParse(deadline).success && deadline < today)
    return "expired";
  return Date.parse(today) - Date.parse(publishedAt) > 45 * 86400000
    ? "stale"
    : "current_unconfirmed";
}
function countryMatch(value: string, requested: string) {
  const aliases = (v: string) =>
    /^(us|usa|u\.s\.?a?\.?|united states(?: of america)?)$/i.test(v.trim())
      ? "us"
      : v.trim().toLowerCase();
  return aliases(value) === aliases(requested);
}
export function classifyComment(
  comment: HnComment,
  threadId: string,
  input: DiscoveryInput,
  today: string,
): Finding {
  const text = plainPost(comment.html);
  const firstLine = text.split("\n")[0];
  const buyer = /^SEEKING\s+(?:A\s+)?FREELANCER\b/i.test(text);
  const seller =
    /^SEEKING\s+(?:WORK|FREELANCE\b(?!R)|CONTRACT\s+WORK|EMPLOYMENT)|\b(?:available for hire|hire me|seeking clients)\b/i.test(
      text,
    );
  const serviceFits = vocabulary[input.targetService].test(text);
  const explicitHelp =
    /\b(looking for|need|seeking|hire|hiring|paid|budget|contract|project)\b/i.test(
      text,
    );
  const technical =
    /\b(developer|engineer|automation|integration|software|website|backend|api|security|crm|application)\b/i.test(
      text,
    );
  const openSource =
    /\b(open.source|github issue|bug report|pull request|unpaid|volunteer|no budget)\b/i.test(
      text,
    );
  const fullTimeOnly =
    /\b(full.time only|no (?:freelancers|contractors)|employees only|permanent employees)\b/i.test(
      text,
    );
  const classification =
    comment.deleted || !comment.author || seller || !text || fullTimeOnly
      ? "irrelevant"
      : comment.parentId !== threadId
        ? "informational"
        : buyer && technical && explicitHelp && !openSource
          ? "explicit_request"
          : buyer &&
              technical &&
              !/\b(unpaid|volunteer|no budget)\b/i.test(text)
            ? "uncertain_opportunity"
            : buyer
              ? "irrelevant"
              : "informational";
  const companyName =
    /^Company\s*:\s*([^\n|]{2,200})/im.exec(text)?.[1]?.trim() ?? null;
  // Only explicit company/buyer location is geography evidence; US-only applicants/time-zone overlap is not.
  const countryEvidence =
    /^(?:Company country|Company location|Country)\s*:\s*([^\n|]{1,80})/im
      .exec(text)?.[1]
      ?.trim() ?? null;
  const categoryEvidence =
    /^(?:Company type|Buyer category)\s*:\s*(small business|small company|small team|startup|start-up)\b/im.exec(
      text,
    )?.[0] ??
    /\b(?:we are|we run|I run|I own)\s+(?:a\s+)?(small business|small company|small team|startup|start-up)\b/i.exec(
      text,
    )?.[0] ??
    null;
  const geography =
    input.country.toLowerCase() === "any" ||
    (countryEvidence !== null && countryMatch(countryEvidence, input.country));
  const category =
    input.buyerCategory === "any" ||
    (categoryEvidence !== null &&
      (input.buyerCategory === "startup"
        ? /start.?up/i.test(categoryEvidence)
        : /small (?:business|company|team)/i.test(categoryEvidence)));
  const keywords =
    input.keywords.toLowerCase().match(/[a-z0-9+#.-]{2,}/g) ?? [];
  const keywordFit =
    !keywords.length || keywords.some((w) => text.toLowerCase().includes(w));
  const matches =
    serviceFits &&
    keywordFit &&
    (geography || (!countryEvidence && input.includeUnknown)) &&
    (category || (!categoryEvidence && input.includeUnknown));
  const lifecycle = availability(text, comment.publishedAt, today);
  const saveable =
    ["explicit_request", "uncertain_opportunity"].includes(classification) &&
    matches &&
    lifecycle === "current_unconfirmed";
  const reasons = [
    seller && "Service advertisement / person seeking work, not a buyer.",
    comment.parentId !== threadId &&
      "Reply/discussion rather than an original buyer request.",
    !serviceFits && "No target-service evidence found.",
    fullTimeOnly && "Employment-only; not a freelance project.",
    openSource &&
      "Open-source/unpaid language requires review; not treated as a paid request.",
    !keywordFit && "Optional keywords not present.",
    countryEvidence &&
      !geography &&
      input.country.toLowerCase() !== "any" &&
      "Recorded company country differs from the target.",
    categoryEvidence &&
      !category &&
      input.buyerCategory !== "any" &&
      "Recorded buyer category differs from the target.",
    buyer &&
      "Post explicitly identifies itself as seeking a freelancer; budget and actual buying intent still require confirmation.",
    lifecycle !== "current_unconfirmed" &&
      `Request marked ${lifecycle}; not recommended for outreach.`,
  ].filter((v): v is string => !!v);
  let contactEmail: string | null = null;
  let contactRoute: Finding["contactRoute"] = null;
  if (["explicit_request", "uncertain_opportunity"].includes(classification)) {
    const email = /^(?:Email|Contact)\s*:\s*([^\s<>]+@[^\s<>]+)/im.exec(
      text,
    )?.[1];
    if (email && z.email().safeParse(email).success) {
      contactEmail = email;
      contactRoute = {
        kind: "email",
        url: `mailto:${email}`,
        evidence: `Explicit public contact line: ${email}`,
      };
    }
    if (!contactRoute) {
      const $ = load(comment.html);
      for (const el of $("a[href]").toArray()) {
        const label = $(el).text();
        const href = $(el).attr("href") || "";
        if (!/apply|application|contact/i.test(label)) continue;
        try {
          const url = new URL(href);
          if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            !url.hostname.includes(".") ||
            /localhost|\.local$|\.internal$/.test(url.hostname) ||
            /^[\d.]+$|^\[/.test(url.hostname) ||
            href.length > 2048
          )
            continue;
          contactRoute = {
            kind: "application_link",
            url: url.href,
            evidence: `Buyer-labelled link: ${label.slice(0, 100)}`,
          };
          break;
        } catch {
          /* invalid public link */
        }
      }
    }
  }
  const missing = [
    !companyName && "Company identity not established",
    !countryEvidence && "Company country unknown",
    !categoryEvidence && "Business size/category unknown",
    !contactRoute && "No explicit buyer-provided public contact route",
    "Current availability not confirmed",
    "Decision-maker identity and permission to contact not verified",
    "Paid budget / scope not verified",
  ].filter((v): v is string => !!v);
  return {
    source: "hn_algolia",
    itemId: comment.id,
    threadId,
    title: firstLine.slice(0, 240) || "Untitled HN comment",
    sourceUrl: `https://news.ycombinator.com/item?id=${comment.id}`,
    publishedAt: comment.publishedAt,
    classification,
    availability: lifecycle,
    companyName,
    excerpt: text.slice(0, 1600),
    contactEmail,
    contactRoute,
    service: input.targetService,
    countryEvidence,
    categoryEvidence,
    reasons,
    missing,
    matches,
    saveable,
  };
}
