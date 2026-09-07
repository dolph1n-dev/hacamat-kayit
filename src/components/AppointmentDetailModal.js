import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { colors } from '../theme/colors';
import KeyboardToolbar from './KeyboardToolbar';
import { getRecords, saveRecords } from '../utils/storage';

export default function AppointmentDetailModal({ visible, appointment, onClose, onDelete }) {
  const [yas, setYas] = useState('');
  const [kupaSayisi, setKupaSayisi] = useState('');
  const [islemler, setIslemler] = useState('');

  // Modal açıldığında taslak müşteri kaydını bul ve state'lere doldur (daha önce girilmiş veri varsa görünsün)
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

  const handleSave = async () => {
    if (!kupaSayisi) {
      Alert.alert('Eksik Bilgi', 'Seansı tamamlamak için en azından Kupa Sayısı girilmelidir.');
      return;
    }

    const records = await getRecords();
    
    // İlgili müşteriyi bul ve yeni verilerle güncelle
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
              
              <Text style={styles.modalTitle}>Seansı Tamamla</Text>
              
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Müşteri: <Text style={styles.bold}>{appointment.isim}</Text></Text>
                <Text style={styles.infoText}>Süre: <Text style={styles.bold}>{appointment.sure}</Text></Text>
              </View>

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
                placeholder="Örn: Sırt bölgesine tarama hacamatı yapıldı."
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
  infoBox: { backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.textSecondary, fontSize: 16, marginBottom: 4 },
  bold: { color: colors.textPrimary, fontWeight: 'bold' },
  label: { color: colors.textSecondary, marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: colors.inputBackground, color: colors.textPrimary, padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCol: { width: '48%' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btn: { padding: 14, borderRadius: 8, alignItems: 'center' },
  btnSave: { backgroundColor: colors.primary, flex: 2, marginLeft: 10 },
  btnDanger: { backgroundColor: colors.danger, flex: 1 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCloseTop: { marginTop: 20, alignItems: 'center', padding: 10 },
  btnCloseText: { color: colors.textSecondary, fontSize: 16 }
});