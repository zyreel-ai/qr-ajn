function dayKey(ts){return new Date(Number(ts||Date.now())).toISOString().slice(0,10);}
function top(map,n=8){return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([name,value])=>({name,value}));}
export function aggregateAnalytics({events={},businessEvents={},businessLeads={},qrLeads={}},days=30){
  const scans=Object.values(events||{}),be=Object.values(businessEvents||{}),bl=Object.values(businessLeads||{}),ql=Object.values(qrLeads||{}),since=Date.now()-days*86400000;
  const recent=scans.filter(e=>Number(e.timestamp||0)>=since&&!e.isBot&&!e.isDuplicate),daily={},devices={},countries={},browsers={},sources={},visitors=new Map();
  for(let i=days-1;i>=0;i--)daily[dayKey(Date.now()-i*86400000)]=0;
  for(const e of recent){
    const d=dayKey(e.timestamp);if(d in daily)daily[d]++;
    const device=e.deviceName||e.device||"Unknown";devices[device]=(devices[device]||0)+1;
    const country=e.country||"Unknown";countries[country]=(countries[country]||0)+1;
    const browser=e.browser||"Unknown";browsers[browser]=(browsers[browser]||0)+1;
    const source=e.referrer?(()=>{try{return new URL(e.referrer).hostname}catch{return "Direct"}})():"Direct";sources[source]=(sources[source]||0)+1;
    const k=e.visitorHash||e.scannerUid||e.id;if(k)visitors.set(k,(visitors.get(k)||0)+1);
  }
  const profileViews=be.filter(e=>e.eventType==="view").length,actions=be.filter(e=>["call","whatsapp","directions","website","booking","payment"].includes(e.eventType)).length,leads=bl.length+ql.length,returning=[...visitors.values()].filter(v=>v>1).length,series=Object.entries(daily).map(([date,value])=>({date,value}));
  return {totals:{scans:recent.length,uniqueVisitors:visitors.size,returningVisitors:returning,profileViews,actions,leads},series,devices:top(devices),countries:top(countries),browsers:top(browsers),sources:top(sources),funnel:[{name:"Scans",value:recent.length},{name:"Profile views",value:profileViews},{name:"Actions",value:actions},{name:"Leads",value:leads}],forecast:forecast(series,14),anomaly:detectAnomaly(series)};
}
export function forecast(series,days=14){
  const y=series.map(x=>Number(x.value||0)),n=y.length;if(n<3)return [];
  const sx=(n-1)*n/2,sy=y.reduce((a,b)=>a+b,0),sxx=(n-1)*n*(2*n-1)/6,sxy=y.reduce((a,v,i)=>a+i*v,0),den=n*sxx-sx*sx||1,slope=(n*sxy-sx*sy)/den,intercept=(sy-slope*sx)/n,last=new Date(series.at(-1).date+"T00:00:00Z");
  return Array.from({length:days},(_,i)=>{const d=new Date(last);d.setUTCDate(d.getUTCDate()+i+1);return {date:d.toISOString().slice(0,10),value:Math.max(0,Math.round(intercept+slope*(n+i)))};});
}
export function detectAnomaly(series){
  const values=series.map(x=>Number(x.value||0));if(values.length<7)return {detected:false,z:0};
  const base=values.slice(0,-1),mean=base.reduce((a,b)=>a+b,0)/base.length,sd=Math.sqrt(base.reduce((a,v)=>a+(v-mean)**2,0)/base.length)||1,z=(values.at(-1)-mean)/sd;
  return {detected:Math.abs(z)>=2.5,z:Number(z.toFixed(2)),direction:z>0?"spike":"drop"};
}
