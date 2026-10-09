import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import KeyboardToolbar from './KeyboardToolbar';
import { getAppointmentState, mutateAppointmentState } from '../utils/appointmentStorage';
import { normalizePhone, validateRecord } from '../utils/appointmentRules';
import { cancelAppointmentNotifications } from '../utils/notifications';

export default function AppointmentDetailModal({ visible, appointment, onClose, onDelete }) {
  const [yas, setYas] = useState('');
  const [kupaSayisi, setKupaSayisi] = useState('');
  const [islemler, setIslemler] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    setYas(''); setKupaSayisi(''); setIslemler('');
    if (appointment && visible) {
      getAppointmentState().then(state => {
        if (!active) return;
        const draft = state.records.find(record => record.id === appointment.musteriId);
        if (draft) { setYas(draft.yas || ''); setKupaSayisi(draft.kupaSayisi || ''); setIslemler(draft.islemler || ''); }
      }).catch(error => { if (active) Alert.alert('Seans okunamadı', error.message); });
    }
    return () => { active = false; };
  }, [appointment, visible]);

  const sendMessage = async channel => {
    try {
      const phone = normalizePhone(appointment.telefon);
      const date = new Date(appointment.tarih);
      const when = `${date.toLocaleDateString('tr-TR')} saat ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
      const message = encodeURIComponent(`Merhaba ${appointment.isim}, ${when} randevunuzu hatırlatmak isteriz. Sağlıklı günler dileriz.`);
      // HTTPS avoids the iOS canOpenURL scheme allow-list requirement.
      const url = channel === 'whatsapp' ? 'https://wa.me/' + phone.slice(1) + '?text=' + message : `sms:${phone}${Platform.OS === 'ios' ? '&' : '?'}body=${message}`;
      await Linking.openURL(url);
    } catch (error) { Alert.alert('Mesaj açılamadı', error.message || 'Mesaj uygulamasını kontrol edin.'); }
  };

  const handleSave = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true);
    try {
      await mutateAppointmentState(state => {
        const draft = state.records.find(record => record.id === appointment.musteriId);
        if (!draft || !state.appointments.some(item => item.id === appointment.id)) throw new Error('Bağlı randevu veya seans kaydı bulunamadı.');
        const record = validateRecord({ ...draft, yas, kupaSayisi, islemler, status: 'completed' });
        return {
          records: state.records.map(item => item.id === record.id ? record : item),
          appointments: state.appointments.map(item => item.id === appointment.id ? { ...item, status: 'completed' } : item),
        };
      });
      let warning = '';
      try { await cancelAppointmentNotifications(appointment.id); }
      catch { warning = ' Eski hatırlatma iptal edilemedi.'; }
      Alert.alert('Başarılı', 'Seans tamamlandı ve müşteri bilgileri güncellendi.' + warning);
      onClose();
    } catch (error) { Alert.alert('Seans kaydedilemedi', error.message); }
    finally { busy.current = false; setSaving(false); }
  };
  const handleCancelAppointment = () => Alert.alert('Randevuyu İptal Et', 'Randevu kaldırılır. Boş taslak silinir; tamamlanmış seans bilgileri korunur.', [
    { text: 'Vazgeç', style: 'cancel' }, { text: 'Evet, İptal Et', style: 'destructive', onPress: () => onDelete(appointment) },
  ]);
  if (!appointment) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { if (!saving) onClose(); }}>
      <View style={styles.modalOverlay}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.modalContent}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Randevu & Seans Detayı</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Müşteri: <Text style={styles.bold}>{appointment.isim}</Text></Text>
            <Text style={styles.infoText}>Saat: <Text style={styles.bold}>{new Date(appointment.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text></Text>
            <Text style={styles.infoText}>Süre: <Text style={styles.bold}>{appointment.sure}</Text></Text>
            <Text style={styles.infoText}>Telefon: <Text style={styles.bold}>{appointment.telefon || 'Kayıtlı Değil'}</Text></Text>
          </View>
          <View style={styles.contactRow}>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#25D366' }]} onPress={() => sendMessage('whatsapp')}><Ionicons name="logo-whatsapp" size={20} color="#FFF" /><Text style={styles.contactBtnText}>WhatsApp</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#3B82F6' }]} onPress={() => sendMessage('sms')}><Ionicons name="chatbubble-ellipses" size={20} color="#FFF" /><Text style={styles.contactBtnText}>SMS Gönder</Text></TouchableOpacity>
          </View>
          <View style={styles.divider} /><Text style={styles.sectionTitle}>Seans Bilgileri</Text>
          <View style={styles.row}>
            <View style={styles.halfCol}><Text style={styles.label}>Yaş</Text><TextInput style={styles.input} value={yas} onChangeText={setYas} keyboardType="numeric" placeholder="Örn: 34" placeholderTextColor={colors.textSecondary} /></View>
            <View style={styles.halfCol}><Text style={styles.label}>Kupa Sayısı</Text><TextInput style={styles.input} value={kupaSayisi} onChangeText={setKupaSayisi} keyboardType="numeric" placeholder="Örn: 7" placeholderTextColor={colors.textSecondary} /></View>
          </View>
          <Text style={styles.label}>Yapılan İşlemler</Text><TextInput style={[styles.input, styles.textArea]} value={islemler} onChangeText={setIslemler} multiline placeholder="Örn: Sırt ve boyun bölgesine tarama hacamatı yapıldı." placeholderTextColor={colors.textSecondary} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity disabled={saving} style={[styles.btn, styles.btnDanger]} onPress={handleCancelAppointment}><Text style={styles.btnText}>İptal Et</Text></TouchableOpacity>
            <TouchableOpacity disabled={saving} style={[styles.btn, styles.btnSave]} onPress={handleSave}><Text style={styles.btnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text></TouchableOpacity>
          </View>
          <TouchableOpacity disabled={saving} style={styles.btnCloseTop} onPress={onClose}><Text style={styles.btnCloseText}>Kapat</Text></TouchableOpacity>
        </ScrollView></View><KeyboardToolbar />
      </KeyboardAvoidingView></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
  keyboardView: { width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 24, maxHeight: '90%' },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  infoBox: { backgroundColor: colors.inputBackground, padding: 14, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.textSecondary, fontSize: 15, marginBottom: 4 }, bold: { color: colors.textPrimary, fontWeight: 'bold' },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, marginHorizontal: 4 },
  contactBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  label: { color: colors.textSecondary, marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: colors.inputBackground, color: colors.textPrimary, padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between' }, halfCol: { width: '48%' }, textArea: { minHeight: 90, textAlignVertical: 'top' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  btn: { padding: 14, borderRadius: 8, alignItems: 'center' }, btnSave: { backgroundColor: colors.primary, flex: 2, marginLeft: 10 },
  btnDanger: { backgroundColor: colors.danger, flex: 1 }, btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCloseTop: { marginTop: 16, alignItems: 'center', padding: 8 }, btnCloseText: { color: colors.textSecondary, fontSize: 15 },
});
