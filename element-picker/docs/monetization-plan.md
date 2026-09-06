# Monetization Plan — Dev Bridge for DSH

Status: draft for review
Owner: Cyber Samurai
Version: 1.0 (plan)

---

## 1. Executive summary

Dev Bridge for DSH will stay **free in the Chrome Web Store** and monetize through
an **own backend subscription/license model**. Users keep a genuinely useful free
tier (capture -> comment -> send to DSH) and unlock **Premium** power features by
registering an email and activating a license (or subscription).

Hard constraint from the platform: the Chrome Web Store no longer supports paid
extensions or in-store purchases (discontinued 2021). Monetization therefore
happens outside the store, through our own HTTPS API — which also gives us full
control over pricing, trials and billing.

---

## 2. Chrome Web Store guardrails (verify current wording before submission)

1. **No store payments** — keep the listing free; revenue flows via our backend.
2. **Single purpose / quality guidelines** — the store listing and in-extension
   messaging must stay clear about what the extension does. Do not make the
   *entire* extension an email-gated shell; gate **Premium features only**.
3. **User Data Policy** — emails are personal information. Collecting them
   requires:
   - disclosure in the store's *Privacy practices* form;
   - a public privacy policy URL (extend `docs/privacy-policy.html`);
   - explicit opt-in consent (double opt-in);
   - HTTPS-only transmission and secure storage;
   - *limited use*: emails are used only for the stated account/licensing purpose;
   - a way for the user to delete their account/data.
4. **No remote code** (MV3) — entitlement checks run in approved extension code;
   the backend only returns data. No dynamically fetched JS.
5. Policy updates land regularly (2025 privacy/integrity updates, 2026 follow-ups)
   — re-check `developer.chrome.com/docs/webstore/program-policies` before each
   release.

**Design rule:** the free tier must remain coherent and useful on its own. Never
silently relicense a feature users already had for free.

---

## 3. Recommended architecture

```
┌─ Browser (extension) ──────────────┐        ┌─ Our backend ─────────────────┐
│ Options/Account page               │  HTTPS  │ API (register/verify/         │
│   email + license key entry        │ ──────► │      entitlements/delete)     │
│ Premium feature flags              │         │ License/subscription store    │
│ chrome.storage: session token      │ ◄────── │ Email provider (magic link/   │
│ Offline grace cache (72 h)         │         │      OTP sending)             │
└────────────────────────────────────┘         │ Payment provider (Stripe etc.)│
                                               └───────────────────────────────┘
```

### Registration & validation flow (recommended: magic link / double opt-in)

1. User opens the Account/Options page and enters an email + clicks **Continue**.
2. Backend issues a short-lived one-time code / token and emails it (magic link
   or 6-digit OTP). Nothing is activated until the user proves inbox access.
3. User confirms inside the extension (or via the link).
4. Backend marks the email verified, records consent, and returns a **license
   key / signed JWT** plus the user's current tier.
5. Extension stores the token locally and calls `GET /entitlements` on
   extension start and after purchase/trial events. A cached response keeps the
   UI usable offline for a grace period.

### Validation methods ranked

| Method | Strength | Notes |
| --- | --- | --- |
| Magic link (double opt-in) | High | Proof of inbox + consent in one step; no password to store |
| OTP code | High | Fast, good UX; needs email delivery reliability |
| Syntax regex only | Low | Never use alone — format is not ownership |

---

## 4. Backend API sketch

