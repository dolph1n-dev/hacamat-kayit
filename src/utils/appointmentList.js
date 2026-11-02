import { localDateKey } from './appointmentRules';

function timestamp(appointment) {
  return appointment?.tarih ? new Date(appointment.tarih).getTime() : NaN;
}

// Only derive the display list. Never rewrite or remove stored appointments.
// All/past views are newest first; the selected day remains earliest first.
export function selectAppointments(appointments, { mode = 'day', selectedDate, now = Date.now() } = {}) {
  const result = (Array.isArray(appointments) ? appointments : []).filter(item => {
    if (!item || typeof item !== 'object') return false;
    const time = timestamp(item);
    if (mode === 'all') return true;
    if (mode === 'past') return Number.isFinite(time) && time < Number(now);
    const day = item.dateKey || (Number.isFinite(time) ? localDateKey(time) : null);
    return Boolean(selectedDate) && day === selectedDate;
  });
  return result.sort((a, b) => {
    const first = timestamp(a), second = timestamp(b);
    // Keep undated legacy entries discoverable at the end of All appointments.
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
    if (!Number.isFinite(second)) return -1;
    return mode === 'day' ? first - second : second - first;
  });
}
