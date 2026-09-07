import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Uygulama açıkken de bildirimlerin üstten düşmesini sağlar
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Bildirim izni isteme fonksiyonu
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Randevu Bildirimleri',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Bildirim izni alınamadı!');
      return false;
    }
    return true;
  } else {
    console.log('Bildirimler için fiziksel cihaz gereklidir.');
    return false;
  }
}

// Randevu için bildirimleri kurma fonksiyonu
export async function scheduleAppointmentNotifications(isim, randevuTarihi) {
  const randevuZamani = new Date(randevuTarihi);
  const suAn = new Date();

  // 1. BİLDİRİM: 1 gün önce saat 14:00'te
  const birGunOnce = new Date(randevuZamani);
  birGunOnce.setDate(birGunOnce.getDate() - 1);
  birGunOnce.setHours(14, 0, 0, 0); // Saat 14:00:00

  // Eğer 1 gün önceki 14:00 henüz geçmediyse bildirimi kur
  if (birGunOnce > suAn) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Yarınki Randevu Hatırlatması',
        body: `Yarın ${isim} adlı müşterinin saat ${randevuZamani.getHours().toString().padStart(2, '0')}:${randevuZamani.getMinutes().toString().padStart(2, '0')} randevusu var.`,
        sound: true,
      },
      trigger: birGunOnce,
    });
  }

  // 2. BİLDİRİM: Randevudan tam 2 saat önce
  const ikiSaatOnce = new Date(randevuZamani.getTime() - (2 * 60 * 60 * 1000));

  // Eğer 2 saat öncesi henüz geçmediyse bildirimi kur
  if (ikiSaatOnce > suAn) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Randevu Yaklaşıyor!',
        body: `${isim} adlı müşterinin randevusuna 2 saat kaldı. Hazırlıkları yapabilirsiniz.`,
        sound: true,
      },
      trigger: ikiSaatOnce,
    });
  }
}