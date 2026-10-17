# Provider review repair, 2026-10-17

## Read-only production finding

Production HTML bundles use `nneammnczvwziggoyzrn`, not staging. Three actual accounts existed at diagnosis. The verified administrator's account had no provider application. The only account registered on 2026-10-16 evening had a verified email and saved profile but no provider application or review record. One account registered on 2026-10-17 morning had an approved application and public provider profile with four successful review audit records. The only open production job belonged to that provider, so self-quotation was correctly prohibited. No real applications were reviewed, deleted, reset or overwritten by the repair.

The requester's identity cannot be inferred for a different account, and the requester does not know the evening registrant's email. Time correlation identifies one candidate account, not proof of the person's identity. Historical submit failures were not logged, so absence of a row proves no current successfully saved application, not whether the person clicked submit. No backend false-success path was found in the original client: it checked RPC errors before showing success. The registration/profile flow lacked a clear return to submit the provider application, while the admin interface always displayed Approve even for approved rows. The bounded old RPC had no status filter, page navigation or submission timestamps; with only one application, its 100-row bound did not cause this incident.

## Change

- Explicit registration / email verification / profile / application / approval / eligibility states and a fixed `next=provider` continuation. No automatic applications or approvals.
- Submission RPC returns a durable ID/time and the client confirms the saved row before success. Failures preserve their safe error code in private history; no private data is logged in error messages.
- New admin-only, audited list RPC supports all four statuses, bounded cursor pages, stable ordering and completeness indicators. Existing private table policies and legacy RPCs are retained.
- Approved rows show eligibility, not another Approve button. Reject/suspend do not require a public name. Checked review has a row lock, expected-state guard, verified-admin authorization and atomic error handling; failed or unchanged reviews are recorded.
- History includes pre-existing successful review audit events using their original times. Legacy initial/submission timestamps stay NULL and display as unrecorded; they are never guessed or backdated. Migration 013 asserts all existing application business fields remain identical.
- Existing self-review policy is preserved: a verified administrator may review their own application. No new permanent administrators and no change to real eligibility.

## Release and recovery

Stage first on `jqzyduwzcbhylgjlrdvf` and the existing `services-integration` Hosting channel. Required gates: PGlite preservation/cursor/error/role tests; synthetic signup and Auth verification; inbox receipt only to the operator's Gmail alias; provider and marketplace API tests; cross-account/photo privacy tests; visible mobile form/filter/approval/rejection/history tests; exact travel HTML/asset/SEO regression; typecheck, dependency audit and GitHub CI.

Before production, preserve application data/functions/policies in a Windows-user DPAPI encrypted backup and clone current Hosting to `pre-provider-review-20261017`. Apply only migration 013 whose checksum matches staging, retaining all real application statuses, identity and business values. Add only the exact provider continuation Auth callback, preserving all existing Auth/SMTP settings. Merge the reviewed fix PR via the existing main deployment workflow only after all acceptance gates pass.

For immediate frontend rollback, pause main auto-deploy and clone `comeback-traveler-web:pre-provider-review-20261017` back to `comeback-traveler-web:live`. Preserve migration 013 and its history/data: the previous frontend still works with the unchanged legacy submission/review/list RPCs and stronger privacy permissions. Do not restore old snapshots over new applications, disable RLS, regrant private contacts or make any eligibility decision as rollback. Additional exact callback URL may remain while existing verification links expire. This change adds no payments, fees or third-party personal-data tracking.
