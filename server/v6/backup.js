import zlib from "node:zlib";
import {getStorage} from "firebase-admin/storage";
export async function createBackup({app,db}){
  const snap=await db.ref("qrajn").get(),payload={version:1,createdAt:new Date().toISOString(),namespace:"qrajn",data:snap.val()||{}};
  const gz=zlib.gzipSync(Buffer.from(JSON.stringify(payload)));
  const bucket=getStorage(app).bucket();
  const day=new Date().toISOString().slice(0,10),name=`qrajn-backups/${day}/qrajn-${Date.now()}.json.gz`;
  await bucket.file(name).save(gz,{contentType:"application/gzip",metadata:{cacheControl:"private,no-store"}});
  return {name,bytes:gz.length};
}
