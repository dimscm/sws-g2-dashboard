# SWS G2 Dashboard

Dashboard monitoring statis untuk data **SWS W36 - G2 Master Update 7 Area** (tim sales minuman, area Jakarta & Bodetabek). HTML + Chart.js + SheetJS, tanpa proses build — siap di-publish ke **GitHub Pages**.

## Isi

- **Dashboard** — KPI (outlet EXT, sasaran NOO, nilai kompensasi, omset), grafik per region, status visit perpanjangan, masa berlaku kontrak, omset bulanan, komposisi brand, historis NOO.
- **Outlet Ext (EXT)** — tabel 2.706 outlet kontrak: cari (nama/alamat/AFPS/PIC), filter region, status visit, masa kontrak; kolom bisa di-sort.
- **Sasaran Baru (NOO)** — tabel 5.151 sasaran outlet: filter prioritas & kategori KPI.
- **Catatan Update** — log perubahan mingguan (perpindahan AFPS, perubahan prioritas, dll).
- **Update Data** — upload file Excel SWS minggu baru langsung di website; dashboard dihitung ulang otomatis di browser dan tersimpan di browser itu (IndexedDB). Tanpa perlu Python/server.

## Update data mingguan (cukup dari browser)

1. Buka website → tab **Update Data**.
2. Seret / pilih file `.xlsx` SWS terbaru.
3. Selesai — dashboard langsung memakai data baru. Tombol *Kembali ke Data Bawaan* mengembalikan data W36 bawaan.

Catatan: hasil upload tersimpan **per-browser/per-laptop**. Orang lain yang membuka website tanpa upload tetap melihat data bawaan dari repo.

## Privasi

Kolom **No Telp PIC tidak dipublikasikan** — dikeluarkan saat ekstraksi, dan nomor telepon di teks catatan di-redaksi otomatis. Nama PIC, alamat, dan nilai kompensasi tetap tampil sesuai permintaan.

## Menjalankan lokal

Butuh HTTP server (data di-`fetch` sebagai JSON):

```bash
python -m http.server 8765   # lalu buka http://localhost:8765
```

## Publish & update ke GitHub (dengan gh CLI)

```bash
gh auth login                                  # sekali saja
gh repo create sws-g2-dashboard --public --source . --push
```

Lalu aktifkan Pages: **Settings → Pages → Source: `main` / `(root)`**, atau:

```bash
gh api repos/<username>/sws-g2-dashboard/pages -X POST -F "source[branch]=main" -F "source[path]=/"
```

Website online di `https://<username>.github.io/sws-g2-dashboard/`.

## Regenerasi data bawaan (untuk maintainer repo)

Kalau mau data bawaan di repo ikut minggu terbaru (tanpa upload manual):

```bash
cd scripts && npm install
node scripts/build-data.js "/path/ke/SWS_W37_-_....xlsx"        # tulis data/*.json
node scripts/build-data.js "/path/ke/file.xlsx" --check         # verifikasi tanpa menulis
git add data && git commit -m "Data W37" && git push
```

`assets/extract.js` adalah modul ekstraksi satu-satunya — dipakai bersama oleh website (browser) dan script Node di atas.
