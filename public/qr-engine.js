/**
 * QRForge offline QR Model 2 encoder.
 * Byte mode, versions 1-6, error correction L/M/Q/H, fixed mask 0.
 */
const GF_EXP=new Uint8Array(512), GF_LOG=new Uint8Array(256);
(function(){let x=1;for(let i=0;i<255;i++){GF_EXP[i]=x;GF_LOG[x]=i;x<<=1;if(x&0x100)x^=0x11d}for(let i=255;i<512;i++)GF_EXP[i]=GF_EXP[i-255]})();
function gfMul(a,b){if(!a||!b)return 0;return GF_EXP[GF_LOG[a]+GF_LOG[b]]}
function rsGenerator(n){let g=[1];for(let i=0;i<n;i++){const next=new Array(g.length+1).fill(0);for(let j=0;j<g.length;j++){next[j]^=g[j];next[j+1]^=gfMul(g[j],GF_EXP[i])}g=next}return g}
function rsEncode(data,n){const gen=rsGenerator(n),res=new Array(n).fill(0);for(const byte of data){const factor=byte^res[0];res.shift();res.push(0);for(let j=0;j<n;j++)res[j]^=gfMul(gen[j+1],factor)}return res}
function pushBits(out,val,len){for(let i=len-1;i>=0;i--)out.push((val>>>i)&1)}
function bchFormat(data){let d=data<<10;const g=0x537;while((31-Math.clz32(d)) >= (31-Math.clz32(g))) d^=g<<((31-Math.clz32(d))-(31-Math.clz32(g)));return ((data<<10)|d)^0x5412}
export function qrMatrix(text,ec="M"){
 const bytes=[...new TextEncoder().encode(text)], level=["L","M","Q","H"].includes(ec)?ec:"M";
 const tables={
  L:[null,{cap:17,data:19,blocks:[[19,7]]},{cap:32,data:34,blocks:[[34,10]]},{cap:53,data:55,blocks:[[55,15]]},{cap:78,data:80,blocks:[[80,20]]},{cap:106,data:108,blocks:[[108,26]]},{cap:134,data:136,blocks:[[68,18],[68,18]]}],
  M:[null,{cap:14,data:16,blocks:[[16,10]]},{cap:26,data:28,blocks:[[28,16]]},{cap:42,data:44,blocks:[[44,26]]},{cap:62,data:64,blocks:[[32,18],[32,18]]},{cap:84,data:86,blocks:[[43,24],[43,24]]},{cap:106,data:108,blocks:[[27,16],[27,16],[27,16],[27,16]]}],
  Q:[null,{cap:11,data:13,blocks:[[13,13]]},{cap:20,data:22,blocks:[[22,22]]},{cap:32,data:34,blocks:[[17,18],[17,18]]},{cap:46,data:48,blocks:[[24,26],[24,26]]},{cap:60,data:62,blocks:[[15,18],[15,18],[16,18],[16,18]]},{cap:74,data:76,blocks:[[19,24],[19,24],[19,24],[19,24]]}],
  H:[null,{cap:7,data:9,blocks:[[9,17]]},{cap:14,data:16,blocks:[[16,28]]},{cap:24,data:26,blocks:[[13,22],[13,22]]},{cap:34,data:36,blocks:[[9,16],[9,16],[9,16],[9,16]]},{cap:44,data:46,blocks:[[11,22],[11,22],[12,22],[12,22]]},{cap:58,data:60,blocks:[[15,28],[15,28],[15,28],[15,28]]}]
 };
 const specs=tables[level];let v=1;while(v<6&&bytes.length>specs[v].cap)v++;
 if(bytes.length>specs[6].cap)throw new Error(`QR content is too long for ${level} error correction. Shorten the content or choose a lower correction level.`);
 const sp=specs[v], bits=[];pushBits(bits,0b0100,4);pushBits(bits,bytes.length,8);bytes.forEach(b=>pushBits(bits,b,8));
 const maxBits=sp.data*8;for(let i=0;i<Math.min(4,maxBits-bits.length);i++)bits.push(0);while(bits.length%8)bits.push(0);
 let data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|(bits[i+j]||0);data.push(b)}
 let pad=true;while(data.length<sp.data){data.push(pad?0xec:0x11);pad=!pad}
 const dataBlocks=[],eccBlocks=[];let offset=0;
 for(const [dataCount,eccCount] of sp.blocks){const part=data.slice(offset,offset+dataCount);offset+=dataCount;dataBlocks.push(part);eccBlocks.push(rsEncode(part,eccCount))}
 const code=[],maxData=Math.max(...dataBlocks.map(b=>b.length)),maxEcc=Math.max(...eccBlocks.map(b=>b.length));
 for(let i=0;i<maxData;i++)for(const block of dataBlocks)if(i<block.length)code.push(block[i]);
 for(let i=0;i<maxEcc;i++)for(const block of eccBlocks)if(i<block.length)code.push(block[i]);
 const size=17+4*v, m=Array.from({length:size},()=>Array(size).fill(null));
 const set=(r,c,val)=>{if(r>=0&&c>=0&&r<size&&c<size)m[r][c]=!!val}
 function finder(r,c){for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++){const rr=r+y,cc=c+x;if(rr<0||cc<0||rr>=size||cc>=size)continue;if(x===-1||x===7||y===-1||y===7)set(rr,cc,false);else set(rr,cc,x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4))}}
 finder(0,0);finder(0,size-7);finder(size-7,0);
 for(let i=8;i<size-8;i++){if(m[6][i]===null)set(6,i,i%2===0);if(m[i][6]===null)set(i,6,i%2===0)}
 if(v>=2){const c=size-7;for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)set(c+y,c+x,Math.max(Math.abs(x),Math.abs(y))!==1)}
 const levelBits={L:1,M:0,Q:3,H:2}[level],format=bchFormat(levelBits<<3);
 for(let i=0;i<15;i++){const bit=((format>>i)&1)===1;if(i<6)set(i,8,bit);else if(i<8)set(i+1,8,bit);else set(size-15+i,8,bit);if(i<8)set(8,size-i-1,bit);else if(i<9)set(8,15-i,bit);else set(8,15-i-1,bit)}
 set(size-8,8,true);
 const stream=[];code.forEach(b=>pushBits(stream,b,8));let bi=0,inc=-1,row=size-1;
 for(let col=size-1;col>0;col-=2){if(col===6)col--;while(true){for(let c=0;c<2;c++){const cc=col-c;if(m[row][cc]===null){let dark=(stream[bi++]||0)===1;if((row+cc)%2===0)dark=!dark;m[row][cc]=dark}}row+=inc;if(row<0||row>=size){row-=inc;inc=-inc;break}}}
 return m;
}
export function qrSvg(text,{size=220,margin=4,fg="#17102f",bg="#fff",ec="M"}={}){
 const matrix=qrMatrix(text,ec), n=matrix.length, total=n+margin*2, scale=size/total;
 let paths="";for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(matrix[r][c])paths+=`M${c+margin} ${r+margin}h1v1h-1z`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${bg}"/><path d="${paths}" fill="${fg}"/></svg>`;
}
