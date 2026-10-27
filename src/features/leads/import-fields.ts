export const importFields = [
  [
    "companyName",
    "Company name",
    ["company", "companyname", "business", "businessname", "organization"],
  ],
  ["websiteUrl", "Website", ["website", "websiteurl", "url", "domain"]],
  [
    "contactName",
    "Contact name",
    ["contact", "contactname", "fullname", "name"],
  ],
  [
    "contactEmail",
    "Contact email",
    ["email", "contactemail", "emailaddress", "workemail"],
  ],
  ["country", "Country", ["country", "location"]],
  ["source", "Source", ["source", "leadsource"]],
  [
    "serviceInterest",
    "Service interest",
    ["service", "serviceinterest", "interest"],
  ],
  ["notes", "Notes", ["notes", "note", "comments"]],
] as const;
export type ImportField = (typeof importFields)[number][0];
export type ColumnMapping = Record<ImportField, number>;
export const MAX_CSV_BYTES = 1024 * 1024;
export const MAX_CSV_ROWS = 1000;
export type ImportReport = {
  total: number;
  valid: number;
  imported: number;
  skipped: number;
  invalid: number;
  issues: { row: number; message: string }[];
  examples: Record<ImportField, string | null>[];
};
