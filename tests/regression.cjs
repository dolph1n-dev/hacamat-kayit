// Run: TZ=Europe/Istanbul node --experimental-vm-modules --test tests/regression.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
async function load(file, mocks = {}) {
  const context = vm.createContext({ console, Date });
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { context });
  await module.link(async name => {
    const values = mocks[name];
    if (!values) throw new Error('Unexpected import: ' + name);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}
const rules = () => load('src/utils/appointmentRules.js');
const json = value => JSON.parse(JSON.stringify(value));
function memoryStore(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map, fail: false,
    async getItem(key) { return map.get(key) ?? null; },
    async setItem(key, value) { map.set(key, value); },
    async removeItem(key) { map.delete(key); },
    async multiGet(keys) { return keys.map(key => [key, map.get(key) ?? null]); },
    async multiSet(entries) {
      for (const [key, value] of entries) {
        map.set(key, value);
        if (this.fail) { this.fail = false; throw new Error('disk failure'); }
      }
    },
  };
}
const storage = store => load('src/utils/appointmentStorage.js', { '@react-native-async-storage/async-storage': { default: store } });
function notificationMock(granted = true) {
  return {
    scheduled: [], cancelled: [], requested: 0, channel: false, handler: null, failAt: 0,
    AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler(value) { this.handler = value; },
    async setNotificationChannelAsync() { this.channel = true; },
    async getPermissionsAsync() { return { granted }; },
    async requestPermissionsAsync() { this.requested++; return { granted }; },
    async getAllScheduledNotificationsAsync() { return this.scheduled; },
    async cancelScheduledNotificationAsync(id) { this.cancelled.push(id); this.scheduled = this.scheduled.filter(item => item.identifier !== id); },
    async scheduleNotificationAsync(item) {
      if (this.failAt && this.scheduled.length + 1 === this.failAt) throw new Error('schedule failure');
      this.scheduled.push(item); return item.identifier;
    },
  };
}
async function notifications(mock, os = 'android') {
  const bound = Object.fromEntries(Object.entries(mock).filter(([key]) => !['scheduled', 'cancelled', 'handler'].includes(key)).map(([key, value]) => [key, typeof value === 'function' ? value.bind(mock) : value]));
  return load('src/utils/notifications.js', { 'expo-notifications': bound, 'react-native': { Platform: { OS: os } } });
}

