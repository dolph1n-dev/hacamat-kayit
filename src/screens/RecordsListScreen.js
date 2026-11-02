import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import RecordDetailModal from '../components/RecordDetailModal';
import { colors } from '../theme/colors';
import { getAppointmentState, mutateAppointmentState } from '../utils/appointmentStorage';
import { validateRecord, normalizePhone, isCompletedRecord } from '../utils/appointmentRules';
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
    if (busy.current) return false;
    busy.current = true;
    try {
      const next = await mutateAppointmentState(state => {
        const original = state.records.find(record => record.id === updatedRecord.id);
        if (!original) throw new Error('Kayıt artık mevcut değil.');
        // Decide from persisted state, never from a cleared input or edited status.
        // Keep legacy empty drafts editable without weakening completed sessions.
        const allowDraft = original.status === 'draft' || (!original.status && !isCompletedRecord(original));
        const valid = validateRecord({ ...updatedRecord, status: original.status }, allowDraft);
        const linked = state.appointments.some(item => (item.musteriId === valid.id || item.customerRecordId === valid.id));
        if (linked && (valid.isim !== original.isim || valid.telefon !== (original.telefon ? normalizePhone(original.telefon) : '') || valid.tarih !== original.tarih)) {
          throw new Error('Randevuya bağlı kaydın isim, telefon ve tarihini bu ekranda değiştiremezsiniz. Randevuyu yeniden oluşturun.');
        }
        return { ...state, records: state.records.map(record => record.id === valid.id ? valid : record) };
      });
      setRecords(next.records); setSelectedRecord(next.records.find(record => record.id === updatedRecord.id));
      setModalVisible(false);
      return true;
    } catch (error) {
      Alert.alert('Kayıt güncellenemedi', error.message);
      return false;
    }
    finally { busy.current = false; }
  };

  const handleDelete = async id => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await mutateAppointmentState(state => {
        if (state.appointments.some(item => (item.musteriId === id || item.customerRecordId === id))) throw new Error('Önce Randevular ekranından bağlı randevuyu kaldırın. Tamamlanmış seans bilgileri korunur.');
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, borderRadius: 8, marginHorizontal: 20, marginBottom: 20, height: 50, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 16 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 },
});
