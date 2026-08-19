import { spawn } from 'node:child_process';
import { copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const testDb = path.join(root, 'data', '.qrforge-smoke-db.json');
const port = 4297;
await copyFile(path.join(root, 'data', 'db.json'), testDb);
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), NODE_ENV: 'test', AUTH_MODE: 'local', DATA_PROVIDER: 'json', JSON_DB_PATH: 'data/.qrforge-smoke-db.json', PUBLIC_BASE_URL: `http://127.0.0.1:${port}` },
  stdio: ['ignore', 'pipe', 'pipe']
});
let stderr = ''; child.stderr.on('data', d => stderr += d);
const base = `http://127.0.0.1:${port}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
async function getJson(url, options={}) { const r=await fetch(url,options); const j=await r.json().catch(()=>({})); if(!r.ok)throw new Error(`${url}: ${r.status} ${JSON.stringify(j)}`); return j; }
try {
  for (let i=0;i<40;i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await wait(100); if(i===39)throw new Error('Server did not start'); }
  const session = await getJson(`${base}/api/auth/demo`, { method:'POST', headers:{'content-type':'application/json'}, body:'{}' });
  const headers = {'content-type':'application/json', authorization:`Bearer ${session.token}`};
  const initial = await getJson(`${base}/api/state`, { headers });
  if (!Array.isArray(initial.qrs) || !Array.isArray(initial.events)) throw new Error('Invalid state payload');
  const qr = await getJson(`${base}/api/qrs`, { method:'POST', headers, body:JSON.stringify({name:'Smoke Test',type:'url',content:'https://example.com',destination_url:'https://example.com',is_dynamic:true,design:{foreground:'#17102f',background:'#ffffff'}}) });
  await getJson(`${base}/api/qrs/${encodeURIComponent(qr.id)}/scan`, { method:'POST', headers, body:'{}' });
  const detail = await getJson(`${base}/api/qrs/${encodeURIComponent(qr.id)}`, { headers });
  if (detail.events.length < 1) throw new Error('Scan event was not persisted');
  const redirect = await fetch(`${base}/r/${qr.short_id}`, { redirect:'manual', headers:{'user-agent':'QRForgeSmoke/1.0'} });
  if (redirect.status !== 200) throw new Error(`Redirect interstitial failed: ${redirect.status}`);
  await getJson(`${base}/api/qrs/${encodeURIComponent(qr.id)}`, { method:'DELETE', headers });
  console.log('QRForge smoke test: PASS');
  console.log('- health endpoint');
  console.log('- local authentication');
  console.log('- user-scoped state');
  console.log('- QR CRUD');
  console.log('- scan persistence');
  console.log('- public dynamic redirect');
} finally {
  child.kill('SIGTERM');
  await wait(150);
  await rm(testDb, { force:true });
  if (stderr.trim()) console.error(stderr.trim());
}
