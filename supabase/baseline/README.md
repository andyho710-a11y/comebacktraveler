# Baseline snapshots for isolated privacy tests

These nine files are byte copies of the completed independent marketplace migrations from `andyho710-a11y/kaohsiung-help`, source revision `72bf9d517f4b616854271ea6e597a1441a487469`. They are test fixtures, not a request to provision a new backend or rerun the existing installation.

The privacy test loads the existing schema in PGlite, mocks only Auth identity / Storage metadata / extension schemas, and excludes the external cron provisioning migration. Real Auth, Storage, gateway, RLS, RPC and browser behavior are additionally tested against `jqzyduwzcbhylgjlrdvf` with disposable accounts.

Only new files under `../migrations/` are applied to the existing test project, with explicit project guards and an idempotence/checksum ledger. Do not run these snapshots against either live website.
