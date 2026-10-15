# Staged customer privacy in the services preview

This is a staging-only extension of the completed marketplace, not a second backend or a production rollout. Preview: https://comeback-traveler-web--services-integration-we1toi2q.web.app/services . Supabase: `jqzyduwzcbhylgjlrdvf`. The independent production backend, administrator grants, SMTP configuration, notification worker and existing travel production release are unchanged.

## Access contract

| Caller/stage | Work information | Customer name | Phone/address | Private photos |
| --- | --- | --- | --- | --- |
| Visitor / unverified account | No private case API | No | No | No |
| Unapproved provider / another customer | No unrelated case | No | No | No |
| Approved, eligible quotation provider | Reviewed description, district, time, budget and workflow identifiers | No | No | Only customer-authorized quotation photos approved safe by an administrator |
| Selected, awaiting provider acceptance | Necessary case/quote | No | No automatic disclosure | No automatic disclosure |
| Individually authorized site visitor | Necessary case | No | Only explicitly checked fields; exact provider; 1–48 hours | Only explicitly authorized safe photos; per-file owner sharing still required |
| Confirmed matching provider | Necessary service case | No | Only after explicit customer sharing consent and actual acceptance | Only owner-authorized safe photos |
| Cancelled/completed/former provider | Own quote/match receipt may remain | No | No new access | No new access |
| Customer / administrator | Own case / necessary review | Own data / necessary review | Audited RPC; administrator must specify a valid purpose | Audited streaming gateway; administrator purpose required |

Quotation visibility remains limited by approved provider category, district and test/real-account partition. Pending jobs remain hidden from providers. Selection is still not a successful match. Confirmation still records the immutable quote snapshot and existing notifications. Cancellation/dispute pauses sensitive sharing; completion, provider suspension, consent withdrawal, expired/revoked visits and selection/status changes are enforced by the backend.

## Database and delivery

Forward migrations `202610150010`–`202610150012` extend the existing schema. A staging-only runner checks the exact project and records normalized SQL checksums in `private.integration_migrations`. It must not be repurposed for production without a separately approved rollout.

- Revoke authenticated SELECT on `job_private`; its RLS SELECT policy is also false. Sensitive values are returned only by `read_job_contact`, which checks the caller/stage and records successful access. Service providers never receive `contact_name`; limited site grants return null for unchecked fields.
- Profiles and provider application table reads are self-only. Existing administrators use bounded audited application/contact RPCs, preserving review behavior without bulk customer phone access.
- Match-sharing consent is per case, timestamped and versioned. No legacy case is silently opted in. The backend gates initial selection/acceptance; a later administrative dispute resolution cannot restore withdrawn consent.
- Site visit authorization is per provider and field, expires in at most 48 hours, is customer-controlled and invalidates on case/selection changes. Expiry is checked at request time, without relying on cron.
- Storage remains private. No user SELECT policy means listing, raw authenticated reads, public URLs and new user-signed URL creation cannot provide photo bytes.
- `service-private-photo` retains platform JWT verification, validates the real Auth user, invokes the permission/audit RPC using that user's JWT, then uses its server-only Storage credential to return only the authorized image bytes. It never returns a reusable signed URL. Every request is checked anew and returns `private, no-store`.
- The gateway validates JPEG structure, strips all APP/COM metadata including EXIF/GPS/XMP/IPTC and removes trailing payloads. It does not recognize, blur or redact image pixels. Customers must obscure sensitive content before upload; administrators must inspect the full image before marking it safe.
- A photograph requires both per-file customer sharing and a safety review. Review is bound to the actual Storage object ID, with deletion cascade, so replacing a file at the same path cannot inherit an old approval. Existing photo bytes cannot be overwritten with user upsert.
- Contact/photo access logs contain actor, case, resource, role/purpose and time, not phone/address/image contents. Customer and administrator can inspect the latest 100 case records; other providers cannot.
- Previously rendered/downloaded information cannot be remotely recalled. Blob URLs are revoked on reload/navigation; private content is cleared on page exit. Access revocation governs subsequent requests.

Administrator photo review, customer consent, per-photo scope, visit grant/revocation and access history are in `/services/job?id=…`. Administration remains at `/services/admin` and uses the existing backend role; no new permanent administrator was created.

## Validation and release boundaries

`npm test` includes a PostgreSQL/PGlite migration and cross-account suite plus JPEG/gateway tests. Baseline snapshots are fixtures under `supabase/baseline`; cron infrastructure is not provisioned in the local test. Real verification runs are separate:

```
node scripts/services/privacy-api-test.mjs jqzyduwzcbhylgjlrdvf
node scripts/services/api-test.mjs jqzyduwzcbhylgjlrdvf
node scripts/services/privacy-browser-test.mjs
node scripts/services/verify-preview.mjs
```

The live tests use verified synthetic Auth accounts marked in `private.test_users`, isolated case records, real PostgREST/RPC/Storage HTTP, and visible browser actions. They remove their own data and roles. Their activity is excluded from real metrics and real administrative mail. They are not evidence of real customer transactions.

The owner explicitly approved rotation of the two legacy staging photo paths after a reference check found no full-path references in 12 related tables. Contents were preserved; a local ignored rollback journal records the mapping, and old signed links were verified refused. No production photo was moved. Do not run the one-time rotation again without inspecting the existing journal.

Tailwind discovery excludes service/backend/testing artifacts via `.gitignore`; tracked additions must be staged explicitly with `git add -f`. This preserves the original travel CSS bytes. Never force-add `supabase/.temp`, environment files, test credentials or the ignored working directory.

## Rollback / future production approval

Keep the draft PR unmerged and deploy only `services-integration`. To withdraw the preview, expire that channel or restore its preceding Hosting version. Do not clone the staging preview to live. Preserve the privacy migration and data; reverting to a legacy direct-read client will fail closed for private data. The old independent Firebase staging frontend has not been rewritten to use the new audited APIs; use this updated integration preview for privacy acceptance. The independent Firebase production frontend/backend are untouched.

Do not undo the security changes by regranting `job_private`, adding a Storage SELECT policy, inferring missing customer consent or placing a server key in the frontend. Production cutover would require a separate approval, a production-configured photo gateway/origin, the forward migrations and actual production auth/callback checks. The current gateway and migration runners intentionally reject the production project.

Operational background: [Supabase function authentication](https://supabase.com/docs/guides/functions/auth). Test/preview evidence is delivered separately with the acceptance report; no SMTP inbox delivery is claimed by these privacy tests.
