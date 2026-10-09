import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import uuid from 'react-native-uuid';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getAppointmentState, mutateAppointmentState } from '../utils/appointmentStorage';
import { localDateKey, appointmentDate, durationMinutes, normalizePhone, hasConflict, isCompletedRecord } from '../utils/appointmentRules';
import { scheduleAppointmentNotifications, cancelAppointmentNotifications } from '../utils/notifications';
import KeyboardToolbar from '../components/KeyboardToolbar';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

LocaleConfig.locales.tr = {
  monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'], today: 'Bugün',
};
LocaleConfig.defaultLocale = 'tr';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isim, setIsim] = useState('');
  const [telefon, setTelefon] = useState('');
  const [sure, setSure] = useState('1 Saat');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const loadAppointments = useCallback(async () => {
    try { setAppointments((await getAppointmentState()).appointments); }
    catch (error) { Alert.alert('Veri okunamadı', error.message); }
  }, []);
  useFocusEffect(useCallback(() => { loadAppointments(); }, [loadAppointments]));

  const handleSaveAppointment = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true);
    try {
      const name = isim.trim();
      if (!name) throw new Error('Müşteri ismi zorunludur.');
      const phone = normalizePhone(telefon);
      const minutes = durationMinutes(sure);
      const date = appointmentDate(selectedDate, time);
      if (date.getTime() <= Date.now()) throw new Error('Geçmiş zamana randevu oluşturulamaz.');
      const musteriId = uuid.v4();
      const appointment = { id: uuid.v4(), musteriId, isim: name, telefon: phone, tarih: date.toISOString(), sure: sure.trim(), durationMinutes: minutes, dateKey: selectedDate, status: 'scheduled' };
      const draft = { id: musteriId, isim: name, telefon: phone, yas: '', kupaSayisi: '', islemler: '', tarih: date.toISOString(), status: 'draft' };
      const next = await mutateAppointmentState(state => {
        if (hasConflict(state.appointments, date, minutes)) throw new Error('Bu saat aralığında başka bir randevu var.');
        return { records: [draft, ...state.records], appointments: [...state.appointments, appointment] };
      });
      setAppointments(next.appointments);
      setIsAddModalVisible(false); setShowTimePicker(false);
      setIsim(''); setTelefon(''); setSure('1 Saat');
      // The appointment is already persisted. Notification failure must not
      // make the user retry and accidentally create a duplicate appointment.
      let warning = '';
      try {
        const result = await scheduleAppointmentNotifications(name, appointment.tarih, appointment.id);
        if (!result.enabled) warning = ' Bildirim izni verilmedi; yerel hatırlatma kurulmadı.';
      } catch {
        warning = ' Yerel hatırlatma kurulamadı; randevu kaydedildi.';
      }
      Alert.alert('Randevu kaydedildi', 'Müşteri kayıt taslağı oluşturuldu.' + warning);
    } catch (error) {
      Alert.alert('Randevu kaydedilemedi', error.message + ' Kayıtları kontrol ederek tekrar deneyin.');
    } finally { busy.current = false; setSaving(false); }
  };

  const handleDeleteAppointment = async appointment => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await mutateAppointmentState(state => ({
        appointments: state.appointments.filter(item => item.id !== appointment.id),
        records: state.records.filter(record => record.id !== appointment.musteriId || isCompletedRecord(record)),
      }));
      setAppointments(next.appointments); setIsDetailModalVisible(false);
      try { await cancelAppointmentNotifications(appointment.id); }
      catch { Alert.alert('Randevu silindi', 'Hatırlatma iptal edilemedi. Cihazda eski bir bildirim görünebilir.'); }
    } catch (error) { Alert.alert('Randevu silinemedi', error.message); }
    finally { busy.current = false; }
  };

  const dayAppointments = appointments.filter(item => item.dateKey === selectedDate).sort((a, b) => new Date(a.tarih) - new Date(b.tarih));
  const markedDates = {};
  for (const item of appointments) {
    if (item.dateKey) markedDates[item.dateKey] = { marked: true, dotColor: colors.primary };
  }
  markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: colors.primary };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Calendar onDayPress={day => setSelectedDate(day.dateString)} markedDates={markedDates}
        theme={{ calendarBackground: colors.surface, textSectionTitleColor: colors.textSecondary, dayTextColor: colors.textPrimary, monthTextColor: colors.primary, arrowColor: colors.primary }} />
      <View style={styles.listHeader}>
        <Text style={styles.title}>{selectedDate} Randevuları</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setTime(new Date()); setIsAddModalVisible(true); }}><Text style={styles.addBtnText}>+ Yeni</Text></TouchableOpacity>
      </View>
      <FlatList data={dayAppointments} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => { setSelectedAppointment(item); setIsDetailModalVisible(true); }}>
            <View><Text style={styles.cardTime}>{new Date(item.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
              <Text style={styles.cardName}>{item.isim}</Text><Text style={styles.cardPhone}>{item.telefon}</Text></View>
            <Text style={styles.cardDuration}>{item.sure}</Text>
          </TouchableOpacity>
        )} ListEmptyComponent={<Text style={styles.emptyText}>Bu tarihe ait randevu bulunmuyor.</Text>} />
      <AppointmentDetailModal visible={isDetailModalVisible} appointment={selectedAppointment} onClose={() => { setIsDetailModalVisible(false); loadAppointments(); }} onDelete={handleDeleteAppointment} />
      <Modal visible={isAddModalVisible} animationType="slide" transparent onRequestClose={() => { if (!saving) { setIsAddModalVisible(false); setShowTimePicker(false); } }}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Yeni Randevu</Text>
          <TextInput style={styles.input} placeholder="Müşteri İsmi" placeholderTextColor={colors.textSecondary} value={isim} onChangeText={setIsim} />
          <TextInput style={styles.input} placeholder="Telefon" keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} value={telefon} onChangeText={setTelefon} />
          <TextInput style={styles.input} placeholder="Süre (Örn: 1 Saat)" placeholderTextColor={colors.textSecondary} value={sure} onChangeText={setSure} />
          <TouchableOpacity style={styles.timeBtn} onPress={() => setShowTimePicker(true)}><Text style={styles.timeBtnText}>Saat Seç: {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text></TouchableOpacity>
          {showTimePicker && <DateTimePicker value={time} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_event, selectedTime) => { if (Platform.OS === 'android') setShowTimePicker(false); if (selectedTime instanceof Date) setTime(selectedTime); }} onDismiss={() => setShowTimePicker(false)} />}
          <View style={styles.btnRow}>
            <TouchableOpacity disabled={saving} style={[styles.btn, styles.cancelBtn]} onPress={() => { setIsAddModalVisible(false); setShowTimePicker(false); }}><Text style={styles.btnText}>İptal</Text></TouchableOpacity>
            <TouchableOpacity disabled={saving} style={[styles.btn, styles.saveBtn]} onPress={handleSaveAppointment}><Text style={styles.btnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text></TouchableOpacity>
          </View>
        </View><KeyboardToolbar /></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cardTime: { color: colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  cardPhone: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  cardDuration: { color: colors.textSecondary, fontSize: 14 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: colors.inputBackground, color: colors.textPrimary, padding: 14, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  timeBtn: { backgroundColor: colors.inputBackground, padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  timeBtnText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: colors.border }, saveBtn: { backgroundColor: colors.primary },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
