import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const STORAGE_KEY = '@hacamat_kayitlari';

export default function App() {
  const [kayitlar, setKayitlar] = useState([]);
  const [isim, setIsim] = useState('');
  const [yas, setYas] = useState('');
  const [kupaSayisi, setKupaSayisi] = useState('');
  const [islemler, setIslemler] = useState('');

  // Uygulama açıldığında verileri yükle
  useEffect(() => {
    verileriYukle();
  }, []);

  const verileriYukle = async () => {
    try {
      const kayitliVeriler = await AsyncStorage.getItem(STORAGE_KEY);
      if (kayitliVeriler !== null) {
        setKayitlar(JSON.parse(kayitliVeriler));
      }
    } catch (e) {
      console.error("Veri yüklenirken hata oluştu:", e);
    }
  };

  const kayitEkle = async () => {
    if (!isim || !kupaSayisi) {
      Alert.alert('Hata', 'Lütfen en azından isim ve kupa sayısını girin.');
      return;
    }

    const yeniKayit = {
      id: uuid.v4(),
      isim,
      yas,
      kupaSayisi,
      islemler,
      tarih: new Date().toISOString(),
    };

    const guncelKayitlar = [yeniKayit, ...kayitlar];

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(guncelKayitlar));
      setKayitlar(guncelKayitlar);
      // Formu temizle
      setIsim('');
      setYas('');
      setKupaSayisi('');
      setIslemler('');
    } catch (e) {
      console.error("Veri kaydedilirken hata oluştu:", e);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.kart}>
      <Text style={styles.kartBaslik}>{item.isim} ({item.yas || 'Yaş Girilmedi'})</Text>
      <Text style={styles.kartDetay}>Kullanılan Kupa: {item.kupaSayisi}</Text>
      {item.islemler ? <Text style={styles.kartDetay}>İşlemler: {item.islemler}</Text> : null}
      <Text style={styles.kartTarih}>{new Date(item.tarih).toLocaleString('tr-TR')}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <Text style={styles.baslik}>Yeni Müşteri Kaydı</Text>
        <TextInput style={styles.input} placeholder="Müşteri İsmi" value={isim} onChangeText={setIsim} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.halfInput]} placeholder="Yaş" value={yas} onChangeText={setYas} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.halfInput]} placeholder="Kupa Sayısı" value={kupaSayisi} onChangeText={setKupaSayisi} keyboardType="numeric" />
        </View>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Yapılan İşlemler (İsteğe bağlı)" value={islemler} onChangeText={setIslemler} multiline />
        
        <TouchableOpacity style={styles.buton} onPress={kayitEkle}>
          <Text style={styles.butonMetni}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listeContainer}>
        <Text style={styles.altBaslik}>Geçmiş Kayıtlar</Text>
        <FlatList
          data={kayitlar}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 50 },
  formContainer: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E1E4E8' },
  baslik: { fontSize: 24, fontWeight: 'bold', color: '#2D3748', marginBottom: 15 },
  input: { backgroundColor: '#EDF2F7', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  textArea: { height: 80, textAlignVertical: 'top' },
  buton: { backgroundColor: '#48BB78', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  butonMetni: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  listeContainer: { flex: 1, padding: 20 },
  altBaslik: { fontSize: 18, fontWeight: '600', color: '#4A5568', marginBottom: 10 },
  kart: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  kartBaslik: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  kartDetay: { fontSize: 14, color: '#4A5568', marginTop: 4 },
  kartTarih: { fontSize: 12, color: '#A0AEC0', marginTop: 8, textAlign: 'right' }
});