test('local day stays October 9 around Istanbul midnight (UTC is October 8)', async () => {
  const r = await rules(); assert.equal(r.localDateKey(new Date('2026-10-09T00:30:00+03:00')), '2026-10-09');
});
test('selected day preserves local hours and clears seconds', async () => {
  const r = await rules(); const result = r.appointmentDate('2026-10-09', new Date(2026, 9, 8, 14, 35, 59));
  assert.equal(result.getDate(), 9); assert.equal(result.getHours(), 14); assert.equal(result.getSeconds(), 0);
  assert.throws(() => r.appointmentDate('2026-02-30', new Date()));
});
test('duration validation accepts hours/minutes and rejects ambiguous input', async () => {
  const r = await rules(); assert.equal(r.durationMinutes('1,5 Saat'), 90); assert.equal(r.durationMinutes('30 dk'), 30);
  for (const value of ['0 Saat', '-1 Saat', 'abc', '60', '25 Saat']) assert.throws(() => r.durationMinutes(value));
});
test('Turkish and international phone normalization', async () => {
  const r = await rules();
  for (const value of ['0555 123 45 67', '5551234567', '+90 5551234567', '00905551234567']) assert.equal(r.normalizePhone(value), '+905551234567');
  assert.equal(r.normalizePhone('+44 7700 900123'), '+447700900123'); assert.throws(() => r.normalizePhone('12'));
});
test('conflicts overlap but adjacent slots and completed appointments do not', async () => {
  const r = await rules(); const start = new Date('2026-10-10T12:00:00+03:00');
  const items = [{ tarih: start.toISOString(), sure: '1 Saat' }];
  assert.equal(r.hasConflict(items, new Date(start.getTime() + 30 * 60000), 60), true);
  assert.equal(r.hasConflict(items, new Date(start.getTime() + 60 * 60000), 60), false);
  assert.equal(r.hasConflict([{ ...items[0], status: 'completed' }], start, 60), false);
});
test('cancellation preserves completed and legacy session records', async () => {
  const r = await rules(); assert.equal(r.isCompletedRecord({ status: 'draft', kupaSayisi: '' }), false);
  for (const record of [{ status: 'completed' }, { kupaSayisi: '7' }, { islemler: 'Sırt' }]) assert.equal(r.isCompletedRecord(record), true);
});
test('record validation trims and rejects invalid cup/age/name values', async () => {
  const r = await rules(); const base = { isim: '  Test  ', kupaSayisi: '7', yas: '34', tarih: '2026-10-09', telefon: '' };
  assert.equal(r.validateRecord(base).isim, 'Test');
  for (const extra of [{ isim: ' ' }, { kupaSayisi: '-2' }, { kupaSayisi: '0' }, { yas: '131' }]) assert.throws(() => r.validateRecord({ ...base, ...extra }));
  assert.equal(r.validateRecord({ ...base, kupaSayisi: '' }, true).kupaSayisi, '');
});
test('legacy collection keys load without migration loss', async () => {
  const s = await storage(memoryStore({ '@hacamat_kayitlari': '[{"id":"r"}]', '@randevular': '[{"id":"a"}]' }));
  assert.deepEqual(json(await s.getAppointmentState()), { records: [{ id: 'r' }], appointments: [{ id: 'a' }] });
});
test('malformed JSON does not become an empty list or overwrite data', async () => {
  const store = memoryStore({ '@hacamat_kayitlari': 'broken' }); const s = await storage(store);
  await assert.rejects(s.mutateAppointmentState(state => ({ ...state, records: [] })));
  assert.equal(store.map.get('@hacamat_kayitlari'), 'broken');
});
test('concurrent mutations preserve both updates', async () => {
  const s = await storage(memoryStore());
  await Promise.all(['one', 'two'].map(id => s.mutateAppointmentState(state => ({ ...state, records: [...state.records, { id }] }))));
  assert.deepEqual(json((await s.getAppointmentState()).records), [{ id: 'one' }, { id: 'two' }]);
});
test('partial write rejects, then journal recovery restores both collections', async () => {
  const store = memoryStore(); const s = await storage(store); store.fail = true;
  await assert.rejects(s.mutateAppointmentState(() => ({ records: [{ id: 'r' }], appointments: [{ id: 'a' }] })));
  assert.ok(store.map.has('@hacamat_pending_transaction_v1'));
  assert.deepEqual(json(await s.getAppointmentState()), { records: [{ id: 'r' }], appointments: [{ id: 'a' }] });
  assert.equal(store.map.has('@hacamat_pending_transaction_v1'), false);
});
test('local notification trigger, permission channel and stable IDs', async () => {
  const mock = notificationMock(); const n = await notifications(mock);
  const date = new Date(Date.now() + 3 * 86400000).toISOString();
  assert.equal((await n.scheduleAppointmentNotifications('Test', date, 'a')).ids.length, 2);
  assert.equal(mock.channel, true); assert.equal(mock.scheduled[0].trigger.type, 'date');
  assert.equal(mock.scheduled[0].content.data.appointmentId, 'a');
  const handler = await mock.handler.handleNotification(); assert.equal(handler.shouldShowBanner, true);
  await n.scheduleAppointmentNotifications('Test', date, 'a'); assert.equal(mock.scheduled.length, 2);
  await n.cancelAppointmentNotifications('a'); assert.equal(mock.scheduled.length, 0);
});
test('denied permission persists no reminders and reports disabled', async () => {
  const mock = notificationMock(false); const n = await notifications(mock);
  assert.equal((await n.scheduleAppointmentNotifications('Test', new Date(Date.now() + 86400000).toISOString(), 'a')).enabled, false);
  assert.equal(mock.scheduled.length, 0); assert.equal(mock.requested, 1);
});
test('partial scheduling failure cleans up already scheduled reminder', async () => {
  const mock = notificationMock(); mock.failAt = 2; const n = await notifications(mock);
  await assert.rejects(n.scheduleAppointmentNotifications('Test', new Date(Date.now() + 3 * 86400000).toISOString(), 'a'));
  assert.equal(mock.scheduled.length, 0);
});

test('same-day booking inside two hours receives a near reminder', async () => {
  const mock = notificationMock(); const n = await notifications(mock);
  const result = await n.scheduleAppointmentNotifications('Test', new Date(Date.now() + 3600000).toISOString(), 'a');
  assert.equal(result.ids.length, 1); assert.equal(mock.scheduled[0].identifier, 'appointment:a:near');
});
