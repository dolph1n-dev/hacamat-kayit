import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import KeyboardToolbar from './KeyboardToolbar';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function RecordDetailModal({ visible, record, onClose, onUpdate, onDelete }) {
    const [editedRecord, setEditedRecord] = useState({ ...record });
    const [isEditing, setIsEditing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const mounted = useRef(true);
    const session = useRef(0);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; session.current += 1; };
    }, []);
    useEffect(() => {
        session.current += 1;
        setEditedRecord({ ...record });
        setIsEditing(false);
        setShowDatePicker(false);
    }, [record, visible]);

    const cancelEditing = () => {
        if (busy.current) return;
        setEditedRecord({ ...record });
        setIsEditing(false);
        setShowDatePicker(false);
    };
    const startEditing = () => {
        if (busy.current) return;
        setEditedRecord({ ...record });
        setShowDatePicker(false);
        setIsEditing(true);
    };
    const handleClose = () => {
        if (busy.current) return;
        cancelEditing();
        onClose();
    };
    const handleSave = async () => {
        if (busy.current || !record || !isEditing) return;
        busy.current = true;
        setSaving(true);
        setShowDatePicker(false);
        const currentSession = session.current;
        try {
            // The parent returns true only after persistence succeeds; false keeps
            // the form open with all entered values and its validation error.
            const success = await onUpdate({ ...editedRecord });
            if (success === true && mounted.current && session.current === currentSession) {
                setIsEditing(false);
            }
        } catch (error) {
            if (mounted.current && session.current === currentSession) {
                Alert.alert('Kayıt güncellenemedi', error.message || 'Lütfen tekrar deneyin.');
            }
        } finally {
            busy.current = false;
            if (mounted.current) setSaving(false);
        }
    };
    const handleDelete = () => {
        if (busy.current) return;
        Alert.alert('Silme Onayı', 'Bu kaydı silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: () => { if (!busy.current) onDelete(record.id); } },
        ]);
    };
    if (!record) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={styles.modalTitle}>{isEditing ? 'Kaydı Düzenle' : 'Kayıt Detayı'}</Text>
                            <Text style={styles.label}>Tarih</Text>
                            {isEditing ? (
                                <TouchableOpacity disabled={saving} style={styles.input} onPress={() => setShowDatePicker(true)}>
                                    <Text style={{ color: colors.textPrimary, fontSize: 16 }}>{editedRecord.tarih ? new Date(editedRecord.tarih).toLocaleDateString('tr-TR') : ''}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TextInput style={[styles.input, styles.disabledInput]} value={editedRecord.tarih ? new Date(editedRecord.tarih).toLocaleDateString('tr-TR') : ''} editable={false} />
                            )}
                            {showDatePicker && isEditing && !saving && (
                                <DateTimePicker value={editedRecord.tarih ? new Date(editedRecord.tarih) : new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onValueChange={(event, selectedDate) => {
                                        if (busy.current) return;
                                        if (Platform.OS === 'android') setShowDatePicker(false);
                                        const finalDate = selectedDate || event;
                                        if (finalDate instanceof Date) setEditedRecord(value => ({ ...value, tarih: finalDate.toISOString() }));
                                    }}
                                    onDismiss={() => setShowDatePicker(false)} />
                            )}
                            <Text style={styles.label}>İsim</Text>
                            <TextInput style={[styles.input, (!isEditing || saving) && styles.disabledInput]} value={editedRecord.isim} onChangeText={text => setEditedRecord(value => ({ ...value, isim: text }))} editable={isEditing && !saving} />
                            <Text style={styles.label}>Telefon Numarası</Text>
                            <TextInput style={[styles.input, (!isEditing || saving) && styles.disabledInput]} value={editedRecord.telefon} onChangeText={text => setEditedRecord(value => ({ ...value, telefon: text }))} editable={isEditing && !saving} keyboardType="phone-pad" placeholder={isEditing ? 'Telefon numarası girin' : 'Kayıtlı numara yok'} placeholderTextColor={colors.textSecondary} />
                            <View style={styles.row}>
                                <View style={styles.halfCol}>
                                    <Text style={styles.label}>Yaş</Text>
                                    <TextInput style={[styles.input, (!isEditing || saving) && styles.disabledInput]} value={editedRecord.yas} onChangeText={text => setEditedRecord(value => ({ ...value, yas: text }))} editable={isEditing && !saving} keyboardType="numeric" />
                                </View>
                                <View style={styles.halfCol}>
                                    <Text style={styles.label}>Kupa Sayısı</Text>
                                    <TextInput style={[styles.input, (!isEditing || saving) && styles.disabledInput]} value={editedRecord.kupaSayisi} onChangeText={text => setEditedRecord(value => ({ ...value, kupaSayisi: text }))} editable={isEditing && !saving} keyboardType="numeric" />
                                </View>
                            </View>
                            <Text style={styles.label}>Yapılan İşlemler</Text>
                            <TextInput style={[styles.input, styles.textArea, (!isEditing || saving) && styles.disabledInput]} value={editedRecord.islemler} onChangeText={text => setEditedRecord(value => ({ ...value, islemler: text }))} editable={isEditing && !saving} multiline />
                            <View style={styles.buttonContainer}>
                                {isEditing ? (
                                    <>
                                        <TouchableOpacity disabled={saving} style={[styles.btn, styles.btnCancel]} onPress={cancelEditing}><Text style={styles.btnText}>İptal</Text></TouchableOpacity>
                                        <TouchableOpacity disabled={saving} accessibilityState={{ disabled: saving, busy: saving }} style={[styles.btn, styles.btnSave]} onPress={handleSave}><Text style={styles.btnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text></TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <TouchableOpacity disabled={saving} style={[styles.btn, styles.btnDanger]} onPress={handleDelete}><Text style={styles.btnText}>Sil</Text></TouchableOpacity>
                                        <TouchableOpacity disabled={saving} style={[styles.btn, styles.btnEdit]} onPress={startEditing}><Text style={styles.btnText}>Düzenle</Text></TouchableOpacity>
                                    </>
                                )}
                            </View>
                            {!isEditing && <TouchableOpacity disabled={saving} style={styles.btnCloseTop} onPress={handleClose}><Text style={styles.btnCloseText}>Kapat</Text></TouchableOpacity>}
                        </ScrollView>
                    </View>
                    {isEditing && <KeyboardToolbar />}
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
    keyboardView: { width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 24, maxHeight: '90%' },
    modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { color: colors.textSecondary, marginBottom: 8, fontSize: 14 },
    input: { backgroundColor: colors.inputBackground, color: colors.textPrimary, padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    disabledInput: { opacity: 0.8, backgroundColor: 'transparent' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    halfCol: { width: '48%' },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    btnSave: { backgroundColor: colors.primary },
    btnEdit: { backgroundColor: '#3B82F6' },
    btnDanger: { backgroundColor: colors.danger, flex: 0.5 },
    btnCancel: { backgroundColor: colors.border },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    btnCloseTop: { marginTop: 20, alignItems: 'center', padding: 10 },
    btnCloseText: { color: colors.textSecondary, fontSize: 16 },
});
