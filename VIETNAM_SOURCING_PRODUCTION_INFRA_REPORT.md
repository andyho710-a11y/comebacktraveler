# Vietnam Sourcing Production Infrastructure Report

Assessment: 2026-10-07 Asia/Taipei. Integration branch `codex/vietnam-sourcing-production-prep`; starting commit `14d95be06f8c6028aae9e2b442e9f3747e362a86`. Final commit is reported in chat to avoid a self-referential SHA. Production main remains `102035b8201073710aeae0867d63f4d408b87de3`.

## 1. Security advisory assessment

See SECURITY_ADVISORY_ASSESSMENT.md: 13 vulnerable-package rollup, 49 unique advisory URLs, 51 version-range entries. Includes installed path/version, severity/GHSA/CVEs named in registry, direct/transitive/dev flags, build/runtime exposure, bundle/deployment applicability, remediation/breaking risk and per-package/per-entry launch decisions. Fresh Functions production audit 0.

## 2. Critical advisory launch decision

GHSA-26w7-cxv4-gfx2 Astro AVIF RCE: NON-BLOCKING TECH DEBT in this deployment architecture. Static Hosting only; no Astro/Sharp in Functions tree, no public image processing or uploads; neither auth/request parser nor image execution path reaches this critical helper. Upstream remediation Astro >=7.2.8/Sharp >=0.35.4 needs independent reviewed toolchain work, including later decoder advisories; no blind major upgrade. Reopen gate for SSR/image upload/untrusted build inputs. Maintainer advisory: https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2 .

## 3. APIs / preflight / quotas

Project comeback-traveler-web (52799693173), billingEnabled=true, active. Existing Auth, app Storage settings/rules, live Hosting/custom domains and GA4 unchanged. Only five core APIs explicitly enabled; other newly enabled dependencies came from platform/Firebase provisioning. Eventarc is a tooling/provisioning dependency, no RFQ event trigger.

| API | Before | After | Reason |
|---|---|---|---|
| artifactregistry.googleapis.com | DISABLED | ENABLED | Function build container artifacts |
| cloudbilling.googleapis.com | DISABLED | ENABLED | Transitive platform/service-enablement dependency of requested core APIs; not separately enabled by task command; no app feature configured |
| cloudbuild.googleapis.com | DISABLED | ENABLED | Node22 source/container build |
| cloudfunctions.googleapis.com | DISABLED | ENABLED | HTTP Functions v2 control plane |
| containerregistry.googleapis.com | DISABLED | ENABLED | Transitive platform/service-enablement dependency of requested core APIs; not separately enabled by task command; no app feature configured |
| deploymentmanager.googleapis.com | DISABLED | ENABLED | Transitive platform/service-enablement dependency of requested core APIs; not separately enabled by task command; no app feature configured |
| eventarc.googleapis.com | DISABLED | ENABLED | Gen2 provisioning dependency automatically enabled by Firebase/platform; no app event trigger deployed |
| firebaseextensions.googleapis.com | DISABLED | ENABLED | Firebase CLI discovery prerequisite; no extension deployed. Cleanup proposed but combined action rejected by automatic review. |
| firebaserules.googleapis.com | ENABLED | ENABLED | Named Firestore client deny-all rules |
| firestore.googleapis.com | DISABLED | ENABLED | Named database, server persistence and transactions |
| logging.googleapis.com | ENABLED | ENABLED | Non-sensitive runtime event logging |
| run.googleapis.com | DISABLED | ENABLED | Gen2 HTTP runtime |
| source.googleapis.com | DISABLED | ENABLED | Transitive platform/service-enablement dependency of requested core APIs; not separately enabled by task command; no app feature configured |

Cloud Functions/Run/Firestore quota API checks succeeded (8/28/16 metric definitions). Relevant examples: Functions build time 300000 seconds/day/project; Functions/Run CPU effective allocation 200000 mCPU per minute/project/region, Firestore database operations 60/minute/project, composite index limit1000/database. No quota override or Billing change. Successful deployment demonstrates current Node22/asia-east1 availability; quotas are not a spend cap.

