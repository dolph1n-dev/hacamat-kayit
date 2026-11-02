const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
async function load() {
  const context = vm.createContext({ Date }); const cache = new Map();
  async function moduleAt(file) {
    if (cache.has(file)) return cache.get(file);
    const module = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context }); cache.set(file, module);
    await module.link(name => moduleAt(path.resolve(path.dirname(file), name + '.js'))); return module;
  }
  const module = await moduleAt(path.join(__dirname, '../src/utils/appointmentList.js')); await module.evaluate(); return module.namespace.selectAppointments;
}
const ids = list => Array.from(list, item => item.id);
const now = new Date('2026-11-02T12:00:00+03:00').getTime();
const items = [
  { id: 'old', tarih: '2026-10-15T10:00:00+03:00', dateKey: '2026-10-15', status: 'completed' },
  { id: 'morning', tarih: '2026-11-02T09:00:00+03:00', dateKey: '2026-11-02' },
  { id: 'later', tarih: '2026-11-02T15:00:00+03:00', dateKey: '2026-11-02' },
  { id: 'future', tarih: '2026-12-01T10:00:00+03:00', dateKey: '2026-12-01' },
];
test('all appointments span every day, newest first, including completed entries', async () => {
  assert.deepEqual(ids((await load())(items, { mode: 'all', now })), ['future', 'later', 'morning', 'old']);
});
test('past appointments include earlier today and old completed appointments, not future ones', async () => {
  assert.deepEqual(ids((await load())(items, { mode: 'past', now })), ['morning', 'old']);
});
test('selected day retains chronological order without pulling in other dates', async () => {
  assert.deepEqual(ids((await load())(items, { mode: 'day', selectedDate: '2026-11-02', now })), ['morning', 'later']);
});
test('past boundary follows the clock without treating now or later as past', async () => {
  const select = await load(); const list = [{ id: 'before', tarih: new Date(now - 1).toISOString() }, { id: 'now', tarih: new Date(now).toISOString() }];
  assert.deepEqual(ids(select(list, { mode: 'past', now })), ['before']);
  assert.deepEqual(ids(select(list, { mode: 'past', now: now + 1 })), ['now', 'before']);
});
test('legacy appointment without dateKey is discoverable on its local day', async () => {
  const select = await load(); const legacy = [{ id: 'legacy', tarih: '2026-11-02T00:30:00+03:00' }];
  assert.deepEqual(ids(select(legacy, { selectedDate: '2026-11-02' })), ['legacy']);
});
test('undated entries remain in All, while empty and invalid collections are safe', async () => {
  const select = await load(); const list = [null, { id: 'undated', tarih: 'invalid' }, { id: 'valid', tarih: items[0].tarih }];
  assert.deepEqual(ids(select(list, { mode: 'all' })), ['valid', 'undated']);
  assert.deepEqual(ids(select(list, { mode: 'past', now })), ['valid']);
  assert.equal(select([], { mode: 'all' }).length, 0); assert.equal(select(null, { mode: 'past' }).length, 0);
});
test('changing list modes never mutates stored order or appointment fields', async () => {
  const select = await load(); const input = items.map(item => Object.freeze({ ...item })); Object.freeze(input);
  const snapshot = JSON.stringify(input); select(input, { mode: 'all' }); select(input, { mode: 'past', now });
  assert.equal(JSON.stringify(input), snapshot);
});
test('screen connects filter buttons, dates and existing details without restricting them to one day', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/AppointmentsScreen.js'), 'utf8');
  for (const label of ['Günlük Takvim', 'Geçmiş Randevular', 'Tüm Randevular']) assert.ok(source.includes(label));
  assert.match(source, /data=\{visibleAppointments\}/); assert.match(source, /onPress=\{\(\) => changeList\(option.mode\)\}/);
  assert.match(source, /setSelectedAppointment\(item\); setIsDetailModalVisible\(true\)/);
  assert.match(source, /listMode !== 'day' && <Text style=\{styles.cardDate\}/);
  assert.match(source, /if \(listMode !== 'day'\) \{ setSelectedDate\(localDateKey\(\)\); setListMode\('day'\); \}/);
  assert.match(source, /return \(\) => clearInterval\(timer\)/);
});
