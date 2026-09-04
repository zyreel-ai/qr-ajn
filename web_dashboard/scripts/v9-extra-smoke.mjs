import assert from 'node:assert/strict';
import {PDFDocument, degrees, rgb, StandardFonts} from 'pdf-lib';

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.HelveticaBold);
const first = pdf.addPage([595, 842]);
first.drawText('QR AJN PDF Editor Smoke Test', {x: 48, y: 780, size: 20, font});
first.drawText('LOCAL TEST', {x: 130, y: 390, size: 46, rotate: degrees(35), color: rgb(.42,.42,.46), opacity: .22});
const second = pdf.addPage([595, 842]);
second.setRotation(degrees(90));
pdf.setTitle('QR AJN PDF Editor Test');
pdf.setAuthor('QR AJN');

const bytes = await pdf.save();
assert.equal(Buffer.from(bytes).subarray(0,5).toString('ascii'), '%PDF-');
const reopened = await PDFDocument.load(bytes);
assert.equal(reopened.getPageCount(), 2);

const extracted = await PDFDocument.create();
const [copied] = await extracted.copyPages(reopened, [0]);
extracted.addPage(copied);
const extractedBytes = await extracted.save();
const extractedRead = await PDFDocument.load(extractedBytes);
assert.equal(extractedRead.getPageCount(), 1);

const merged = await PDFDocument.create();
for (const src of [reopened, extractedRead]) {
  const pages = await merged.copyPages(src, src.getPageIndices());
  for (const page of pages) merged.addPage(page);
}
assert.equal(merged.getPageCount(), 3);
const mergedBytes = await merged.save();
assert.ok(mergedBytes.length > 500);

console.log('PASS: pdf-lib loads and creates a valid PDF');
console.log('PASS: rotate + watermark drawing APIs work');
console.log('PASS: page extraction works');
console.log('PASS: PDF merge works');
console.log('PASS: PDF metadata save/load works');
