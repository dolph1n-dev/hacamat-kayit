const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Pure tests run dependency-free, like regression.cjs.
async function load(file) {
  const context = vm.createContext({ Date });
  const cache = new Map();
  async function moduleAt(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const module = new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), { context }); cache.set(filename, module);
    await module.link(specifier => moduleAt(path.resolve(path.dirname(filename), specifier + '.js')));
    return module;
  }
  const module = await moduleAt(path.join(__dirname, '..', file)); await module.evaluate(); return module.namespace;
}
const choices = () => load('src/utils/customerSelection.js');

test('safe-area bottom padding protects 60pt controls for buttons, gestures, iPhone and rotation', async () => {
  const { getTabBarLayout } = await load('src/utils/navigationLayout.js');
  for (const bottom of [0, 8, 16, 24, 34, 48, -1, NaN]) {
    const result = getTabBarLayout({ bottom });
    assert.equal(result.height - result.paddingBottom, 60);
    assert.ok(result.paddingBottom >= 8);
    if (Number.isFinite(bottom)) assert.ok(result.paddingBottom >= bottom);
  }
});
test('cancelled native contact picker leaves form unchanged', async () => {
  assert.equal((await choices()).contactSelection(null), null);
});
test('native contact name and number are extracted and normalized', async () => {
  const result = (await choices()).contactSelection({ firstName: 'Ada', lastName: 'Yılmaz', phoneNumbers: [{ number: '0555 123 45 67', label: 'cep' }] });
  assert.equal(result.isim, 'Ada Yılmaz'); assert.equal(result.phones[0].telefon, '+905551234567');
});
test('multiple numbers remain selectable, duplicate phone formats collapse', async () => {
  const result = (await choices()).contactSelection({ name: 'Ada', phoneNumbers: [{ number: '05551234567' }, { number: '+905551234567' }, { number: '+44 7700 900123', label: 'iş' }] });
  assert.equal(result.phones.length, 2); assert.equal(result.phones[1].telefon, '+447700900123');
});
test('contact without a phone and an unusual editable phone do not crash', async () => {
  const c = await choices(); assert.equal(c.contactSelection({ name: 'Ada' }).phones.length, 0);
  assert.equal(c.contactSelection({ phoneNumbers: [{ number: '123' }] }).phones[0].telefon, '123');
});
test('customer list deduplicates repeated sessions without modifying records', async () => {
  const c = await choices(); const records = [
    { id: 'old', isim: 'Eski', telefon: '05551234567', tarih: '2026-01-01' },
    { id: 'new', isim: 'Yeni', telefon: '+905551234567', tarih: '2026-10-01' },
    { id: 'no-phone', isim: 'Telefon Yok', telefon: '', tarih: '2026-01-01' },
  ];
  const snapshot = JSON.stringify(records); const result = c.savedCustomerChoices(records);
  assert.equal(result.length, 2); assert.equal(result.find(item => item.telefon).isim, 'Yeni'); assert.equal(JSON.stringify(records), snapshot);
});
test('different customers with identical names and distinct phones remain distinct', async () => {
  const result = (await choices()).savedCustomerChoices([{ id: 'a', isim: 'Ada', telefon: '+905551234567' }, { id: 'b', isim: 'Ada', telefon: '+905551234568' }]);
  assert.equal(result.length, 2);
});
test('Turkish name and formatted phone searches work; invalid records ignored', async () => {
  const c = await choices(); const customers = c.savedCustomerChoices([null, {}, { id: 'a', isim: 'Işık', telefon: '+905551234567' }, { id: 'b', isim: 'İpek', telefon: '+905551234568' }]);
  assert.equal(c.filterCustomers(customers, 'ışık').length, 1); assert.equal(c.filterCustomers(customers, 'ipek').length, 1);
  assert.equal(c.filterCustomers(customers, '555 123 45 67').length, 1); assert.equal(c.filterCustomers([], '').length, 0);
});
test('both forms include shared source picker; appointment keeps a fresh session draft', () => {
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const appointment = read('src/screens/AppointmentsScreen.js'); const record = read('src/screens/AddRecordScreen.js');
  assert.match(appointment, /CustomerSourceButtons includeSaved/); assert.match(record, /CustomerSourceButtons disabled/);
  for (const source of [appointment, record]) assert.match(source, /setIsim\(person.isim\); setTelefon\(person.telefon\)/);
  assert.match(appointment, /const musteriId = uuid.v4\(\)/);
  assert.match(read('App.js'), /useSafeAreaInsets\(\)/);
  assert.match(read('App.js'), /getTabBarLayout\(insets\)/);
});
