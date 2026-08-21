export async function compressUploadImage(file,{maxDimension=2200,quality=.84}={}){
  if(!file||!file.type?.startsWith("image/"))return file;
  if(file.type==="image/svg+xml")return file;
  const bitmap=await createImageBitmap(file),scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d",{alpha:false});ctx.drawImage(bitmap,0,0,w,h);bitmap.close?.();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image conversion failed.")),"image/webp",quality));
  if(blob.size>=file.size&&file.type==="image/webp")return file;
  return new File([blob],`${file.name.replace(/\.[^.]+$/,"")}.webp`,{type:"image/webp",lastModified:Date.now()});
}
function hexRgb(hex){const m=String(hex).replace("#","");const v=m.length===3?m.split("").map(x=>x+x).join(""):m;if(!/^[0-9a-f]{6}$/i.test(v))return [0,0,0];return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)];}
function lum([r,g,b]){return [r,g,b].map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);}
export function qrContrast(fg,bg){const a=lum(hexRgb(fg)),b=lum(hexRgb(bg));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
export function validateQrContrast(fg,bg){const ratio=qrContrast(fg,bg);return {ratio:Number(ratio.toFixed(2)),ok:ratio>=4.5,message:ratio>=7?"Excellent scan contrast":ratio>=4.5?"Good scan contrast":"Low contrast may reduce QR reliability"};}
export async function writeNfc(url){
  if(!("NDEFReader" in window))throw new Error("Web NFC is not available in this browser. Copy the URL and write it with your phone's NFC app.");
  const ndef=new NDEFReader();await ndef.write({records:[{recordType:"url",data:url}]});return true;
}
