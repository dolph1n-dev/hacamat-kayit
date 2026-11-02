const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/screens/AddRecordScreen.js'), 'utf8');
// Runs the real pre-JSX handlers with mock hooks, not a native/device renderer.
function form(persist = async () => {}) {
  const code = source.replace(/^import .*;\r?\n/gm, '').replace('export default function AddRecordScreen', 'function AddRecordScreen');
  const cut = code.indexOf('\n  return (\n'); assert.ok(cut > 0);
  const expose = 'isim,telefon,yas,kupaSayisi,islemler,tarih,showDatePicker,saving,setIsim,setTelefon,setYas,setKupaSayisi,setIslemler,setTarih,setShowDatePicker,cancelAdding,kaydet';
  const slots = []; let cursor = 0, writes = 0, dismissals = 0; const routes = [], alerts = [];
  const Component = vm.runInNewContext(code.slice(0, cut) + '\nreturn {' + expose + '};\n}\nAddRecordScreen;', {
    Date,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    Keyboard: { dismiss() { dismissals++; } }, Alert: { alert: (...args) => alerts.push(args) },
    uuid: { v4: () => 'new-record' }, validateRecord: value => value,
    mutateAppointmentState: async updater => { writes++; return persist(updater); },
  });
  return {
    get current() { cursor = 0; return Component({ navigation: { navigate: route => routes.push(route) } }); },
    get writes() { return writes; }, get dismissals() { return dismissals; }, routes, alerts,
    fill() { const f = this.current; f.setIsim('Ada'); f.setTelefon('05551234567'); f.setYas('30'); f.setKupaSayisi('4'); f.setIslemler('Sırt'); f.setTarih(new Date('2020-01-01')); f.setShowDatePicker(true); },
  };
}
test('cancel clears all customer fields and picker, dismisses keyboard and returns to list without writing', () => {
  const h = form(); h.fill(); h.current.cancelAdding(); const f = h.current;
  for (const field of ['isim', 'telefon', 'yas', 'kupaSayisi', 'islemler']) assert.equal(f[field], '');
  assert.equal(f.showDatePicker, false); assert.ok(Math.abs(f.tarih.getTime() - Date.now()) < 5000);
  assert.equal(h.writes, 0); assert.equal(h.dismissals, 1); assert.deepEqual(h.routes, ['Liste']);
});
test('cancel is blocked during pending save, then success resets date picker and form', async () => {
  let resolve; const pending = new Promise(done => { resolve = done; }); const h = form(() => pending); h.fill();
  const saving = h.current.kaydet(); assert.equal(h.current.saving, true); h.current.cancelAdding();
  assert.equal(h.current.isim, 'Ada'); assert.equal(h.dismissals, 0); assert.deepEqual(h.routes, []);
  resolve(); await saving; assert.equal(h.current.saving, false); assert.equal(h.current.isim, ''); assert.equal(h.current.showDatePicker, false); assert.equal(h.writes, 1);
});
test('failed save retains form values and leaves cancel available afterwards', async () => {
  const h = form(async () => { throw new Error('Disk full'); }); h.fill(); await h.current.kaydet();
  assert.equal(h.current.isim, 'Ada'); assert.equal(h.current.saving, false); assert.equal(h.alerts[0][0], 'Kayıt eklenemedi');
  h.current.cancelAdding(); assert.equal(h.current.isim, ''); assert.deepEqual(h.routes, ['Liste']); assert.equal(h.writes, 1);
});
test('cancel button is visible in the form header, accessible and disabled during saving', () => {
  assert.match(source, /<View style=\{styles.header\}>/); assert.match(source, /<Text style=\{styles.cancelText\}>İptal<\/Text>/);
  assert.match(source, /disabled=\{saving\} accessibilityState=\{\{ disabled: saving \}\}/); assert.match(source, /onPress=\{cancelAdding\}/);
});
