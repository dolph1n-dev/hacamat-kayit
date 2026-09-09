import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Uygulama açıkken de bildirimlerin üstten düşmesini sağlar
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Fonksiyon ismini ve içeriğini sadece yerel bildirimler için güncelledik
export async function registerForLocalNotificationsAsync() {
  // Android için zorunlu bildirim kanalı ayarı
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Randevu Bildirimleri',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });
  }

  // Sadece cihazdan bildirim gösterme izni istiyoruz (Push token istemiyoruz)
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
}

// Randevu için bildirimleri kurma fonksiyonu (Değişmedi, aynı kalıyor)
export async function scheduleAppointmentNotifications(isim, randevuTarihi) {
  const randevuZamani = new Date(randevuTarihi);
  const suAn = new Date();

  const birGunOnce = new Date(randevuZamani);
  birGunOnce.setDate(birGunOnce.getDate() - 1);
  birGunOnce.setHours(14, 0, 0, 0); 

  if (birGunOnce > suAn) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Yarınki Randevu Hatırlatması',
        body: `Yarın ${isim} adlı müşterinin saat ${randevuZamani.getHours().toString().padStart(2, '0')}:${randevuZamani.getMinutes().toString().padStart(2, '0')} randevusu var.`,
        sound: true,
      },
      trigger: {
        date: birGunOnce,
        channelId: 'default' 
      },
    });
  }

  const ikiSaatOnce = new Date(randevuZamani.getTime() - (2 * 60 * 60 * 1000));

  if (ikiSaatOnce > suAn) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Randevu Yaklaşıyor!',
        body: `${isim} adlı müşterinin randevusuna 2 saat kaldı. Hazırlıkları yapabilirsiniz.`,
        sound: true,
      },
      trigger: {
        date: ikiSaatOnce,
        channelId: 'default'
      },
    });
  }
}