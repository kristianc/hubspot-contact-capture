# hubspot-contact-capture

Lightweight HubSpot contact capture via the Contacts API v3. No HubSpot form required — call the API directly from your server, tag contacts with custom properties, and optionally block generic email domains.

## Install

```bash
npm install hubspot-contact-capture
# or from GitHub
npm install github:kristianc/hubspot-contact-capture
```

## Quick start

```typescript
import { captureContact } from "hubspot-contact-capture";

const result = await captureContact(
  {
    email: "jane@acme.com",
    formType: "demo_email_gate",
    source: "my-product",
  },
  {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    portalId: process.env.HUBSPOT_PORTAL_ID,
  },
);

console.log(result);
// { contactId: "12345", isNew: true, email: "jane@acme.com", domain: "acme.com" }
```

### Client factory

For repeated use with the same config:

```typescript
import { createClient } from "hubspot-contact-capture";

const hs = createClient({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
  portalId: process.env.HUBSPOT_PORTAL_ID,
  blockGenericEmails: true,
});

await hs.capture({ email: "jane@acme.com", formType: "contact_form" });
```

## Generic email blocking

Pass `blockGenericEmails: true` to reject addresses from Gmail, Outlook, Yahoo, iCloud, and ~30 other free providers. A `GenericEmailError` is thrown with the offending domain.

```typescript
import { captureContact, GenericEmailError } from "hubspot-contact-capture";

try {
  await captureContact(
    { email: "someone@gmail.com", formType: "demo" },
    { accessToken: "...", portalId: "...", blockGenericEmails: true },
  );
} catch (err) {
  if (err instanceof GenericEmailError) {
    console.log(err.domain); // "gmail.com"
  }
}
```

### Utilities

```typescript
import { isGenericEmail, extractDomain } from "hubspot-contact-capture";

isGenericEmail("jane@gmail.com");  // true
isGenericEmail("jane@acme.com");   // false
extractDomain("jane@acme.com");    // "acme.com"
```

## HubSpot setup

### Private app

Create a [HubSpot private app](https://developers.hubspot.com/docs/api/private-apps) with the **crm.objects.contacts.write** scope. Copy the access token.

### Custom properties

The following custom contact properties are set automatically. Create them in HubSpot under **Settings → Properties → Contact properties** before first use:

| Internal name | Label | Type |
|---|---|---|
| `email_domain` | Email Domain | Single-line text |
| `lead_source_form` | Lead Source Form | Single-line text |
| `lead_source_product` | Lead Source Product | Single-line text |

## API

### `captureContact(input, config)`

Creates or updates a HubSpot contact. Returns `{ contactId, isNew, email, domain }`.

**input**
- `email` — contact email (required)
- `formType` — identifies the capture form (required, stored as `lead_source_form`)
- `source` — identifies the product (optional, stored as `lead_source_product`)
- `properties` — additional HubSpot contact properties (optional)

**config**
- `accessToken` — HubSpot private app token (required)
- `portalId` — HubSpot portal ID (required)
- `blockGenericEmails` — reject generic email domains (default `false`)

### Errors

- `GenericEmailError` — thrown when `blockGenericEmails` is enabled and the domain is generic
- `HubSpotApiError` — thrown on HubSpot API failures (exposes `status` and `body`)

## License

MIT
