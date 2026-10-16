import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Capture recovery mode before the Auth SDK consumes/removes the URL hash.
export const recovering = typeof window !== 'undefined' && new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
export const enabled = import.meta.env.PUBLIC_PILOT_ENABLED === 'true' && !!url && !!key;
export const client = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const escape = (text: unknown) => String(text ?? '').replace(/[&<>"']/g, s => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[s]!));
export function message(text: string, error = false) {
  const box = document.querySelector<HTMLElement>('#notice');
  if (box) { box.textContent = text; box.hidden = false; box.className = error ? 'notice error' : 'notice'; box.scrollIntoView({ block:'nearest' }); }
}
export async function run(action: () => Promise<void>) {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')].filter(b => !b.disabled);
  buttons.forEach(b => b.disabled = true);
  try { if (!enabled || !client) throw new Error('目前是預覽環境，尚未開放註冊或刊登。'); await action(); }
  catch (error) { console.error('操作未完成'); message(error instanceof Error ? error.message : String((error as {message?: string})?.message ?? '操作失敗，請稍後重試。'), true); }
  finally { buttons.forEach(b => b.disabled = false); }
}
export async function session() {
  const { data, error } = await client!.auth.getUser();
  if (error || !data.user) throw new Error('請先登入，再使用此功能。');
  return data.user;
}
export function check<T extends { error: { message: string } | null }>(result: T): T {
  if(result.error){const error=result.error as {message:string;code?:string};const friendly:Record<string,string>={
    '42501':'目前沒有操作權限，請確認登入與審核狀態。',
    '23505':'資料已存在，請重新整理確認結果，勿重複送出。',
    '23514':'請檢查電話格式、文字長度、預算與必填欄位。',
    '23503':'請先完成會員資料，或重新載入確認案件狀態。',
    'invalid_credentials':'Email 或密碼不正確。',
    'email_not_confirmed':'請先到信箱完成 Email 驗證。',
    'over_email_send_rate_limit':'驗證信寄送次數暫時達上限，請稍後再試。',
    'over_request_rate_limit':'操作次數暫時達上限，請稍後再試。'
  };const mailFailure=/Error sending (recovery|confirmation) email/i.test(error.message)?'驗證或重設密碼信尚未寄出，請稍後再試或聯絡營運者。':null;throw new Error(mailFailure??friendly[error.code??'']??error.message);}return result;
}
export async function downloadPhoto(path:string,purpose=''): Promise<Blob> {
  const {data:{session}} = await client!.auth.getSession();
  if(!session) throw new Error('請先登入查看照片。');
  const response = await fetch(url+'/functions/v1/service-private-photo',{method:'POST',body:JSON.stringify({path,purpose}),headers:{Authorization:'Bearer '+session.access_token,apikey:key,'Content-Type':'application/json'},cache:'no-store'});
  if(!response.ok) throw new Error('無法取得照片，或目前沒有照片查看權限。');
  return response.blob();
}
export async function preparePhoto(file: File): Promise<Blob> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('照片僅接受 JPEG、PNG、WebP，每張原始檔不超過 8 MB。');
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 40000000) { bitmap.close(); throw new Error('照片尺寸過大，請縮小後上傳。'); }
  const canvas = document.createElement('canvas');
  const scale = Math.min(1,1600 / Math.max(bitmap.width,bitmap.height));
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve,'image/jpeg',0.8));
  if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('壓縮後照片仍超過 2 MB，請縮小照片。');
  return blob;
}