## 4. Database

Created exactly named `rfq-intake`, Native Standard. Before database list empty. Database delete protection ENABLED; no database-wide deletion or other database mutation. Current API reports freeTier=true as first project database; this is not a promise of zero costs. PITR disabled; no scheduled backup claimed.

## 5. Region

Database and Function both asia-east1 (Taiwan), matching existing audited code and Taiwan/Asia latency goal; avoids cross-region app traffic. Region proven by real Function deployment and database metadata, not guessed from a default.

## 6. Collections

`rfqs` (complete schema/status=new), `_rfq_receipts` (atomic idempotency fingerprint+RFQ ID), `_rfq_abuse` (provider hash + global counters). Server authoritative timestamps/IDs, RFQ ID random128bit component. Browser CRUD/list denied. Required schema fields present in actual synthetic stored record; attachments empty.

## 7. Rules

Named-target Firebase deploy `--only firestore:rfq-intake` succeeded. Existing minimal deny-all rules retained; no public allow. Actual anonymous get/list/create/update/delete/nested get all403. Prior emulator 32 authenticated/anonymous operation gates remain applicable to unchanged rule text; no production Auth test-user creation. Admin SDK bypasses rules and is constrained by IAM.

## 8. Indexes

Composite indexes empty/ready, collection-group wildcard field indexing disabled for all three collections; field configs read back from API. RFQ service uses document references/transactions, not indexed user queries. Private admin inspector uses bounded pagination and local ordering; no disabled-field server orderBy/filter.

## 9. TTL

`_rfq_abuse.expires_at` ACTIVE. Cleanup only abuse counters; limiter resets by reset_at independent of TTL latency. RFQ and receipts have no short TTL, preserve idempotency until owner deletes paired documents per retention policy. Privacy retention must be administratively enforced; no fabricated short business retention period.

## 10. Service account

`rfq-intake@comeback-traveler-web.iam.gserviceaccount.com` dedicated runtime, no keys created or exported. Cloud Function deployed with that exact account. Existing project compute/build identity remains separate and unchanged; no new Owner/Editor/BillingAdmin grants. Platform source buckets/container repository are backend build resources, not public upload pipeline or app Storage deployment.

## 11. IAM

Custom role `projects/comeback-traveler-web/roles/rfqIntakeRuntime`: datastore.databases.get, datastore.entities.get/create/update only. No list/delete/index/database administration. Condition `resource.name == "projects/comeback-traveler-web/databases/rfq-intake"`. Production transaction persistence/retry succeeds with these permissions. Policy equality excludes other databases; no other production database was created just for a negative test. No broad grant added. Stdout logger is captured by platform; runtime does not call Logging API, so no logWriter role needed. Public invoker limited to this Run service (required public RFQ endpoint); validation/Origin allowlist is abuse control, not caller authentication.

Existing default compute identity is used by Cloud Build and has pre-existing Editor access. It is not the RFQ runtime; it was not granted or expanded this round and cannot be claimed least-privilege. Recommend a separate reviewed build identity migration, avoiding changes to an existing shared account. Runtime data IAM is least-privilege as verified.

## 12. Environment

RFQ_SERVICE_ACCOUNT equals dedicated account; initial RFQ_INTAKE_ENABLED=false. Enabled temporarily for synthetic test and restored false after testing. Final Function ACTIVE / enabled=false. Production .env file ignored, no secrets/browser config or service account key committed. Environment PATCH changed only this Function's environmentVariables and preserved other platform values. Each completed rollout rebuilt Node22 service successfully.

## 13. Function deployment

Only `functions:rfq-intake:vietnamSourcingIntake` deployed. Node22, asia-east1, 256MiB, CPU1, concurrency10, maxInstances2, timeout30s, minimum instances0. URL: https://asia-east1-comeback-traveler-web.cloudfunctions.net/vietnamSourcingIntake

