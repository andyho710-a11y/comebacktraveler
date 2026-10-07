# Vietnam Sourcing Production Infrastructure Report

Assessment: 2026-10-07 Asia/Taipei. Integration branch `codex/vietnam-sourcing-production-prep`; original infrastructure baseline `14d95be06f8c6028aae9e2b442e9f3747e362a86`; this owner-approved follow-up starts at `23fd2e3b170b355695e98f9932251887abcdf593`. Final commit is reported in chat to avoid a self-referential SHA. Production main remains `102035b8201073710aeae0867d63f4d408b87de3`.

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
| firebaseextensions.googleapis.com | DISABLED | DISABLED | Temporarily enabled by Firebase CLI provisioning; owner-approved standalone disable completed after zero-dependency audit. No other API disabled. |
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

## 14. Post-change synthetic production test

Extensions API was disabled BEFORE these tests. Backend-only source deployment succeeded; environment rollouts through the Functions API also completed with Extensions disabled. Disabled POST503/stored:false and no persistence. Temporarily enabled: synthetic RFQ201 and Firestore transaction/receipt match, identical retry200 same RFQ ID, conflicting duplicate409, honeypot400, invalid schema400. GET/OPTIONS405, content type415, forbidden Origin403, >64KiB413 and malformed JSON400 (generic public Bad Request; no stack). Six anonymous Firestore read/list/create/update/delete/nested-read checks403. All17 end-to-end checks passed. No real Buyer input or merchant actions.

Complete test RFQ ID `RFQ-20261007-3002d5223e8b9a5f4232415dae6ddb59`; created UTC `2026-10-07T03:35:51.936Z`. An earlier test-helper import-name collision interrupted checks after persistence/retry; that synthetic pair was safely deleted before a complete rerun. Exactly two synthetic RFQs were created over the two attempts; both and both receipts were removed. No company/contact/payload copied into this report. Provider/global persistent counters read back at7; production saturation intentionally avoided, emulator covers both limits.

## 15. Cleanup

Known synthetic document identities and synthetic company marker verified before narrow deletion. Both RFQ/receipt pairs now absent; remaining RFQs0. Abuse counters retained for ACTIVE TTL, preserving protection. Final Function ACTIVE / RFQ_INTAKE_ENABLED=false. No data deletion outside synthetic records/receipts.

## 16. Owner-approved log privacy hardening and observability

Owner directly approved this follow-up's two actions. Applied project exclusion `rfq-intake-request-privacy`, active on `_Default`, exactly:

```text
resource.type="cloud_run_revision" AND resource.labels.service_name="vietnamsourcingintake" AND (log_id("run.googleapis.com/requests") OR (log_id("run.googleapis.com/stderr") AND textPayload:"SyntaxError" AND textPayload:"body-parser"))
```

Scope: only this Cloud Run service's IP-bearing request log stream and raw stderr errors that contain BOTH SyntaxError and body-parser. No all-ERROR or whole-Function exclusion. Unrelated SyntaxError/ERROR, other services, stdout structured application logs, system health/startup logs and audit streams remain retained. Sink readback shows only `_Default` and `_Required`; `_Required` audit sink has zero exclusions. Detailed per-request client IP/headers/body forensic logging is intentionally omitted; status/latency monitoring remains available.

Malformed JSON fails in the upstream framework before the intake handler. The narrow console sanitizer recognizes only that JSON-parser stack, replaces it with structured event `rfq_intake_security_event`, `error_code=INVALID_JSON`, `http_status=400`, safe rejected status and timestamp; neither raw error, stack nor body is forwarded. All unrelated console errors are forwarded unchanged. Actual production malformed input containing a unique synthetic email marker proved INVALID_JSON400 was retained while the marker and raw parser payload were absent. Public HTTP semantics remain unchanged.

