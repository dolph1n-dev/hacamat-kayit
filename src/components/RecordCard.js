import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

export default function RecordCard({ item, onPress }) {
  const tarih = new Date(item.tarih).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{item.isim}</Text>
        <Text style={styles.date}>{tarih}</Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={styles.detailText}>Yaş: {item.yas || '-'}</Text>
        <Text style={styles.detailText}>Kupa: {item.kupaSayisi}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  date: { color: colors.textSecondary, fontSize: 14 },
  detailsRow: { flexDirection: 'row', gap: 16 },
  detailText: { color: colors.textSecondary, fontSize: 15 }
});