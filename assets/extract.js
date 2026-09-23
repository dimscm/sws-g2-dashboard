/* Ekstraksi workbook SWS -> data dashboard. Dipakai oleh app.js (browser) dan scripts/build-data.js (Node). */
"use strict";

export function xlsxDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) {
    const p = (n) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  if (typeof v === "number" && globalThis.XLSX) {
    const d = globalThis.XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return null;
}

export const xnum = (v) => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const t = v.trim();
    if (/^-?[\d.]+$/.test(t)) return parseFloat(t.replace(/\./g, ""));       // "1.929.000" -> 1929000
    if (/^-?[\d,]+$/.test(t)) return parseFloat(t.replace(/,/g, ""));         // "1,929,000"
    const n = parseFloat(t.replace(/\./g, "").replace(",", "."));             // campuran
    if (isFinite(n) && /^\s*-?[\d.,]+\s*$/.test(t)) return n;
  }
  return null;
};

export const xstr = (v) => {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
};

const PHONE_RE = /(\+?62[\s\-]?|0)8\d{2}[\s\-]?\d{4}[\s\-]?\d{2,5}/g;
export const redact = (t) => t.replace(PHONE_RE, "[redacted]");

export function extractWorkbook(wb) {
  const sheetRows = (name, startRow0) =>
    globalThis.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, range: startRow0, raw: true });

  /* ---- EXT (data mulai baris ke-5, 1-based) ---- */
  const ext = [];
  for (const r of sheetRows("EXT", 4)) {
    if (!r[7]) continue;
    ext.push({
      no: xnum(r[1]), grfpm: xstr(r[2]), region: xstr(r[3]), kota: xstr(r[4]),
      kecamatan: xstr(r[5]), afps: xstr(r[6]), outlet: xstr(r[7]),
      jenis: xstr(r[9]), alamat: xstr(r[11]), pic: xstr(r[12]),
      channel: xstr(r[14]), kode_outlet: xstr(r[15]),
      takeover: xstr(r[17]), kompetitor: xstr(r[18]), bbbrbl: xstr(r[19]),
      brand: xstr(r[20]), nomor_ap: xstr(r[21]),
      start: xlsxDate(r[22]), end: xlsxDate(r[23]),
      kompensasi: xnum(r[24]), produksi: xnum(r[25]), total_nilai: xnum(r[26]),
      plan_perpanjang: xstr(r[33]), hasil_visit: xstr(r[38]),
      tgl_deal: xlsxDate(r[39]), week_deal: xnum(r[40]), reason_not_ext: xstr(r[41]),
      omset_week: xnum(r[42]),
      nomor_ap_new: xstr(r[46]), start_new: xlsxDate(r[47]), end_new: xlsxDate(r[48]),
      kompensasi_new: xnum(r[49]),
      omset25: Array.from({ length: 12 }, (_, i) => xnum(r[60 + i]) || 0),
      omset26: Array.from({ length: 12 }, (_, i) => xnum(r[73 + i]) || 0),
      total25: xnum(r[72]), total26: xnum(r[85]),
    });
  }

  /* ---- NOO (data mulai baris ke-4, 1-based; kolom no telp PIC dibuang) ---- */
  const noo = [];
  for (const r of sheetRows("NOO", 3)) {
    if (!r[6]) continue;
    noo.push({
      grfpm: xstr(r[1]), region: xstr(r[2]), kota: xstr(r[3]), kecamatan: xstr(r[4]),
      afps: xstr(r[5]), outlet: xstr(r[6]), jenis: xstr(r[8]),
      prioritas: xstr(r[9]), kategori_kpi: xstr(r[10]),
      alamat: xstr(r[12]), pic: xstr(r[13]),
      channel: xstr(r[15]), rating: xnum(r[16]), perating: xnum(r[17]),
      score: xnum(r[18]), siswa: xnum(r[19]), omset_week: xnum(r[20]),
      alasan: xstr(r[21]), historis: xstr(r[22]),
      week_visit: xnum(r[23]), hari_visit: xstr(r[24]),
      /* hasil dealing */
      bulan_status: xstr(r[25]),
      takeover: xstr(r[30]), kompetitor: xstr(r[31]),
      tgl_visit: xlsxDate(r[32]), noo_status: xstr(r[33]),
      tgl_deal: xlsxDate(r[34]), week_deal: xnum(r[35]),
      alasan_proses: xstr(r[37]),
      bbbrbl: xstr(r[38]), brand: xstr(r[39]),
      start: xlsxDate(r[42]), end: xlsxDate(r[43]),
      kompensasi_deal: xnum(r[44]), branding_deal: xnum(r[45]), total_deal: xnum(r[46]),
      kode_outlet: xstr(r[53]), kode_subdist: xstr(r[54]),
      omset26: Array.from({ length: 12 }, (_, i) => xnum(r[55 + i]) || 0),
      total26: xnum(r[67]),
    });
  }

  /* ---- CATATAN UPDATE 1-4 ---- */
  const catatan = [];
  for (const name of wb.SheetNames.filter((n) => n.toUpperCase().startsWith("CATATAN UPDATE"))) {
    const blocks = [];
    let cur = [];
    const push = () => { if (cur.length) { blocks.push(cur.join("\n")); cur = []; } };
    for (const r of globalThis.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true })) {
      const cells = r
        .map((v) => (v instanceof Date ? xlsxDate(v) : xstr(v)))
        .filter(Boolean)
        .map(redact);
      if (cells.length) cur.push(cells.join(" | "));
      else push();
    }
    push();
    catatan.push({ sheet: name, blocks });
  }

  return { ext, noo, catatan, summary: buildSummary(ext, noo) };
}