First Cloud Build failed npm ci: uuid@9.0.1 missing from lock. Minimal fix changed Functions parent-scoped gaxios override to version-specific `uuid@9.0.1:11.1.1`; final lock unchanged, root packages untouched. npm10 clean install/audit0/backend13 passed, then actual Cloud Build passed. Windows shell/discovery retry was solved using the installed official Firebase CLI's supported SDK output-manifest discovery with60s timeout. Final CLI deployment success and actual ACTIVE status both checked.

New Function container repository cleanup policy30 days configured; no unrelated artifact repository policy changed. No live Hosting deploy, main merge/push, nav exposure, supplier outreach, account/payment/file-upload/CRM work.

## 14. Synthetic production test

Disabled POST503/stored:false, RFQ count unchanged. Temporarily enabled: exactly one clearly synthetic RFQ201, Firestore record+receipt match, duplicate200 same RFQ ID, changed duplicate409, honeypot400, invalid fields400. GET/OPTIONS405, content type415, forbidden Origin403, payload >64KiB413; cache no-store/private and no ACAO. Malformed JSON rejected by upstream framework400 with generic Bad Request HTML, no public stack/internals; frontend already handles non-JSON failure without success. Framework error happens before application handler.

17 enabled verification checks; 11 public endpoint requests total, five entered rate transaction, no high-frequency stress. Provider and global counters both5, persistent state read back. Full saturation proof stays in emulator suite, not production. Provider extraction actual direct endpoint path verified only; future Hosting proxy chain must be checked at authorized site release.

RFQ ID: `RFQ-20261007-7c52591140b1fcef7d49c0d3410fc65c`. Created UTC: `2026-10-07T03:04:17.926Z`. No company/contact/email/phone/free text copied into this report. Private owner-authenticated REST inspection verified company/contact/requirement and status server fields, without a public dashboard.

## 15. Cleanup

Synthetic RFQ and matching idempotency receipt precisely deleted after identity/content checks; both404 confirmed. Remaining RFQs0. Abuse counters preserved until TTL to avoid weakening protection. Function returned to false; no synthetic Buyer remains. No real Buyer data used or deleted.

## 16. Logging / privacy

Application emits only rfq_intake_stored/rfq_intake_storage_failure constants. Actual Cloud logs contain none of the synthetic company/name/email/phone/requirement markers. GA4 source unchanged: only safe normalized category/services/page_path; success after confirmed persistence; Preview/local do not load prod GA.

Residual privacy issue: platform Run request logs include remoteIP (12 observed test request entries); framework malformed-JSON stderr emits SyntaxError stack and future parse errors may contain caller snippets. Public response exposes neither stack nor service account. Therefore do not claim every historical/platform log is PII-free. Existing private test log entries remain under current log retention; no broad log deletion attempted.

Concrete proposed exclusion (NOT APPLIED):
```text
resource.type="cloud_run_revision"
AND resource.labels.service_name="vietnamsourcingintake"
AND (log_id("run.googleapis.com/requests")
     OR (log_id("run.googleapis.com/stderr") AND textPayload:"SyntaxError"))
```

This would affect only RFQ request/JSON-parser error logs; retains constant app stored/failure events, other stderr/system events, platform request/error/latency metrics and Cloud audit logs. Tradeoff: detailed per-request forensic and malformed-JSON error logs would no longer be stored in the default logging destination. Reviewer rejected the combined exclusion/API-disable action: it requires explicit approval for durable loss of request/error visibility and coupled API changes. No exclusion or API disable occurred; no retry/workaround attempted. Need owner decision and post-change log/metrics verification before public release.

## 17. Admin visibility / backup and recovery

Private read-only `scripts/inspect-vietnam-sourcing.py` uses existing gcloud operator login/token in memory; default summary omits PII, --details EXACT_RFQ_ID reads private full record locally. No key, writes, remote notification or analytics. Pagination bounded1000 with explicit overflow failure. Current authenticated project owner successfully inspected synthetic record and final empty collection.

