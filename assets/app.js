/* SWS G2 Dashboard — logika utama */
"use strict";

const TODAY = new Date();
const PAGE_SIZE = 100;

const fmtRp = (v) => {
  if (v == null) return "-";
  if (Math.abs(v) >= 1e9) return "Rp " + (v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
  if (Math.abs(v) >= 1e6) return "Rp " + (v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " jt";
  return "Rp " + v.toLocaleString("id-ID");
};
const fmtNum = (v) => (v == null ? "-" : v.toLocaleString("id-ID"));
const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return Math.round((d - TODAY) / 86400000);
}

function expiryBadge(iso) {
  const d = daysUntil(iso);
  if (d == null) return `<span class="badge exp-gray">-</span>`;
  const tgl = iso;
  if (d < 0) return `<span class="badge exp-red">${tgl} · kedaluwarsa</span>`;
  if (d <= 60) return `<span class="badge exp-red">${tgl} · ${d} hari</span>`;
  if (d <= 180) return `<span class="badge exp-amber">${tgl} · ${d} hari</span>`;
  return `<span class="badge exp-green">${tgl} · ${d} hari</span>`;
}

function visitBadge(status) {
  const s = (status || "").toUpperCase();
  if (!s) return `<span class="badge belum">BELUM DIVISIT</span>`;
  if (s.includes("NO DEAL")) return `<span class="badge nodeal">NO DEAL</span>`;
  if (s.includes("DEAL")) return `<span class="badge deal">DEAL</span>`;
  if (s.includes("PROSES")) return `<span class="badge proses">PROSES</span>`;
  return `<span class="badge belum">${esc(s)}</span>`;
}

/* ---------- Tabs ---------- */
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === btn.dataset.tab));
});

/* ---------- Load data ---------- */
async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal memuat " + url);
  return res.json();
}

const [summary, ext, noo, catatan] = await Promise.all([
  loadJSON("data/summary.json"),
  loadJSON("data/ext.json"),
  loadJSON("data/noo.json"),
  loadJSON("data/catatan.json"),
]);

document.getElementById("generated").textContent = "Data per " + new Date(summary.generated).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/* efektif: tanggal berakhir kontrak terbaru */
ext.forEach((r) => { r.endEff = r.end_new || r.end; r.endSort = daysUntil(r.endEff) ?? 99999; });
noo.forEach((r) => { r.search = `${r.outlet || ""} ${r.alamat || ""} ${r.afps || ""} ${r.pic || ""}`.toLowerCase(); });
ext.forEach((r) => { r.search = `${r.outlet || ""} ${r.alamat || ""} ${r.afps || ""} ${r.pic || ""}`.toLowerCase(); });

renderDashboard();
initExtTable();
initNooTable();
renderCatatan();

