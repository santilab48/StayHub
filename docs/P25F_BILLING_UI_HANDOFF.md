# StayHub P2.5-F — Cloud Billing UI handoff

## Result

This checkout contains the original P2.5-A–F history and two follow-up commits for the Cloud Billing workflow:
- Owner `/cloud` provides access to `/cloud/billing`.
- `/cloud/billing` selects an existing owner property and active lease, records monthly water/electric meter readings, issues a monthly bill, displays totals and paginated history, and records cash or transfer payments. All writes call the P2.5 server APIs, not the legacy Supabase billing database.
- Tenant `/my` has a persistent billing link even after checkout; tenant history is account-scoped on the server.
- Forms retain the same idempotency key for the same request payload when retrying after network uncertainty.

## Verification

- `node scripts/test-billing-ui-contract.mjs`: PASS (source/static/TSX syntax)
- `node scripts/test-bill-history.mjs`: PASS (with local TypeScript module link)
- `node scripts/test-billing-migration-contract.mjs`: PASS
- `node --experimental-strip-types scripts/test-bill-generation.mjs`: PASS
- `node --experimental-strip-types scripts/test-payment-recording.mjs`: PASS
- `node scripts/test-billing-final-audit.mjs`: PASS
- `node scripts/test-migration-contract.mjs`: PASS
- `node scripts/test-id-binding-contract.mjs`: PASS
- `node scripts/verify-structure.mjs`: PASS
- `git diff --check`: PASS

NOT VERIFIED: `npm run build` / full TypeScript typecheck (`node_modules` could not be installed because npm registry DNS is blocked in this environment); actual PostgreSQL migration 010/011, transactional/concurrency tests, and browser HTTP QA.

## Deployment scope and blockers

- This release is **not deployed to GitHub or Railway** from this isolated runtime. GitHub remote is at P2.5-A SHA `52c4f4b`; all later work exists in the exported bundle.
- Railway Staging still tracks `feat/stayhub-p1-security-staging-audit`, which would deploy when that branch is updated. Do not deploy the old remote HEAD instead of this new code.
- Before the Billing APIs can function, the authorized staging PostgreSQL migration runner must apply migrations 010–011 exactly once after confirming the actual database target and migration checksums.
- Do not deploy or migrate Production without explicit authorization. No automatic migration on app startup and no UI edits to legacy Supabase billing screens were made.