Alternative Firebase/Google Cloud Console select comeback-traveler-web → Firestore → rfq-intake → rfqs. Existing owner IAM can view full records; browser rules remain deny-all. Do not grant runtime list/delete merely to support inspection. Export can be an explicit private local JSON copy using the inspector; secure encrypted storage, never repo/CI/public bucket. Managed export to restricted private bucket needs separately reviewed destination/permissions. No auto backup configured or promised; delete protection protects database deletion, not accidental document deletion; narrow manual deletions need confirmation/content checks. Current default 1-hour recovery metadata is not a7-day PITR or scheduled backup.

## 18. Notification operating procedure

WHO: Comeback Traveler owner, using existing private project Owner identity; any delegated operator gets approved read access, not public access. WHERE: named rfq-intake Console or private read-only inspector. HOW OFTEN: each Taiwan business day09:00 and17:00; internal target inspect new RFQ within1 business day. No website SLA added. WHAT STATUS: new → reviewing upon human inspection, set updated_at, then applicable existing schema status (qualified/supplier_search/etc.) only after real work. No automatic supplier sends. Avoid deleting receipt without matching RFQ retention decision. This procedure is documented, not an automation/calendar reminder created on the owner's behalf.

Options only, not implemented: Email — Monitoring signal/email channel or approved provider, low-to-medium setup, provider recurring cost depends on chosen plan; credentials in Secret Manager if needed. Telegram — bot/channel setup medium, potential low provider cost but operational maintenance, token in Secret Manager. Both increase disclosure risk; payload only New RFQ received + RFQ ID/time/normalized category, never full specs/price/phone/email/notes. Notification receipts are not GA4 dimensions. Owner must actually adopt daily inspection before public form release.

## 19. Cost considerations

Costs: Functions CPU/memory/requests and Cloud Build/artifact storage, Firestore reads/writes/storage/TTL deletes, Logging ingestion/retention/network. minInstances0 avoids deliberate idle allocation; maxInstances2/concurrency10 limits capacity, not spend or total incoming requests. A rejected invalid submission can still incur compute, and post-origin/type/cap invalid requests consume abuse transactions. Global100/10min is app protection, not guaranteed monthly spend cap.

Current first database metadata freeTier=true; TTL deletes are billed outside free use. Source: https://firebase.google.com/docs/firestore/pricing . Recommend owner review last30-day project baseline, set a separately approved monthly incremental budget, alerts50/80/100%, daily Run/Firestore/Logs usage review firstweek. Budget alerts do not stop spending. Billing account/budget not changed. No unsupported currency estimate or paid notification service added.

## 20. Remaining owner actions

**2 outstanding approvals in this round:**
1. Approve/refuse the exact scoped logging exclusion and visibility tradeoff above (or select another reviewed privacy-preserving design), then verify logs/metrics again. This is the release-blocking privacy decision.
2. Approve cleanup of firebaseextensions.googleapis.com, newly enabled only by Firebase CLI deployment discovery; no extension deployed. Combined cleanup call was rejected and API remains enabled. Check current dependencies before a standalone disable; do not force-disable dependent production services.

Later site release is explicitly out of scope: owner separately authorizes enabled=true + Hosting exact rewrite/frontend + main integration and validates real Hosting proxy chain. Adopt daily RFQ SOP, consider cost alerts, reviewed toolchain patch and separate least-privilege build identity migration. These are clearly recorded recommendations/future-release gates, not claimed completed actions or included in the two current approval count.

## 21. Release recommendation / verification

Backend ACTIVE, correct region/runtime/SA, named DB/rules/indexes/TTL verified; actual synthetic transaction/retry and cleanup successful; private operator inspection functional. Final RFQ disabled. Production Hosting live release/version unchanged; no main change/push/deploy. Build45 pages/frontend105/backend13 gates re-run after minimal package fix; all protected HTML/JS/CSS remain exact except already approved privacy addition. Prior unchanged backend emulator5/5 evidence retained, no fresh high-frequency production stress claimed.

Ready backend infrastructure does not satisfy final privacy gate while platform log collection decision is unresolved. Automatic approval rejection is an owner-action blocker, not a reachable critical package blocker.

BLOCKED — OWNER ACTION
