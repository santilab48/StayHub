import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root=process.cwd()
const files=(dir)=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(entry=>{
  const name=join(dir,entry.name)
  return entry.isDirectory()?files(name):/\.(tsx?|sql|yml)$/.test(name)?[name]:[]
})
const sourcePaths=[...files('app'),...files('components'),...files('lib')]
const source=sourcePaths.map(p=>readFileSync(join(root,p),'utf8')).join('\n')
const schema=readFileSync(join(root,'supabase/schema.sql'),'utf8')
const declared=new Set([...schema.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi)].map(m=>m[1]))
const referenced=new Set([...source.matchAll(/\.from\(['"]([a-z][a-z_0-9]*)['"]\)/g)].map(m=>m[1]))
const missing=[...referenced].filter(t=>!declared.has(t)).sort()
const rpcNames=new Set([...source.matchAll(/\.rpc\(['"]([a-z][a-z_0-9]*)['"]/g)].map(m=>m[1]))
const missingRpcs=[...rpcNames].filter(x=>!new RegExp(`(?:create|replace)\\s+function\\s+(?:public\\.)?${x}\\s*\\(`,'i').test(schema)).sort()
const rlsStatements=[...schema.matchAll(/alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi)].map(m=>m[1])
const browser=readFileSync(join(root,'lib/supabase-browser.ts'),'utf8')
const workflow=readFileSync(join(root,'.github/workflows/build-check.yml'),'utf8')
const checks={
  noHardcodedSupabaseProject: !/https:\/\/[a-z0-9-]+\.supabase\.co/.test(browser),
  noAutomaticProdDeploy: !/vercel[^\n]*deploy[^\n]*--prod/.test(workflow),
  noServiceRoleInBrowser: !sourcePaths.some(p=>/NEXT_PUBLIC_.*SERVICE_ROLE|process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(readFileSync(join(root,p),'utf8')))
}
console.log(JSON.stringify({sourceFiles:sourcePaths.length,declaredTables:[...declared].sort(),referencedTables:[...referenced].sort(),missingTablesInBundledSchema:missing,referencedRpcs:[...rpcNames].sort(),missingRpcsInBundledSchema:missingRpcs,rlsEnabledTables:rlsStatements,checks},null,2))
if(Object.values(checks).some(x=>!x)) process.exitCode=1
// Missing schema objects are warnings until real staging migrations are verified.
