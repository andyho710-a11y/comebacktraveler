# High-level production release and recovery

The owner explicitly authorized the 2026-10-16 production cutover of PR #2 to https://comebacktraveler.com/services. This supersedes the preceding staging-only release boundary for this cutover. Free matching remains free: no commission, collected payments, or payment integration.

## Existing resources

- Application: `andyho710-a11y/comebacktraveler`, `/services` namespace. No new backend or account system.
- Production Supabase: `nneammnczvwziggoyzrn`; staging: `jqzyduwzcbhylgjlrdvf`.
- Existing verified production administrator: `andyho710@gmail.com`. No permanent role was created or changed.
- Formal admin: https://comebacktraveler.com/services/admin; login: https://comebacktraveler.com/services/account?next=admin.
- Production-backed acceptance channel: https://comeback-traveler-web--services-release-qrv8b9r1.web.app/services. All preview responses remain noindex.
- The independent Firebase site uses the privacy-compatible frontend. Its original root and account/job links redirect into its own `/services` namespace, so old recovery links keep working. Its staging channel remains unchanged. The original legacy frontend must never be reactivated against the upgraded private-data permissions.

## Backup and migration gates

Before remote changes, production contained one verified administrator and zero jobs/photos. The application's 18 tables, all rows, 47 function definitions, columns, grants, policies, triggers and baseline schema scripts were saved in `work/release/production-before.dpapi`. Windows DPAPI restricts decryption to this Windows account; no plaintext database export or credential was saved. Managed Auth credentials, SMTP secrets and Vault secrets were not exported. This is a targeted application migration backup, not a full managed Supabase project backup.

The encrypted file was read back and decrypted, and its exported application rows were restored into a disposable local PostgreSQL database. All 47 function definitions matched the saved baseline. Migrations 010, 011 and 012 then succeeded against the restored state, preserving the existing administrator. No Storage byte backup was required because there were no production objects. Future releases with photos or active jobs require additional backup and compatibility review.

Production uses the exact staging-tested migration checksums. The photo streaming gateway retains platform JWT verification, rechecks user/RPC authorization on every request, removes JPEG metadata, sends no-store responses and creates no signed URLs. CORS is separated by backend with exact production, legacy and configured acceptance origins.

Production operations require `--production-release` and the fixed production reference in the `release-*` helpers. Existing staging-only migration and photo rotation helpers retain their original guards. Do not rotate photos again or downgrade the privacy permissions as a rollback shortcut.

## Configuration and acceptance

GitHub contains only public URL/anon-key variables. Production Auth site URL is the formal `/services/account`; exact recovery callbacks include the release preview and compatible legacy routes. Other Auth and SMTP settings are compared before/after and preserved. Notification mail points to the formal `/services` namespace without reading or changing SMTP passwords.

Only the formal `/services` landing page is indexable and canonicalized. Sitemap adds exactly that URL. All other services routes retain noindex/no-store and contain no static customer data. Preview and legacy Hosting headers override indexing. Travel analytics and affiliate scripts are absent from services screens.

Acceptance artifacts are under ignored `work/release/`. They contain safe summaries, fixture counts and test results, never tokens, passwords, actual private addresses or recovery links. Synthetic accounts/cases are explicitly excluded from real operations and mail, and are deleted after tests. The SMTP probe is labeled “not a transaction”; its message and recovery email are independently verified in the owner's actual Gmail inbox.

The release gate requires successful unit/type/dependency checks, 18 matching/API checks, 22 privacy checks, tracking/reminder checks, visible mobile matching/admin/privacy tests, synthetic full recovery behavior, actual inbox delivery, and the exact travel comparison (45 pages / 33 old assets). GitHub CI also tests both disabled/default and production builds. Final safe evidence and deployment version are delivered separately after live verification.

## Recovery plan

Original travel main: `90a180a760c434a4265f5dbd2a1f35b8be10263c`. Original live Hosting version: `d0833aa906b73c98`. The exact version was cloned to `comeback-traveler-web:pre-services-20261016`, expiring 2026-10-23 04:28 UTC. Hosting also retains the original version; preserve/download the original source/build for longer recovery needs.

If integration must be withdrawn, first pause the main deployment workflow to avoid an automatic re-release, then restore the travel-only version:

```powershell
gh workflow disable deploy.yml
npx -y firebase-tools@latest hosting:clone comeback-traveler-web:pre-services-20261016 comeback-traveler-web:live --project comeback-traveler-web
```

Keep the compatible independent Firebase frontend available for existing accounts. Change only Auth site URL back to `https://kaoh-help-20261014.web.app/services/account` and `NOTIFICATION_SITE_URL` back to `https://kaoh-help-20261014.web.app/services`; retain the allowlisted callback URLs. Do not modify SMTP credentials or administrator roles. Preserve the upgraded database and private-photo service, all customer data and access logs. In a reviewed follow-up, revert the integration merge on main and verify the restored travel pages before re-enabling deployment. A Hosting rollback does not roll back the database, Auth config or secrets.

Do not restore the old direct-read client by regranting `job_private`, adding Storage SELECT, disabling RLS, or inferring consent. Any database recovery must preserve new writes and the stronger privacy model and must first be rehearsed from the encrypted snapshot; never blindly replay a pre-release snapshot over new customer data.
