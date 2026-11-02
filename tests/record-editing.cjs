const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const base = { id: 'r1', isim: 'Ada', telefon: '+905551234567', yas: '30', kupaSayisi: '4', islemler: 'Sırt', tarih: '2026-11-02T09:00:00.000Z', status: 'completed' };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

// Dependency-free logic harness: execute the component's real pre-JSX handlers
// and effects, with mock hooks. This is NOT native rendering or device testing.
function logicHarness(file, component, indent, exposed, globals = {}, initialProps = {}) {
  const source = read(file).replace(/^import .*;\r?\n/gm, '').replace('export default function ' + component, 'function ' + component);
  const marker = '\n' + ' '.repeat(indent) + 'return (\n';
  const boundary = source.indexOf(marker); assert.ok(boundary > 0, 'component render boundary');
  const code = source.slice(0, boundary) + '\nreturn {' + exposed + '};\n}\n' + component;
  const slots = [], queued = [];
  let cursor = 0, dirty = true, props = initialProps, value, unmounted = false, lateUpdates = 0;
  const hooks = {
    useState(initial) {
      const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { if (unmounted) lateUpdates++; const result = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(result, slots[i])) { slots[i] = result; dirty = true; } }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useEffect(callback, deps) {
      const i = cursor++, old = slots[i];
      if (!old || deps.some((dep, n) => !Object.is(dep, old.deps[n]))) {
        slots[i] = { deps, cleanup: old?.cleanup };
        queued.push(() => { slots[i].cleanup?.(); slots[i].cleanup = callback(); });
      }
    },
    useCallback: fn => fn,
    useFocusEffect() {},
  };
  const Component = vm.runInNewContext(code, { ...hooks, Date, ...globals });
  function render() {
    let limit = 10;
    do { dirty = false; cursor = 0; value = Component(props); while (queued.length) queued.shift()(); assert.ok(limit-- > 0, 'effects settle'); } while (dirty);
    return value;
  }
  render();
  return {
    get current() { return dirty ? render() : value; },
    setProps(next) { props = { ...props, ...next }; return render(); },
    unmount() { unmounted = true; for (const slot of slots) slot?.cleanup?.(); },
    get lateUpdates() { return lateUpdates; },
  };
}
function modal(onUpdate = async () => true) {
  const record = clone(base), alerts = []; let closes = 0;
  const h = logicHarness('src/components/RecordDetailModal.js', 'RecordDetailModal', 4,
    'editedRecord,isEditing,showDatePicker,saving,setEditedRecord,setShowDatePicker,cancelEditing,startEditing,handleClose,handleSave,handleDelete',
    { Alert: { alert: (...args) => alerts.push(args) } }, { visible: true, record, onUpdate, onClose: () => { closes++; }, onDelete() {} });
  return { h, record, alerts, get closes() { return closes; }, edit(patch) { h.current.startEditing(); h.current.setEditedRecord(value => ({ ...value, ...patch })); return h.current; } };
}
async function rules() {
  const module = new vm.SourceTextModule(read('src/utils/appointmentRules.js')); await module.link(() => { throw Error('Unexpected import'); }); await module.evaluate(); return module.namespace;
}
async function screen(records, options = {}) {
  const r = await rules(), alerts = []; let stored = { records: clone(records), appointments: options.appointments || [] }, writes = 0;
  const h = logicHarness('src/screens/RecordsListScreen.js', 'RecordsListScreen', 2,
    'handleUpdate,handleDelete,records,selectedRecord,modalVisible', {
      ...Object.fromEntries(Object.keys(r).map(key => [key, r[key]])), Alert: { alert: (...args) => alerts.push(args) },
      getAppointmentState: async () => stored,
      mutateAppointmentState: async fn => { if (options.fail) throw Error('disk failure'); const next = fn(stored); stored = next; writes++; return stored; },
    });
  return { h, alerts, get stored() { return stored; }, get writes() { return writes; } };
}

