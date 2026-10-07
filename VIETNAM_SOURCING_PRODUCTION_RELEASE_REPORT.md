# Vietnam Sourcing Production Release Report

Release date2026-10-07 Asia/Taipei. Owner authorized final site release. Integration source codex/vietnam-sourcing-production-prep at d9af2cc8edb611c81b0abf3cafa5b6d5f53ccfa0. Refreshed production base102035b8201073710aeae0867d63f4d408b87de3 had no newer commits.

## Git and Hosting release

History-preserving no-ff merge SHA: f6e00cffd3ae6143e61157bbfa1de2aec437ebd6. Clean merge, no conflicting production file choices; existing history retained. Operations/report follow-up commit and exact remote main SHA are delivered in the final response to avoid self-referential report SHA. Push main only after all production validation gates passed; no unrelated branch push. Existing main CI automatically performs another Hosting-only publication; its verified run/final Hosting IDs are delivered in the final response.

Initial authorized manual Hosting release: sites/comeback-traveler-web/channels/live/releases/1791347627697000; version sites/comeback-traveler-web/versions/77fb4d73ef972715; UTC timestamp 2026-10-07T04:33:47.697Z. Only --only hosting used. No Functions source, Firestore, rules, indexes, Auth, Storage or database deployment. Firebase renders /api/vietnam-sourcing as Run service vietnamsourcingintake, regionasia-east1 (the existing GEN2 Function); cleanUrls and REMOVE trailing-slash behavior retained, JCB301 redirect retained.

## Build and tests

Post-merge build45 pages PASS. Frontend/regression105/105 PASS; backend16/16 PASS; isolated demo-rfq-intake emulator integration5/5 PASS. Astro check59 errors/0 warnings/1 hint, exactly existing baseline with added diagnostic count0. Protected current production HTML/JS/CSS hashes all passed. Root package/frontend/backend code is the reviewed integration; no blind dependency upgrade or new service.

## Disabled smoke and browser QA

Kept RFQ_INTAKE_ENABLED=false for Hosting deployment and first live smoke. /vietnam-sourcing200 with correct canonical/title/description/schema, complete form, service selection, privacy link, consent, FAQ and footer. Formal /api/vietnam-sourcing returned503 {stored:false,code:unavailable}; RFQ count unchanged. Browser valid synthetic disabled-submit showed loading/inert state and safe error, retained form values, no fake success or stack/infrastructure detail. Empty required fields and missing consent correctly blocked before persistence.

Visible production browser viewport widths verified as actual320/390/1280; document scrollWidths305/375/1265, no horizontal overflow. Hero/CTA/services/process/form/FAQ/footer checked. CTA scroll/focus, required validation, consent, service selection, loading/error and success observed; FAQ expansion works. No upload controls, payment UI or fixed-price additions. The viewport API initially targeted the selected tab rather than an older tab; QA was repeated on the selected production tab and actual innerWidth verified. No simulated backend success.

## Enable and real browser flow

Only after disabled and site gates passed, PATCHed only Function runtime environmentVariables, preserved existing values and set intake=true. No Function source deploy. Completed platform rollout, Function ACTIVE and effective configtrue.

From https://comebacktraveler.com/vietnam-sourcing , filled the owner-specified clearly synthetic fields, selected service/consent and submitted through the real form. Browser → exact Hosting rewrite → deployed Function → validation/anti-abuse → Firestore transaction/receipt → frontend success verified. Browser showed loading, then confirmed success, disabled success button and reset form. Browser RFQ ID RFQ-20261007-59953b3048dd9cfa23186a39da8c17ae; created UTC 2026-10-07T04:38:33.153Z; statusnew; owner REST inspection verified company/contact/request privately and exactly one matching receipt. Full form contents and client token are not recorded here. Screenshot evidence is local private D:/astro/.tmp-sourcing-release/browser-success.png.

## Idempotency and safe rejection

A separate controlled synthetic envelope through the SAME production Hosting endpoint verified retry with identical token/payload returns200/same RFQ receipt, no second RFQ; conflicting payload returns409. This is explicitly separate from the browser record because the browser intentionally keeps its token private and disables resubmission after success. API test RFQ ID RFQ-20261007-57c9b07ce3eaba4785bdd3595dace141; created UTC 2026-10-07T04:39:26.681Z. Additional schema/honeypot/malformed400, GET/OPTIONS405, media415, origin403, >64KiB413 and six anonymous Firestore403 checks passed (17 checks total). No production rate-limit stress. Persistent provider/global limiter state read back; Hosting relay/provider hashes can vary, so no claim of guaranteed per-visitor identity. Global cap remains the independent backstop, and unit/emulator saturation checks passed.

## Cleanup and admin visibility

Both synthetic RFQs and both matching receipts were removed only after private synthetic identity/content verification; exact documents return404. Final rfqs0 and receipts0. No real Buyer records deleted, security/abuse counters preserved for ACTIVE TTL. Owner's existing private Console/inspector access verified RFQ ID, created_at, status, company, contact and request. No public admin UI, paid notification provider, outgoing email or supplier outreach added.

Daily review SOP: VIETNAM_SOURCING_OPERATIONS.md. At least one business-day inspection; internal one-business-day target; statusnew→reviewing→qualified/lost; no public SLA promised. Email/Telegram notification remains an optional separately authorized enhancement, not a hidden launch dependency.

## Live logs and infrastructure

New live window: runtime entries22, safe structured events14, request-detail entries0, synthetic PII/confidential-marker matches0. No body/email/phone/company/contact/specifications/notes in runtime event logs. Allowed status/error_code/latency/timestamp/security events retained, including safe INVALID_JSON400. Cloud Monitoring request-count/latency each returned6 points; audit activity11 entries. No broad ERROR/audit exclusion. Historical pre-hardening platform records remain under existing retention; this validates new ingestion.

Function ACTIVE; RFQ_INTAKE_ENABLED=true. Firestore rfq-intake healthy, same region; deny-all rule source exactly unchanged, TTL ACTIVE. Project/Run IAM equal prior verified policies; dedicated runtime/custom conditioned least-privilege role unchanged. Existing broader build identity explicitly remains prior separate technical debt. Extensions API still DISABLED. No additional infrastructure expansion.

## Existing site regression and final state

All80 live HTML/script/style/sitemap artifacts matched merged dist. /, /esim, /esim/japan, /esim/korea, /esim/joytel, /vietnam-mosquito-repellent, /vietnam-packing-list, /anti-theft-crossbody-bag-guide and /vietnam-jcb-lounge exactly match original approved production bytes; /privacy matches reviewed sourcing privacy addition. Mosquito commercial section/product keys/merchants/hrefs/affiliate_cta_view/experiment ID/title/meta/H1 unchanged under28-day freeze. eSIM JOYTEL Japan/Korea, Klook Japan/Korea and KKday Vietnam/Vinaphone public landing checks all passed; active LsI9l and parked zf2Z8/z4xjt0; WaySim comparison stays internal. Unrelated affiliate href changes0; affiliate tracker privacy tests passed; sitemap includes sourcing and JCB mixed-case redirect301 correct.

RFQ_INTAKE_ENABLED=true / Function ACTIVE / actual production browser durable persistence passed. Final CI/remote SHA and Hosting metadata are independently read back in the final response. No unresolved release gate.

VIETNAM SOURCING MVP LIVE
