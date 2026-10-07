# Vietnam Sourcing RFQ backend handoff

## Scope and verified infrastructure

Stage 2 continues `codex/vietnam-sourcing-mvp` from `8f58bbf6c89dca636cca336041c6b52ddf95f972`. No merge, push, production deployment, API enablement, cloud resource creation, IAM change or production secret change was performed. Unrelated scorecard, Instagram image and `social/` files are excluded.

Astro 6.1.10 still builds a static site (45 pages) for Firebase Hosting, project `comeback-traveler-web`. The existing main-branch workflow builds and deploys Hosting only; it is unchanged. Its GitHub service-account secret is unchanged. Repository audit found no existing server endpoint, database integration, dependable email service or upload pipeline. Read-only cloud list requests returned `SERVICE_DISABLED` for Firestore and Cloud Functions; this does not prove that historical cloud resources do not exist. Audit provisioning before enabling services.

Chosen backend: Firebase HTTP Functions v2 plus a separate named Firestore database `rfq-intake`, both configured for `asia-east1`. Only the official Admin and Functions SDKs are added, in an isolated `functions/` package. No Astro server adapter or backend framework is added. Server SDK authentication uses the runtime service account through Application Default Credentials, without a private key in the repository or browser.

Reference: [Firebase Hosting with Functions](https://firebase.google.com/docs/hosting/functions). Functions deployment requires a Blaze project; billing eligibility was not changed or established by this task.

## Data flow and access control

`Browser → POST /api/vietnam-sourcing → Hosting exact rewrite → vietnamSourcingIntake → strict validation / durable rate limits → Firestore transaction → committed receipt → success UI / event`

The client sends schema version 1, a retry UUIDv4, an explicitly mapped input object and five UTM attributes. It never supplies authoritative record IDs, timestamps, status or attachments. The server accepts only the documented keys, types, enum values and lengths, checks consent and honeypot, trims text and normalizes selected services. Unknown fields, nested injection objects, attachment fields and data-URL base64 content are rejected. The raw request limit is 64 KiB; ordinary text is limited to 300 characters, specifications/notes to 4,000, and UTM attributes to 200. The shared validator applies tighter field limits where applicable. No submitted text is executed.

The server generates `RFQ-YYYYMMDD-<32 hex characters>` using 128 bits from Node's cryptographically secure random generator. `created_at` and `updated_at` are server ISO timestamps, initial `status` is `new`, attachments are empty, and `notification_status` is `pending_manual_review`. The full existing RFQ schema is stored in `rfqs/{rfq_id}`.

The Firestore transaction creates the RFQ and `_rfq_receipts/{SHA256 submission UUID}` atomically. A matching retry checks that the original RFQ still exists, then returns the same ID; conflicting content under the same token returns 409. A failed or unconfirmed commit returns a generic 500, never a successful receipt. A log failure after commit does not undo a successful intake.

Only a receipt containing `stored: true`, the matching submission UUID and a valid server ID can unlock the frontend success message and `vietnam_sourcing_form_success`. The client keeps unchanged retry data/token in page memory, blocks concurrent submission, freezes editing during submission, applies a five-second cooldown, times out after 15 seconds, and locks the form after success. Drafts are not stored in localStorage; reloading loses the draft/token. Network errors, 400/429/500, malformed receipts and timeouts keep the form data and show an unconfirmed-receipt error. Raw server errors are never shown to visitors.

Storage actually exercised during this task: local Firestore emulator, project `demo-rfq-intake`, database `rfq-intake`. No new production database has been provisioned or written. After approved provisioning/deployment the intended path is `projects/comeback-traveler-web/databases/rfq-intake/documents/rfqs/{rfq_id}`.

`firestore.rfq.rules` denies all browser reads, queries, creates, updates and deletes, including authenticated clients and nested collections. There is no client Firestore SDK or credential in the form bundle. Admin SDK bypasses Security Rules: a dedicated runtime account and database-scoped IAM condition are mandatory deployment requirements, not protections proven by the emulator. Do not grant the runtime account project Owner/Editor or unrestricted access to other databases. See [Firestore IAM](https://cloud.google.com/firestore/native/docs/security/iam) for database access conditions.

Rules audit (prototype client-access boundary only):

```json
{"score":5,"max_score":5,"findings":[],"scope":"all anonymous and authenticated browser CRUD denied; server IAM needs deployment review"}
```

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for denying all browser access and requiring server intake. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## Abuse controls and operational limits

- Required honeypot and consent are checked again on the server. Strict Origin allowlist, JSON content type and POST-only endpoint; no permissive cross-origin response.
- Firestore transactions enforce 10 requests per hashed provider address per 10-minute window and 100 requests globally per 10-minute window. Invalid JSON, invalid fields and honeypot attempts count. Counters survive instance changes and are race-safe. Unsupported methods/origins/media and oversized bodies are rejected before database work.
- Only the last provider-appended forwarded address is used, with socket fallback; the first caller-supplied address cannot select a counter. A proxy address can group several visitors conservatively. Verify the actual Hosting/Functions forwarding chain in staging before launch; never switch blindly to the first forwarded address.
- `_rfq_abuse` stores hashed addresses, count and expiry, without raw IP. The hash is pseudonymous, not encryption. Its TTL policy expires counter metadata after at most roughly 20 minutes, subject to Firestore's asynchronous TTL deletion. Rate windows work independently of TTL. No RFQ retention duration is invented.
- Idempotency plus the atomic receipt prevents concurrent/retry duplicates for one token. It is not an identity system or CAPTCHA; a new token can create another valid request. Origin headers also do not authenticate bots. Function concurrency 10, maximum instances 2 and timeout 30 seconds bound compute scaling but do not guarantee a spending cap. Billing alerts and operational monitoring still need manual setup.
- There is no file input/upload, browser database write or automated supplier outreach. Attachment metadata remains an empty extension point; the existing preparation notice remains.

## Privacy and analytics

`/privacy` minimally adds company name, optional tax ID, contact/title, email/phone, optional LINE/website, product specifications, quantity, budget and voluntarily supplied business information. Purposes cover reply, sourcing evaluation, candidate supplier contact, quotes/service and necessary business communication. Necessary supplier information sharing is explained; confidential drawing sharing is subject to prior confirmation. Existing contact/deletion rights remain. No retention period, encryption certification or cross-border guarantee was added. Operator deletion must also remove associated receipt references; otherwise retries correctly fail without claiming success.

The five existing custom sourcing events remain: `vietnam_sourcing_view`, `vietnam_sourcing_cta_click`, `vietnam_sourcing_form_start`, `vietnam_sourcing_form_submit`, `vietnam_sourcing_form_success`. Their only custom dimensions are constant `page_path`, enum-normalized `product_category` and enum-normalized `services_requested`. They never spread RFQ data, query strings, record IDs, company/tax/contact information, email/phone/LINE/website, specifications, price, notes or attachment filenames. Consent does not override this boundary.

On this sensitive intake page only, the layout omits advertising scripts and sets the GA page location to the clean canonical URL. It exposes `window.gtag` for the sourcing controller; local QA queues events without loading the production GA tag, so fictitious emulator leads are not reported as real conversions. Other pages retain their original advertising/GA scripts byte for byte. Automated tests exercise both the controller's PII allowlist and the compiled page's analytics initialization. Live GA DebugView verification remains a staging/launch check.

## Notification

There is no existing mail service to reuse. Each new committed RFQ emits the non-PII Cloud Logging event `rfq_intake_stored`; failures emit only `rfq_intake_storage_failure`. Replayed submissions do not repeat the new-intake log. There is no automatic email notification currently.

Before opening intake, assign an operator to inspect the private database daily. An optional Google Cloud Logging metric and Cloud Monitoring email channel can notify administrators using only the constant event count; this requires separate manual configuration. A later approved mail provider can use Secret Manager and a server workflow, without sending the full confidential RFQ in notification content. No paid provider, secret or email send was introduced here.

## Validation results

Local runtime: Node 24.15.0; deploy target: Node 22. The actual emulator uses the local runtime. Node 22 cloud-runtime and IAM validation still require staging; they are not claimed as completed cloud checks.

| Check | Actual result |
| --- | --- |
| Astro build | Pass, 45 static pages |
| Root tests | 32/32 pass (including existing tests) |
| Backend unit tests | 13/13 pass |
| Firebase emulator integration | 5/5 pass |
| Sourcing typecheck | 0 errors, 0 warnings |
| Backend TypeScript build | Pass |
| Full-site typecheck | Existing 59 errors; no increase or new feature errors |
| Backend production dependency audit | 0 known vulnerabilities |
| Lint | No configured linter |

The 50 tests cover valid/invalid RFQs, required fields/email/consent, honeypot, input shape/length/base64/size limits, per-address/global rate limits, same-token concurrency/replay/conflict, persistence failure and receipt validity, PII exclusions, client loading/duplicate prevention, network/400/429/500/timeout behavior and 1,000 generated RFQ IDs. Emulator integration exercises the real Hosting rewrite, Function and named Firestore transaction, actual persisted contents, cross-instance counters and 32 denied browser REST operations with anonymous and authenticated emulator identities. It runs only with explicit demo project/emulator environment guards.

Actual browser QA used the local Hosting emulator and fictitious input at 320×800, 390×844 and 1280×900. Hero, CTA, form fields, services/consent, required and invalid-email errors, committed success state, keyboard FAQ and footer were inspected. No horizontal overflow: document/client widths were 305/305, 375/375 and 1265/1265 respectively (15px vertical scrollbar). Success was observed at all three widths. Failure variants are automated controller/transport/backend tests, not claimed as separate browser network-interception checks. Screenshot evidence is in ignored `.astro/rfq-desktop-success.jpg`.

Baseline build was captured before backend edits in ignored `.astro/rfq-backend-baseline`. Every pre-existing output file except `privacy.html`, `vietnam-sourcing.html` and the replaced sourcing JS asset is byte-identical, including `/`, `/esim`, all affiliate pages, shared CSS and other GA/affiliate scripts. These three differences are expected: policy amendment, real-intake UI/sensitive-page tracking, and real endpoint client code. There is no affiliate URL/tracking change or eSIM core edit.

## Manual production requirements — not performed

1. Audit actual Firebase project resources and approve Blaze/billing, budgets and API enablement. Enable required Firestore, Functions, Cloud Run, Cloud Build and Artifact Registry services through the normal approved process.
2. Provision named Firestore Native database `rfq-intake` in `asia-east1`. Review/deploy only its deny-all rules and index/TTL configuration; leave other database rules unchanged. Review operator access, data deletion procedures and backups appropriate to business needs.
3. Create a dedicated runtime service account. Grant only the read/create/update/transaction permissions needed by this database using a database access IAM condition. Verify it cannot read another database. Review deployer permissions and public invocation of this intentionally public HTTP endpoint separately.
4. Supply non-secret Functions parameters `RFQ_SERVICE_ACCOUNT` and `RFQ_INTAKE_ENABLED` (default false), using `functions/environment.example` as reference. No database password or client secret is required. The local ignored `.env.local` contains emulator-only fake values, not production configuration.
5. Deploy the reviewed database rules/indexes and function while intake is disabled. Verify the compiled shared module is packaged, ADC/IAM, Node 22, trusted proxy handling, persistence/retries/failures and cost controls in staging. Enable intake only after operator handling is ready.
6. Deploy Hosting with the exact API rewrite only after the function is ready, using a separately authorized release. Existing GitHub Actions still deploys Hosting only; merging this branch would not automatically deploy the function/rules. Do not merge before this dependency is handled.
7. Arrange manual inbox/database review or the optional non-PII Cloud Monitoring notification, and verify production GA events in DebugView without real confidential form data.

## Relevant files and local commands

Backend: `functions/src/{index,service,firestore-store}.ts`, `functions/{package.json,package-lock.json,tsconfig.json,environment.example}`, `functions/tests/*`, `functions/emulator-tests/intake.test.mjs`, `firestore.rfq.rules`, `firestore.rfq.indexes.json`, `firebase.json`.

Frontend/privacy: `src/lib/vietnam-sourcing/rfq.ts`, `src/scripts/vietnam-sourcing.ts`, `src/components/VietnamSourcingForm.astro`, `src/pages/{vietnam-sourcing,privacy}.astro`, `src/layouts/BlogLayout.astro`, sourcing tests, root `package.json`, `.gitignore`, this report and the historical MVP report pointer.

```powershell
npm run build
npm test
npm run typecheck:sourcing
npm run build:backend
npm run test:backend
# In a separate terminal, with Java 21+ and emulator-only function parameters:
npx -y firebase-tools@latest emulators:start --project demo-rfq-intake --only hosting,functions,firestore,auth
# Then in the test terminal:
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
$env:GCLOUD_PROJECT='demo-rfq-intake'
npm --prefix functions run test:emulator
```
