import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import RecordDetailModal from '../components/RecordDetailModal';
import { colors } from '../theme/colors';
import { getAppointmentState, mutateAppointmentState } from '../utils/appointmentStorage';
import { validateRecord, normalizePhone } from '../utils/appointmentRules';
import { Ionicons } from '@expo/vector-icons';
import KeyboardToolbar from '../components/KeyboardToolbar';

export default function RecordsListScreen() {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const busy = useRef(false);
  const loadRecords = useCallback(async () => {
    try { setRecords((await getAppointmentState()).records); }
    catch (error) { Alert.alert('Kayıtlar okunamadı', error.message); }
  }, []);
  useFocusEffect(useCallback(() => { loadRecords(); }, [loadRecords]));

  const handleUpdate = async updatedRecord => {
    if (busy.current) return;
    busy.current = true;
    try {
      const valid = validateRecord(updatedRecord, updatedRecord.status === 'draft' || !String(updatedRecord.kupaSayisi || '').trim());
      const next = await mutateAppointmentState(state => {
        if (!state.records.some(record => record.id === valid.id)) throw new Error('Kayıt artık mevcut değil.');
        const linked = state.appointments.some(item => item.musteriId === valid.id);
        const original = state.records.find(record => record.id === valid.id);
        if (linked && (valid.isim !== original.isim || valid.telefon !== (original.telefon ? normalizePhone(original.telefon) : '') || valid.tarih !== original.tarih)) {
          throw new Error('Randevuya bağlı kaydın isim, telefon ve tarihini bu ekranda değiştiremezsiniz. Randevuyu yeniden oluşturun.');
        }
        return { ...state, records: state.records.map(record => record.id === valid.id ? valid : record) };
      });
      setRecords(next.records); setModalVisible(false);
    } catch (error) { Alert.alert('Kayıt güncellenemedi', error.message); }
    finally { busy.current = false; }
  };

  const handleDelete = async id => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await mutateAppointmentState(state => {
        if (state.appointments.some(item => item.musteriId === id)) throw new Error('Önce Randevular ekranından bağlı randevuyu kaldırın. Tamamlanmış seans bilgileri korunur.');
        return { ...state, records: state.records.filter(record => record.id !== id) };
      });
      setRecords(next.records); setModalVisible(false);
    } catch (error) { Alert.alert('Kayıt silinemedi', error.message); }
    finally { busy.current = false; }
  };
  const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
  const filteredRecords = records.filter(record => String(record.isim || '').toLocaleLowerCase('tr-TR').includes(query) || (query && String(record.telefon || '').includes(query)));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Kayıtlar</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Müşteri ara..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>
      <FlatList keyboardShouldPersistTaps="handled" data={filteredRecords} keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <RecordCard item={item} onPress={() => { setSelectedRecord(item); setModalVisible(true); }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Kayıt bulunamadı.</Text>} />
      <KeyboardToolbar />
      <RecordDetailModal visible={modalVisible} record={selectedRecord} onClose={() => setModalVisible(false)} onUpdate={handleUpdate} onDelete={handleDelete} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: 8 }, searchInput: { flex: 1, paddingVertical: 12, color: colors.textPrimary, fontSize: 16 },
  listContainer: { padding: 20, paddingBottom: 100 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 },
});