The handler emits explicit safe fields only: event/message, normalized error_code, http_status, accepted/rejected status, timestamp and latency_ms. No request-derived IP, company/contact/email/phone/specification/price/notes/attachments or idempotency token is logged. Events include persisted201, replay200, conflict409, schema/honeypot400, rate429 and storage500. Unit tests verify rate-limit and500 telemetry and logging failure cannot undo persistence; 500 maps to ERROR severity, schema/security rejects to WARNING. No production fault injection or saturation was performed.

Actual post-change observation: 38 runtime entries, 14 safe structured events, request-detail log count0, synthetic confidential marker matches0. Stored/replay/conflict/schema/honeypot/INVALID_JSON signals all present. Cloud Monitoring request count and latency each returned 13 series/83 points; audit activity returned 52 entries. Platform metrics remain independent of log exclusions; status-class500 visibility and availability/latency remain supported. Function system events and safe app status timing are retained. Existing GA4 privacy behavior unchanged.

Historical logs from the earlier infrastructure test are not retroactively erased by an exclusion; previous private platform IP/parser entries remain governed by bucket retention. This pass proves new ingestion after the change, not a claim that all historical logs were scrubbed. No broad historical deletion or audit deletion.

Extensions dependency check: Firebase Extensions API instance list200 with0 instances; targeted repository source/config/package/workflow search has no Firebase Extensions import/manifest/runtime call; deployed Function is GEN2 HTTP with no event trigger and only Admin Firestore/Functions params/logger. Service Usage standalone disable succeeded WITHOUT force/dependent-service disable. Final API state DISABLED; core runtime/storage APIs remain available as proved by the tests. A future Firebase CLI deploy may request Extensions API for discovery again; inspect and repeat approved narrowly scoped cleanup when necessary rather than treating this as a runtime requirement.

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

**0 remaining owner actions for this approved infrastructure follow-up.** Targeted logging privacy hardening and standalone Extensions API disable are complete and verified. No additional external notification service, IAM grant, API disable or unrelated infrastructure added.

Site release remains a separately authorized future task: main integration, exact Hosting rewrite/frontend release, enabling intake and validating the actual Hosting proxy chain. Daily admin inspection/cost review, future toolchain patch and separate build-identity migration remain documented operational recommendations; they are not unfinished approvals in this two-action scope.

## 21. Final production infrastructure gates

- READY: Function ACTIVE; RFQ_INTAKE_ENABLED=false; named rfq-intake database healthy, same asia-east1 location.
- READY: exact deny-all client rules unchanged; six real anonymous operations403; isolated emulator rules and anti-abuse suite5/5.
- READY: abuse TTL ACTIVE, no RFQ/receipt retention/index/rule change.
- READY: project and Run IAM policies equal before/after; dedicated runtime/custom conditioned database role unchanged. Existing broader build identity remains an explicitly separate prior limitation, no new grant.
- READY: new runtime logs omit payload/PII/request-IP and raw parser details; safe structured INVALID_JSON/400 and required operational/security events retained.
- READY: Audit Logs and Cloud Run request-count/latency metrics retained and read back; other ERROR/system health logs retained.
- READY: Extensions API DISABLED with no dependency; synthetic persistence/receipt/retry409 proof after disable; synthetic RFQs and receipts removed, remaining RFQs0.
- READY: build45 pages; frontend105/105; backend16/16; emulator5/5; Astro59 errors/0 warnings/1 hint, new diagnostic delta0. Protected production HTML/JS/CSS byte gates passed. No eSIM/Mosquito/Affiliate or frontend changes.
- READY: live Hosting release/version exactly equals before: release1791336282578000, versionb4360d804ef7e9ea. Main/origin main remains102035b8201073710aeae0867d63f4d408b87de3. No main merge/push or Hosting deploy.

Evidence is local private operational output under D:/astro/.tmp-sourcing-owner-actions: dependency/Function snapshots, exact exclusion/sinks, enabled/disabled/cleanup checks, safe log/Monitoring/Audit query results, IAM/rules/TTL/Hosting readback, build/frontend/backend/emulator/typecheck logs. No tokens or confidential RFQ fields committed. Final commit SHA is in the delivery response.

PRODUCTION INFRA READY FOR SITE RELEASE
