# StayHub P5.5 Production room sync verification

Date: 23 November 2026 (Asia/Bangkok)
Status: **PARTIAL — isolated two-way sync passed; live Production verification blocked**

## Repository and release identity

- Branch `feat/stayhub-p26-readiness` was fetched and fast-forwarded without overwriting local work. Remote HEAD before this report was `8e787999cd0ad395a891e2ca26f6e3175e55bfc9`. Working tree was clean before the isolated test run.
- Draft PR #2 remains unmerged.
- User-supplied last successful Railway Production deployment is `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5`, configured source `d163b4d167f8686e8015c8797d5eb0bdcc635c17`. The P5.4 follow-up in `docs/P54_PRODUCTION_RELEASE.md` records this deployment as SUCCESS with app/PostgreSQL Online at that earlier observation. This task could not independently refresh Railway status.
- Rollback reference supplied by the user and P5.4 report is `dfcdc09f-7f9c-43ad-a77d-1a6f7d701493`. Its current artifact availability was not checked in this task.

## Production read-only verification

| Check | Result this task |
|---|---|
| Railway app and PostgreSQL Online | **BLOCKED** — no Railway management connector or CLI available |
| `/api/health/db` | **BLOCKED** — proxy returned `CONNECT tunnel failed, response 403`, HTTP `000` |
| `/api/v2/sync/properties` unauthenticated GET | **BLOCKED** — same proxy response |
| `/api/v2/sync` unauthenticated GET | **BLOCKED** — same proxy response |
| Production deployment logs, failure and warning status | **BLOCKED** — no live Railway log access |
| Production database provider and variables | **BLOCKED** — no live variable metadata or database binding; no secret value inspected |
| Current migration ledger 001–014 | **BLOCKED** — no live PostgreSQL read access |

The P5.4 report previously recorded a successful deployment healthcheck, migration pre-deploy `SKIP 001–014`, and 0 warnings/critical issues. Those are historical Production observations, not fresh P5.5 checks. No Production write request was sent.

## Isolated PostgreSQL and HTTP integration performed now

A disposable local `postgres:16-alpine` container named `stayhub-p55-isolated` hosted database `stayhub_p26_ci` on `127.0.0.1:55435`. The existing CI migration runner verified its loopback/database-name guard and applied **14/14 migrations** there. The local Next.js app used only that database at `http://127.0.0.1:3000`; `/api/health/db` returned `200` with `database: ready`.

`scripts/p26-http-e2e.mjs` **passed** against this isolated app/database. Its output included anonymous sync-property denial `401`, owner-only property listing, other-account isolation, session revocation/login, idempotent room operation replay, stale-revision conflict, rejected unauthorized changes and refusal to issue bill drafts through room sync. The script also exercises existing Auth/QR/Billing behavior against its disposable database. None of those writes targeted Production.

## Two-way Chromium browser test performed now

The repository's `scripts/p53-browser-e2e.mjs` was run unchanged in behavior from a temporary copy using the machine's installed Playwright package and Chromium executable. It used two independent browser contexts and the same isolated localhost app/database. All emitted assertions passed:

- `PASS Chromium contexts A → server → B room transfer`
- `PASS offline B edit retained through conflicting pull`
- `PASS conflict rebase and browser B → server → A return transfer`
- `PASS both browser IndexedDB stores persist after reload`
- `PASS P5.3 real Chromium two-context / isolated PostgreSQL E2E`

The script covers room ID/name and revision behavior, offline conflict and a return transfer. Browser cookie and IndexedDB contexts were separate. The test was on a single local host, so it does not establish physical-device network behavior or Production write behavior.

## Data isolation, authorization and limits

The isolated HTTP test verified anonymous denial, account-scoped property lists, cross-property rejection, duplicate operation handling and stale-revision conflict. The isolated browser test verified that an offline edit remained local during a conflicting pull and was rebased before successful send. The room sync allowlist does not issue billing drafts as bills or payments.

**Production Write E2E was not run.** No explicitly authorized Production test account/property scope or Production API connectivity was available. Consequently P5.5 is verified only for the isolated environment and historical Production release evidence. It cannot be marked fully passed for live Production health, authorization or two-way sync.

## Changes and next gate

No product code, UI/UX, variables, CI, database provider, Production data or deployment was changed. No bug was found in the isolated tests, so no regression fix was added. A future authorized Production read-only check must confirm the current deployment, app/database Online status, `/api/health/db`, migration ledger and provider target. A Production write E2E requires an explicitly authorized dedicated account/property and must remain separate from real customer data.
