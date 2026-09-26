// Pesan error dari driver MySQL (mysql2) dan modul lain memuat detail yang
// tidak boleh keluar ke klien: nama tabel, nama kolom, nama constraint,
// potongan SQL, bahkan nilai yang gagal di-insert. Backend ILMANA pernah
// mengirim `error.message` apa adanya di 36 titik controller, sehingga
// proteksi di server.js yang menyembunyikan detail di production tidak pernah
// berarti apa-apa.
//
// Semua kegagalan yang tidak terduga sekarang lewat `serverError()`: detail
// dicatat di log server, tapi klien hanya melihat pesan generik. Mode
// development tetap menampilkan detail karena itulah gunanya debugging lokal.

const isProduction = () => process.env.NODE_ENV === 'production';

const serializeError = (error) => {
  if (!error) return 'Unknown error';
  if (error.stack) return error.stack;
  if (error.message) return error.message;
  return String(error);
};

const serverError = (res, error) => {
  // Tetap dicatat apa pun NODE_ENV-nya. Tanpa ini tidak ada jejak error di
  // server sama sekali, dan satu-satunya cara mencari penyebab 500 adalah
  // membaca respons yang justru tidak boleh bocor.
  console.error('[ILMANA]', serializeError(error));

  return res.status(500).json({
    message: 'Server error',
    ...(isProduction() ? {} : { error: error?.message }),
  });
};

// Terjemahkan error terstruktur (kode dari multer dan body parser) menjadi
// status + pesan yang layak dibaca klien. Kode yang tidak dikenal dianggap
// 500 supaya tidak pernah membocorkan detail internal.
//
// Fungsi ini menggantikan tebukan `err.message.includes("Only")` yang
// sebelumnya dipakai di server.js. Tebukan itu membalas 400 dan memantulkan
// pesan mentah untuk error apa pun yang kebetulan mengandung kata itu,
// termasuk pesan dari driver database.
const classifyError = (err) => {
  const code = err?.code;
  const message = err?.message || 'Terjadi kesalahan';

  if (code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'Ukuran file terlalu besar' };
  }
  if (code === 'LIMIT_UNEXPECTED_FILE') {
    return { status: 400, message: 'Field file tidak dikenali' };
  }
  if (code === 'LIMIT_FIELD_VALUE' || code === 'LIMIT_FIELD_COUNT' || code === 'LIMIT_PART_COUNT') {
    return { status: 400, message: 'Data yang dikirim terlalu besar' };
  }
  if (err?.type === 'entity.too.large') {
    return { status: 413, message: 'Data yang dikirim terlalu besar' };
  }
  if (err?.type === 'entity.parse.failed') {
    return { status: 400, message: 'Format JSON tidak valid' };
  }
  // Pesan dari fileFilter multer sengaja diteruskan: isinya sudah ditulis
  // sendiri oleh kita, bukan detail internal.
  if (/^Only .+ files are allowed!$/.test(message)) {
    return { status: 400, message };
  }

  return { status: 500, message: 'Internal server error' };
};

module.exports = { serverError, isProduction, classifyError };

