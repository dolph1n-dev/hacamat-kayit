import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert, 
  Linking 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import KeyboardToolbar from './KeyboardToolbar';
import { getRecords, saveRecords } from '../utils/storage';

export default function AppointmentDetailModal({ visible, appointment, onClose, onDelete }) {
  const [yas, setYas] = useState('');
  const [kupaSayisi, setKupaSayisi] = useState('');
  const [islemler, setIslemler] = useState('');

  useEffect(() => {
    if (appointment && visible) {
      loadDraftRecord();
    }
  }, [appointment, visible]);

  const loadDraftRecord = async () => {
    const records = await getRecords();
    const draftRecord = records.find(r => r.id === appointment.musteriId);
    
    if (draftRecord) {
      setYas(draftRecord.yas || '');
      setKupaSayisi(draftRecord.kupaSayisi || '');
      setIslemler(draftRecord.islemler || '');
    }
  };

  const sendWhatsApp = async () => {
    if (!appointment?.telefon) {
      Alert.alert('Hata', 'Bu müşterinin kayıtlı bir telefon numarası bulunamadı.');
      return;
    }

    let cleanPhone = appointment.telefon.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('90')) {
      cleanPhone = '90' + cleanPhone;
    }

    const saat = new Date(appointment.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const mesaj = `Merhaba ${appointment.isim}, bugün saat ${saat}'teki hacamat randevunuzu hatırlatmak isteriz. Sağlıklı günler dileriz.`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(mesaj)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mesaj)}`);
      }
    } catch (error) {
      Alert.alert('Hata', 'WhatsApp uygulaması açılamadı.');
    }
  };

  const sendSMS = async () => {
    if (!appointment?.telefon) {
      Alert.alert('Hata', 'Bu müşterinin kayıtlı bir telefon numarası bulunamadı.');
      return;
    }

    const saat = new Date(appointment.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const mesaj = `Merhaba ${appointment.isim}, bugün saat ${saat}'teki hacamat randevunuzu hatırlatmak isteriz. Sağlıklı günler dileriz.`;
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${appointment.telefon}${separator}body=${encodeURIComponent(mesaj)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Hata', 'SMS uygulaması açılamadı.');
    }
  };

  const handleSave = async () => {
    if (!kupaSayisi) {
      Alert.alert('Eksik Bilgi', 'Seansı tamamlamak için en azından Kupa Sayısı girilmelidir.');
      return;
    }

    const records = await getRecords();
    const updatedRecords = records.map(r => {
      if (r.id === appointment.musteriId) {
        return { ...r, yas, kupaSayisi, islemler };
      }
      return r;
    });

    await saveRecords(updatedRecords);
    Alert.alert('Başarılı', 'Seans tamamlandı ve müşteri bilgileri güncellendi.');
    onClose();
  };

  const handleCancelAppointment = () => {
    Alert.alert(
      "Randevuyu İptal Et",
      "Bu randevuyu ve oluşturulan taslak müşteri kaydını silmek istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Evet, İptal Et", style: "destructive", onPress: () => onDelete(appointment) }
      ]
    );
  };

  if (!appointment) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <Text style={styles.modalTitle}>Randevu & Seans Detayı</Text>
              
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Müşteri: <Text style={styles.bold}>{appointment.isim}</Text></Text>
                <Text style={styles.infoText}>Saat: <Text style={styles.bold}>{new Date(appointment.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text></Text>
                <Text style={styles.infoText}>Süre: <Text style={styles.bold}>{appointment.sure}</Text></Text>
                <Text style={styles.infoText}>Telefon: <Text style={styles.bold}>{appointment.telefon || 'Kayıtlı Değil'}</Text></Text>
              </View>

              <View style={styles.contactRow}>
                <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#25D366' }]} onPress={sendWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                  <Text style={styles.contactBtnText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#3B82F6' }]} onPress={sendSMS}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                  <Text style={styles.contactBtnText}>SMS Gönder</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Seans Bilgileri</Text>

              <View style={styles.row}>
                <View style={styles.halfCol}>
                  <Text style={styles.label}>Yaş</Text>
                  <TextInput
                    style={styles.input}
                    value={yas}
                    onChangeText={setYas}
                    keyboardType="numeric"
                    placeholder="Örn: 34"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfCol}>
                  <Text style={styles.label}>Kupa Sayısı</Text>
                  <TextInput
                    style={styles.input}
                    value={kupaSayisi}
                    onChangeText={setKupaSayisi}
                    keyboardType="numeric"
                    placeholder="Örn: 7"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <Text style={styles.label}>Yapılan İşlemler</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={islemler}
                onChangeText={setIslemler}
                multiline
                placeholder="Örn: Sırt ve boyun bölgesine tarama hacamatı yapıldı."
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleCancelAppointment}>
                  <Text style={styles.btnText}>İptal Et</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
                  <Text style={styles.btnText}>Kaydet</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.btnCloseTop} onPress={onClose}>
                <Text style={styles.btnCloseText}>Kapat</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
          <KeyboardToolbar />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
  keyboardView: { width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 24, maxHeight: '90%' },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  infoBox: { backgroundColor: colors.inputBackground, padding: 14, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.textSecondary, fontSize: 15, marginBottom: 4 },
  bold: { color: colors.textPrimary, fontWeight: 'bold' },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, marginHorizontal: 4 },
  contactBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  label: { color: colors.textSecondary, marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: colors.inputBackground, color: colors.textPrimary, padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCol: { width: '48%' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  btn: { padding: 14, borderRadius: 8, alignItems: 'center' },
  btnSave: { backgroundColor: colors.primary, flex: 2, marginLeft: 10 },
  btnDanger: { backgroundColor: colors.danger, flex: 1 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCloseTop: { marginTop: 16, alignItems: 'center', padding: 8 },
  btnCloseText: { color: colors.textSecondary, fontSize: 15 }
});