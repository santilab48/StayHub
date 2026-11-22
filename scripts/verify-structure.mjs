import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

// Use the real TypeScript modules without requiring a deployed Next.js server.
function loadTs(path, imports = {}) {
  const source = readFileSync(path,'utf8')
  const js = ts.transpileModule(source,{
    fileName: path,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText
  const module={exports:{}}
  vm.runInNewContext(js,{
    module,exports:module.exports,
    require:(name)=>{
      if(Object.prototype.hasOwnProperty.call(imports,name))return imports[name]
      throw new Error('Unexpected module import: '+name)
    }
  },{filename:path,timeout:2000})
  return module.exports
}

const routes=loadTs(resolve('lib/routes.ts'))
const menu=loadTs(resolve('lib/rich-menu-routes.ts'),{'./routes':routes})
const actions=Object.keys(menu.richMenuActions)
assert.equal(actions.length,13,'Expected six resident menu actions, six admin actions and home')

for(const action of actions){
  const path=menu.richMenuTarget('test-tenant',action)
  assert.ok(path?.startsWith('/t/test-tenant/'),'All targets must remain tenant scoped')
  assert.ok(!path.includes('://')&&!path.includes('..'),'No external/open redirect targets')
  const appPath=join('app',path.replace('/t/test-tenant','/t/[tenantSlug]'))
  const exists=existsSync(join(appPath,'page.tsx'))
  const segments=appPath.split('/')
  const fallback=join(segments.slice(0,5).join('/'),'[...section]','page.tsx')
  assert.ok(exists||existsSync(fallback),'Missing destination page for '+action+': '+path)
  const entry=menu.richMenuEntryPath('test-tenant',action)
  assert.equal(entry,`/t/test-tenant/menu/${action}`)
}
for(const invalid of ['../admin','%2fadmin','a/b','', 'a'.repeat(65)]){
  assert.equal(menu.richMenuTarget(invalid,'room'),null)
}
assert.equal(menu.richMenuTarget('test-tenant','https://example.com'),null)
assert.equal(menu.richMenuTarget('test-tenant','__proto__'),null)
assert.ok(existsSync('app/t/[tenantSlug]/menu/[action]/page.tsx'),'Entry route required')
assert.ok(existsSync('lib/local-repair-drafts.ts'),'IndexedDB adapter required')
console.log(`StayHub route structure OK: ${actions.length} allowlisted LINE actions, no external redirects.`)
