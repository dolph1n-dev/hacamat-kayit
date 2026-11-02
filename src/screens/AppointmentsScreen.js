import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Platform, Alert, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import uuid from 'react-native-uuid';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getAppointmentState, mutateAppointmentState } from '../utils/appointmentStorage';
import { localDateKey, appointmentDate, durationMinutes, normalizePhone, hasConflict } from '../utils/appointmentRules';
import { scheduleAppointmentNotifications, cancelAppointmentNotifications } from '../utils/notifications';
import KeyboardToolbar from '../components/KeyboardToolbar';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import CustomerSourceButtons from '../components/CustomerSourceButtons';
import { selectAppointments } from '../utils/appointmentList';
import { addCustomerAppointment, removeCustomerAppointment } from '../utils/appointmentCustomerState';

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
  const [listMode, setListMode] = useState('day');
  const [now, setNow] = useState(Date.now);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isim, setIsim] = useState('');
  const [telefon, setTelefon] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
  useFocusEffect(useCallback(() => {
    loadAppointments();
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [loadAppointments]));

  const selectCustomer = person => {
    if (busy.current) return;
    setIsim(person.isim); setTelefon(person.telefon);
    setSelectedCustomer(person.recordId || null);
  };
  const changeName = value => { if (!busy.current) { setIsim(value); setSelectedCustomer(null); } };
  const changePhone = value => { if (!busy.current) { setTelefon(value); setSelectedCustomer(null); } };
  const resetCustomerForm = () => {
    setIsim(''); setTelefon(''); setSelectedCustomer(null); setSure('1 Saat'); setShowTimePicker(false);
  };
  const closeAddModal = () => {
    if (busy.current) return;
    setIsAddModalVisible(false); resetCustomerForm();
  };
  const askForDraft = () => new Promise(resolve => {
    Alert.alert('Müşteri taslağı eklensin mi?', 'Bu yeni müşteri için Kayıtlar listesine bir taslak da eklensin mi? Hayır seçerseniz yalnızca randevu kaydedilir.', [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Hayır', onPress: () => resolve(false) },
      { text: 'Evet, Taslak Ekle', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });

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
      const addDraft = selectedCustomer ? false : await askForDraft();
      if (addDraft === null) return;
      const appointment = { id: uuid.v4(), isim: name, telefon: phone, tarih: date.toISOString(), sure: sure.trim(), durationMinutes: minutes, dateKey: selectedDate, status: 'scheduled' };
      const draftId = addDraft ? uuid.v4() : null;
      const next = await mutateAppointmentState(state => {
        if (date.getTime() <= Date.now()) throw new Error('Geçmiş zamana randevu oluşturulamaz.');
        if (hasConflict(state.appointments, date, minutes)) throw new Error('Bu saat aralığında başka bir randevu var.');
        return addCustomerAppointment(state, appointment, { savedRecordId: selectedCustomer, addDraft, draftId });
      });
      setAppointments(next.appointments);
      setIsAddModalVisible(false); resetCustomerForm();
      // The appointment is already persisted. Notification failure must not
      // make the user retry and accidentally create a duplicate appointment.
      let warning = '';
      try {
        const result = await scheduleAppointmentNotifications(name, appointment.tarih, appointment.id);
        if (!result.enabled) warning = ' Bildirim izni verilmedi; yerel hatırlatma kurulmadı.';
      } catch {
        warning = ' Yerel hatırlatma kurulamadı; randevu kaydedildi.';
      }
      Alert.alert('Randevu kaydedildi', (addDraft ? 'Müşteri kayıt taslağı da oluşturuldu.' : 'Müşteri listesine yeni taslak eklenmedi.') + warning);
    } catch (error) {
      Alert.alert('Randevu kaydedilemedi', error.message + ' Kayıtları kontrol ederek tekrar deneyin.');
    } finally { busy.current = false; setSaving(false); }
  };

  const handleDeleteAppointment = async appointment => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await mutateAppointmentState(state => removeCustomerAppointment(state, appointment.id));
      setAppointments(next.appointments); setIsDetailModalVisible(false);
      try { await cancelAppointmentNotifications(appointment.id); }
      catch { Alert.alert('Randevu silindi', 'Hatırlatma iptal edilemedi. Cihazda eski bir bildirim görünebilir.'); }
    } catch (error) { Alert.alert('Randevu silinemedi', error.message); }
    finally { busy.current = false; }
  };

  const visibleAppointments = selectAppointments(appointments, { mode: listMode, selectedDate, now });
  const listTitle = listMode === 'past' ? 'Geçmiş Randevular' : listMode === 'all' ? 'Tüm Randevular' : selectedDate + ' Randevuları';
  const emptyMessage = listMode === 'past' ? 'Saati geçmiş randevu bulunmuyor.' : listMode === 'all' ? 'Henüz randevu bulunmuyor.' : 'Bu tarihe ait randevu bulunmuyor.';
  const changeList = mode => { setNow(Date.now()); setListMode(mode); };
  const openNewAppointment = () => {
    if (listMode !== 'day') { setSelectedDate(localDateKey()); setListMode('day'); }
    resetCustomerForm(); setTime(new Date()); setIsAddModalVisible(true);
  };
  const markedDates = {};
  for (const item of appointments) {
    if (item.dateKey) markedDates[item.dateKey] = { marked: true, dotColor: colors.primary };
  }
  markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: colors.primary };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.listModes}>
        {[{ mode: 'day', label: 'Günlük Takvim' }, { mode: 'past', label: 'Geçmiş Randevular' }, { mode: 'all', label: 'Tüm Randevular' }].map(option => (
          <TouchableOpacity key={option.mode} accessibilityRole="button" accessibilityState={{ selected: listMode === option.mode }} style={[styles.modeButton, listMode === option.mode && styles.modeButtonSelected]} onPress={() => changeList(option.mode)}>
            <Text style={[styles.modeLabel, listMode === option.mode && styles.modeLabelSelected]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {listMode === 'day' && <Calendar firstDay={1} onDayPress={day => setSelectedDate(day.dateString)} markedDates={markedDates}
        theme={{ calendarBackground: colors.surface, textSectionTitleColor: colors.textSecondary, dayTextColor: colors.textPrimary, monthTextColor: colors.primary, arrowColor: colors.primary }} />}
      <View style={styles.listHeader}>
        <Text accessibilityRole="header" style={styles.title}>{listTitle} ({visibleAppointments.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNewAppointment}><Text style={styles.addBtnText}>+ Yeni</Text></TouchableOpacity>
      </View>
      <FlatList key={listMode} data={visibleAppointments} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => { setSelectedAppointment(item); setIsDetailModalVisible(true); }}>
            <View style={styles.cardInfo}>
              {listMode !== 'day' && <Text style={styles.cardDate}>{item.tarih && Number.isFinite(new Date(item.tarih).getTime()) ? new Date(item.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Tarih bilgisi yok'}</Text>}
              <Text style={styles.cardTime}>{item.tarih && Number.isFinite(new Date(item.tarih).getTime()) ? new Date(item.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</Text>
              <Text style={styles.cardName}>{item.isim}</Text><Text style={styles.cardPhone}>{item.telefon}</Text></View>
            <Text style={styles.cardDuration}>{item.sure}</Text>
          </TouchableOpacity>
        )} ListEmptyComponent={<Text style={styles.emptyText}>{emptyMessage}</Text>} />
      <AppointmentDetailModal visible={isDetailModalVisible} appointment={selectedAppointment} onClose={() => { setIsDetailModalVisible(false); loadAppointments(); }} onDelete={handleDeleteAppointment} />
      <Modal visible={isAddModalVisible} animationType="slide" transparent onRequestClose={closeAddModal}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}><ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <Text style={styles.modalTitle}>Yeni Randevu</Text>
          {isAddModalVisible && <CustomerSourceButtons includeSaved disabled={saving} onSelect={selectCustomer} />}
          <TextInput style={styles.input} placeholder="Müşteri İsmi" placeholderTextColor={colors.textSecondary} value={isim} editable={!saving} onChangeText={changeName} />
          <TextInput style={styles.input} placeholder="Telefon" keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} value={telefon} editable={!saving} onChangeText={changePhone} />
          <TextInput style={styles.input} placeholder="Süre (Örn: 1 Saat)" placeholderTextColor={colors.textSecondary} value={sure} editable={!saving} onChangeText={setSure} />
          <TouchableOpacity disabled={saving} style={styles.timeBtn} onPress={() => setShowTimePicker(true)}><Text style={styles.timeBtnText}>Saat Seç: {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text></TouchableOpacity>
          {showTimePicker && !saving && <DateTimePicker value={time} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_event, selectedTime) => { if (Platform.OS === 'android') setShowTimePicker(false); if (selectedTime instanceof Date) setTime(selectedTime); }} onDismiss={() => setShowTimePicker(false)} />}
          <View style={styles.btnRow}>
            <TouchableOpacity disabled={saving} style={[styles.btn, styles.cancelBtn]} onPress={closeAddModal}><Text style={styles.btnText}>İptal</Text></TouchableOpacity>
            <TouchableOpacity disabled={saving} style={[styles.btn, styles.saveBtn]} onPress={handleSaveAppointment}><Text style={styles.btnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text></TouchableOpacity>
          </View>
        </ScrollView><KeyboardToolbar /></View>
        </KeyboardAvoidingView></SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listModes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  modeButton: { flexGrow: 1, minWidth: 140, minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  modeButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  modeLabelSelected: { color: colors.background },
  cardInfo: { flex: 1, marginRight: 12 },
  cardDate: { color: colors.textSecondary, fontSize: 14, marginBottom: 6 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { flex: 1, marginRight: 12, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  addBtn: { minHeight: 44, justifyContent: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cardTime: { color: colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  cardPhone: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  cardDuration: { color: colors.textSecondary, fontSize: 14 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 20 },
  modalSafe: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, padding: 24, borderRadius: 16, maxHeight: '100%', flexShrink: 1 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: colors.inputBackground, color: colors.textPrimary, padding: 14, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  timeBtn: { backgroundColor: colors.inputBackground, padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  timeBtnText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: colors.border }, saveBtn: { backgroundColor: colors.primary },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
