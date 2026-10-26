const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { releaseErrors } = require('../scripts/check-release.cjs');
const app = require('../app.json');
const eas = require('../eas.json');
const clone = value => JSON.parse(JSON.stringify(value));
// Unit-test the validator independently of image decoding; the CLI checks the
// real checked-out asset paths in CI. logo.jpeg is in the reviewed repo inventory.
const knownAsset = value => value === './assets/logo.jpeg';

test('release configuration passes with the preserved repository logo', () => {
  assert.deepEqual(releaseErrors(app, eas, knownAsset), []);
});
test('a missing adaptive icon blocks the release check', () => {
  const bad = clone(app); bad.expo.android.adaptiveIcon.foregroundImage = './assets/missing.jpeg';
  assert.ok(releaseErrors(bad, eas, knownAsset).some(error => error.includes('foregroundImage')));
});
test('invalid public version, package and missing EAS project are rejected', () => {
  const bad = clone(app); bad.expo.version = 'latest'; bad.expo.android.package = ''; delete bad.expo.extra.eas.projectId;
  assert.equal(releaseErrors(bad, eas, knownAsset).length, 3);
});
test('APK profile and automatic build number management are required', () => {
  const bad = clone(eas); bad.build.preview.android.buildType = 'app-bundle'; bad.build.preview.autoIncrement = false; bad.cli.appVersionSource = 'local';
  assert.equal(releaseErrors(app, bad, knownAsset).length, 3);
});
test('calendar starts on Monday without shifting locale day indexes', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/AppointmentsScreen.js'), 'utf8');
  assert.match(source, /<Calendar\s+firstDay=\{1\}/);
  assert.match(source, /dayNames:\s*\['Pazar', 'Pazartesi'/);
  assert.match(source, /dayNamesShort:\s*\['Paz', 'Pzt'/);
});
test('release keeps the existing application identity and new logo', () => {
  assert.equal(app.expo.version, '1.1.0');
  assert.equal(app.expo.android.package, 'com.yunus.hacamatkayit');
  assert.equal(app.expo.extra.eas.projectId, '1491f509-325c-4d72-bd70-2d2cc970333e');
  assert.equal(app.expo.android.adaptiveIcon.foregroundImage, app.expo.icon);
  assert.equal(app.expo.android.adaptiveIcon.monochromeImage, undefined);
});
