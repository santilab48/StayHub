# ADR-001 — Local-first data storage for StayHub

Status: **Accepted direction / implementation pending**  
Date: 2026-11-22  
Scope: StayHub architecture; no production migration authorized.

## Decision
Keep day-to-day data on the user's own device using IndexedDB, with PWA offline support. Use a backend only for cross-device and cross-account coordination, authentication, permissions, payments and durable shared records. **Do not interpret local storage as a secure authority.** This follows the intended local-first experience of RecycleBill; exact parity with RecycleBill internals has not been verified in this connected GitHub account.

## Responsibilities
| Data | Primary authority | Offline cache | Notes |
| --- | --- | --- | --- |
| UI settings, drafts, unsent meter readings | IndexedDB | Yes | Sync only when user submits or enables backup |
| Rooms, occupancy and shared rent rules | Authorized owner/server | Encrypted/minimized device cache where appropriate | Changes affect multiple people |
| Published bills, approvals and payment status | Server | Read-only cache | Do not finalize or approve offline |
| Resident documents, ID and signatures | Secured server storage | Avoid long-lived unencrypted local copies | Strict owner/resident authorization |
| Repair tickets, messages and notifications | Server | Queue drafts + cached records | Cross-account synchronization required |
| Tenant membership and role access | Server | Session display only | RLS and validated server permissions remain mandatory |

## Local data design
- IndexedDB: versioned `stayhub_local_v1` stores for device settings, draft meter readings, draft bills, outbound queue and cached non-sensitive records.
- Every entry includes `tenantId`, `deviceId`, `localId`, `schemaVersion`, `updatedAt`, `syncStatus`; avoid storing secrets or access tokens in IndexedDB.
- Partition data by authenticated user + tenant. Clear or lock access when the signed-in account changes.
- Use client-generated idempotency keys for submitted operations; server validates authority, tenant, uniqueness and current state.
- Use explicit conflict resolution: drafts may remain local; published bills/payments/server-approved actions always resolve to the server record.
- Enable backup/export and recovery with user-initiated consent; warn that browser clear/reset can delete local-only data.
- PWA service worker caches application assets only, not private API responses by default.
- IndexedDB is **not** a safe vault for national IDs, signatures, full contracts, payment slips or Supabase service-role credentials.

## Implementation gates
1. Identify all existing Supabase direct writes and classify shared vs device-only data.
2. Implement IndexedDB schema + upgrade path and adapter with user/tenant-scoped keys, quota/error reporting, export/import tests.
3. Migrate UI preferences and unsent form drafts first, leaving existing shared records untouched.
4. Add an offline outbox with submission idempotency and permission checks.
5. Test multiple users, two tenants, multiple devices, offline transitions, conflict resolution, lost device and browser storage cleared.
6. Do not replace RLS, authentication or document authorization while moving local storage.
7. Do not run production schema migrations, merge or deploy production without explicit approval.

## Current constraints
- No Staging database or test identities available for end-to-end validation.
- This ADR does not imply the product is currently offline-ready.
- RecycleBill codebase is not accessible through the currently connected GitHub installation, so exact technical equivalence has not been verified.