/* ================= DASHBOARD ================= */
function renderDashboard() {
  const k = summary.kpi;
  const cards = [
    { label: "Outlet EXT", value: fmtNum(k.total_ext), sub: "outlet kontrak aktif" },
    { label: "Sasaran NOO", value: fmtNum(k.total_noo), sub: `${fmtNum(k.prioritas_noo)} prioritas` },
    { label: "Nilai Kompensasi", value: fmtRp(k.total_kompensasi), sub: "seluruh kontrak EXT" },
    { label: "Omset 2025", value: fmtRp(k.total_omset_2025), sub: "total outlet EXT" },
    { label: "Omset 2026 (YTD)", value: fmtRp(k.total_omset_2026), sub: "s.d. bulan terakhir" },
    { label: "Takeover", value: fmtNum(k.takeover), sub: "kontrak dari kompetitor" },
  ];
  document.getElementById("kpiGrid").innerHTML = cards
    .map((c) => `<div class="kpi"><div class="label">${c.label}</div><div class="value">${c.value}</div><div class="sub">${c.sub}</div></div>`)
    .join("");

  const regions = Object.entries(summary.per_region);
  new Chart(chartRegion, {
    data: {
      labels: regions.map(([r]) => r),
      datasets: [
        { type: "bar", label: "Jumlah Outlet", data: regions.map(([, v]) => v.count), backgroundColor: "#0ea5e9", yAxisID: "y" },
        { type: "line", label: "Kompensasi (M Rp)", data: regions.map(([, v]) => Math.round(v.kompensasi / 1e6)), borderColor: "#d97706", backgroundColor: "#d97706", yAxisID: "y1", tension: .3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: {
        y: { position: "left", title: { display: true, text: "Outlet" } },
        y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Kompensasi (jt Rp)" } },
      },
    },
  });

  const vs = summary.visit_status;
  const visitColors = { DEAL: "#16a34a", "NO DEAL": "#dc2626", PROSES: "#d97706", "BELUM DIVISIT": "#94a3b8" };
  const vsLabels = Object.keys(vs);
  new Chart(chartVisit, {
    type: "doughnut",
    data: {
      labels: vsLabels,
      datasets: [{ data: vsLabels.map((l) => vs[l]), backgroundColor: vsLabels.map((l) => visitColors[l] || "#64748b"), borderWidth: 2 }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });

  const ex = summary.expiring;
  new Chart(chartExpiry, {
    type: "bar",
    data: {
      labels: ["Kedaluwarsa", "≤30 hari", "31–60", "61–90", "91–180", ">180 hari", "Tanpa data"],
      datasets: [{ data: [ex.expired, ex.d30, ex.d60, ex.d90, ex.d180, ex.later, ex.unknown], backgroundColor: ["#dc2626", "#ea580c", "#d97706", "#eab308", "#84cc16", "#16a34a", "#94a3b8"] }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: "Outlet" } } } },
  });

  const monthly = summary.monthly_omset;
  const labels = monthly.map((m) => m.bulan);
  new Chart(chartOmset, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "2025", data: monthly.map((m) => m.omset), borderColor: "#0ea5e9", backgroundColor: "rgba(14,165,233,.12)", fill: true, tension: .3 },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { callback: function (v) { return labels[v].slice(2); } } },
        y: { ticks: { callback: (v) => (v / 1e9).toFixed(0) + " M" } },
      },
    },
  });

  const brands = Object.entries(summary.per_brand).slice(0, 6);
  new Chart(chartBrand, {
    type: "doughnut",
    data: {
      labels: brands.map(([b]) => b),
      datasets: [{ data: brands.map(([, v]) => v.count), backgroundColor: ["#0284c7", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"], borderWidth: 2 }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });

  const nr = Object.entries(summary.noo_per_region).slice(0, 8);
  new Chart(chartNooRegion, {
    type: "bar",
    data: { labels: nr.map(([r]) => r), datasets: [{ data: nr.map(([, v]) => v.count), backgroundColor: "#6366f1" }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  });

  const nh = summary.noo_historis;
  new Chart(chartNooHistoris, {
    type: "doughnut",
    data: {
      labels: Object.keys(nh),
      datasets: [{ data: Object.values(nh), backgroundColor: ["#0ea5e9", "#94a3b8", "#16a34a"], borderWidth: 2 }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

/* ================= TABLES ================= */
function makeTable({ bodyId, moreId, countId, rows, filters, renderRow, sortKey }) {
  let filtered = rows.slice();
  let shown = 0;
  let sort = { key: sortKey, dir: 1 };

  function apply() {
    filtered = rows.filter(filters);
    const { key, dir } = sort;
    filtered.sort((a, b) => {
      const va = a[key] == null ? "" : a[key], vb = b[key] == null ? "" : b[key];
      return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))) * dir;
    });
    shown = 0;
    bodyId.innerHTML = "";
    renderMore();
    countId.textContent = `${filtered.length.toLocaleString("id-ID")} outlet`;
  }

  function renderMore() {
    const slice = filtered.slice(shown, shown + PAGE_SIZE);
    bodyId.insertAdjacentHTML("beforeend", slice.map(renderRow).join(""));
    shown += slice.length;
    moreId.disabled = shown >= filtered.length;
    moreId.textContent = shown >= filtered.length ? "Semua data ditampilkan" : `Muat lebih banyak (${shown.toLocaleString("id-ID")}/${filtered.length.toLocaleString("id-ID")})`;
  }

  moreId.addEventListener("click", renderMore);
  bodyId.closest("table").querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      sort = { key, dir: sort.key === key ? -sort.dir : 1 };
      apply();
    });
  });
  apply();
  return { apply };
}

function initExtTable() {
  const regionSel = document.getElementById("extRegion");
  [...new Set(ext.map((r) => r.region).filter(Boolean))].sort().forEach((r) => regionSel.add(new Option(r, r)));

  const search = document.getElementById("extSearch");
  const status = document.getElementById("extStatus");
  const exp = document.getElementById("extExp");

  const filters = (r) => {
    if (search.value && !r.search.includes(search.value.toLowerCase())) return false;
    if (regionSel.value && r.region !== regionSel.value) return false;
    if (status.value) {
      const s = (r.hasil_visit || "").toUpperCase();
      const match = status.value === "BELUM DIVISIT" ? !s : s.includes(status.value);
      if (!match) return false;
    }
    if (exp.value) {
      const d = daysUntil(r.endEff);
      const ok =
        exp.value === "expired" ? d != null && d < 0 :
        exp.value === "d30" ? d != null && d >= 0 && d <= 30 :
        exp.value === "d60" ? d != null && d > 30 && d <= 60 :
        exp.value === "d90" ? d != null && d > 60 && d <= 90 :
        exp.value === "d180" ? d != null && d > 90 && d <= 180 :
        d == null || d > 180;
      if (!ok) return false;
    }
    return true;
  };

  const renderRow = (r) => `<tr>
    <td><div class="main">${esc(r.outlet)}</div><div class="sub">${esc(r.kecamatan || "")}</div></td>
    <td><div class="main">${esc(r.region || "-")}</div><div class="sub">${esc(r.kota || "")}</div></td>
    <td>${esc(r.jenis || "-")}</td>
    <td>${esc(r.brand || "-")}</td>
    <td>${esc(r.afps || "-")}</td>
    <td>${expiryBadge(r.endEff)}</td>
    <td class="num">${fmtRp(r.kompensasi_new ?? r.kompensasi)}</td>
    <td>${visitBadge(r.hasil_visit)}</td>
  </tr>`;

  const t = makeTable({
    bodyId: document.getElementById("extBody"),
    moreId: document.getElementById("extMore"),
    countId: document.getElementById("extCount"),
    rows: ext, filters, renderRow, sortKey: "endSort",
  });
  [search, regionSel, status, exp].forEach((el) => el.addEventListener("input", t.apply));
}

function initNooTable() {
  const regionSel = document.getElementById("nooRegion");
  [...new Set(noo.map((r) => r.region).filter(Boolean))].sort().forEach((r) => regionSel.add(new Option(r, r)));
  const katSel = document.getElementById("nooKategori");
  [...new Set(noo.map((r) => r.kategori_kpi).filter(Boolean))].sort().forEach((r) => katSel.add(new Option(r, r)));

  const search = document.getElementById("nooSearch");
  const prio = document.getElementById("nooPrioritas");

  const filters = (r) => {
    if (search.value && !r.search.includes(search.value.toLowerCase())) return false;
    if (regionSel.value && r.region !== regionSel.value) return false;
    if (prio.value && r.prioritas !== prio.value) return false;
    if (katSel.value && r.kategori_kpi !== katSel.value) return false;
    return true;
  };

  const renderRow = (r) => `<tr>
    <td><div class="main">${esc(r.outlet)}</div><div class="sub">${esc(r.kecamatan || "")}</div></td>
    <td><div class="main">${esc(r.region || "-")}</div><div class="sub">${esc(r.kota || "")}</div></td>
    <td>${esc(r.jenis || "-")}</td>
    <td>${r.prioritas === "PRIORITAS" ? '<span class="badge prio">PRIORITAS</span>' : '<span class="badge belum">TIDAK</span>'}</td>
    <td>${esc(r.kategori_kpi || "-")}</td>
    <td class="num">${r.rating != null ? "⭐ " + r.rating.toLocaleString("id-ID") : "-"}</td>
    <td class="num">${r.week_visit != null ? "W" + r.week_visit + " · " + esc(r.hari_visit || "") : "-"}</td>
    <td><div class="sub">${esc(r.historis || "—")}</div></td>
  </tr>`;

  const t = makeTable({
    bodyId: document.getElementById("nooBody"),
    moreId: document.getElementById("nooMore"),
    countId: document.getElementById("nooCount"),
    rows: noo, filters, renderRow, sortKey: "outlet",
  });
  [search, regionSel, prio, katSel].forEach((el) => el.addEventListener("input", t.apply));
}

/* ================= CATATAN ================= */
function renderCatatan() {
  const el = document.getElementById("catatanList");
  el.innerHTML = catatan.map((s, i) => `
    <div class="note-sheet${i > 0 ? " collapsed" : ""}">
      <h3>${esc(s.sheet)} <span class="toggle">${s.blocks.length} blok — klik untuk buka/tutup</span></h3>
      <div class="note-body">${s.blocks.map((b) => `<div class="note-block">${esc(b)}</div>`).join("")}</div>
    </div>`).join("");
  el.addEventListener("click", (e) => {
    const h = e.target.closest(".note-sheet > h3");
    if (h) h.parentElement.classList.toggle("collapsed");
  });
}
