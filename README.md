# Loyalin Dasbor

PWA untuk memantau transaksi, stamp, dan member [Loyalin](https://github.com/rifkilabbaik/Loyalin). Dasbor membaca spreadsheet dan Apps Script yang sama dengan aplikasi kasir.

## Fitur

- **Masuk** pakai **Kode admin** dari sheet `Pengaturan`.
- **Beranda**: Omzet, Transaksi, Hadiah (kartu stamp yang penuh), Member baru, dan Member aktif, masing-masing dibandingkan dengan periode sebelumnya. Ada juga grafik Omzet, Jam ramai, ranking Toko, Top member, dan transaksi Terbaru.
- **Filter** periode (Hari ini, 7 hari, 30 hari, Bulan ini, 90 hari, Semua) dan toko. Filter berlaku untuk semua angka.
- **Member**: cari pakai nama, ID, atau No. HP. Urutan bisa menurut Stamp, Belanja, Baru, atau Pasif (tidak belanja 30 hari atau lebih). Setiap member menampilkan progres kartu (misalnya 3/10) dan jumlah hadiah.
- **Detail member**: kartu stamp (slot terakhir = hadiah, lencana hadiah ×N), total belanja, rata-rata, terakhir belanja, riwayat, serta tombol WhatsApp dan Telepon.
- **Ubah member**: nama dan No. HP. Perubahan ikut diperbarui di sheet `Transaksi`. Satu No. HP tetap hanya untuk satu member.
- **Hapus member**: baris di `Member` dihapus. Riwayat transaksinya tetap ada di `Transaksi`, dan ID kartunya bisa didaftarkan lagi di Loyalin.
- **Batalkan transaksi**:
  - `Jenis` diubah menjadi `Batal`.
  - Stamp, Total Belanja, Jumlah Transaksi, dan Terakhir Belanja member dikoreksi.
  - Transaksi batal tidak dihitung lagi di omzet.
  - Pembatalan ditolak jika stamp member sudah tidak cukup.
- **Transaksi**: dikelompokkan per hari dengan total harian. Setiap transaksi menampilkan posisi kartu setelah stamp masuk (misalnya 4/10), dan transaksi yang memenuhi kartu ditandai hadiah. Nominal yang mencapai Batas Belanja diberi tanda.
- **Toko**: omzet, pangsa (%), perubahan, jumlah transaksi, member baru, dan rata-rata belanja.
- Unduh **CSV** (member dan transaksi). ID dan No. HP tetap berupa teks saat dibuka di Excel.
- Data dimuat ulang otomatis tiap 60 detik. Data terakhir tetap bisa dibuka saat offline.
- **Pengaturan**: warna (Oranye, Peach, Mint, Lavender), tema (Terang, Gelap, Otomatis), Install, dan Keluar.

## Setup Apps Script

Dasbor memakai **project Apps Script yang sama** dengan Loyalin, jadi URL-nya juga sama. Kedua file diambil dari repo [Loyalin](https://github.com/rifkilabbaik/Loyalin):

1. Buka spreadsheet → **Extensions → Apps Script**.
2. Ganti seluruh isi `Code.gs` dengan [`apps-script/Code.gs`](https://github.com/rifkilabbaik/Loyalin/blob/claude/vigilant-brown-w5thqt/apps-script/Code.gs) dari repo Loyalin.
3. Klik **+ → Script**, beri nama `Dasbor`, lalu tempel isi [`apps-script/Dasbor.gs`](https://github.com/rifkilabbaik/Loyalin/blob/claude/vigilant-brown-w5thqt/apps-script/Dasbor.gs) dari repo Loyalin. Jangan digabung ke `Code.gs`.
4. Pilih fungsi **`setupDasbor`** → **Run**. Baris `Kode Admin` akan muncul di sheet `Pengaturan`. Isi kolom `Nilai` dengan kode admin Anda (format teks, jadi `0123` tidak berubah).
5. **Deploy → Manage deployments** → pilih deployment yang sudah dipakai (`…AKfycbw_EmBV…/exec`) → ikon pensil → **Version: New version** → **Deploy**. URL tetap sama, jadi `js/config.js` tidak perlu diubah.

Jika Kode Admin diganti di sheet, Dasbor yang sedang terbuka otomatis keluar dan meminta kode baru. Kode akses toko tidak pernah dikirim ke Dasbor.

## Spreadsheet

| Sheet | Dibaca | Diubah oleh Dasbor |
|---|---|---|
| `Member` | semua kolom | Nama, No HP, Stamp, Total Belanja, Jumlah Transaksi, Terakhir Belanja, hapus baris |
| `Transaksi` | semua kolom | Nama dan No HP (saat member diubah), `Jenis` = `Batal` |
| `Toko` | Nama Toko | – |
| `Pengaturan` | Minimal Belanja, Stamp per Kartu, Batas Belanja, Kode Admin | baris `Kode Admin` dibuat jika belum ada |

Kolom dibaca berdasarkan nama header, sama seperti Loyalin. Judul lama `Poin` / `Saldo Poin` tetap terbaca sebagai `Stamp` / `Saldo Stamp`.

## Hosting & install

File statis, bisa memakai **GitHub Pages** (Settings → Pages → Deploy from branch). PWA butuh HTTPS.

- **Android / Chrome**: Pengaturan → **Install**, atau menu browser → *Install app*.
- **iPhone / Safari**: Share → *Add to Home Screen*.
