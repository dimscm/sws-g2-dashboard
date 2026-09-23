# SWS G2 Dashboard

Dashboard monitoring statis untuk data **SWS W36 - G2 Master Update 7 Area** (tim sales minuman, area Jakarta & Bodetabek). Dibuat dengan HTML + Chart.js, tanpa proses build — siap di-publish ke **GitHub Pages**.

## Isi

- **Dashboard** — KPI (outlet EXT, sasaran NOO, nilai kompensasi, omset), grafik per region, status visit perpanjangan, masa berlaku kontrak, omset bulanan, komposisi brand, historis NOO.
- **Outlet Ext (EXT)** — tabel 2.706 outlet kontrak, bisa cari (nama/alamat/AFPS/PIC), filter region, status visit, masa kontrak, urutkan kolom.
- **Sasaran Baru (NOO)** — tabel 5.151 sasaran outlet, filter prioritas & kategori KPI.
- **Catatan Update** — log perubahan mingguan (perpindahan AFPS, perubahan prioritas, dll).

## Privasi

Kolom **No Telp PIC sengaja tidak dipublikasikan** (dikeluarkan saat ekstraksi, dan nomor telepon di teks catatan di-redaksi). Nama PIC, alamat, dan nilai kompensasi tetap tampil sesuai permintaan.

## Menjalankan lokal

Butuh HTTP server (karena data di-`fetch` sebagai JSON):

```bash
python -m http.server 8765
# buka http://localhost:8765
```

## Publish ke GitHub Pages

1. Buat repo baru di github.com (misal `sws-g2-dashboard`), **public**.
2. Dari folder ini:
   ```bash
   git remote add origin https://github.com/<username>/sws-g2-dashboard.git
   git push -u origin main
   ```
3. Di GitHub: **Settings → Pages → Source: `main` branch, `/ (root)` → Save**.
4. Website online di `https://<username>.github.io/sws-g2-dashboard/`.

## Update data dari Excel baru

Ganti file sumber di `scripts/extract.py` (variabel `SRC`), lalu jalankan:

```bash
python scripts/extract.py
```

Script akan menimpa `data/*.json` (kolom no. telp tetap dibuang otomatis). Commit & push, website ikut ter-update.
