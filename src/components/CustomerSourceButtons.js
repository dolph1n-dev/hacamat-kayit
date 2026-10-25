import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert, Platform, Linking, Keyboard } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getAppointmentState } from '../utils/appointmentStorage';
import { contactSelection, savedCustomerChoices, filterCustomers } from '../utils/customerSelection';

export default function CustomerSourceButtons({ onSelect, includeSaved = false, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [contact, setContact] = useState(null);
  const [query, setQuery] = useState('');
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const choose = person => {
    if (!active.current || disabled) return;
    onSelect({ isim: person.isim, telefon: person.telefon || '' });
    setPanel(null); setContact(null); setQuery('');
    if (!person.telefon) Alert.alert('Telefon bulunamadı', 'İsim aktarıldı. Telefon numarasını elle girebilirsiniz.');
  };
  const run = async action => {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); Keyboard.dismiss();
    try { await action(); }
    catch (error) { if (active.current) Alert.alert('Kişi seçilemedi', error.message || 'Lütfen tekrar deneyin.'); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  };
  const fromContacts = () => run(async () => {
    if (Platform.OS === 'web') throw new Error('Telefon rehberi Android ve iOS cihazlarda kullanılabilir.');
    // The iOS system picker grants access to the selected person only.
    // Android's legacy picker requires READ_CONTACTS permission first.
    if (Platform.OS === 'android') {
      let permission = await Contacts.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain !== false) permission = await Contacts.requestPermissionsAsync();
      if (!active.current) return;
      if (!permission.granted) {
        Alert.alert('Rehber izni gerekli', 'Rehberden seçim yapmak için kişiler iznini açın. Elle giriş yapmaya devam edebilirsiniz.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Ayarları Aç', onPress: () => { Linking.openSettings().catch(() => Alert.alert('Ayarlar açılamadı', 'Cihaz ayarlarından kişiler iznini açabilirsiniz.')); } },
        ]);
        return;
      }
    }
    if (!active.current) return;
    const selected = contactSelection(await Contacts.presentContactPickerAsync());
    if (!active.current || !selected) return;
    if (selected.phones.length <= 1) choose({ isim: selected.isim, telefon: selected.phones[0]?.telefon || '' });
    else { setContact(selected); setPanel('phones'); }
  });
  const fromSaved = () => run(async () => {
    const state = await getAppointmentState();
    if (!active.current) return;
    setCustomers(savedCustomerChoices(state.records)); setQuery(''); setPanel('customers');
  });
  const matches = filterCustomers(customers, query);

  return (
    <View style={styles.container}>
      <TouchableOpacity accessibilityRole="button" disabled={disabled || busy} style={[styles.source, (disabled || busy) && styles.disabled]} onPress={fromContacts}>
        <Ionicons name="people-outline" size={20} color={colors.textPrimary} /><Text style={styles.sourceText}>{busy ? 'Açılıyor…' : 'Rehberden Seç'}</Text>
      </TouchableOpacity>
      {includeSaved && <TouchableOpacity accessibilityRole="button" disabled={disabled || busy} style={[styles.source, (disabled || busy) && styles.disabled]} onPress={fromSaved}>
        <Ionicons name="person-circle-outline" size={20} color={colors.textPrimary} /><Text style={styles.sourceText}>Kayıtlı Müşteriden Seç</Text>
      </TouchableOpacity>}
      {panel && <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.heading}>{panel === 'phones' ? 'Telefon Numarası Seç' : 'Kayıtlı Müşteriler'}</Text>
        {panel === 'customers' && <TextInput accessibilityLabel="Kayıtlı müşterilerde isim veya telefon ara" style={styles.search} placeholder="İsim veya telefon ara" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery} />}
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.list}>
          {panel === 'phones' ? contact?.phones.map(phone => <TouchableOpacity accessibilityRole="button" disabled={disabled} key={phone.telefon} style={styles.item} onPress={() => choose({ isim: contact.isim, telefon: phone.telefon })}>
            <Text style={styles.name}>{contact.isim || 'İsimsiz kişi'} · {phone.label}</Text><Text style={styles.phone}>{phone.telefon}</Text>
          </TouchableOpacity>) : matches.map(person => <TouchableOpacity accessibilityRole="button" disabled={disabled} key={person.id} style={styles.item} onPress={() => choose(person)}>
            <Text style={styles.name}>{person.isim}</Text><Text style={styles.phone}>{person.telefon || 'Telefon kayıtlı değil'}</Text>
          </TouchableOpacity>)}
          {panel === 'customers' && !matches.length && <Text style={styles.empty}>{customers.length ? 'Aramaya uygun müşteri bulunamadı.' : 'Henüz kayıtlı müşteri yok. Rehberden seçebilir veya elle girebilirsiniz.'}</Text>}
        </ScrollView>
        <TouchableOpacity accessibilityRole="button" style={styles.close} onPress={() => setPanel(null)}><Text style={styles.sourceText}>Seçimi Kapat</Text></TouchableOpacity>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  source: { minHeight: 48, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground },
  sourceText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', flexShrink: 1, marginLeft: 8 },
  disabled: { opacity: 0.5 }, panel: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 },
  heading: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  search: { minHeight: 48, backgroundColor: colors.inputBackground, color: colors.textPrimary, fontSize: 16, padding: 12, marginBottom: 8, borderRadius: 8 },
  list: { maxHeight: 220 }, item: { minHeight: 64, justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { color: colors.textPrimary, fontSize: 16 }, phone: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  empty: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, paddingVertical: 12 },
  close: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
