import test from 'node:test';
import assert from 'node:assert/strict';
import {createQrMatrix,matrixToSvg,isQrContrastSafe} from '../qr-encoder.js';

test('QR encoder handles URL, Telugu and all ECC levels',()=>{for(const level of ['L','M','Q','H']){const q=createQrMatrix('https://qrajn.online/అంజన్',{level});assert.ok(q.matrix.length>=21);assert.equal(q.matrix.length,q.matrix[0].length);}});
test('QR SVG exports, transparent backgrounds, eye styling and contrast guard work',()=>{const q=createQrMatrix('QR AJN profile',{level:'M'});const svg=matrixToSvg(q.matrix,{size:500,foreground:'#111827',eyeColor:'#4f46e5',eyeStyle:'rounded'});assert.match(svg,/svg/);assert.match(svg,/#4f46e5/i);const transparent=matrixToSvg(q.matrix,{size:500,transparent:true,eyeColor:'#2563eb',eyeStyle:'dot'});assert.doesNotMatch(transparent,/<rect[^>]+fill="#ffffff"/i);assert.match(transparent,/#2563eb/i);assert.equal(isQrContrastSafe('#0f172a','#ffffff'),true);assert.equal(isQrContrastSafe('#ffffff','#ffffff'),false);});
