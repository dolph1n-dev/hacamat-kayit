import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@hacamat_kayitlari';

export const getRecords = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Veri okuma hatası:", error);
    return [];
  }
};

export const saveRecords = async (records) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Veri yazma hatası:", error);
  }
};

const APPOINTMENTS_KEY = '@randevular';

export const getAppointments = async () => {
  try {
    const data = await AsyncStorage.getItem(APPOINTMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Randevu okuma hatası:", error);
    return [];
  }
};

export const saveAppointments = async (appointments) => {
  try {
    await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  } catch (error) {
    console.error("Randevu yazma hatası:", error);
  }
};