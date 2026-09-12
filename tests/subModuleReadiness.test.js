const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('submodule listing exposes additive readiness counts', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../controllers/subModuleController.js'),
    'utf8'
  );

  assert.match(source, /AS material_count/);
  assert.match(source, /q\.type = 'pretest'.+AS pretest_count/);
  assert.match(source, /q\.type = 'postest'.+AS postest_count/);
  assert.match(source, /LEFT JOIN questions q ON sm\.id = q\.sub_module_id/);
});
