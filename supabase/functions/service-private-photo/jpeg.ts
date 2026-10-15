// Remove all APP/COM metadata (including EXIF GPS, IPTC and XMP) and trailing data.
// This does not identify or redact addresses, faces or documents in image pixels.
export function stripJpegMetadata(input: Uint8Array): Uint8Array {
 if(input.length>2097152||input[0]!==255||input[1]!==216)throw Error('Invalid JPEG');
 const parts:Uint8Array[]=[input.slice(0,2)];let p=2,ended=false;
 while(p<input.length){
  const start=p;if(input[p++]!==255)throw Error('Invalid JPEG marker');
  while(input[p]===255)p++;const marker=input[p++];
  if(marker===217){parts.push(new Uint8Array([255,217]));ended=true;break;}
  if(marker===216||marker===0||marker===undefined)throw Error('Invalid JPEG marker');
  if(marker===1||(marker>=208&&marker<=215)){parts.push(input.slice(start,p));continue;}
  const length=(input[p]<<8)|input[p+1];if(length<2||p+length>input.length)throw Error('Invalid JPEG length');
  p+=length;if(!((marker>=224&&marker<=239)||marker===254))parts.push(input.slice(start,p));
  if(marker===218){
   const scanStart=p;
   while(p<input.length){if(input[p]!==255){p++;continue;}const next=input[p+1];if(next===0||(next>=208&&next<=215)){p+=2;continue;}if(next===255){p++;continue;}break;}
   parts.push(input.slice(scanStart,p));
  }
 }
 if(!ended)throw Error('Incomplete JPEG');
 const out=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;
}
