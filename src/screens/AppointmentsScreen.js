import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import uuid from 'react-native-uuid';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getAppointments, saveAppointments, getRecords, saveRecords } from '../utils/storage';
// import { scheduleAppointmentNotifications } from '../utils/notifications';
import KeyboardToolbar from '../components/KeyboardToolbar';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

// Takvimi Türkçeleştirme
LocaleConfig.locales['tr'] = {
    monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
    dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
    today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

export default function AppointmentsScreen() {
    const [appointments, setAppointments] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

    // Yeni Randevu Form State'leri
    const [isim, setIsim] = useState('');
    const [telefon, setTelefon] = useState('');
    const [sure, setSure] = useState('1 Saat');
    const [time, setTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Randevu Detay Modal State'leri
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => { loadAppointments(); }, [])
    );

    const loadAppointments = async () => {
        const data = await getAppointments();
        setAppointments(data);
    };

    const handleSaveAppointment = async () => {
        if (!isim || !telefon) {
            Alert.alert('Eksik Bilgi', 'İsim ve telefon numarası zorunludur.');
            return;
        }

        const musteriId = uuid.v4();
        const tamTarih = new Date(selectedDate);
        tamTarih.setHours(time.getHours(), time.getMinutes());

        // 1. Müşteri Listesine (Geçmiş Kayıtlar) Eksik Veriyle Ekleme
        const yeniMusteri = { id: musteriId, isim, telefon, yas: '', kupaSayisi: '', islemler: '', tarih: tamTarih.toISOString() };
        const mevcutKayitlar = await getRecords();
        await saveRecords([yeniMusteri, ...mevcutKayitlar]);

        // 2. Randevulara Ekleme
        const yeniRandevu = { id: uuid.v4(), musteriId, isim, telefon, tarih: tamTarih.toISOString(), sure, dateKey: selectedDate };
        const yeniRandevular = [...appointments, yeniRandevu];
        await saveAppointments(yeniRandevular);
        setAppointments(yeniRandevular);

        // 3. Bildirimleri Kurma (build)
        // await scheduleAppointmentNotifications(isim, tamTarih.toISOString());

        setIsAddModalVisible(false);
        setIsim(''); setTelefon(''); setSure('1 Saat');
        Alert.alert('Başarılı', 'Randevu oluşturuldu ve müşteri kayıt taslağı açıldı.');
    };

    const handleDeleteAppointment = async (appointmentToDelete) => {
        // 1. Randevular listesinden sil
        const guncelRandevular = appointments.filter(a => a.id !== appointmentToDelete.id);
        await saveAppointments(guncelRandevular);
        setAppointments(guncelRandevular);

        // 2. Geçmiş Kayıtlar listesinden (taslak kaydı) sil
        const records = await getRecords();
        const guncelKayitlar = records.filter(r => r.id !== appointmentToDelete.musteriId);
        await saveRecords(guncelKayitlar);

        setIsDetailModalVisible(false);
    };

    const dayAppointments = appointments.filter(a => a.dateKey === selectedDate);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Calendar
                onDayPress={day => setSelectedDate(day.dateString)}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: colors.primary } }}
                theme={{ calendarBackground: colors.surface, textSectionTitleColor: colors.textSecondary, dayTextColor: colors.textPrimary, monthTextColor: colors.primary, arrowColor: colors.primary }}
            />

            <View style={styles.listHeader}>
                <Text style={styles.title}>{selectedDate} Randevuları</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalVisible(true)}>
                    <Text style={styles.addBtnText}>+ Yeni</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={dayAppointments}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20 }}
                // renderItem kısmını TouchableOpacity ile sarıp tıklanabilir yapıyoruz:
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => {
                            setSelectedAppointment(item);
                            setIsDetailModalVisible(true);
                        }}
                    >
                        <View>
                            <Text style={styles.cardTime}>{new Date(item.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                            <Text style={styles.cardName}>{item.isim}</Text>
                            <Text style={styles.cardPhone}>{item.telefon}</Text>
                        </View>
                        <Text style={styles.cardDuration}>{item.sure}</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Bu tarihe ait randevu bulunmuyor.</Text>}
            />

            {/* Randevu Detay Modalı */}
            <AppointmentDetailModal
                visible={isDetailModalVisible}
                appointment={selectedAppointment}
                onClose={() => setIsDetailModalVisible(false)}
                onDelete={handleDeleteAppointment}
            />

            {/* Randevu Ekleme Modalı */}
            <Modal visible={isAddModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Yeni Randevu</Text>
                        <TextInput style={styles.input} placeholder="Müşteri İsmi" placeholderTextColor={colors.textSecondary} value={isim} onChangeText={setIsim} />
                        <TextInput style={styles.input} placeholder="Telefon" keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} value={telefon} onChangeText={setTelefon} />
                        <TextInput style={styles.input} placeholder="Süre (Örn: 1 Saat)" placeholderTextColor={colors.textSecondary} value={sure} onChangeText={setSure} />

                        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowTimePicker(true)}>
                            <Text style={styles.timeBtnText}>Saat Seç: {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                        </TouchableOpacity>

                        {showTimePicker && (
                            <DateTimePicker
                                value={time}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={(event, selectedTime) => {
                                    setShowTimePicker(Platform.OS === 'ios');
                                    if (selectedTime) setTime(selectedTime);
                                }}
                            />
                        )}

                        <View style={styles.btnRow}>
                            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setIsAddModalVisible(false)}><Text style={styles.btnText}>İptal</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSaveAppointment}><Text style={styles.btnText}>Kaydet</Text></TouchableOpacity>
                        </View>
                    </View>
                    <KeyboardToolbar />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
    addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    addBtnText: { color: '#FFF', fontWeight: 'bold' },
    card: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    cardTime: { color: colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
    cardPhone: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
    cardDuration: { color: colors.textSecondary, fontSize: 14 },
    emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.surface, padding: 24, borderRadius: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: colors.inputBackground, color: colors.textPrimary, padding: 14, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    timeBtn: { backgroundColor: colors.inputBackground, padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    timeBtnText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
    btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
    btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    cancelBtn: { backgroundColor: colors.border },
    saveBtn: { backgroundColor: colors.primary },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});