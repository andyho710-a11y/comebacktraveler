import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
function digest(files){const hash=createHash('sha256');for(const path of files.sort()){hash.update(path+'\n');hash.update(readFileSync(path));}return hash.digest('hex');}
function tree(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?tree(path+'/'+entry.name):[path+'/'+entry.name]);}
export const workerFingerprint=()=>digest(tree('supabase/functions/notification-dispatch'));
export const frontendFingerprint=()=>digest(tree('src'));
