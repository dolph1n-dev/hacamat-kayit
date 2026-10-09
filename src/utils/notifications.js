import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForLocalNotificationsAsync() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Randevu Bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });
  }
  const allowed = permission => permission.granted || (
    Platform.OS === 'ios' && [Notifications.IosAuthorizationStatus.PROVISIONAL,
      Notifications.IosAuthorizationStatus.EPHEMERAL].includes(permission.ios?.status)
  );
  let permission = await Notifications.getPermissionsAsync();
  if (!allowed(permission)) permission = await Notifications.requestPermissionsAsync();
  return allowed(permission);
}

export async function cancelAppointmentNotifications(appointmentId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (item.content.data?.appointmentId === appointmentId ||
      item.identifier.startsWith(`appointment:${appointmentId}:`)) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }
}

// Local notifications remind the operator, NOT the customer. No push-token API.
export async function scheduleAppointmentNotifications(isim, randevuTarihi, appointmentId) {
  if (!appointmentId) throw new Error('Bildirim için randevu kimliği gerekli.');
  const date = new Date(randevuTarihi);
  if (!Number.isFinite(date.getTime())) throw new Error('Geçersiz randevu tarihi.');
  if (!(await registerForLocalNotificationsAsync())) return { enabled: false, ids: [] };
  await cancelAppointmentNotifications(appointmentId);
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  previousDay.setHours(14, 0, 0, 0);
  const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const reminders = [
    { key: 'previous-day', date: previousDay, title: '📅 Yarınki Randevu Hatırlatması', body: `Yarın ${isim} adlı müşterinin saat ${time} randevusu var.` },
    { key: 'two-hours', date: new Date(date.getTime() - 2 * 3600000), title: '⏰ Randevu Yaklaşıyor!', body: `${isim} adlı müşterinin randevusuna 2 saat kaldı.` },
  ].filter(item => item.date.getTime() > Date.now());
  if (!reminders.some(item => item.key === 'two-hours') && date.getTime() > Date.now() + 1000) {
    reminders.push({ key: 'near', date: new Date(Math.max(Date.now() + 1000, date.getTime() - 15 * 60000)), title: '⏰ Randevu Yaklaşıyor!', body: `${isim} adlı müşterinin saat ${time} randevusu var.` });
  }
  const ids = [];
  try {
    for (const item of reminders) {
      ids.push(await Notifications.scheduleNotificationAsync({
        identifier: `appointment:${appointmentId}:${item.key}`,
        content: { title: item.title, body: item.body, sound: true, data: { appointmentId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: 'default' },
      }));
    }
    return { enabled: true, ids };
  } catch (error) {
    // Do not leave half of a reminder pair scheduled if scheduling fails.
    for (const id of ids) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    }
    throw error;
  }
}
