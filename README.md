# Website Kelas X TKJ K, SMK Talenta Bangsa

Halaman data kelas: daftar siswa, jadwal pelajaran, jadwal piket, struktur
organisasi, dan galeri. Semua isinya dibaca dari berkas CSV di
`assets/data/`, jadi kelas bisa memperbarui datanya sendiri dari Excel tanpa
menyentuh kode.

Berkas statis biasa: HTML, CSS, dan JavaScript tanpa framework, tanpa proses
build, tanpa dependensi.

## Menjalankan

Halaman ini harus dibuka lewat server lokal. Alasannya, browser melarang
JavaScript membaca berkas CSV dari alamat `file://`. Kalau `index.html` dibuka
dengan klik ganda, setiap bagian akan menampilkan pesan galat beserta cara
mengatasinya, bukan halaman kosong.

Jalankan server dari folder proyek ini:

```
npx serve .
```

Alternatif tanpa Node.js:

```
php -S localhost:8000
```

Alternatif lewat Python:

```
python -m http.server 8000
```

Lalu buka `http://localhost:8000`. Server cukup dijalankan sekali selama ingin
bekerja, boleh dibuka di beberapa jendela sekaligus.

## Struktur berkas

```
index.html
assets/
  css/style.css
  js/main.js
  data/
    students.csv
    organization.csv
    schedule_lesson.csv
    schedule_duty.csv
    gallery.csv
    uniform.csv
    links.csv
  images/
    students/
    gallery/
    uniforms/
    logo/
DESIGN.md
README.md
```

## Section Utility

Section Utility ada di bawah Struktur, sebelum Galeri.

**Acak Kelompok** membagi 43 siswa memakai pengacakan Fisher-Yates. Pilih mode
pembagian lewat "Jumlah Kelompok" atau "Siswa per Kelompok". Seimbangnya
pembagian dibaca otomatis dari kolom `Kelamin` di `students.csv`: siswa
berkolom `L` dan siswa berkolom `P` diocok terpisah lalu dibagikan bergilir,
sehingga tiap kelompok mendapat potongan dari keduanya dan ukurannya tetap
berbeda paling banyak satu siswa. Halaman tidak pernah menebak jenis kelamin
dari nama. Kolom `Kelamin` sengaja saya isi kosong semua, jadi halaman
menyatakan bahwa pengacakan berjalan acak murni sampai kelas mengisinya
sendiri. Tombol "Salin Teks WA" menyalin hasil akhir dengan format yang bisa
langsung dikirim ke grup WhatsApp.

**Kalkulator Subnet** menghitung mask, network, broadcast, rentang host, dan
total host dari satu alamat IPv4 dan prefix /8 sampai /30, memakai operasi
bitwise tanpa pustaka luar. Kalau alamat yang diketik bukan alamat jaringan
blok itu, halaman menyatakaninya di bawah hasil, bukan diam-diam menyesuaikannya.

**Spin The Wheel** menggambar roda di atas canvas HTML5. Roda berputar 4 sampai
6 putaran selama 5,2 detik dengan perlambatan ease-out, tombolnya berubah jadi
"Memutar..." selama putaran berjalan, dan juring yang menang menyala hijau
setelah berhenti. Titik mendarat diacak di seluruh roda, bukan di sekitar
posisi sebelumnya, jadi nama yang keluar tidak bergantung pada putaran
sebelumnya. Warna juring berselang-seling dua warna yang kontrasnya sudah
diukur, dan nomor juring selalu dituliskan di dalam roda supaya hasilnya tetap
terbaca walau nama terlalu panjang untuk muat di dalam juring. Centang
"Hapus nama terpilih" untuk mengurangi nama yang sudah keluar dari putaran
berikutnya, dan tombol "Kembalikan Semua Nama" untuk mengulang dari awal.
Kalau sistem operasi Anda sedang mematikan efek animasi, putaran roda berjalan
instan dan hasilnya langsung muncul di dialog, karena penghormatan
`prefers-reduced-motion` memang sengaja dipasang. Untuk melihat rodanya
berputar, nyalakan lagi "Animation effects" di Pengaturan Windows, di
Aksesibilitas, Efek Visual.

Bagian ini memakai `students.csv`. Kalau daftar siswa gagal dimuat, ketiga alat
menampilkan pesan penyebabnya, bukan cramik kosong.

