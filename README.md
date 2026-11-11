# Loyalin Dasbor

PWA untuk memantau transaksi, poin, dan member [Loyalin](https://github.com/rifkilabbaik/Loyalin). Dasbor membaca spreadsheet dan Apps Script yang sama dengan aplikasi kasir.

## Fitur

- **Masuk** pakai **Kode admin** dari sheet `Pengaturan`.
- **Beranda**: Omzet, Transaksi, Poin, Member baru, dan Member aktif, masing-masing dibandingkan dengan periode sebelumnya. Ada juga grafik Omzet, Jam ramai, ranking Toko, Top member, dan transaksi Terbaru.
- **Filter** periode (Hari ini, 7 hari, 30 hari, Bulan ini, 90 hari, Semua) dan toko. Filter berlaku untuk semua angka.
- **Member**: cari pakai nama, ID, atau No. HP. Urutan bisa menurut Poin, Belanja, Baru, atau Pasif (tidak belanja 30 hari atau lebih).
- **Detail member**: poin, total belanja, rata-rata, terakhir belanja, riwayat, serta tombol WhatsApp dan Telepon.
- **Ubah member**: nama dan No. HP. Perubahan ikut diperbarui di sheet `Transaksi`. Satu No. HP tetap hanya untuk satu member.
- **Hapus member**: baris di `Member` dihapus. Riwayat transaksinya tetap ada di `Transaksi`, dan ID kartunya bisa didaftarkan lagi di Loyalin.
- **Batalkan transaksi**:
  - `Jenis` diubah menjadi `Batal`.
  - Poin, Total Belanja, Jumlah Transaksi, dan Terakhir Belanja member dikoreksi.
  - Transaksi batal tidak dihitung lagi di omzet.
  - Pembatalan ditolak jika poin member sudah tidak cukup.
- **Transaksi**: dikelompokkan per hari dengan total harian. Nominal yang mencapai Batas Belanja diberi tanda.
- **Toko**: omzet, pangsa (%), perubahan, jumlah transaksi, member baru, dan rata-rata belanja.
- Unduh **CSV** (member dan transaksi). ID dan No. HP tetap berupa teks saat dibuka di Excel.
- Data dimuat ulang otomatis tiap 60 detik. Data terakhir tetap bisa dibuka saat offline.
- **Pengaturan**: warna (Oranye, Peach, Mint, Lavender), tema (Terang, Gelap, Otomatis), Install, dan Keluar.

## Setup Apps Script

Dasbor memakai **project Apps Script yang sama** dengan Loyalin, jadi URL-nya juga sama. Kasir dan Dasbor memakai kunci yang sama saat menyimpan, sehingga poin tidak bentrok.

1. Buka spreadsheet → **Extensions → Apps Script**.
2. Pastikan `Code.gs` sudah versi terbaru dari repo Loyalin, yang berisi baris `if (a.indexOf('dasbor') === 0) return _dasbor(p);`.
3. Klik **+ → Script**, beri nama `Dasbor`. Tempel isi [`apps-script/Dasbor.gs`](apps-script/Dasbor.gs), lalu simpan.
4. Pilih fungsi **`setupDasbor`** → **Run**. Baris `Kode Admin` akan muncul di sheet `Pengaturan`. Isi kolom `Nilai` dengan kode admin Anda. Kolom ini berformat teks, jadi kode seperti `0123` tidak berubah.
5. **Deploy → Manage deployments** → pilih deployment yang sudah dipakai (`…AKfycbw_EmBV…/exec`) → ikon pensil → **Version: New version** → **Deploy**. URL tetap sama, jadi `js/config.js` tidak perlu diubah.

Jika Kode Admin diganti di sheet, Dasbor yang sedang terbuka otomatis keluar dan meminta kode baru. Kode akses toko tidak pernah dikirim ke Dasbor.

## Spreadsheet

| Sheet | Dibaca | Diubah oleh Dasbor |
|---|---|---|
| `Member` | semua kolom | Nama, No HP, Poin, Total Belanja, Jumlah Transaksi, Terakhir Belanja, hapus baris |
| `Transaksi` | semua kolom | Nama dan No HP (saat member diubah), `Jenis` = `Batal` |
| `Toko` | Nama Toko | – |
| `Pengaturan` | Rupiah per Poin, Batas Belanja, Kode Admin | baris `Kode Admin` dibuat jika belum ada |

Kolom dibaca berdasarkan nama header, sama seperti Loyalin.

## Hosting & install

File statis, bisa memakai **GitHub Pages** (Settings → Pages → Deploy from branch). PWA butuh HTTPS.

- **Android / Chrome**: Pengaturan → **Install**, atau menu browser → *Install app*.
- **iPhone / Safari**: Share → *Add to Home Screen*.
