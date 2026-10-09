import AsyncStorage from '@react-native-async-storage/async-storage';

const RECORDS = '@hacamat_kayitlari';
const APPOINTMENTS = '@randevular';
const JOURNAL = '@hacamat_pending_transaction_v1';
let queue = Promise.resolve();

function serialized(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}

function parseArray(raw) {
  const value = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Kayıt verisi bozuk; üzerine yazılmadı.');
  return value;
}

async function recover() {
  const raw = await AsyncStorage.getItem(JOURNAL);
  if (!raw) return;
  const pending = JSON.parse(raw);
  if (!Array.isArray(pending.records) || !Array.isArray(pending.appointments)) {
    throw new Error('Bekleyen kayıt işlemi bozuk; veri korunuyor.');
  }
  await AsyncStorage.multiSet([
    [RECORDS, JSON.stringify(pending.records)],
    [APPOINTMENTS, JSON.stringify(pending.appointments)],
  ]);
  await AsyncStorage.removeItem(JOURNAL);
}

async function readState() {
  await recover();
  const values = await AsyncStorage.multiGet([RECORDS, APPOINTMENTS]);
  const map = Object.fromEntries(values);
  return { records: parseArray(map[RECORDS] ?? null), appointments: parseArray(map[APPOINTMENTS] ?? null) };
}

export function getAppointmentState() {
  return serialized(readState);
}

// One journaled operation for appointment + its session draft. AsyncStorage
// multiSet is not a database transaction; a pending journal rolls forward at
// the next appointment read. Do not report success on an I/O failure.
export function mutateAppointmentState(mutator) {
  return serialized(async () => {
    const state = await readState();
    const next = mutator(state);
    if (!Array.isArray(next?.records) || !Array.isArray(next?.appointments)) {
      throw new Error('Geçersiz kayıt işlemi.');
    }
    await AsyncStorage.setItem(JOURNAL, JSON.stringify(next));
    await AsyncStorage.multiSet([
      [RECORDS, JSON.stringify(next.records)],
      [APPOINTMENTS, JSON.stringify(next.appointments)],
    ]);
    await AsyncStorage.removeItem(JOURNAL);
    return next;
  });
}
