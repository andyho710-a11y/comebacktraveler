import {handlePhoto} from './handler.ts';
Deno.serve(req=>handlePhoto(req,{SUPABASE_URL:Deno.env.get('SUPABASE_URL'),SUPABASE_ANON_KEY:Deno.env.get('SUPABASE_ANON_KEY'),SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),SERVICE_PHOTO_PREVIEW_ORIGIN:Deno.env.get('SERVICE_PHOTO_PREVIEW_ORIGIN')}));