All endpoints `https://api.<domain>/`, HTTPS only, JSON, rate-limited.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/v1/auth/request` | `{email}` -> sends magic link / OTP; records consent intent |
| POST | `/v1/auth/verify` | `{email, code}` -> marks verified; returns session JWT + tier |
| GET | `/v1/entitlements` | `Authorization: Bearer <token>` -> current tier, flags, expiry |
| POST | `/v1/account/delete` | erases account + personal data (GDPR/limited-use) |
| POST | `/v1/subscriptions/portal` | payment/provider billing portal link (tier upgrades) |

### DB schema (minimal)

- `users(id, email UNIQUE, email_verified_at, consent_at, created_at, deleted_at)`
- `licenses(id, user_id, key UNIQUE, tier, status, trial_ends_at, expires_at)`
- `devices(id, user_id, token_hash, last_seen_at)` (for revocation)
- `premium_events(id, user_id, feature, ts)` (analytics: which features drive upgrades)

Security notes: store only a hash of the license key at rest for lookups; keep
raw session tokens hashed; access logs minimal; support hard-delete.

---

## 5. Free vs Premium matrix (v1 proposal)

| Feature | Free | Premium |
| --- | --- | --- |
| Capture -> comment -> send to DSH | Yes | Yes |
| Local capture history | Last 40 | Unlimited + cloud sync + search + folders |
| Element screenshots + before/after diff | — | Yes |
| iframe / shadow-DOM capture | — | Yes (robust multi-fallback selectors) |
| Selector watchdog (re-verify over time, alert on breakage) | — | Yes |
| Auto-heal selectors when pages change | — | Yes |
| Team review boards, statuses, assignees, Jira/GitHub export | — | Yes |
| Batch multi-element capture + queued send | — | Yes |
| Scheduled page-watch reports | — | Yes |
| Playwright/Cypress selector export, CSVs/templates | — | Yes |
| Multiple/custom Harness endpoints, profiles | — | Yes |
| AI triage & suggested code fixes (via our stack) | — | Yes |

Suggested upgrade hooks in-app: "Selector watchdog", "Team review" and "Cloud
history" are the strongest value stories; surface a Premium upsell card at the
moment the user hits a free cap (e.g. history limit) or captures an element
inside an iframe.

---

## 6. Monetization mechanics (options)

1. **Subscription (recommended core):** monthly/annual Premium via Stripe or a
   regional equivalent; license auto-refreshes with each entitlement call.
2. **Team seats:** per-seat pricing around shared boards/exports.
3. **Trial:** 14-day Premium trial without a payment method, license key issued
   after email verification; downgrade at trial end is graceful.
4. **(Later) Usage/enterprise:** page-watch job counts or self-hosted Harness
   fleets for power users.

Decide early: single global price vs regional tiers; annual discount; student/free
for OSS maintainers. Keep the free tier stable through pricing experiments.

---

## 7. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Store rejects listing due to data collection | Full disclosure, privacy policy URL, consent-first flow, minimal data |
| Email-gated UX perceived as bait-and-switch | Free tier always functional; Premium clearly additive |
| Policy change mid-launch | Track policy updates; feature flags so we can disable premium gating fast |
| License revocation/chargebacks | Server-side entitlement checks + hashed keys + per-device tokens |
| Users lose data when we stop a paid plan | Cloud history export anytime; grace period before lockout |
| GDPR/EU | Data deletion endpoint, consent timestamps, EU-friendly hosting option |

---

## 8. Rollout phases

- **Phase 0 — Consent & account MVP:** Account/Options page (email + license
  field), backend `/auth` + `/entitlements`, storage of token, privacy policy +
  store disclosure updated. Feature flags plumbed through code.
- **Phase 1 — First paid feature:** pick ONE premium feature (recommend
  **selector watchdog** or **cloud history**) end-to-end behind the tier flag.
- **Phase 2 — Billing + team:** subscription portal, team seats, analytics of
  which features convert.
- **Phase 3 — Expand:** visual diff, page-watch, AI triage.

## 9. Open questions to decide

1. Backend host/region and email provider (e.g. Resend, SES, Postmark) + sender domain.
2. Payment provider (Stripe availability/region) and price points.
3. Which premium feature ships first (recommend selector watchdog).
4. Whether email collection should be optional for free users (recommend: yes —
   accounts only required for Premium).
