import { parse } from 'ultrahtml';
import { createHash } from 'node:crypto';
export const digest = value => createHash('sha256').update(value).digest('hex');
const entity = value => value.replace(/&(?:#(x[0-9a-f]+|\d+)|amp|quot|apos|lt|gt|nbsp);/gi, (all, code) => code ? String.fromCodePoint(code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code)) : ({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':'\u00a0'}[all.toLowerCase()]));
const scope = value => value.replace(/data-astro-cid-[\w-]+/g,'data-astro-scope').replace(/astro-[\w-]{8}/g,'astro-scope');
export function semanticHTML(html) {
  function node(n) {
    if (n.type===3 || n.type===4) return null;
    if (n.type===2) {const text=scope(entity(n.value).replace(/\s+/g,' ').trim());return text||null;}
    const a=n.attributes||{};
    if(n.name==='style'||(n.name==='meta'&&a.name==='generator')||(n.name==='link'&&a.rel==='stylesheet'))return null;
    const attrs=Object.entries(a).map(([k,v])=>[scope(k),scope(entity(v)).replace(/\/_astro\/[^"\s]+\.(css|js)/g,'/_astro/ASSET.$1')]).sort(([a],[b])=>a.localeCompare(b));
    // Bundler output is separately gated by unchanged client source and behavioral tests.
    const children=n.name==='script'&&a.type==='module'?['COMPILED_MODULE']:(n.children||[]).map(node).filter(x=>x!==null);
    return [n.name||'document',attrs,children];
  }
  return digest(JSON.stringify(node(parse(html))));
}