import { normalizePhone } from './appointmentRules';

export function contactSelection(contact) {
  if (!contact) return null; // Native picker cancelled: leave the form alone.
  const isim = String(contact.name || [contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(' ') || contact.company || '').trim();
  const phones = new Map();
  for (const entry of contact.phoneNumbers || []) {
    const raw = String(entry.number || entry.digits || '').trim();
    if (!raw) continue;
    // Keep unusual numbers editable rather than silently discarding them.
    let telefon = raw;
    try { telefon = normalizePhone(raw); } catch {}
    if (!phones.has(telefon)) phones.set(telefon, { telefon, label: String(entry.label || 'Telefon') });
  }
  return { isim, phones: [...phones.values()] };
}

// Records are sessions, not unique customers. Show each normalized phone once,
// using its latest session name; never reuse a historical session as a draft.
export function savedCustomerChoices(records) {
  const unique = new Map();
  const sorted = [...records].filter(record => record && record.id).sort((a, b) => (Date.parse(b.tarih) || 0) - (Date.parse(a.tarih) || 0));
  for (const record of sorted) {
    const isim = String(record.isim || '').trim();
    if (!isim) continue;
    let telefon = String(record.telefon || '').trim();
    try { if (telefon) telefon = normalizePhone(telefon); } catch {}
    const key = telefon ? 'phone:' + telefon : 'record:' + record.id;
    if (!unique.has(key)) unique.set(key, { id: key, isim, telefon });
  }
  return [...unique.values()].sort((a, b) => a.isim.localeCompare(b.isim, 'tr'));
}

export function filterCustomers(customers, query) {
  const text = query.trim().toLocaleLowerCase('tr-TR');
  const digits = text.replace(/\D/g, '');
  return customers.filter(customer => customer.isim.toLocaleLowerCase('tr-TR').includes(text) ||
    (digits.length > 0 && customer.telefon.replace(/\D/g, '').includes(digits)));
}
