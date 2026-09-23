/* Regenerasi data bawaan (data/*.json) dari file Excel SWS.
   Pakai modul yang sama persis dengan yang dipakai website (assets/extract.js).

   Usage: node scripts/build-data.js <file.xlsx>        -> tulis data/*.json
          node scripts/build-data.js <file.xlsx> --check -> bandingkan dengan data/*.json tanpa menulis
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import { extractWorkbook } from "../assets/extract.js";

globalThis.XLSX = XLSX;

const SRC = process.argv[2];
const CHECK = process.argv.includes("--check");
const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");

if (!SRC || !fs.existsSync(SRC)) {
  console.error("Usage: node scripts/build-data.js <file.xlsx> [--check]");
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(SRC), { type: "buffer", cellDates: true });
const { ext, noo, catatan, summary } = extractWorkbook(wb);
console.log(`EXT: ${ext.length} · NOO: ${noo.length} · Catatan: ${catatan.length} sheet`);

const out = {
  "ext.json": ext,
  "noo.json": noo,
  "catatan.json": catatan,
  "summary.json": summary,
};

let fail = 0;
for (const [fn, data] of Object.entries(out)) {
  const file = path.join(DATA, fn);
  if (CHECK) {
    const cur = JSON.parse(fs.readFileSync(file, "utf8"));
    if (JSON.stringify(cur) === JSON.stringify(data)) console.log("OK   ", fn);
    else { console.log("BEDA ", fn); fail++; }
  } else {
    fs.writeFileSync(file, JSON.stringify(data));
    console.log("TULIS", fn, fs.statSync(file).size, "bytes");
  }
}
process.exit(fail ? 1 : 0);