## Mengubah data

Buka berkasnya di Excel, ubah, simpan sebagai CSV, lalu muat ulang halaman.
Tidak ada yang perlu diedit di dalam kode.

### students.csv

Kolom `No. Absen` dan `Nama Lengkap Siswa` sudah cukup. Ada dua kolom opsional:

`Kelamin`: diisi `L` atau `P`, dipakai Acak Kelompok supaya pembagiannya
seimbang. Kosongkan sebagian pun tetap jalan,sisanya masuk hitungan sebagai
"belum ditandai". Kalau semua kosong, pengacakan berjalan acak murni dan
halaman mengatakannya.

`Foto`: kalau kolom ini ada, halaman akan mencari berkas
`assets/images/students/<nama berkas>` untuk setiap siswa. Foto yang tidak ada
tidak akan merusak halaman, kartu siswa akan otomatis memakai inisial nama.

### organization.csv

Kolom `Level`, `Peran`, dan `Nama`. Level dipakai untuk mengurutkan dari wali
kelas sampai seksi. Beberapa baris dengan `Peran` yang sama akan digabung ke
satu kartu, jadi dua bendahara bisa ditulis sebagai dua baris.

Nama yang dikurung dengan tanda `[ ]` akan ditampilkan tanpa kurung. Nama yang
masih berupa templat, misalnya `Nama Seksi Kebersihan`, atau yang kosong, akan
ditampilkan sebagai "Belum diisi di berkas" supaya tidak disangka sudah ada
orangnya.

### schedule_lesson.csv

Kolom pertama `Jam`, lalu satu kolom per hari. Baris dengan isi `Istirahat`,
`Dhuhur`, `Jeda`, atau `Jum'atan` akan ditampilkan sebagai jeda dengan warna
berbeda. Setiap hari menampilkan isi kolomnya sendiri, jadi baris `12.00 - 13.00`
menuliskan `Dhuhur` pada Senin sampai Kamis dan `Jum'atan` pada hari Jumat.
Baris yang semua kolom hari kosongnya dilewati, jadi jadwal hari Jumat bisa
berhenti setelah jam makan siang tanpa meninggalkan baris kosong.

Nama hari yang dikenali: `Senin`, `Selasa`, `Rabu`, `Kamis`, dan `Jum'at`
(`Jumat` juga dikenali).

### schedule_duty.csv

Satu baris per petugas, kolom pertama `Senin` sampai `Jum'at`, nomor
otomatis boleh diketik atau tidak, misalnya `3. Nama Siswa`.

Jumlah petugas di setiap hari dihitung dari jumlah nama yang benar-benar
tertulis, bukan dari baris `Total:` di bawahnya. Kalau baris `Total:` dan
daftar nama tidak cocok, yang ditampilkan adalah daftar nama.

### gallery.csv

Kolom `File` berisi nama berkas foto di `assets/images/gallery/`, kolom
`Keterangan` berisi teks yang muncul di bawah foto dan dipakai sebagai
keterangan untuk pembaca layar. Selama berkas ini kosong, halaman menampilkan
petunjuk cara mengisinya, bukan foto contoh.

### uniform.csv

Aturan seragam per hari untuk tab "Seragam" di panel Hari Ini. Kolom `Hari`, kolom `Berkas` untuk nama berkas harian, dan kolom
`JikaPenjaskes` untuk berkas pengganti yang dipakai kalau hari itu ada
pelajaran Penjaskes di `schedule_lesson.csv`.

```
Hari,Berkas,JikaPenjaskes
Senin,white_uniform.png,
Selasa,white_uniform.png,pe_uniform.png
Rabu,wearpack.png,
Kamis,scout_uniform.png,
Jumat,batik.png,
```

Nama berkas di kolom `Berkas` dan `JikaPenjaskes` diambil dari
`assets/images/uniforms/`. Kalau berkasnya belum ada, halaman menampilkan
kotak kosong bergaris putus-putus yang menyebut nama berkas yang belum ada, bukan
gambar pengganti. Kalau kolom `JikaPenjaskes` diisi, halaman menampilkan
sebuah catatan yang menjelaskan seragam mana yang dipakai hari ini dan
kenapa.

### links.csv

Tautan di footer. Kolom `Label` adalah nama yang tampil, kolom `URL` adalah
alamat lengkapnya.

