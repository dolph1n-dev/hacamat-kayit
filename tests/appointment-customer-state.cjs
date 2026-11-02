const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
async function load(file) {
  const context = vm.createContext({ Date }), cache = new Map();
  async function at(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const mod = new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), { context }); cache.set(filename, mod);
    await mod.link(name => at(path.resolve(path.dirname(filename), name + '.js'))); return mod;
  }
  const mod = await at(path.join(__dirname, '..', file)); await mod.evaluate(); return mod.namespace;
}
const customer = { id: 'customer', isim: 'Ada', telefon: '+905551234567', yas: '30', kupaSayisi: '4', islemler: 'Eski seans', tarih: '2026-01-01T09:00:00.000Z', status: 'completed' };
const appointment = { id: 'appointment', isim: 'Ada', telefon: customer.telefon, tarih: '2026-11-05T09:00:00.000Z', status: 'scheduled' };
const empty = records => ({ records: clone(records), appointments: [] });
const fields = { yas: '31', kupaSayisi: '6', islemler: 'Yeni seans' };
// Actual screen handlers with mock hooks/storage/alerts; not native rendering.
async function screen(records = [], options = {}) {
  const rules = await load('src/utils/appointmentRules.js'), customers = await load('src/utils/appointmentCustomerState.js');
  const source = read('src/screens/AppointmentsScreen.js').replace(/^import .*;\r?\n/gm, '').replace('export default function AppointmentsScreen', 'function AppointmentsScreen');
  const cut = source.indexOf('\n  return (\n'); assert.ok(cut > 0);
  const expose = 'handleSaveAppointment,handleDeleteAppointment,selectCustomer,changeName,changePhone,selectedCustomer,isim,telefon,saving,setSelectedDate,setTime,closeAddModal,openNewAppointment';
  const slots = []; let cursor = 0, writes = 0, notifications = 0, sequence = 0, stored = empty(records); const alerts = [];
  const Component = vm.runInNewContext(source.slice(0, cut) + '\nreturn {' + expose + '};\n}\nAppointmentsScreen;', {
    ...Object.fromEntries(Object.keys(rules).map(key => [key, rules[key]])), ...Object.fromEntries(Object.keys(customers).map(key => [key, customers[key]])),
    Date, LocaleConfig: { locales: {} }, useCallback: fn => fn, useFocusEffect() {},
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    uuid: { v4: () => 'generated-' + (++sequence) }, Alert: { alert: (...args) => alerts.push(args) },
    getAppointmentState: async () => stored,
    mutateAppointmentState: async fn => { if (options.fail) throw Error('Disk full'); const next = fn(stored); stored = clone(next); writes++; return next; },
    scheduleAppointmentNotifications: async () => { notifications++; return { enabled: true }; }, cancelAppointmentNotifications: async () => {},
    selectAppointments: () => [], colors: {},
  });
  const h = {
    get current() { cursor = 0; return Component(); }, get stored() { return stored; }, get writes() { return writes; }, get notifications() { return notifications; }, alerts,
    fill(saved = false) { const f = this.current; const future = new Date(Date.now() + 2 * 86400000); future.setHours(12, 0, 0, 0); f.setSelectedDate(rules.localDateKey(future)); f.setTime(future); f.changeName('Ada'); f.changePhone(customer.telefon); if (saved) this.current.selectCustomer({ ...customer, recordId: customer.id }); },
    answer(text) { const prompt = alerts.findLast(args => Array.isArray(args[2])); assert.ok(prompt, 'draft question shown'); const button = prompt[2].find(value => value.text === text); assert.ok(button); button.onPress(); },
    deleteCustomer() { stored.records = []; },
  };
  h.current; return h;
}
test('saved selection books an appointment without a question, duplicate draft or modifying the customer', async () => {
  const h = await screen([customer]); h.fill(true); await h.current.handleSaveAppointment();
  assert.equal(h.writes, 1); assert.deepEqual(h.stored.records, [customer]); assert.equal(h.stored.appointments[0].customerRecordId, customer.id); assert.equal(h.stored.appointments[0].musteriId, null);
  assert.equal(h.alerts.filter(args => Array.isArray(args[2])).length, 0);
});
test('new customer Yes persists one draft and appointment only after consent, blocking double save', async () => {
  const h = await screen(); h.fill(); const pending = h.current.handleSaveAppointment();
  assert.equal(h.writes, 0); assert.equal(h.current.saving, true); await h.current.handleSaveAppointment(); h.answer('Evet, Taslak Ekle'); await pending;
  assert.equal(h.writes, 1); assert.equal(h.stored.records.length, 1); assert.equal(h.stored.records[0].status, 'draft'); assert.equal(h.stored.appointments[0].musteriId, h.stored.records[0].id); assert.equal(h.notifications, 1);
});
test('new customer No persists only the appointment, with no customer draft', async () => {
  const h = await screen(); h.fill(); const pending = h.current.handleSaveAppointment(); h.answer('Hayır'); await pending;
  assert.equal(h.stored.records.length, 0); assert.equal(h.stored.appointments.length, 1); assert.equal(h.stored.appointments[0].musteriId, null);
});
test('dismiss or cancel of the draft question writes nothing and preserves form input', async () => {
  for (const dismiss of [false, true]) {
    const h = await screen(); h.fill(); const pending = h.current.handleSaveAppointment();
    if (dismiss) h.alerts.find(args => Array.isArray(args[2]))[3].onDismiss(); else h.answer('Vazgeç');
    await pending; assert.equal(h.writes, 0); assert.equal(h.notifications, 0); assert.equal(h.current.isim, 'Ada'); assert.equal(h.current.saving, false);
  }
});
test('manual name or phone edits invalidate the saved-customer association', async () => {
  for (const edit of ['changeName', 'changePhone']) {
    const h = await screen([customer]); h.fill(true); h.current[edit](edit === 'changeName' ? 'Yeni Ada' : '+905551234568');
    assert.equal(h.current.selectedCustomer, null); const pending = h.current.handleSaveAppointment(); h.answer('Hayır'); await pending;
    assert.equal(h.stored.appointments[0].customerRecordId, null); assert.deepEqual(h.stored.records, [customer]);
  }
});
test('choosing a contact after a saved customer clears the reference and asks for draft consent', async () => {
  const h = await screen([customer]); h.fill(true); h.current.selectCustomer({ isim: 'Rehber', telefon: '+905551234568', recordId: null });
  assert.equal(h.current.selectedCustomer, null); const pending = h.current.handleSaveAppointment(); h.answer('Hayır'); await pending; assert.equal(h.stored.records.length, 1);
});
test('closing and reopening the creation form clears the previous customer selection', async () => {
  const h = await screen([customer]); h.fill(true); h.current.closeAddModal(); h.current.openNewAppointment();
  assert.equal(h.current.selectedCustomer, null); assert.equal(h.current.isim, ''); assert.equal(h.current.telefon, '');
});
test('deleted saved customer is rejected instead of silently creating a duplicate', async () => {
  const h = await screen([customer]); h.fill(true); h.deleteCustomer(); await h.current.handleSaveAppointment();
  assert.equal(h.writes, 0); assert.equal(h.stored.appointments.length, 0); assert.equal(h.current.selectedCustomer, customer.id); assert.ok(h.alerts.some(args => args[0] === 'Randevu kaydedilemedi'));
});
test('storage failure retains form and selected customer without creating a new draft', async () => {
  const h = await screen([customer], { fail: true }); h.fill(true); await h.current.handleSaveAppointment();
  assert.equal(h.writes, 0); assert.equal(h.current.selectedCustomer, customer.id); assert.equal(h.current.isim, 'Ada'); assert.equal(h.current.saving, false);
});
test('saved customer choices include the actual record id, not just a phone grouping key', async () => {
  const c = await load('src/utils/customerSelection.js'); const choice = c.savedCustomerChoices([customer])[0]; assert.equal(choice.recordId, customer.id); assert.notEqual(choice.id, customer.id);
});
test('existing customer sessions are not copied into a new appointment and completion preserves their history', async () => {
  const c = await load('src/utils/appointmentCustomerState.js'); const booked = c.addCustomerAppointment(empty([customer]), appointment, { savedRecordId: customer.id });
  const initial = c.appointmentSessionFields(booked, booked.appointments[0]); assert.equal(initial.yas, customer.yas); assert.equal(initial.kupaSayisi, ''); assert.equal(initial.islemler, '');
  const completed = c.completeCustomerAppointment(booked, appointment.id, fields, 'new-session');
  assert.equal(completed.records.length, 2); assert.equal(completed.records[0].id, 'new-session'); assert.deepEqual(clone(completed.records[1]), customer); assert.equal(completed.records[0].tarih, appointment.tarih);
});
test('appointment without a draft can be completed, and repeated save updates only its own session', async () => {
  const c = await load('src/utils/appointmentCustomerState.js'); const booked = c.addCustomerAppointment(empty([]), appointment);
  const first = c.completeCustomerAppointment(booked, appointment.id, fields, 'session'); const second = c.completeCustomerAppointment(first, appointment.id, { ...fields, kupaSayisi: '7' }, 'unused');
  assert.equal(second.records.length, 1); assert.equal(second.records[0].id, 'session'); assert.equal(second.records[0].kupaSayisi, '7'); assert.equal(second.appointments[0].status, 'completed');
});
test('consented draft and legacy linked draft are completed in place, with positive cup validation', async () => {
  const c = await load('src/utils/appointmentCustomerState.js'); const booked = c.addCustomerAppointment(empty([]), appointment, { addDraft: true, draftId: 'draft' });
  const completed = c.completeCustomerAppointment(booked, appointment.id, fields, 'unused'); assert.equal(completed.records.length, 1); assert.equal(completed.records[0].id, 'draft');
  assert.throws(() => c.completeCustomerAppointment(booked, appointment.id, { ...fields, kupaSayisi: '' }, 'unused'), /Kupa/);
});
test('cancelling a saved-customer appointment preserves even an existing customer draft', async () => {
  const c = await load('src/utils/appointmentCustomerState.js'); const draft = { ...customer, status: 'draft', kupaSayisi: '', islemler: '' };
  const booked = c.addCustomerAppointment(empty([draft]), appointment, { savedRecordId: draft.id }); const removed = c.removeCustomerAppointment(booked, appointment.id);
  assert.equal(removed.appointments.length, 0); assert.deepEqual(clone(removed.records), [draft]);
});
test('cancellation removes only an unshared owned draft, retaining completed and shared records', async () => {
  const c = await load('src/utils/appointmentCustomerState.js'); const booked = c.addCustomerAppointment(empty([]), appointment, { addDraft: true, draftId: 'draft' });
  assert.equal(c.removeCustomerAppointment(booked, appointment.id).records.length, 0);
  const shared = { ...booked, appointments: [...booked.appointments, { ...appointment, id: 'second', customerRecordId: 'draft', musteriId: null }] };
  assert.equal(c.removeCustomerAppointment(shared, appointment.id).records.length, 1);
  const completed = c.completeCustomerAppointment(booked, appointment.id, fields, 'unused'); assert.equal(c.removeCustomerAppointment(completed, appointment.id).records.length, 1);
});
test('picker propagates saved record ids and record editing/deletion guards both reference types', () => {
  assert.match(read('src/components/CustomerSourceButtons.js'), /recordId: person.recordId \|\| null/);
  assert.match(read('src/screens/RecordsListScreen.js'), /item.customerRecordId === valid.id/); assert.match(read('src/screens/RecordsListScreen.js'), /item.customerRecordId === id/);
  assert.match(read('src/screens/AppointmentsScreen.js'), /onSelect=\{selectCustomer\}/);
});
