const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    // =========================
    // LOAD DATA
    // =========================
    const filePath = path.join(
      __dirname,
      '..',
      'kahf.json'
    );

    const data = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    );

    // =========================
    // GLOBAL DAY SYSTEM
    // =========================
    const startDate = new Date('2026-05-25');

    const now = new Date();

    const diffTime = now - startDate;

    const currentDay =
      Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
      ) + 1;

    // =========================
    // PARSE COOKIE
    // =========================
    const cookies = Object.fromEntries(
      (req.headers.cookie || '')
        .split(';')
        .filter(Boolean)
        .map(cookie => {
          const trimmed = cookie.trim();
          const eq = trimmed.indexOf('=');

          if (eq === -1) {
            return [trimmed, ''];
          }

          return [
            trimmed.slice(0, eq),
            decodeURIComponent(trimmed.slice(eq + 1))
          ];
        })
    );

    // terakhir user lihat hari berapa
    const lastSeenDay = parseInt(
      cookies.last_seen_day || '0'
    );

    // =========================
    // OPTIONAL QUERY
    // =========================
    let requestedDay = parseInt(
      req.query.day || currentDay
    );

    // query rusak (bukan angka / kurang dari 1)
    // -> pakai hari global
    if (Number.isNaN(requestedDay) || requestedDay < 1) {
      requestedDay = currentDay;
    }

    // =========================
    // VALIDASI
    // =========================

    // gak boleh lompat masa depan
    if (requestedDay > currentDay) {
      return res.status(200).json({
        success: false,
        message: 'Kembali lagi besok'
      });
    }

    // optional:
    // cegah mundur terlalu jauh
    // kalau gak mau fitur ini tinggal hapus

    /*
    if (
      lastSeenDay > 0 &&
      requestedDay < lastSeenDay
    ) {
      return res.status(200).json({
        success: false,
        message:
          'Tidak bisa membuka hari sebelumnya'
      });
    }
    */

    // =========================
    // LOOPING INDEX
    // ayat 1-10, hari ke-11 kembali ke ayat 1
    // =========================
    const index =
      (requestedDay - 1) % data.length;

    // =========================
    // SAVE COOKIE
    // =========================
    res.setHeader(
      'Set-Cookie',
      [
        `last_seen_day=${requestedDay}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
      ]
    );

    // =========================
    // RESPONSE
    // =========================
    const item = data[index];

    res.status(200).json({
      success: true,

      hari_ke: requestedDay,

      hari_global: currentDay,

      terakhir_dibuka: lastSeenDay,

      total_ayat: data.length,

      ayat: item.ayat,

      arab: item.arab,

      latin: item.latin,

      terjemahan_id: item.terjemahan_id,

      terjemahan_en: item.terjemahan_en,

      audio_url: item.audio_url
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan'
    });

  }
};
