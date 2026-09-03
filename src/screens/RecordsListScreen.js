import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import RecordDetailModal from '../components/RecordDetailModal';
import { colors } from '../theme/colors';
import { getRecords, saveRecords } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function RecordsListScreen() {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Sayfaya her odaklanıldığında (tab değiştirildiğinde) verileri tazele
  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    const data = await getRecords();
    setRecords(data);
  };

  const handleUpdate = async (updatedRecord) => {
    const newData = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    setRecords(newData);
    await saveRecords(newData);
    setModalVisible(false);
  };

  const handleDelete = async (id) => {
    const newData = records.filter(r => r.id !== id);
    setRecords(newData);
    await saveRecords(newData);
    setModalVisible(false);
  };

  const filteredRecords = records.filter(r => 
    r.isim.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Kayıtlar</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Müşteri ara..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RecordCard 
            item={item} 
            onPress={() => { setSelectedRecord(item); setModalVisible(true); }} 
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Kayıt bulunamadı.</Text>}
      />

      <RecordDetailModal
        visible={modalVisible}
        record={selectedRecord}
        onClose={() => setModalVisible(false)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.textPrimary, fontSize: 16 },
  listContainer: { padding: 20, paddingBottom: 100 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 }
});