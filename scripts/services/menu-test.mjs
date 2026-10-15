import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const wmux='D:/wmux-0.7.0-win-x64/resources/cli/wmux.js',origin='https://comeback-traveler-web--services-integration-we1toi2q.web.app';
const browser=(...args)=>JSON.parse(execFileSync(process.execPath,[wmux,'browser',...args],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}));
const evaluate=code=>browser('eval',code).result;
const results=[];
try{
 for(const path of ['/esim','/first-trip-packing-list','/japan-guide']){
  browser('open',origin+path+'?services-test='+Date.now());
  evaluate("document.querySelector('.cbt-nav-toggle').click();true");
  const state=JSON.parse(evaluate("JSON.stringify({path:location.pathname,width:innerWidth,expanded:document.querySelector('.cbt-nav-toggle').getAttribute('aria-expanded'),height:document.querySelector('.cbt-nav-links').clientHeight,scrollHeight:document.querySelector('.cbt-nav-links').scrollHeight,inlineMax:document.querySelector('.cbt-nav-links').style.maxHeight,services:Array.from(document.querySelectorAll('.cbt-nav-link')).filter(a=>a.getAttribute('href')==='/services').length})"));
  console.log('Menu geometry:',JSON.stringify(state));
  assert.equal(state.expanded,'true');assert.equal(state.services,1);assert.ok(state.scrollHeight<=state.height+1,'Mobile menu must not clip the service entry');
  evaluate("Array.from(document.querySelectorAll('.cbt-nav-link')).find(a=>a.getAttribute('href')==='/services').click();true");assert.equal(evaluate('location.pathname'),'/services');
  results.push({...state,passed:true});console.log('PASS actual mobile travel menu',path);
 }
 writeFileSync('work/services-menu-evidence.json',JSON.stringify({verified_at:new Date().toISOString(),passed:true,results,actual_navigation:true},null,2));
}finally{if(results.length!==3)browser('open',origin+'/services');}
