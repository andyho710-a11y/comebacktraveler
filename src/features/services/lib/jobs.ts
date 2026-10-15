import { escape } from './client';
import { categories,statuses } from './catalog';
export type Job = { id:string;owner_id:string;category:keyof typeof categories;district:string;preferred_at:string;budget_min:number;budget_max:number;summary:string;status:string;selected_provider_id:string|null;review_note:string; };
export const date = (value:string) => new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export const money = (value:number) => 'NT$ '+Number(value).toLocaleString('zh-TW');
export function jobCard(job:Job) { return `<article class="job-card"><span class="tag">${escape(categories[job.category])}</span><span class="tag gold">${escape(statuses[job.status])}</span><h3>${escape(job.district)} · ${escape(categories[job.category])}</h3><p class="summary">${escape(job.summary)}</p><div class="meta"><span>${escape(date(job.preferred_at))}</span><span>僅顯示行政區</span></div><p class="budget">${money(job.budget_min)} – ${money(job.budget_max)}</p><a class="button secondary small" href="/services/job?id=${encodeURIComponent(job.id)}">查看案件</a></article>`; }
