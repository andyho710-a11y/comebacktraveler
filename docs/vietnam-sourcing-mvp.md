# Vietnam Sourcing MVP — implementation and handoff

> Historical frontend snapshot at `8f58bbf6c89dca636cca336041c6b52ddf95f972`. The backend connection, current behavior and deployment requirements are documented in [vietnam-sourcing-backend.md](./vietnam-sourcing-backend.md).

## Audit and baseline (2026-10-06)

- Production base: local `main` and cached `origin/main` at `79e1735cef5e25864bb13707b54e81f76238ffe0`. No network fetch, push, merge or deployment performed.
- Starting checkout: `codex/first-trip-packing-affiliates`, `70697ac`; its tracked source tree was identical to `main`. Created `codex/vietnam-sourcing-mvp` from `main`.
- Existing dirty files were preserved: `docs/affiliate-weekly-scorecard.md`, `public/instagram-vietnam-essentials.png`, `social/`. They are excluded from this feature commit.
- Installed Astro 6.1.10; Node 24.15.0 locally, project minimum Node 22.12.0. `.astro` filesystem routing, static output, `build.format: 'file'`, clean Firebase URLs. No server adapter or content collections. Config actually uses sitemap and Tailwind v4; no MDX integration is installed.
- Reused `BlogLayout.astro` (canonical, OG, Twitter, WebPage/Organization/Breadcrumb schema, GA4 `G-XW4LBK8PYF`, existing advertising scripts), `SiteNav.astro`, `SiteFooter.astro` and the existing paper/red/serif design vocabulary. Shared files remain unchanged.
- Existing CTA components are affiliate-specific. Sourcing CTAs are local to this page; affiliate URLs, attributes and tracker remain unchanged.
- Firebase is Hosting only: no Functions rewrite, API route, database, Supabase, server endpoint, email service or dependable form receiver found. Existing homepage subscription code POSTs to `/`; this is not a reliable backend and was not reused or modified.
- Existing `/privacy` is linked. Its current text does not cover company RFQ/contact collection adequately; review and update it before enabling intake, separately from this change.
- Existing commands: `npm run build`, `npm run dev`, `npm run preview`, `npx astro check`. Two existing Node test files, 11 tests; no configured lint. Added test/typecheck scripts and development-only `@astrojs/check` / TypeScript. Production dependency version entries were preserved.
- Initial sandbox build could not resolve Astro's prerender entrypoint. Reinstalled the existing lockfile dependencies, then ran build outside the sandbox: 44 pages, success. Baseline copied to ignored `.astro/sourcing-baseline` before implementation. Existing 11 tests passed.

## Files

- `src/pages/vietnam-sourcing.astro`: landing page, honest service copy, 5 steps, fees, disclaimer, six displayed FAQ answers and matching Service/FAQ schema. Layout supplies canonical, OG/Twitter and Breadcrumb schema. No navigation changes to other pages; sitemap includes the route automatically.
- `src/components/VietnamSourcingForm.astro`: mobile-first labeled RFQ fields, per-field errors, consent, honeypot, truthful attachment/availability notice, no file input. Disabled submit before JavaScript initializes.
- `src/lib/vietnam-sourcing/rfq.ts`: versioned RFQ/attachment TypeScript contracts, enums, shared intake validation, serialization, analytics allowlist, replaceable transport and submission gate.
- `src/scripts/vietnam-sourcing.ts`: client form state, CTA smooth scroll with reduced-motion support, focus handling and GA4 calls.
- `tests/vietnam-sourcing.test.mjs`, `tests/vietnam-sourcing-ui.test.mjs`: shared logic, endpoint contract, rendered semantics and actual controller behavior via a DOM harness.
- `tsconfig.sourcing.json`: focused check without suppressing or changing existing site diagnostics.
- `package.json`, `package-lock.json`: development tooling and commands only.
- This handoff document.

## Current architecture

`RFQ form → FormData → readIntake → validateIntake → serializeRFQ → submission gate → unavailableTransport`

There is **no endpoint or storage currently**. Fields and a retry payload stay only in page memory. No localStorage, cookies, console logging, email send or network POST of RFQ data. Closing/reloading the page loses the draft. UTM values are captured from the landing query for a future payload; `landing_page` is the constant clean route, without query strings.

The page tells visitors that online intake is not open, before they fill the form. A valid submit attempt shows that nothing was sent or saved and keeps the entered values. It never confirms receipt and never emits `vietnam_sourcing_form_success`. `/contact` offers the site's existing manual contact channel; clicking it does not transfer the form data.

Validation covers required whitespace-only fields, email, text limits, optional tax ID format, optional HTTP(S) website, enums, service allowlist and consent. Honeypot rejects before serialization/transport. Submission blocks concurrent requests, adds a five-second attempt cooldown, locks after success and keeps the same RFQ ID for retries of unchanged input. The HTTP transport has a 15-second timeout. Client protections are convenience controls; they are not server security or rate limiting.

Attachment metadata reserves ID, filename, MIME, byte size, storage key and scan status. `attachments` is currently always empty. There is no upload request or pretend upload success.

RFQ includes all requested fields, `schema_version: 1`, consent timestamp/text version and these lifecycle statuses: `new`, `reviewing`, `qualified`, `supplier_search`, `rfq_sent`, `quotation_received`, `sample`, `negotiation`, `won`, `lost`. Quantity/MOQ/budget/timeline are text so buyers can include units, currencies and estimates. OEM/ODM/private label use `yes | no | unsure`.

