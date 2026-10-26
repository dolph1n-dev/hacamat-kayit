const fs = require('node:fs');
const path = require('node:path');

// Dependency-free checks: run before Expo config resolution and native prebuild.
function releaseErrors(app, eas, fileExists) {
  const errors = [];
  const expo = app.expo || {};
  if (!/^\d+\.\d+\.\d+$/.test(expo.version || '')) errors.push('expo.version must be a release version such as 1.1.0.');
  if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(expo.android?.package || '')) errors.push('A valid android.package is required.');
  if (!expo.extra?.eas?.projectId) errors.push('EAS projectId is missing.');
  const icons = {
    icon: expo.icon,
    'android.icon': expo.android?.icon,
    'android.adaptiveIcon.foregroundImage': expo.android?.adaptiveIcon?.foregroundImage,
    'android.adaptiveIcon.backgroundImage': expo.android?.adaptiveIcon?.backgroundImage,
    'android.adaptiveIcon.monochromeImage': expo.android?.adaptiveIcon?.monochromeImage,
    'web.favicon': expo.web?.favicon,
  };
  if (!expo.icon) errors.push('The application icon is missing.');
  for (const [field, value] of Object.entries(icons)) {
    if (value && !fileExists(value)) errors.push(field + ': file not found: ' + value);
  }
  if (eas.build?.preview?.android?.buildType !== 'apk') errors.push('preview must build an Android APK.');
  if (eas.build?.preview?.distribution !== 'internal') errors.push('preview must use internal distribution.');
  if (eas.cli?.appVersionSource !== 'remote') errors.push('Use remote EAS build version management.');
  if (eas.build?.preview?.autoIncrement !== true) errors.push('preview must increment its build number.');
  return errors;
}

module.exports = { releaseErrors };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  try {
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
    const errors = releaseErrors(app, eas, value => fs.existsSync(path.resolve(root, value)));
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Release config and referenced icon paths: OK');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
