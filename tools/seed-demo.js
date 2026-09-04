// disuntik ke halaman waktu tes — bikin 45 hari data yang masuk akal
window.__seedDemo = function () {
  let rnd = 7;
  const R = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = a => a[Math.floor(R() * a.length)];
  const N = (min, max) => Math.round(min + R() * (max - min));

  S.profile.nama = 'Blay';
  S.settings.budget = 3000000;
  S.settings.beratTarget = 64;
  S.skripsi.judul = 'Pengaruh Literasi Keuangan terhadap Perilaku Menabung Mahasiswa Perantau';
  S.skripsi.dosen = 'Dr. Andi Prasetyo, M.Si.';
  S.skripsi.deadline = '2026-11-20';
  const prog = [100, 70, 45, 10, 0], stt = ['acc', 'revisi', 'nulis', 'nulis', 'belum'];
  const dls = ['2026-06-20', '2026-08-25', '2026-09-15', '2026-10-10', '2026-10-30'];
  S.skripsi.bab.forEach((b, i) => { b.p = prog[i]; b.st = stt[i]; b.dl = dls[i]; });
  S.skripsi.bimbingan = [
    { id: 'bm1', d: addDays(today(), -4), catatan: 'Metode masih lemah. Tambah referensi 5 tahun terakhir, perjelas beda populasi sama sampel di 3.2.', aksi: 'Revisi 3.2, cari 5 jurnal 2021+, kirim Jumat.' },
    { id: 'bm2', d: addDays(today(), -18), catatan: 'BAB II udah oke, tinggal rapihin sitasi pakai APA 7.', aksi: 'Rapihin sitasi, lanjut BAB III.' },
  ];

  const catsOut = ['makan', 'makan', 'makan', 'transport', 'kuota', 'hiburan', 'belanja', 'kuliah', 'sehat'];
  const notes = { makan: ['Nasi goreng depan kos', 'Ayam geprek', 'Kopi + roti', 'Warteg', 'Mie ayam'],
    transport: ['Bensin', 'Ojol ke kampus', 'Ojol pulang'], kuota: ['Paket data', 'Langganan musik'],
    hiburan: ['Nonton', 'Nongkrong'], belanja: ['Sabun + odol', 'Kaos'], kuliah: ['Print proposal', 'Fotokopi jurnal'],
    sehat: ['Vitamin', 'Obat batuk'] };

  for (let i = 44; i >= 0; i--) {
    const d = addDays(today(), -i);
    const dow = fromD(d).getDay();
    const o = day(d);

    // rutinitas — makin lama makin konsisten
    const chance = 0.42 + (44 - i) / 44 * 0.42;
    S.routines.forEach(r => { if (R() < chance) o.rt[r.id] = true; });

    o.bangun = `0${N(5, 7)}:${String(N(0, 5) * 10).padStart(2, '0')}`;
    o.tidur = R() < 0.7 ? `2${N(2, 3)}:${String(N(0, 5) * 10).padStart(2, '0')}` : `0${N(0, 1)}:${String(N(0, 5) * 10).padStart(2, '0')}`;
    o.mood = N(2, 5); o.energi = N(2, 5);
    if (i % 6 === 0) o.catatan = pick(['Lumayan produktif, sempat mandek pas nyari jurnal.', 'Capek banget, tapi setidaknya BAB III jalan.', 'Ketemu dosen, revisian nambah. Gapapa.', 'Hari santai. Butuh juga kadang.']);

    // blok waktu
    o.blocks = [];
    let jam = 7 + N(0, 1);
    const rencana = dow === 0 ? ['santai', 'olahraga', 'sosial'] : [pick(['skripsi', 'kerja']), 'makan', pick(['kelas', 'kerja', 'skripsi']), pick(['olahraga', 'santai']), 'skripsi'];
    rencana.forEach(c => {
      const dur = c === 'makan' ? 1 : N(1, 3);
      if (jam + dur > 23) return;
      o.blocks.push({ id: 'b' + i + c + jam, s: `${String(jam).padStart(2, '0')}:00`, e: `${String(jam + dur).padStart(2, '0')}:00`, c, t: '' });
      jam += dur + (R() < 0.5 ? 1 : 0);
    });

    // transaksi
    const nOut = N(1, 4);
    for (let k = 0; k < nOut; k++) {
      const c = pick(catsOut);
      S.txns.push({ id: 't' + i + '_' + k, d, type: 'out', cat: c,
        amt: c === 'makan' ? N(3, 9) * 5000 : c === 'transport' ? N(2, 8) * 5000 : N(3, 30) * 10000,
        note: pick(notes[c] || ['']) });
    }
    if (fromD(d).getDate() === 1) S.txns.push({ id: 'in' + i, d, type: 'in', cat: 'kiriman', amt: 2500000, note: 'Kiriman bulanan' });
    if (i % 14 === 3) S.txns.push({ id: 'inf' + i, d, type: 'in', cat: 'freelance', amt: N(8, 25) * 100000, note: 'Project desain' });

    // berat
    if (i % 3 === 0) S.badan.berat.push({ d, kg: +(69.8 - (44 - i) * 0.045 + (R() - 0.5) * 0.5).toFixed(1) });
    // latihan
    if (R() < 0.45) S.badan.latihan.push({ id: 'l' + i, d, jenis: pick(['Lari 5K', 'Gym push', 'Gym pull', 'Badminton', 'Jalan kaki']), menit: N(25, 70), note: '' });
    // asupan
    S.badan.asupan[d] = { kcal: N(1500, 2500), air: N(3, 9) };
    // jam kerja
    if (dow !== 0 && R() < 0.75) S.workLogs.push({ id: 'w' + i, d, jam: +(N(2, 8) / 1).toFixed(1) * 1, proj: pick(['Freelance', 'Magang', 'Freelance']), note: pick(['Revisi landing page', 'Meeting klien', 'Bikin aset', 'Laporan']) });
  }

  S.tasks = [
    { id: 'k1', t: 'Kirim revisi desain ke klien', proj: 'Freelance', prio: 'tinggi', due: today(), est: 3, done: false, doneAt: '' },
    { id: 'k2', t: 'Bikin invoice Juli', proj: 'Freelance', prio: 'sedang', due: addDays(today(), -3), est: 1, done: false, doneAt: '' },
    { id: 'k3', t: 'Riset kompetitor buat pitch', proj: 'Magang', prio: 'rendah', due: addDays(today(), 5), est: 4, done: false, doneAt: '' },
    { id: 'k4', t: 'Setor draft BAB III ke dosen', proj: 'Skripsi', prio: 'tinggi', due: addDays(today(), 2), est: 2, done: false, doneAt: '' },
    { id: 'k5', t: 'Update portofolio', proj: 'Pribadi', prio: 'rendah', due: '', est: 2, done: true, doneAt: addDays(today(), -2) },
  ];

  S.ide = [
    { id: 'i1', judul: 'Cara ngatur uang 1 juta sebulan buat anak kos', st: 'produksi', platform: 'TikTok', hook: '"Gua hidup sebulan cuma pakai 1 juta. Ini rinciannya."', isi: 'Buka pakai struk belanja. Breakdown 4 pos: makan 500rb, transport 150rb, kuota 100rb, sisanya darurat. Tutup pakai template yang bisa didownload.', tag: 'keuangan, kos', dl: addDays(today(), 3), created: addDays(today(), -6) },
    { id: 'i2', judul: 'Rutinitas pagi 30 menit sebelum kelas', st: 'konsep', platform: 'Instagram', hook: 'Bangun jam 5 itu overrated — yang penting urutannya.', isi: 'Format carousel 7 slide. Ambil footage pagi minggu depan.', tag: 'produktivitas', dl: addDays(today(), 9), created: addDays(today(), -3) },
    { id: 'i3', judul: 'Nulis skripsi pakai metode Pomodoro terbalik', st: 'ide', platform: 'YouTube', hook: '', isi: 'Riset dulu apakah ada yang udah bahas.', tag: 'skripsi, produktivitas', dl: '', created: addDays(today(), -1) },
    { id: 'i4', judul: 'Isi tas kuliah yang beneran kepake', st: 'tayang', platform: 'TikTok', hook: 'Dari 14 barang, cuma 6 yang kepake tiap hari.', isi: '', tag: 'kampus', dl: addDays(today(), -8), created: addDays(today(), -14) },
    { id: 'i5', judul: 'Review 3 aplikasi catat keuangan gratis', st: 'edit', platform: 'YouTube', hook: '', isi: 'Footage udah ada, tinggal edit + thumbnail.', tag: 'keuangan, review', dl: addDays(today(), 1), created: addDays(today(), -11) },
  ];

  commit();
  return { hari: Object.keys(S.days).length, tx: S.txns.length, berat: S.badan.berat.length };
};