## Endpoint integration contract / remaining TODO

The exported `createHttpTransport('/api/vietnam-sourcing')` is deliberately **not wired**. A future endpoint must accept a JSON RFQ and the `Idempotency-Key` header, and only return a successful receipt after durable storage:

```json
{ "stored": true, "rfq_id": "same RFQ ID as request" }
```

An HTTP 200 without this matching receipt is an error. Exceptions, timeout, invalid JSON, 4xx/5xx and missing configuration do not show success. The client success/loading/error branches are tested with mocks, not a live receiver.

Before enabling intake:

1. Implement a same-origin authenticated-to-storage receiver (e.g. a separately provisioned Firebase Function + Firestore with a Hosting `/api/` rewrite), or an approved equivalent. Hosting alone cannot execute an Astro API route. No such service, account or secret was created in this task.
2. Normalize untrusted JSON into the intake contract and reuse `validateIntake`; add strict request/shape/size validation and authoritative server timestamps, IDs/status/consent verification. Reject client changes to workflow status or attachment metadata. Never trust TypeScript interfaces as runtime validation.
3. Enforce server rate limits, origin policy, honeypot/anti-spam strategy and durable idempotency by RFQ ID. The current serialized RFQ intentionally omits the honeypot: when connecting a server, also define a validated envelope carrying the honeypot/anti-spam proof. Client-only checks are bypassable.
4. Store RFQs with restricted staff access, server-only credentials, retention/deletion procedures and no public database writes. Return the matching receipt only after persistence. Decide staff notification/CRM workflow separately; no automated email workflow exists now.
5. Review existing privacy policy for RFQ purpose, fields, retention, third-party processing and contact rights; obtain an approved consistent update before collection. No new conflicting policy was written.
6. Wire the transport at the marked TODO in `src/scripts/vietnam-sourcing.ts`; update the pending UI/button text only after real endpoint integration tests pass. Review the inherited advertising scripts before collecting confidential business information.
7. Upload stays unavailable until private storage, permissions, size/type limits and malware checking are ready. Never expose public file links or confidential filenames to analytics.
8. Complete real browser checks at 320px, 390px and desktop using approved tooling; perform keyboard, invalid/valid-submit and network-failure checks against the chosen backend, followed by a reviewed merge/deploy.

## Analytics

Existing GA4 infrastructure is reused unchanged. New events:

| Event | Meaning |
| --- | --- |
| `vietnam_sourcing_view` | Page controller initialized |
| `vietnam_sourcing_cta_click` | Hero RFQ/process CTA clicked |
| `vietnam_sourcing_form_start` | First non-honeypot input interaction, once per page |
| `vietnam_sourcing_form_submit` | Valid form attempts transport; this is not a received lead |
| `vietnam_sourcing_form_success` | Transport confirms durable receipt; impossible with current unavailable transport |

Every event uses only `page_path: '/vietnam-sourcing'`, an allowlisted product category code and allowlisted service codes. Never passes names, company, email, phone, LINE, specifications, notes, filenames, RFQ IDs, UTM/query values or the entire payload. Events tolerate unavailable/throwing analytics. No GA4 property settings or custom dimensions were configured; reporting configuration is a separate manual step. No live GA4 receipt was claimed.

## Verification

- Build baseline: 44 pages passed. Feature: 45 pages passed.
- Tests: `npm test` — 27/27 passed (11 existing, 16 new), including required fields, invalid email, consent, payload serialization, PII exclusion, honeypot, concurrent submit/cooldown, loading/error/success branches and receipt contract. Controller tests are a DOM harness, not browser E2E.
- `npm run typecheck:sourcing` — 0 errors, 0 warnings, 0 hints (5 files).
- Full `npm run typecheck` — existing diagnostics remain. Baseline-only check confirmed 59 errors, 0 warnings, 1 hint in untouched files, including the Vite 6/7 type conflict, `ReadAloud.astro`, `esim-quiz.astro` and `index.astro`. They were not repaired or suppressed within this feature.
- Lint: not configured; not run.
- Regression: compared all 75 previous built HTML/CSS/JS artifacts against the pre-change build; all byte-identical. This includes `/`, `/esim`, destination eSIM pages, shared CSS/JS, affiliate URLs/tracking markup and GA4 scripts. Sitemap changes only to include the new route. No production network checks or deployment performed.
- Browser/layout: `wmux` command was unavailable. Responsive rules use a single column below 700px, `minmax(0, 1fr)`, zero minimum field/fieldset widths, bounded 100% inputs and wrapping CTAs/text. **320px/390px/desktop overflow has not been verified in a real browser; do not treat CSS inspection as that proof.** The user was asked for a wmux path or permission to use the Codex browser panel.

## Review state

Landing page, RFQ schema, local validation, submission abstraction and privacy-safe event dimensions are implemented. Online intake/storage, server validation/spam protection, uploads and live conversion verification are not implemented. This branch is a reviewable static MVP, **not production-ready RFQ collection**. No supplier marketplace, login/account, payments, CRM UI, AI agent, scraping or automatic email was added. No merge, push, deploy or production secrets change was performed.
