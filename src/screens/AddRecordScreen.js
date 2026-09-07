import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import { colors } from '../theme/colors';
import { getRecords, saveRecords } from '../utils/storage';
import KeyboardToolbar from '../components/KeyboardToolbar';

export default function AddRecordScreen() {
  const [isim, setIsim] = useState('');
  const [yas, setYas] = useState('');
  const [kupaSayisi, setKupaSayisi] = useState('');
  const [islemler, setIslemler] = useState('');

  const kaydet = async () => {
    if (!isim || !kupaSayisi) {
      Alert.alert('Eksik Bilgi', 'İsim ve Kupa Sayısı zorunludur.');
      return;
    }

    const yeniKayit = { id: uuid.v4(), isim, yas, kupaSayisi, islemler, tarih: new Date().toISOString() };
    const mevcutKayitlar = await getRecords();
    await saveRecords([yeniKayit, ...mevcutKayitlar]);

    Alert.alert('Başarılı', 'Kayıt başarıyla eklendi.');
    setIsim(''); setYas(''); setKupaSayisi(''); setIslemler('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* keyboardShouldPersistTaps eklendi */}
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Yeni Müşteri</Text>
          
          <TextInput style={styles.input} placeholder="Müşteri İsmi" placeholderTextColor={colors.textSecondary} value={isim} onChangeText={setIsim} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="Yaş" placeholderTextColor={colors.textSecondary} value={yas} onChangeText={setYas} keyboardType="numeric" />
            <TextInput style={[styles.input, styles.half]} placeholder="Kupa Sayısı" placeholderTextColor={colors.textSecondary} value={kupaSayisi} onChangeText={setKupaSayisi} keyboardType="numeric" />
          </View>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Yapılan İşlemler (Örn: Sırt, omuz)" placeholderTextColor={colors.textSecondary} value={islemler} onChangeText={setIslemler} multiline />
          
          <TouchableOpacity style={styles.button} onPress={kaydet}>
            <Text style={styles.buttonText}>Kaydet</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Klavye çubuğu en alta eklendi */}
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  button: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});