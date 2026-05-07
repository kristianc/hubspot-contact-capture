const GENERIC_DOMAINS = new Set([
  // Google
  "gmail.com", "googlemail.com",
  // Microsoft
  "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "live.co.uk", "msn.com",
  // Yahoo
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.ca", "yahoo.com.au", "ymail.com", "rocketmail.com",
  // Apple
  "icloud.com", "me.com", "mac.com",
  // ProtonMail
  "protonmail.com", "proton.me", "pm.me",
  // AOL
  "aol.com", "aim.com",
  // Zoho
  "zoho.com", "zohomail.com",
  // Other major
  "mail.com", "email.com",
  "gmx.com", "gmx.net", "gmx.de",
  "fastmail.com", "fastmail.fm",
  "tutanota.com", "tuta.com", "tuta.io",
  "yandex.com", "yandex.ru",
  "163.com", "126.com", "qq.com",
  "naver.com", "daum.net",
  "web.de", "t-online.de",
  "orange.fr", "free.fr",
  "libero.it", "virgilio.it",
  "rediffmail.com",
  "inbox.com",
  "hushmail.com",
  "mailfence.com",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CaptureConfig {
  accessToken: string;
  portalId: string;
  blockGenericEmails?: boolean;
}

export interface CaptureInput {
  email: string;
  formType: string;
  source?: string;
  properties?: Record<string, string>;
}

export interface CaptureResult {
  contactId: string;
  isNew: boolean;
  email: string;
  domain: string;
}

export class GenericEmailError extends Error {
  public readonly domain: string;
  constructor(domain: string) {
    super(`Generic email domain blocked: ${domain}`);
    this.name = "GenericEmailError";
    this.domain = domain;
  }
}

export class HubSpotApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  constructor(status: number, body: unknown) {
    super(`HubSpot API error: ${status}`);
    this.name = "HubSpotApiError";
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isGenericEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return GENERIC_DOMAINS.has(domain);
}

export function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

const HS_API = "https://api.hubapi.com";

async function hsRequest(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${HS_API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export async function captureContact(
  input: CaptureInput,
  config: CaptureConfig,
): Promise<CaptureResult> {
  const email = input.email.trim().toLowerCase();
  const domain = extractDomain(email);

  if (!domain) {
    throw new Error("Invalid email address");
  }

  if (config.blockGenericEmails && isGenericEmail(email)) {
    throw new GenericEmailError(domain);
  }

  const properties: Record<string, string> = {
    email,
    email_domain: domain,
    lead_source_form: input.formType,
    ...(input.source && { lead_source_product: input.source }),
    ...input.properties,
  };

  // Try to create the contact
  const create = await hsRequest(
    "/crm/v3/objects/contacts",
    "POST",
    config.accessToken,
    { properties },
  );

  if (create.ok) {
    return { contactId: create.data.id, isNew: true, email, domain };
  }

  // Contact already exists — extract ID from the 409 response and update
  if (create.status === 409) {
    const existingId = create.data?.message?.match(/Existing ID:\s*(\d+)/)?.[1];
    if (!existingId) {
      throw new HubSpotApiError(409, create.data);
    }

    const update = await hsRequest(
      `/crm/v3/objects/contacts/${existingId}`,
      "PATCH",
      config.accessToken,
      { properties },
    );

    if (update.ok) {
      return { contactId: existingId, isNew: false, email, domain };
    }

    throw new HubSpotApiError(update.status, update.data);
  }

  throw new HubSpotApiError(create.status, create.data);
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export function createClient(config: CaptureConfig) {
  return {
    capture: (input: CaptureInput) => captureContact(input, config),
    isGenericEmail,
    extractDomain,
  };
}