export function buildSummary(ext, noo, today = new Date()) {
  const daysUntil = (iso) => (iso ? Math.round((new Date(iso + "T00:00:00") - today) / 86400000) : null);

  const agg = (rows, key, valKeys) => {
    const d = {};
    for (const r of rows) {
      const k = r[key] || "-";
      d[k] ||= { count: 0, ...Object.fromEntries(valKeys.map((v) => [v, 0])) };
      d[k].count++;
      for (const vk of valKeys) if (typeof r[vk] === "number") d[k][vk] += r[vk];
    }
    return Object.fromEntries(Object.entries(d).sort((a, b) => b[1].count - a[1].count));
  };

  const visit_status = {};
  for (const r of ext) {
    const h = (r.hasil_visit || "").trim().toUpperCase();
    const k = !h ? "BELUM DIVISIT" : h.includes("DEAL") && !h.includes("NO") ? "DEAL" : h.includes("NO DEAL") ? "NO DEAL" : h.includes("PROSES") ? "PROSES" : h;
    visit_status[k] = (visit_status[k] || 0) + 1;
  }

  const expiring = { expired: 0, d30: 0, d60: 0, d90: 0, d180: 0, later: 0, unknown: 0 };
  for (const r of ext) {
    const d = daysUntil(r.end_new || r.end);
    if (d == null) expiring.unknown++;
    else if (d < 0) expiring.expired++;
    else if (d <= 30) expiring.d30++;
    else if (d <= 60) expiring.d60++;
    else if (d <= 90) expiring.d90++;
    else if (d <= 180) expiring.d180++;
    else expiring.later++;
  }

  const noo_historis = {};
  for (const r of noo) {
    const h = (r.historis || "").trim().toUpperCase();
    const k = !h ? "BELUM ADA" : h.includes("DEAL") ? "ADA PROGRESS/DEAL" : "PERNAH DILIBATKAN";
    noo_historis[k] = (noo_historis[k] || 0) + 1;
  }

  const monthly = [];
  for (let i = 0; i < 12; i++) monthly.push({ bulan: `2025-${String(i + 1).padStart(2, "0")}`, omset: ext.reduce((a, r) => a + (r.omset25?.[i] || 0), 0) });
  for (let i = 0; i < 12; i++) monthly.push({ bulan: `2026-${String(i + 1).padStart(2, "0")}`, omset: ext.reduce((a, r) => a + (r.omset26?.[i] || 0), 0) });

  return {
    generated: today.toISOString().slice(0, 10),
    kpi: {
      total_ext: ext.length,
      total_noo: noo.length,
      total_kompensasi: ext.reduce((a, r) => a + (r.kompensasi || 0), 0),
      total_omset_2025: ext.reduce((a, r) => a + (r.total25 || 0), 0),
      total_omset_2026: ext.reduce((a, r) => a + (r.total26 || 0), 0),
      takeover: ext.filter((r) => r.takeover && !r.takeover.toUpperCase().includes("BUKAN")).length,
      prioritas_noo: noo.filter((r) => r.prioritas === "PRIORITAS").length,
    },
    per_region: agg(ext, "region", ["kompensasi", "total25", "total26"]),
    per_kota: agg(ext, "kota", ["kompensasi"]),
    per_jenis: agg(ext, "jenis", ["kompensasi"]),
    per_brand: agg(ext, "brand", ["kompensasi"]),
    noo_per_region: agg(noo, "region", []),
    noo_per_kategori: agg(noo, "kategori_kpi", []),
    visit_status,
    expiring,
    noo_historis,
    monthly_omset: monthly,
  };
}
