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