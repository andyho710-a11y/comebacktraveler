# Vietnam Sourcing Operations

Owner: Comeback Traveler owner, using the existing approved private Google Cloud/Firebase identity. Production site: https://comebacktraveler.com/vietnam-sourcing . Backend: vietnamSourcingIntake / asia-east1; named Firestore database rfq-intake. No public admin UI, automatic supplier outreach, payment handling or file uploads.

## Daily RFQ review

Inspect new RFQs at least once each Taiwan business day. Recommended review windows09:00 and17:00. Internal target: review a new RFQ within one business day; this is not a website/customer SLA. Notification service is not configured; do not assume an email/Telegram message will arrive.

Open Firebase/Google Cloud Console → project comeback-traveler-web → Firestore → named database rfq-intake → rfqs. Confirm rfq_id, created_at, status, company, contact, product/specifications/quantity and requested services. The existing scripts/inspect-vietnam-sourcing.py offers private read-only summaries; --details requires an exact RFQ ID. Use only the approved operator's existing identity; never copy tokens/keys or RFQ details into Git, GA4, logs, public documents or supplier mass mail.

## Case handling

For each new genuine RFQ, manually move status new → reviewing and update updated_at in UTC ISO format. Read the requirement and confirm completeness/contact consent; clarify needs individually when authorized. Move reviewing → qualified if scope and Buyer intent fit, or reviewing → lost with a private minimal reason if not proceeding. Update timestamps for each transition. Do not silently delete genuine RFQs or alter idempotency receipts as a status change. Do not treat synthetic validation records as leads.

Quote separately according to product, sourcing difficulty, supplier count and scope. Define any success/service fee before formal engagement. Buyer normally pays Supplier directly; we do not collect goods payments. Candidate supplier information is not a quality guarantee. Samples, inspection, contract and necessary site confirmation remain Buyer decisions. No new fixed price, payment gateway, upload pipeline, supplier account or guarantee is authorized.

## Monitoring and privacy

Review Function ACTIVE/health, Cloud Run request count/status-class/latency and safe rfq_intake_result/security events. Alert investigation focuses on 500, rising429, abnormal latency and missing persistence signals. Available events include RFQ_STORED, IDEMPOTENCY_REPLAY, IDEMPOTENCY_CONFLICT, INVALID_SCHEMA, INVALID_JSON, HONEYPOT and RATE_LIMITED. Safe fields are status/error_code/timestamp/latency; full Buyer data is inspected only privately in Firestore. Audit Logs are retained. Do not relax the targeted request/parser exclusion to debug with request body or client IP.

Persistent provider-address and global100/10min controls remain enabled. Hosting relay addresses can vary; provider buckets are not a guaranteed unique end-user identifier. The global cap is the backstop. Do not claim these limits are a financial spend cap, and do not run production rate stress. Investigate abuse via safe aggregates rather than logging PII.

Firestore client rules remain deny-all. Runtime account is dedicated to this database; do not grant list/delete/admin just for inspection. Abuse expiry TTL is ACTIVE; do not manually erase counters/security evidence during retry testing. RFQ/receipt retention is an owner-administered policy; no automatic short RFQ TTL or backup guarantee is configured. Any authorized RFQ deletion must verify identity/retention purpose and handle its corresponding receipt consistently, using approved private access.

## Incident and controlled tests

If the production RFQ flow cannot confirm persistence or any privacy/security gate fails, immediately set RFQ_INTAKE_ENABLED=false on ONLY vietnamSourcingIntake. Use the Functions v2 API environmentVariables PATCH with updateMask=serviceConfig.environmentVariables, first read and preserve all other existing variables. Wait for completed rollout and ACTIVE, then verify disabled endpoint returns503/stored:false and makes no RFQ write. Do not deploy unrelated resources or alter IAM/rules/metrics/Audit Logs. Correct and retest before a separately authorized re-enable.

Controlled validation uses clearly synthetic company/contact/email/phone/specifications, no real Buyer information. Record only RFQ ID/time/status and receipt match in reports. After private identity checks, remove only synthetic RFQ/receipt pairs; verify absence, preserve limiter/security evidence and let ACTIVE TTL remove abuse counters. Do not send test contacts to any external notification/outreach service.

## Release boundaries

CI pushes to main deploy Hosting only. They do not deploy Functions/rules. Extensions API is disabled because runtime has no dependency; future Firebase CLI Function discovery can request it again, so review narrowly rather than disabling other services. Public reception requires intake=true + ACTIVE and a verified Hosting rewrite. Runtime data IAM is restricted; the pre-existing broader build identity remains a separately reviewed improvement, not an invitation to change shared IAM.
