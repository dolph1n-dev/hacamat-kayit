import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import KeyboardToolbar from './KeyboardToolbar';
import { KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function RecordDetailModal({ visible, record, onClose, onUpdate, onDelete }) {
    const [editedRecord, setEditedRecord] = useState(record || {});
    const [isEditing, setIsEditing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        setEditedRecord(record || {});
        setIsEditing(false);
    }, [record]);

    if (!record) return null;

    const handleSave = () => {
        onUpdate(editedRecord);
        setIsEditing(false);
    };

    const handleDelete = () => {
        Alert.alert("Silme Onayı", "Bu kaydı silmek istediğinize emin misiniz?", [
            { text: "İptal", style: "cancel" },
            { text: "Sil", style: "destructive", onPress: () => onDelete(record.id) }
        ]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={styles.modalTitle}>{isEditing ? "Kaydı Düzenle" : "Kayıt Detayı"}</Text>

                            <Text style={styles.label}>Tarih</Text>
                            {isEditing ? (
                                <TouchableOpacity
                                    style={styles.input}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                                        {editedRecord.tarih ? new Date(editedRecord.tarih).toLocaleDateString('tr-TR') : ''}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <TextInput
                                    style={[styles.input, styles.disabledInput]}
                                    value={editedRecord.tarih ? new Date(editedRecord.tarih).toLocaleDateString('tr-TR') : ''}
                                    editable={false}
                                />
                            )}

                            {showDatePicker && isEditing && (
                                <DateTimePicker
                                    value={editedRecord.tarih ? new Date(editedRecord.tarih) : new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(Platform.OS === 'ios');
                                        if (selectedDate) {
                                            setEditedRecord({ ...editedRecord, tarih: selectedDate.toISOString() });
                                        }
                                    }}
                                />
                            )}

                            <Text style={styles.label}>İsim</Text>
                            <TextInput
                                style={[styles.input, !isEditing && styles.disabledInput]}
                                value={editedRecord.isim}
                                onChangeText={(text) => setEditedRecord({ ...editedRecord, isim: text })}
                                editable={isEditing}
                            />

                            <Text style={styles.label}>Telefon Numarası</Text>
                            <TextInput
                                style={[styles.input, !isEditing && styles.disabledInput]}
                                value={editedRecord.telefon}
                                onChangeText={(text) => setEditedRecord({ ...editedRecord, telefon: text })}
                                editable={isEditing}
                                keyboardType="phone-pad"
                                placeholder={isEditing ? "Telefon numarası girin" : "Kayıtlı numara yok"}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <View style={styles.row}>
                                <View style={styles.halfCol}>
                                    <Text style={styles.label}>Yaş</Text>
                                    <TextInput
                                        style={[styles.input, !isEditing && styles.disabledInput]}
                                        value={editedRecord.yas}
                                        onChangeText={(text) => setEditedRecord({ ...editedRecord, yas: text })}
                                        editable={isEditing}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfCol}>
                                    <Text style={styles.label}>Kupa Sayısı</Text>
                                    <TextInput
                                        style={[styles.input, !isEditing && styles.disabledInput]}
                                        value={editedRecord.kupaSayisi}
                                        onChangeText={(text) => setEditedRecord({ ...editedRecord, kupaSayisi: text })}
                                        editable={isEditing}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>Yapılan İşlemler</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, !isEditing && styles.disabledInput]}
                                value={editedRecord.islemler}
                                onChangeText={(text) => setEditedRecord({ ...editedRecord, islemler: text })}
                                editable={isEditing}
                                multiline
                            />

                            <View style={styles.buttonContainer}>
                                {isEditing ? (
                                    <>
                                        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setIsEditing(false)}>
                                            <Text style={styles.btnText}>İptal</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
                                            <Text style={styles.btnText}>Kaydet</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleDelete}>
                                            <Text style={styles.btnText}>Sil</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.btn, styles.btnEdit]} onPress={() => setIsEditing(true)}>
                                            <Text style={styles.btnText}>Düzenle</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>

                            {!isEditing && (
                                <TouchableOpacity style={styles.btnCloseTop} onPress={onClose}>
                                    <Text style={styles.btnCloseText}>Kapat</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                    {isEditing && <KeyboardToolbar />}
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' }, // padding: 20'yi kaldırdık
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
    btnCloseText: { color: colors.textSecondary, fontSize: 16 }
});