test('cancel restores persisted values and closes the date picker without saving', () => {
  let saves = 0; const m = modal(async () => { saves++; return true; });
  m.edit({ isim: 'Unsaved', kupaSayisi: '9' }); m.h.current.setShowDatePicker(true);
  m.h.current.cancelEditing();
  assert.equal(m.h.current.editedRecord.isim, 'Ada'); assert.equal(m.h.current.editedRecord.kupaSayisi, '4');
  assert.equal(m.h.current.isEditing, false); assert.equal(m.h.current.showDatePicker, false); assert.equal(saves, 0);
});
test('closing and reopening the same record resets form state', () => {
  const m = modal(); m.edit({ isim: 'Unsaved' }); m.h.current.setShowDatePicker(true); m.h.current.handleClose();
  assert.equal(m.closes, 1); m.h.setProps({ visible: false }); m.h.setProps({ visible: true, record: m.record });
  assert.equal(m.h.current.editedRecord.isim, 'Ada'); assert.equal(m.h.current.isEditing, false); assert.equal(m.h.current.showDatePicker, false);
});
test('pending save stays in edit mode, blocks duplicate save and close, and retains input on false', async () => {
  const d = deferred(); let saves = 0; const m = modal(() => { saves++; return d.promise; });
  m.edit({ isim: 'Changed' }); const operation = m.h.current.handleSave();
  assert.equal(m.h.current.saving, true); assert.equal(m.h.current.isEditing, true);
  await m.h.current.handleSave(); m.h.current.cancelEditing(); m.h.current.handleClose();
  assert.equal(saves, 1); assert.equal(m.closes, 0); assert.equal(m.h.current.editedRecord.isim, 'Changed');
  d.resolve(false); await operation;
  assert.equal(m.h.current.saving, false); assert.equal(m.h.current.isEditing, true); assert.equal(m.h.current.editedRecord.isim, 'Changed');
});
test('successful save exits edit mode only after the awaited result', async () => {
  const d = deferred(); const m = modal(() => d.promise); m.edit({ isim: 'Saved' });
  const operation = m.h.current.handleSave(); assert.equal(m.h.current.isEditing, true);
  d.resolve(true); await operation; assert.equal(m.h.current.isEditing, false); assert.equal(m.h.current.saving, false);
});
test('unexpected save rejection reports the error without discarding form data', async () => {
  const m = modal(async () => { throw Error('offline'); }); m.edit({ isim: 'Retry me' }); await m.h.current.handleSave();
  assert.equal(m.h.current.isEditing, true); assert.equal(m.h.current.editedRecord.isim, 'Retry me'); assert.equal(m.alerts.length, 1);
});
test('a late save resolution does not update an unmounted modal', async () => {
  const d = deferred(); const m = modal(() => d.promise); m.edit({ isim: 'Changed' });
  const operation = m.h.current.handleSave(); m.h.unmount(); d.resolve(true); await operation; assert.equal(m.h.lateUpdates, 0);
});
test('completed session cannot clear cups or bypass validation with an edited status', async () => {
  for (const status of ['completed', 'draft']) {
    const s = await screen([base]); const result = await s.h.current.handleUpdate({ ...base, status, kupaSayisi: '' });
    assert.equal(result, false); assert.equal(s.writes, 0); assert.equal(s.stored.records[0].kupaSayisi, '4'); assert.equal(s.alerts.length, 1);
  }
});
test('legacy completed session is not weakened into a draft by clearing its cups', async () => {
  const legacy = { ...base }; delete legacy.status;
  const s = await screen([legacy]); assert.equal(await s.h.current.handleUpdate({ ...legacy, kupaSayisi: '' }), false); assert.equal(s.writes, 0);
});
test('real and legacy empty drafts can still be edited', async () => {
  for (const status of ['draft', undefined]) {
    const draft = { ...base, status, kupaSayisi: '', islemler: '' }; const s = await screen([draft]);
    assert.equal(await s.h.current.handleUpdate({ ...draft, isim: 'Draft name' }), true);
    assert.equal(s.stored.records[0].isim, 'Draft name'); assert.equal(s.stored.records[0].status, status); assert.equal(s.writes, 1);
  }
});
test('valid completed update returns success and uses the persisted result', async () => {
  const s = await screen([base]); assert.equal(await s.h.current.handleUpdate({ ...base, kupaSayisi: '6' }), true);
  assert.equal(s.h.current.selectedRecord.kupaSayisi, '6'); assert.equal(s.stored.records[0].kupaSayisi, '6'); assert.equal(s.h.current.modalVisible, false);
});
test('storage failure and linked identity rejection report false and preserve persisted data', async () => {
  const failure = await screen([base], { fail: true }); assert.equal(await failure.h.current.handleUpdate({ ...base, kupaSayisi: '6' }), false); assert.equal(failure.writes, 0);
  const linked = await screen([base], { appointments: [{ id: 'a1', musteriId: base.id }] }); assert.equal(await linked.h.current.handleUpdate({ ...base, isim: 'Forbidden' }), false); assert.equal(linked.writes, 0);
});
test('validator never skips completed cup validation even when allowDraft is true', async () => {
  const r = await rules(); assert.throws(() => r.validateRecord({ ...base, kupaSayisi: '' }, true), /Kupa/);
});
test('modal UI is wired to reset handlers and disables editing during save', () => {
  const source = read('src/components/RecordDetailModal.js');
  assert.match(source, /onPress=\{cancelEditing\}/); assert.match(source, /onRequestClose=\{handleClose\}/);
  assert.equal((source.match(/editable=\{isEditing && !saving\}/g) || []).length, 5);
  assert.match(source, /Kaydediliyor…/);
});
