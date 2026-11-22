import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
const required=['app/page.tsx','app/start/page.tsx','app/workspace/page.tsx','lib/local-workspace.ts','lib/local-repair-drafts.ts','app/platform/layout.tsx','app/t/[tenantSlug]/admin/layout.tsx']
for(const path of required) assert.ok(existsSync(path),'Missing '+path)
const home=readFileSync('app/page.tsx','utf8')
assert.ok(home.includes('href="/start"'),'Homepage must link to direct onboarding')
assert.ok(!/LINE OA|Rich Menu|LIFF/.test(home),'Homepage must not advertise OA dependencies')
const local=readFileSync('lib/local-workspace.ts','utf8')
assert.ok(local.includes('indexedDB.open('),'Onboarding must persist to IndexedDB')
assert.ok(!local.includes('service_role'),'No service credential in local onboarding')
assert.ok(!existsSync('app/t/[tenantSlug]/menu/[action]/page.tsx'),'Legacy OA menu route should be removed')
console.log('StayHub standalone Local-First entry and routing structure OK')
