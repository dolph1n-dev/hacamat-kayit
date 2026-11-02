const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { releaseErrors } = require('../scripts/check-release.cjs');
const app = require('../app.json');
const eas = require('../eas.json');
const clone = value => JSON.parse(JSON.stringify(value));
// Unit fixtures do not depend on a production asset's filename or extension.
// scripts/check-release.cjs checks actual checked-out asset paths separately.
const fixture = { expo: { version: '1.2.3', icon: './fixture/icon.png', android: { package: 'com.example.app', adaptiveIcon: { foregroundImage: './fixture/foreground.png' } }, web: { favicon: './fixture/favicon.png' }, extra: { eas: { projectId: 'fixture-project' } } } };
const fixtureEas = { cli: { appVersionSource: 'remote' }, build: { preview: { distribution: 'internal', autoIncrement: true, android: { buildType: 'apk' } } } };
const fixtureFiles = new Set(['./fixture/icon.png', './fixture/foreground.png', './fixture/favicon.png']);
const exists = value => fixtureFiles.has(value);

test('valid release fixture passes independently of production logo name', () => {
  assert.deepEqual(releaseErrors(fixture, fixtureEas, exists), []);
});
test('a missing adaptive icon blocks the release check', () => {
  const bad = clone(fixture); bad.expo.android.adaptiveIcon.foregroundImage = './fixture/missing.png';
  assert.ok(releaseErrors(bad, fixtureEas, exists).some(error => error.includes('foregroundImage')));
});
test('invalid public version, package and missing EAS project are rejected', () => {
  const bad = clone(fixture); bad.expo.version = 'latest'; bad.expo.android.package = ''; delete bad.expo.extra.eas.projectId;
  assert.equal(releaseErrors(bad, fixtureEas, exists).length, 3);
});
test('APK profile and automatic build number management are required', () => {
  const bad = clone(fixtureEas); bad.build.preview.android.buildType = 'app-bundle'; bad.build.preview.autoIncrement = false; bad.cli.appVersionSource = 'local';
  assert.equal(releaseErrors(fixture, bad, exists).length, 3);
});
test('calendar starts on Monday without shifting locale day indexes', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/AppointmentsScreen.js'), 'utf8');
  assert.match(source, /<Calendar\s+firstDay=\{1\}/);
  assert.match(source, /dayNames:\s*\['Pazar', 'Pazartesi'/);
  assert.match(source, /dayNamesShort:\s*\['Paz', 'Pzt'/);
});
test('current release keeps application identity and valid non-asset configuration', () => {
  assert.match(app.expo.version, /^\d+\.\d+\.\d+$/);
  assert.equal(app.expo.android.package, 'com.yunus.hacamatkayit');
  assert.equal(app.expo.extra.eas.projectId, '1491f509-325c-4d72-bd70-2d2cc970333e');
  // File existence is tested by the real preflight CLI, not a stale allow-list.
  assert.deepEqual(releaseErrors(app, eas, () => true), []);
});
test('renaming a valid logo to PNG or JPEG does not invalidate unit fixtures', () => {
  for (const extension of ['png', 'jpeg']) {
    const changed = clone(fixture); const logo = './fixture/renamed-logo.' + extension;
    changed.expo.icon = logo; changed.expo.android.adaptiveIcon.foregroundImage = logo; changed.expo.web.favicon = logo;
    assert.deepEqual(releaseErrors(changed, fixtureEas, value => value === logo), []);
    assert.equal(releaseErrors(changed, fixtureEas, () => false).length, 3);
  }
});
