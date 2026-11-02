import { normalizePhone, validateRecord, isCompletedRecord } from './appointmentRules';

// Customer identity is a reference; musteriId remains the appointment's own
// session record only. Never use a historical customer session as a new draft.
export function addCustomerAppointment(state, appointment, { savedRecordId = null, addDraft = false, draftId = null } = {}) {
  let customer = null;
  if (savedRecordId) {
    customer = state.records.find(record => record.id === savedRecordId);
    if (!customer) throw new Error('Seçilen müşteri artık mevcut değil. Lütfen tekrar seçin.');
    const phone = customer.telefon ? normalizePhone(customer.telefon) : '';
    if (String(customer.isim || '').trim() !== appointment.isim || phone !== appointment.telefon) {
      throw new Error('Seçilen müşterinin bilgileri değişti. Lütfen tekrar seçin.');
    }
  }
  const needsDraft = !customer && addDraft;
  if (needsDraft && (!draftId || state.records.some(record => record.id === draftId))) throw new Error('Geçersiz taslak kimliği.');
  const nextAppointment = { ...appointment, customerRecordId: customer?.id || null, musteriId: needsDraft ? draftId : null };
  const draft = needsDraft ? {
    id: draftId, isim: appointment.isim, telefon: appointment.telefon, yas: '', kupaSayisi: '', islemler: '', tarih: appointment.tarih, status: 'draft',
  } : null;
  return { ...state, records: draft ? [draft, ...state.records] : state.records, appointments: [...state.appointments, nextAppointment] };
}

export function appointmentSessionFields(state, appointment) {
  const session = appointment?.musteriId && state.records.find(record => record.id === appointment.musteriId);
  const customer = appointment?.customerRecordId && state.records.find(record => record.id === appointment.customerRecordId);
  return { yas: session?.yas || customer?.yas || '', kupaSayisi: session?.kupaSayisi || '', islemler: session?.islemler || '' };
}

export function completeCustomerAppointment(state, appointmentId, fields, newSessionId) {
  const appointment = state.appointments.find(item => item.id === appointmentId);
  if (!appointment) throw new Error('Randevu artık mevcut değil.');
  const session = appointment.musteriId && state.records.find(record => record.id === appointment.musteriId);
  if (appointment.musteriId && !session) throw new Error('Bağlı seans kaydı bulunamadı.');
  if (!session && (!newSessionId || state.records.some(record => record.id === newSessionId))) throw new Error('Geçersiz seans kimliği.');
  const record = validateRecord({
    ...(session || {}), id: session?.id || newSessionId,
    isim: appointment.isim, telefon: appointment.telefon, tarih: appointment.tarih,
    yas: fields.yas, kupaSayisi: fields.kupaSayisi, islemler: fields.islemler, status: 'completed',
  });
  return {
    ...state,
    records: session ? state.records.map(item => item.id === record.id ? record : item) : [record, ...state.records],
    appointments: state.appointments.map(item => item.id === appointmentId ? { ...item, musteriId: record.id, status: 'completed' } : item),
  };
}

export function removeCustomerAppointment(state, appointmentId) {
  const appointment = state.appointments.find(item => item.id === appointmentId);
  if (!appointment) return state;
  const appointments = state.appointments.filter(item => item.id !== appointmentId);
  return { ...state, appointments, records: state.records.filter(record =>
    record.id !== appointment.musteriId || isCompletedRecord(record) ||
    appointments.some(item => item.musteriId === record.id || item.customerRecordId === record.id)) };
}
