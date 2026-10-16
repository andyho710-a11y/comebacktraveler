import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadEnv} from 'vite';
import {validateServicesConfig} from './check-config.mjs';
const settings=validateServicesConfig({...loadEnv('production',process.cwd(),'PUBLIC_'),...process.env});
if(!settings.enabled||settings.environment!=='staging')throw Error('Services preview must use the enabled staging backend.');
if(JSON.parse(readFileSync('.firebaserc')).projects.default!=='comeback-traveler-web')throw Error('Unexpected Hosting project');
const npm='C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js';
execFileSync(process.execPath,[npm,'run','build'],{stdio:'inherit',env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'}});
execFileSync(process.execPath,[npm,'test'],{stdio:'inherit'});
const config=JSON.parse(readFileSync('firebase.json'));config.hosting.public=resolve('dist');
for(const rule of config.hosting.headers)for(const h of rule.headers)if(h.key==='X-Robots-Tag')h.value='noindex, nofollow';
// Preview pages keep travel markup intact while external analytics/ad scripts are blocked.
// The stricter services policy remains last; production firebase.json is unchanged.
config.hosting.headers.unshift({source:'**',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data: https:; frame-ancestors 'none'; object-src 'none'"}]});
writeFileSync('.firebase.services-preview.json',JSON.stringify(config,null,2));
const output=execFileSync(process.execPath,[npm,'exec','--yes','--package=firebase-tools@latest','--','firebase','hosting:channel:deploy','services-integration','--expires','7d','--project','comeback-traveler-web','--config','.firebase.services-preview.json','--no-authorized-domains','--json'],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
const result=JSON.parse(output.slice(output.indexOf('{')));if(result.status!=='success')throw Error('Preview deployment not confirmed');
mkdirSync('work',{recursive:true});writeFileSync('work/services-preview-deployment.json',JSON.stringify({verified_at:new Date().toISOString(),...result},null,2));
console.log('Only preview channel deployed:',result.result['comeback-traveler-web'].url);
