import {execFileSync} from 'node:child_process';import {keys,assertRelease,productionRef} from './release-backend.mjs';
assertRelease(productionRef);const {anon}=keys(productionRef);const env={...process.env,ASTRO_TELEMETRY_DISABLED:'1',PUBLIC_SUPABASE_URL:'https://'+productionRef+'.supabase.co',PUBLIC_SUPABASE_PUBLISHABLE_KEY:anon,PUBLIC_ENVIRONMENT:'production',PUBLIC_PILOT_ENABLED:'true',PUBLIC_OPERATOR_NAME:'andyho710（個人試營運）',PUBLIC_PRIVACY_EMAIL:'andyho710@gmail.com'};
execFileSync(process.execPath,['scripts/services/check-config.mjs','--production'],{env,stdio:'inherit'});
execFileSync(process.execPath,['C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js','run','build'],{env,stdio:'inherit'});
