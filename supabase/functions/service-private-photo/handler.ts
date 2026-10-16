import {stripJpegMetadata} from './jpeg.ts';
const stageUrl='https://jqzyduwzcbhylgjlrdvf.supabase.co',productionUrl='https://nneammnczvwziggoyzrn.supabase.co';
export async function handlePhoto(req:Request,env:Record<string,string|undefined>):Promise<Response>{
 const production=env.SUPABASE_URL===productionUrl;
 const allowedOrigins=new Set(production?['https://comebacktraveler.com','https://kaoh-help-20261014.web.app']:['https://comeback-traveler-web--services-integration-we1toi2q.web.app','http://127.0.0.1:4321','http://localhost:4321']);
 // This is an exact operator-configured origin, never a wildcard from the request.
 const preview=env.SERVICE_PHOTO_PREVIEW_ORIGIN;
 if(production&&preview&&/^https:\/\/comeback-traveler-web--services-release-[a-z0-9]+\.web\.app$/.test(preview))allowedOrigins.add(preview);
 const origin=req.headers.get('origin');const headers:Record<string,string>={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin','Content-Security-Policy':"default-src 'none'; sandbox"};
 if(origin&&allowedOrigins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const fail=(status:number)=>new Response(JSON.stringify({error:'照片不存在、未授權或暫時無法取得。'}),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(origin&&!allowedOrigins.has(origin))return fail(403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}});
 if(req.method!=='POST')return fail(405);
 if(![stageUrl,productionUrl].includes(env.SUPABASE_URL??'')||!env.SUPABASE_ANON_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)return fail(503);
 const auth=req.headers.get('authorization');if(!auth?.startsWith('Bearer ')||auth.length>8192)return fail(401);
 try{
  const body=await req.text();if(body.length>4096)return fail(400);const {path,purpose=''}=JSON.parse(body);
  if(typeof path!=='string'||!/^([0-9a-f-]{36}\/){2}[0-9a-f-]{36}\.jpg$/.test(path)||typeof purpose!=='string'||purpose.length>32)return fail(400);
  const userHeaders={apikey:env.SUPABASE_ANON_KEY,Authorization:auth};
  const user=await fetch(env.SUPABASE_URL+'/auth/v1/user',{headers:userHeaders});if(!user.ok)return fail(401);await user.body?.cancel();
  const permission=await fetch(env.SUPABASE_URL+'/rest/v1/rpc/authorize_private_photo',{method:'POST',headers:{...userHeaders,'Content-Type':'application/json'},body:JSON.stringify({p_path:path,p_purpose:purpose})});
  if(!permission.ok)return fail(403);if(await permission.json()!==true)return fail(403);
  const image=await fetch(env.SUPABASE_URL+'/storage/v1/object/authenticated/job-photos/'+path,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Cache-Control':'no-cache'},cache:'no-store'});
  if(!image.ok)return fail(404);const bytes=stripJpegMetadata(new Uint8Array(await image.arrayBuffer()));
  return new Response(bytes,{status:200,headers:{...headers,'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="private-photo.jpg"'}});
 }catch{return fail(400);}
}
