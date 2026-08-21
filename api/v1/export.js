import {context} from "../../server/v6/platform.js";
import {method,fail,escapeCsv} from "../../server/v6/security.js";
function rows(v,source){return Object.values(v||{}).map(x=>({...x,source}));}
export default async function handler(request,response){
  try{
    method(request,"GET");const ctx=await context(request),type=String(request.query?.type||"leads"),format=String(request.query?.format||"csv").toLowerCase();
    let data=[],columns=[];
    if(type==="scans"){data=rows((await ctx.db.ref(`qrajn/scanEvents/${ctx.uid}`).get()).val(),"scan");columns=["timestamp","qrId","shortId","device","deviceName","browser","browserVersion","os","osVersion","country","region","city","language","timezone","referrer","visitorHash"];}
    else{const [a,b]=await Promise.all([ctx.db.ref(`qrajn/businessLeads/${ctx.uid}`).get(),ctx.db.ref(`qrajn/qrLeads/${ctx.uid}`).get()]);data=[...rows(a.val(),"profile"),...rows(b.val(),"qr")];columns=["createdAt","source","name","phone","email","message","profileId","qrId","visitorHash"];}
    if(format==="xls"){
      const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${type}"><Table>${[columns,...data.map(r=>columns.map(c=>r[c]??""))].map(row=>`<Row>${row.map(v=>`<Cell><Data ss:Type="String">${String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
      response.status(200).setHeader("content-type","application/vnd.ms-excel").setHeader("content-disposition",`attachment; filename="qrajn-${type}.xls"`).send(xml);return;
    }
    const csv=[columns.join(","),...data.map(r=>columns.map(c=>escapeCsv(r[c])).join(","))].join("\r\n");
    response.status(200).setHeader("content-type","text/csv; charset=utf-8").setHeader("content-disposition",`attachment; filename="qrajn-${type}.csv"`).send("\ufeff"+csv);
  }catch(e){return fail(e,response);}
}
