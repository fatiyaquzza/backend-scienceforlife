const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isHttpsUrl,
  isYouTubeUrl,
  normalizeMaterialInteractions,
} = require('../utils/materialInteractions');

test('accepts and normalizes supported interactions', () => {
  const result = normalizeMaterialInteractions([
    { type: 'link', page: 1, x: 10, y: 10, width: 20, height: 10, url: 'https://example.com', label: 'Baca' },
    { type: 'image', page: 2, x: 0, y: 0, width: 25, height: 25, url: '/uploads/images/example.png' },
    { type: 'youtube', page: 3, x: 15, y: 20, width: 50, height: 30, url: 'https://youtu.be/dQw4w9WgXcQ' },
  ], 3);

  assert.equal(result.length, 3);
  assert.equal(result[2].type, 'youtube');
});

test('rejects unsafe urls and out-of-page geometry', () => {
  assert.equal(isHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isYouTubeUrl('https://example.com/watch?v=123'), false);
  assert.throws(
    () => normalizeMaterialInteractions([
      { type: 'link', page: 1, x: 90, y: 10, width: 20, height: 10, url: 'https://example.com' },
    ], 2),
    /di luar halaman/
  );
});

test('rejects interactions beyond the PDF page count', () => {
  assert.throws(
    () => normalizeMaterialInteractions([
      { type: 'link', page: 4, x: 10, y: 10, width: 20, height: 10, url: 'https://example.com' },
    ], 3),
    /Nomor halaman/
  );
});

test('migration remains guarded for repeated execution', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/005_flipbook_and_team.sql'), 'utf8');
  assert.match(sql, /information_schema\.COLUMNS/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS team_categories/);
  assert.match(sql, /AND NOT EXISTS \(SELECT 1 FROM team_members/);
});
