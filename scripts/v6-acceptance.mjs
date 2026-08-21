import fs from "node:fs";
const rows=JSON.parse(fs.readFileSync("scripts/v6-acceptance.json","utf8"));
if(rows.length!==200)throw new Error(`Expected 200 acceptance items, found ${rows.length}`);
for(let i=1;i<=200;i++){if(rows[i-1]?.id!==i)throw new Error(`Acceptance registry missing point ${i}`);}
const allowed=new Set(["implemented","provider-config","operational-gate"]);
for(const x of rows)if(!allowed.has(x.status))throw new Error(`Invalid status for point ${x.id}`);
const summary=rows.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
console.log(`QR AJN V6 200-point build registry: PASS`);
console.log(`- Implemented in code: ${summary["implemented"]||0}`);
console.log(`- Provider configuration required: ${summary["provider-config"]||0}`);
console.log(`- Operational/release gate: ${summary["operational-gate"]||0}`);
console.log(`- Total covered: ${rows.length}/200`);
