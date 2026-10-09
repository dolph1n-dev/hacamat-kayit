export function localDateKey(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Geçersiz tarih.');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function appointmentDate(dateKey, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('Geçersiz gün.');
  const [year, month, day] = dateKey.split('-').map(Number);
  const result = new Date(year, month - 1, day, time.getHours(), time.getMinutes(), 0, 0);
  if (localDateKey(result) !== dateKey) throw new Error('Geçersiz gün.');
  return result;
}

export function durationMinutes(value) {
  const match = String(value).trim().toLocaleLowerCase('tr-TR').match(/^(\d+(?:[.,]\d+)?)\s*(saat|sa|dakika|dk)$/);
  if (!match) throw new Error('Süreyi 1 Saat veya 30 dk biçiminde girin.');
  const minutes = Number(match[1].replace(',', '.')) * (['saat', 'sa'].includes(match[2]) ? 60 : 1);
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) throw new Error('Süre 1–1440 dakika arasında olmalıdır.');
  return minutes;
}

export function normalizePhone(value) {
  const raw = String(value || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (!raw.startsWith('+')) {
    if (/^0\d{10}$/.test(digits)) digits = '90' + digits.slice(1);
    else if (/^\d{10}$/.test(digits)) digits = '90' + digits;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error('Geçerli bir telefon numarası girin.');
  return '+' + digits;
}

export function hasConflict(appointments, start, minutes) {
  const end = start.getTime() + minutes * 60000;
  return appointments.some(item => {
    if (item.status === 'completed' || item.status === 'cancelled') return false;
    const other = new Date(item.tarih).getTime();
    // Legacy free-text durations default to one hour; do not rewrite old data.
    let duration = 60;
    try { duration = durationMinutes(item.sure); } catch {}
    return Number.isFinite(other) && start.getTime() < other + duration * 60000 && other < end;
  });
}

export function isCompletedRecord(record) {
  // Old versions did not have a status field. Preserve any record with session data.
  return record?.status === 'completed' || Boolean(String(record?.kupaSayisi || '').trim()) || Boolean(String(record?.islemler || '').trim());
}

export function validateRecord(record, allowDraft = false) {
  const name = String(record.isim || '').trim();
  const cups = String(record.kupaSayisi || '').trim();
  const age = String(record.yas || '').trim();
  if (!name) throw new Error('Müşteri ismi zorunludur.');
  if ((!allowDraft || cups) && (!/^\d+$/.test(cups) || Number(cups) < 1)) throw new Error('Kupa sayısı pozitif bir tam sayı olmalıdır.');
  if (age && (!/^\d+$/.test(age) || Number(age) > 130)) throw new Error('Yaş 0–130 arasında olmalıdır.');
  if (!Number.isFinite(new Date(record.tarih).getTime())) throw new Error('Geçersiz kayıt tarihi.');
  return { ...record, isim: name, telefon: String(record.telefon || '').trim() ? normalizePhone(record.telefon) : '', yas: age, kupaSayisi: cups, islemler: String(record.islemler || '').trim() };
}
