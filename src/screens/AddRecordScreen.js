import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import * as Contacts from 'expo-contacts/legacy';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getRecords, saveRecords } from '../utils/storage';
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

  // Sadece uygulamaya kaydetme işlemi
  const kaydet = async () => {
    if (!isim || !kupaSayisi) {
      Alert.alert('Eksik Bilgi', 'İsim ve Kupa Sayısı zorunludur.');
      return;
    }

    const yeniKayit = { 
      id: uuid.v4(), 
      isim, 
      telefon, 
      yas, 
      kupaSayisi, 
      islemler, 
      tarih: tarih.toISOString()
    };
    
    const mevcutKayitlar = await getRecords();
    await saveRecords([yeniKayit, ...mevcutKayitlar]);

    Alert.alert('Başarılı', 'Kayıt başarıyla uygulamaya eklendi.');
    // Formu temizle
    setIsim(''); setTelefon(''); setYas(''); setKupaSayisi(''); setIslemler('');
  };

  // Telefonun kendi rehber ekranını açma işlemi
  const rehbereEkle = async () => {
    if (!isim || !telefon) {
      Alert.alert('Eksik Bilgi', 'Rehbere eklemek için isim ve telefon numarası alanlarını doldurmalısınız.');
      return;
    }

    // Rehber erişim izni iste
    const { status } = await Contacts.requestPermissionsAsync();
    
    if (status === 'granted') {
      try {
        // Native kişi ekleme formunu önceden doldurulmuş şekilde aç
        const contact = {
          [Contacts.Fields.FirstName]: isim,
          [Contacts.Fields.PhoneNumbers]: [{
            label: 'cep',
            number: telefon,
          }],
        };
        
        await Contacts.presentFormAsync(null, contact);
      } catch (error) {
        Alert.alert('Hata', 'Rehber ekranı açılamadı.');
        console.error(error);
      }
    } else {
      Alert.alert('İzin Gerekli', 'Rehbere kişi ekleyebilmek için izin vermeniz gerekmektedir.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Yeni Müşteri</Text>

          <TouchableOpacity 
            style={styles.dateBtn} 
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateBtnText}>
              Kayıt Tarihi: {tarih.toLocaleDateString('tr-TR')}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={tarih}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setTarih(selectedDate);
              }}
            />
          )}
          
          <TextInput 
            style={styles.input} 
            placeholder="Müşteri İsmi" 
            placeholderTextColor={colors.textSecondary} 
            value={isim} 
            onChangeText={setIsim} 
          />
          
          <View style={styles.phoneContainer}>
            <TextInput 
              style={[styles.input, styles.phoneInput]} 
              placeholder="Telefon Numarası" 
              placeholderTextColor={colors.textSecondary} 
              value={telefon} 
              onChangeText={setTelefon} 
              keyboardType="phone-pad" 
            />
            <TouchableOpacity style={styles.contactBtn} onPress={rehbereEkle}>
              <Ionicons name="person-add" size={20} color="#FFF" />
              <Text style={styles.contactBtnText}>Rehbere Ekle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="Yaş" placeholderTextColor={colors.textSecondary} value={yas} onChangeText={setYas} keyboardType="numeric" />
            <TextInput style={[styles.input, styles.half]} placeholder="Kupa Sayısı" placeholderTextColor={colors.textSecondary} value={kupaSayisi} onChangeText={setKupaSayisi} keyboardType="numeric" />
          </View>
          
          <TextInput style={[styles.input, styles.textArea]} placeholder="Yapılan İşlemler (Örn: Sırt, omuz)" placeholderTextColor={colors.textSecondary} value={islemler} onChangeText={setIslemler} multiline />
          
          <TouchableOpacity style={styles.button} onPress={kaydet}>
            <Text style={styles.buttonText}>Uygulamaya Kaydet</Text>
          </TouchableOpacity>
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  button: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  dateBtnText: { color: colors.textPrimary, fontSize: 16, marginLeft: 10 },
});