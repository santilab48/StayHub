import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
const required=['app/page.tsx','app/start/page.tsx','app/workspace/page.tsx','lib/local-workspace.ts','lib/local-repair-drafts.ts','app/platform/layout.tsx','app/t/[tenantSlug]/admin/layout.tsx']
for(const path of required) assert.ok(existsSync(path),'Missing '+path)
const home=readFileSync('app/page.tsx','utf8')
assert.ok(home.includes("'/cloud?type='"),'Homepage must route selected accommodation type to Cloud signup')
assert.ok(!home.includes('href="/start"'),'Homepage must not allow onboarding bypass via local-only workspace')
assert.ok(!/Rich Menu 6 ช่อง|Multi-OA ready|ทุกเรื่องของหอพัก อยู่ใน LINE ที่เดียว/.test(home),'Homepage must not promote LINE-dependent navigation')
const local=readFileSync('lib/local-workspace.ts','utf8')
assert.ok(local.includes('indexedDB.open('),'Onboarding must persist to IndexedDB')
assert.ok(!local.includes('service_role'),'No service credential in local onboarding')
assert.ok(!existsSync('app/t/[tenantSlug]/menu/[action]/page.tsx'),'Legacy OA menu route should be removed')
const types=readFileSync('lib/accommodation-types.ts','utf8')
for (const type of ['apartment','guesthouse','daily','homestay']) assert.ok(types.includes(type), 'Accommodation type missing: '+type)
const start=readFileSync('app/start/page.tsx','utf8')
assert.ok(start.includes('accommodationTypes'), 'Onboarding must offer property types')
console.log('StayHub standalone Local-First entry and routing structure OK')