```
Label,URL
GitHub,https://github.com/namakelas
TikTok,https://tiktok.com/@namakelas
Instagram,https://instagram.com/namakelas
```

Selama kolom `URL` masih kosong, nama platform tampil sebagai teks biasa
disertai keterangan "tautan belum diisi", bukan sebagai tautan yang tidak bisa
ditekan. Baru begitu URL diisi, tautannya aktif dan terbuka di tab baru.

## Animation toggle

At the bottom of the page in the "Pengaturan Tampilan" section there is a
checkbox **"Animasi halaman"**. It controls two things at once, the smooth scroll
when switching sections and the rotation of the wheel.

The default follows the computer's own setting. If Windows has animations turned
off, then "Animation effects" in
Settings > Accessibility > Visual effects, the page stays still, and that is
deliberate: some people get dizzy or have a headache from moving screens, and
the system setting is how they tell the browser.

Turn the checkbox on to get the animations anyway. The choice is stored in the
browser, so it only needs setting once.

The smooth scroll is done with JavaScript, not CSS `scroll-behavior`, because the
browser turns off CSS smooth scrolling as well when the system animations are
off. CSS `scroll-behavior` would then make the checkbox a lie. The smooth
scrolling lasts about 550 milliseconds.

## Yang perlu diketahui

- Pindah seksi lewat navbar bergerak halus. Kalau browser atau pengaturan
  `prefers-reduced-motion` minta gerak seminimal mungkin, lompatan ini
  dimatikan dan seksi langsung pindah.
- Panel "Hari Ini" di beranda punya tiga tab: Pelajaran, Piket, dan Seragam.
  Tab Pelajaran menampilkan baris yang memang ada di hari itu saja, jadi Jumat
  tidak menampilkan "Kosong" pada jam sore yang memang tidak ada jadwalnya.
- Kartu siswa memakai warna hijau untuk menandai petugas piket hari ini, jadi
  nama yang diberi tag "Piket" berubah sendiri setiap hari tanpa sentuhan kode.
  Nama jabatan dari `organization.csv` memakai warna abu-abu supaya hijau
  selalu berarti "hari ini".
- Gambar seragam hanya dimuat ketika tab Seragam dibuka, supaya halaman tidak
  meminta berkas yang belum ada.
- Tombol "Kembali ke Atas" di footer mengembalikan fokus keyboard ke bagian atas
  halaman, bukan hanya menggulir layar.
- Kolom `Kelamin` di `students.csv` sengaja saya isi kosong semua, karena
  mengisi jenis kelamin 43 orang bukan hak saya. Cukup isi `L` atau `P` kalau
  pembagian kelompok perlu seimbang, dan halamannya langsung berubah.
- Kolom `Foto` di `students.csv` juga sengaja dikosongkan dan kolom itu sendiri
  tidak ada di berkas asal. Tambahkan hanya kalau ada foto yang mau dipakai.
  Tanpa kolom itu, halaman tidak membuat permintaan gambar yang gagal.
- Folder `assets/images/logo/` tidak dipakai oleh halaman ini. Nama kelas
  ditulis sebagai teks supaya tetap tajam di layar kecil. Kalau nanti mau
  memakai berkas logo, itu perlu perubahan pada `index.html`.
- `schedule_duty.csv` memuat dua baris dengan peran Bendahara. Keduanya
  ditampilkan dalam satu kartu.
- Halaman ini hanya punya satu tema, gelap. Alasannya ada di `DESIGN.md`.
- Hanya ada satu mode gerak, yaitu perubahan keadaan saat hover, fokus, dan
  pergantian tab. Pengaturan `prefers-reduced-motion` di browser tetap dihormati.

## Peramban

Chrome, Edge, Firefox, dan Safari versi terkini. Yang dipakai: `fetch`,
`dialog`, `backdrop-filter`, dan `clamp()`.

Untuk `dialog` ada perilaku cadangan di dalam `main.js`: kalau peramban tidak
mendukungnya, tombol tutup tetap bekerja karena tombol itu selalu menutup
dialog. Untuk `backdrop-filter` tidak ada perilaku cadangan, tetapi warna
latar kartu sudah 72 persen pekat sejak awal, jadi kalau efek kacanya
diabaikan teks di atasnya tetap terbaca.
