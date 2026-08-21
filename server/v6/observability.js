export function log(level,event,data={}){
  const row={time:new Date().toISOString(),level,event,...data},out=JSON.stringify(row);
  if(level==="error"||level==="fatal")console.error(out);else if(level==="warn")console.warn(out);else console.log(out);
  if((level==="error"||level==="fatal")&&process.env.ERROR_TRACKING_WEBHOOK_URL){
    fetch(process.env.ERROR_TRACKING_WEBHOOK_URL,{method:"POST",headers:{"content-type":"application/json"},body:out}).catch(()=>{});
  }
}
export async function measured(name,fn,meta={}){
  const t=performance.now();
  try{const value=await fn();log("info","metric",{name,durationMs:Math.round(performance.now()-t),...meta});return value;}
  catch(error){log("error","exception",{name,durationMs:Math.round(performance.now()-t),message:String(error?.message||error),...meta});throw error;}
}
