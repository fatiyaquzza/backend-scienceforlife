// Regresi untuk tiga kebocoran/kerusakan yang sudah diperbaiki. Test sebelumnya
// hanya menguji regex di atas teks sumber, jadi tidak satu pun dari masalah ini
// akan terdeteksi oleh suite lama.
const test = require('node:test');
const assert = require('node:assert/strict');

const { parsePageCount } = require('../controllers/materialController');
const { classifyError, serverError } = require('../utils/httpError');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-regression-tests-only';

test('parsePageCount menerima 0 sebagai "belum dihitung"', () => {
  // Admin UI mengirim "0" untuk modul legacy. Dulu nilai ini ditolak karena
  // `parsed < 1`, sehingga setiap penyimpanan materi di modul 4 dan 5 berakhir
  // HTTP 400 "Jumlah halaman PDF tidak valid".
  assert.equal(parsePageCount('0'), null);
  assert.equal(parsePageCount(0), null);
  assert.equal(parsePageCount('0.0'), null);
});

test('parsePageCount tetap menyimpan jumlah halaman yang valid', () => {
  assert.equal(parsePageCount('24'), 24);
  assert.equal(parsePageCount(24), 24);
  assert.equal(parsePageCount('1'), 1);
  assert.equal(parsePageCount('2000'), 2000);
  assert.equal(parsePageCount(null), null);
  assert.equal(parsePageCount(''), null);
});

test('parsePageCount menolak nilai di luar rentang', () => {
  assert.throws(() => parsePageCount('-1'), /tidak valid/);
  assert.throws(() => parsePageCount('2001'), /tidak valid/);
  assert.throws(() => parsePageCount('1.5'), /tidak valid/);
  assert.throws(() => parsePageCount('abc'), /tidak valid/);
});

test('classifyError memetakan kode terstruktur, bukan menebak teks', () => {
  assert.equal(classifyError({ code: 'LIMIT_FILE_SIZE' }).status, 413);
  assert.equal(classifyError({ code: 'LIMIT_FIELD_VALUE' }).status, 400);
  assert.equal(classifyError({ code: 'LIMIT_UNEXPECTED_FILE' }).status, 400);
  assert.equal(classifyError({ type: 'entity.too.large' }).status, 413);
  assert.equal(classifyError({ type: 'entity.parse.failed' }).status, 400);

  // Pesan dari fileFilter multer boleh diteruskan.
  const filterError = classifyError({ message: 'Only PDF files are allowed!' });
  assert.equal(filterError.status, 400);
  assert.equal(filterError.message, 'Only PDF files are allowed!');
});

test('classifyError tidak pernah memantulkan detail driver database', () => {
  // Inilah kebocoran yang sebelumnya terjadi: string error mysql2 pernah
  // dibalas apa adanya ke klien pada 36 titik controller.
  const leaked = classifyError(
    new Error("ER_BAD_FIELD_ERROR: Unknown column 'materials.pdgf_page_count' in 'field list'")
  );
  assert.equal(leaked.status, 500);
  assert.equal(leaked.message, 'Internal server error');
  assert.ok(!JSON.stringify(leaked).includes('ER_BAD_FIELD_ERROR'));
  assert.ok(!JSON.stringify(leaked).includes('pdgf_page_count'));
});

test('classifyError tidak lagi memakai tebukan kata "Only"', () => {
  // Error acak yang kebetulan mengandung kata "Only" dulu dibalas 400 dan
  // pesan mentahnya dipantulkan. Sekarang harus 500 generik.
  const innocent = classifyError(new Error('Table `users` is temporarily Only readable'));
  assert.equal(innocent.status, 500);
  assert.ok(!innocent.message.includes('users'));
});

test('serverError menyembunyikan pesan di produksi dan mencatatnya', () => {
  const originalEnv = process.env.NODE_ENV;
  const logged = [];
  const originalError = console.error;
  console.error = (...args) => logged.push(args);

  const makeRes = () => {
    const res = { statusCode: null, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
  };

  try {
    process.env.NODE_ENV = 'production';
    const res = makeRes();
    serverError(res, new Error('ER_PARSE_ERROR near users.email'));

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Server error');
    assert.equal(res.body.error, undefined);
    assert.ok(!JSON.stringify(res.body).includes('ER_PARSE_ERROR'));
    assert.equal(logged.length, 1, 'error harus tetap tercatat di log server');
  } finally {
    process.env.NODE_ENV = originalEnv;
    console.error = originalError;
  }
});

test('serverError menampilkan detail di mode development', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalError = console.error;
  console.error = () => {};

  try {
    process.env.NODE_ENV = 'development';
    const res = { statusCode: null, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };

    serverError(res, new Error('detail lokal'));
    assert.equal(res.body.error, 'detail lokal');
  } finally {
    process.env.NODE_ENV = originalEnv;
    console.error = originalError;
  }
});

const runOptionalAuth = (authorization) => {
  const req = { headers: authorization ? { authorization } : {} };
  let called = false;
  optionalAuthMiddleware(req, {}, () => { called = true; });
  return { req, called };
};

test('optionalAuth menerima permintaan anonim tanpa menolak', async () => {
  const { req, called } = runOptionalAuth(undefined);
  assert.equal(called, true, 'request anonim harus tetap dilayani');
  assert.equal(req.user, undefined);
});

test('optionalAuth menempatkan payload token yang valid', async () => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const { req, called } = runOptionalAuth(`Bearer ${token}`);

  assert.equal(called, true);
  assert.equal(req.user.role, 'admin');
});

test('optionalAuth mengabaikan token rusak tanpa menolak', () => {
  const { req, called } = runOptionalAuth('Bearer bukan-token-yang-sah');
  assert.equal(called, true, 'token rusak tidak boleh membuat endpoint publik jadi 401');
  assert.equal(req.user, undefined);
});

test('optionalAuth menolak skema selain Bearer', async () => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });

  //_authMiddleware lama menerima `Basic <jwt>`. Kalau ini diteruskan,
  // attacker bisa memakai token admin di luar mekanisme bearer.
  for (const header of [`Basic ${token}`, `Foo ${token}`, token]) {
    const { req, called } = runOptionalAuth(header);
    assert.equal(called, true);
    assert.equal(req.user, undefined, `skema harus ditolak: ${header.split(' ')[0]}`);
  }
});

test('kolom kunci jawaban tidak ikut ke daftar kolom publik', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'controllers', 'questionController.js'),
    'utf8'
  );

  // Endpoint soal ini publik. Kalau correct_answer pernah masuk daftar kolom
  // default, kunci jawaban bocor lagi.
  assert.match(src, /PUBLIC_QUESTION_COLUMNS\s*=\s*\[/);
  const block = src.slice(src.indexOf('PUBLIC_QUESTION_COLUMNS'), src.indexOf('];', src.indexOf('PUBLIC_QUESTION_COLUMNS')));
  assert.ok(!block.includes('correct_answer'), 'correct_answer tidak boleh ada di daftar kolom publik');

  // Dan endpoint harus tetap punya optionalAuth supaya admin tetap bisa edit.
  const routes = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'questionRoutes.js'),
    'utf8'
  );
  assert.match(routes, /optionalAuthMiddleware,\s*getQuestionsBySubModule/);
});
