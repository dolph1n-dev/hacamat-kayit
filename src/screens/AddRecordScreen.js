import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import * as Contacts from 'expo-contacts/legacy';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { mutateAppointmentState } from '../utils/appointmentStorage';
import { validateRecord } from '../utils/appointmentRules';
import KeyboardToolbar from '../components/KeyboardToolbar';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddRecordScreen() {
  const [isim, setIsim] = useState('');
  const [telefon, setTelefon] = useState('');
  const [yas, setYas] = useState('');
  const [kupaSayisi, setKupaSayisi] = useState('');
  const [islemler, setIslemler] = useState('');
  const [tarih, setTarih] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const kaydet = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true);
    try {
      const record = validateRecord({ id: uuid.v4(), isim, telefon, yas, kupaSayisi, islemler, tarih: tarih.toISOString(), status: 'completed' });
      await mutateAppointmentState(state => ({ ...state, records: [record, ...state.records] }));
      Alert.alert('Başarılı', 'Kayıt başarıyla uygulamaya eklendi.');
      setIsim(''); setTelefon(''); setYas(''); setKupaSayisi(''); setIslemler(''); setTarih(new Date());
    } catch (error) { Alert.alert('Kayıt eklenemedi', error.message); }
    finally { busy.current = false; setSaving(false); }
  };

  const rehbereEkle = async () => {
    if (!isim.trim() || !telefon.trim()) {
      Alert.alert('Eksik Bilgi', 'Rehbere eklemek için isim ve telefon numarası alanlarını doldurmalısınız.');
      return;
    }
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Rehbere kişi ekleyebilmek için izin vermeniz gerekmektedir.');
        return;
      }
      await Contacts.presentFormAsync(null, {
        [Contacts.Fields.FirstName]: isim.trim(),
        [Contacts.Fields.PhoneNumbers]: [{ label: 'cep', number: telefon.trim() }],
      });
    } catch { Alert.alert('Hata', 'Rehber ekranı açılamadı.'); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Yeni Müşteri</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateBtnText}>Kayıt Tarihi: {tarih.toLocaleDateString('tr-TR')}</Text>
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={tarih} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_event, selectedDate) => { if (Platform.OS === 'android') setShowDatePicker(false); if (selectedDate instanceof Date) setTarih(selectedDate); }}
            onDismiss={() => setShowDatePicker(false)} />}
          <TextInput style={styles.input} placeholder="Müşteri İsmi" placeholderTextColor={colors.textSecondary} value={isim} onChangeText={setIsim} />
          <View style={styles.phoneContainer}>
            <TextInput style={[styles.input, styles.phoneInput]} placeholder="Telefon Numarası" placeholderTextColor={colors.textSecondary} value={telefon} onChangeText={setTelefon} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.contactBtn} onPress={rehbereEkle}><Ionicons name="person-add" size={20} color="#FFF" /><Text style={styles.contactBtnText}>Rehbere Ekle</Text></TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="Yaş" placeholderTextColor={colors.textSecondary} value={yas} onChangeText={setYas} keyboardType="numeric" />
            <TextInput style={[styles.input, styles.half]} placeholder="Kupa Sayısı" placeholderTextColor={colors.textSecondary} value={kupaSayisi} onChangeText={setKupaSayisi} keyboardType="numeric" />
          </View>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Yapılan İşlemler (Örn: Sırt, omuz)" placeholderTextColor={colors.textSecondary} value={islemler} onChangeText={setIslemler} multiline />
          <TouchableOpacity disabled={saving} style={styles.button} onPress={kaydet}><Text style={styles.buttonText}>{saving ? 'Kaydediliyor…' : 'Uygulamaya Kaydet'}</Text></TouchableOpacity>
        </ScrollView>
        <KeyboardToolbar />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 24 },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  phoneContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  phoneInput: { flex: 1, marginBottom: 0, marginRight: 10 },
  contactBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12 },
  contactBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' }, half: { width: '48%' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  button: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  dateBtnText: { color: colors.textPrimary, fontSize: 16, marginLeft: 10 },
});
