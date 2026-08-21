export const QRAJN_PLUGIN_SDK_VERSION="1.0.0";
const registry=new Map();
export function registerBlockPlugin(manifest,renderer){
  if(!manifest?.id||!manifest?.name||typeof renderer!=="function")throw new Error("Invalid QR AJN block plugin.");
  if(registry.has(manifest.id))throw new Error(`Plugin already registered: ${manifest.id}`);
  const safe={id:String(manifest.id).slice(0,60),name:String(manifest.name).slice(0,100),version:String(manifest.version||"1.0.0").slice(0,30),category:String(manifest.category||"custom").slice(0,60)};
  registry.set(safe.id,{manifest:safe,renderer});return safe;
}
export function renderPluginBlock(id,data,ctx={}){const p=registry.get(id);if(!p)return "";return p.renderer(structuredClone(data||{}),Object.freeze({...ctx}));}
export function pluginCatalog(){return [...registry.values()].map(x=>x.manifest);}
