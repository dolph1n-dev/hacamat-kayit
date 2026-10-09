# Mimari inceleme, düzeltmeler ve test durumu

İnceleme: 9 Ekim 2026. Başlangıç commit'i: 076795299fe11cf72719d3539fa33fdda2020d46.

## Mimari

Expo SDK 57, React 19.2.3 ve React Native 0.86.3 kullanılan bir yerel mobil uygulama. App.js, SafeAreaProvider ve NavigationContainer içinde React Navigation bottom-tabs ile Randevular, Kayıt Ekle ve Liste ekranlarını açıyor. Ortak tema src/theme/colors.js içinde. Sunucu, kullanıcı hesabı, bulut senkronizasyonu veya merkezi müşteri tablosu yok.

- AddRecordScreen: isim, isteğe bağlı telefon/yaş, kupa sayısı, işlemler ve tarih ile tamamlanmış seans kaydı oluşturur. Rehbere Ekle, expo-contacts/legacy ile cihazın kişi formunu açar; uygulamaya kaydetmek ile rehbere kaydetmek ayrı işlemlerdir.
- RecordsListScreen: sekmeye odaklanınca veriyi yeniler, Türkçe isim/telefon araması yapar. RecordCard listeyi, RecordDetailModal düzenleme/silmeyi sunar.
- AppointmentsScreen: react-native-calendars ile gün seçer, datetimepicker ile yerel saat seçer. Her randevu ayrı bir seans taslağına musteriId ile bağlanır. Bu alan gerçek bir tekil müşteri kimliği değil, yerel kayıt kimliğidir; aynı kişi birden fazla seans kaydına sahip olabilir.
- AppointmentDetailModal: seans bilgilerini doldurur; tamamlandığında kaydı ve randevuyu completed olarak işaretler. WhatsApp/SMS düğmeleri kullanıcıya gönderim taslağı açar; arka planda mesaj göndermez.
- Veriler AsyncStorage'da @hacamat_kayitlari ve @randevular anahtarları altında JSON dizileri halinde saklanır. Eski anahtarlar değiştirilmedi. appointmentStorage.js ortak seri işlem kuyruğu ve @hacamat_pending_transaction_v1 günlüğü ile kısmi yazmayı sonraki okumada tamamlar. Bu, gerçek bir SQLite transaction değildir; uygulama kesilirse bekleyen yazı sonraki erişimde tamamlanabilir. Hata sonrasında listeyi kontrol etmeden yeniden kayıt girmeyin.
- appointmentRules.js tarih, süre, telefon, çakışma ve seans doğrulamasını ekranlardan ayırır. storage.js eski API için uyumluluk katmanıdır.

## Düzeltilen sorunlar

1. UTC toISOString ile bugünün seçilmesi yerine yerel gün anahtarı kullanılır; seçilen saat/gün birleşiminde saniyeler sıfırlanır.
2. Geçmiş zaman, boş isim, geçersiz telefon/süre, negatif/sıfır kupa ve geçersiz yaş girdileri engellenir. İsim/alanlar kırpılır; yerel Türk numaraları +90 biçimine getirilir, + ile girilen yabancı numaralar korunur.
3. Tek işletmeci/tek kaynak varsayımıyla çakışan randevular engellenir; bitişi ile diğer başlangıcı eşit olan ardışık randevular kabul edilir. Eski serbest süre metni çözülemezse çakışma hesabında 60 dakika kullanılır.
4. Kaydet düğmesine hızlı çift basmanın mükerrer kayıt oluşturması engellenir; değişiklikler eski ekran dizisinden değil en güncel ortak durumdan üretilir.
5. Bozuk JSON veya depolama hatası boş liste/başarı olarak gizlenmez. Müşteri taslağı ve randevu günlüklü ortak işlemle yazılır.
6. Randevu silinirken yalnızca boş taslak silinir; kupa/işlem içeren eski seanslar da korunur. Bağlı kayıt doğrudan Liste'den silinemez; önce randevu kaldırılır. Bağlı isim/telefon/tarih değişikliği tutarsız kopyalar yaratmasın diye engellenir.
7. Expo bildirim tetikleyicisine DATE tipi, ön plan işleyicisine shouldShowBanner/shouldShowList eklendi. Android kanalı izin istemeden önce kurulur. İzin verilmezse randevu korunur ve kullanıcı bilgilendirilir.
8. Bildirimler randevu kimliğine bağlıdır; tekrar planlama mükerrer bildirim bırakmaz. İptal/tamamlama sırasında ilgili bildirimler kaldırılır. Kısmi planlama başarısızsa oluşturulan bildirimler temizlenir.
9. Önceki gün 14:00 ve iki saat önce hatırlatma sürer. İki saatten az kalan yeni randevu için 15 dakika önce; buna da zaman kalmadıysa kısa süre sonra yerel hatırlatma planlanır.
10. Takvimde randevulu günler işaretlenir, gün listesi saate göre sıralanır, Android geri tuşu yeni randevu modalını kapatır. DateTimePicker 9.x onValueChange/onDismiss API'si korunur; eski onChange API'sine geri dönülmedi.
11. Mesaj metnindeki yanıltıcı 'bugün' yerine gerçek randevu tarihi/saat kullanılır. WhatsApp HTTPS bağlantısı iOS scheme sorgulama sınırlamasına takılmaz. Rehber izin hataları yakalanır; native build için Contacts ve Notifications config plugin'leri eklenir.

## Ücretsiz hatırlatma / mesaj otomasyonu

### İşletmenin telefonuna: uygulanmış yerel bildirim

Sunucu veya mesaj servis ücreti gerektirmez. Cihaz işletim sistemine tarihli bildirim bırakılır; uygulamanın sürekli çalışması gerekmez. Bu, müşteriye WhatsApp/SMS gönderimi değildir. İzin, işletim sistemi pil/odak ayarları, cihazın kapalı olması ve planlanmış bildirim limitleri teslimatı etkileyebilir; kesin teslim veya saniye hassasiyeti garantisi yoktur.

### Müşteriye: Telegram + sunucu tarafı zamanlayıcı

Telegram Bot API, normal hız limitleri içinde ücretsiz mesaj gönderebilir. Müşteri önce botu başlatmalı ve açık rıza/abonelik alınmalıdır. Sadece telefon numarası ile bot gönderimi yapılamaz; chat_id eşlemesi gerekir. Cloudflare Workers ücretsiz planı gibi kota sınırlı bir sunucu tarafı zamanlayıcı ve kalıcı veri deposu küçük işletme için değerlendirilebilir. Mobil uygulamadaki AsyncStorage'ı sunucu göremez: randevuların yetkilendirilmiş API ile senkronize edilmesi şarttır. Önerilen akış: randevu + izin + chat_id -> sunucu dueAt -> zamanlayıcı -> iptal/tamamlanma kontrolü -> tekil gönderim anahtarı -> Telegram sendMessage -> gönderim kaydı ve yeniden deneme. Bot anahtarı mobil uygulamaya veya repoya yazılmamalıdır. Tamamen kesin zamanlı teslim ve sonsuz ücretsiz kullanım garantisi değildir. Bu entegrasyon araştırıldı; hesap, bot veya müşteri mesajı oluşturulmadı, canlıya alınmadı.

### WhatsApp / SMS

wa.me/sms bağlantıları taslak açar; kullanıcı gönderime basar. WhatsApp resmi API ile iş tarafından başlatılan randevu hatırlatması genel durumda onaylı utility template ve ücrete tabidir. 24 saatlik müşteri hizmet penceresi, güncel ücretsiz istisnalar ve müşteri rızası ayrıca değerlendirilmelidir; her randevu için ücretsiz otomasyon vaat edilmez. SMS operatör/sağlayıcı maliyetlidir ve iOS/Expo Go'da sessiz arka plan SMS gönderimi uygun bir çözüm değildir. Resmi olmayan WhatsApp Web botları oturum güvenliği/hesap kısıtlaması riski nedeniyle önerilmez.

## Expo Go ve test durumu

Bağımlılık sürümleri ve lockfile bu değişiklikte yükseltilmedi. Native modül eklenmedi; mevcut Expo modülleri kullanıldı. SDK 57 DateTimePicker dokümanı Android/iOS ve Expo Go desteğini belirtir. Expo Go Android'de SDK 53+ uzaktan push desteği yoktur; bu uygulama getExpoPushToken çağırmaz, yalnızca yerel bildirim kullanır. Contacts için mevcut legacy import korunur. Config plugin ayarları Expo Go'nun kendi binary'sini değiştirmez; standalone/dev build için etkilidir.

Yerelde 15 bağımlılıksız regresyon testi geçti. Yeni/değişen JS dosyaları Babel parser ile sözdizimi kontrolünden geçti. Testler depolama ve bildirim API'lerini taklit eder; gerçek native davranışı doğrulamaz. Sandbox github.com ve registry.npmjs.org DNS erişimi olmadığı için git clone, npm kurulumu, expo install --check, Metro paketleme ve Android/iOS cihaz çalıştırma yapılamadı. Dosyalar GitHub bağlantısı üzerinden incelendi/güncellendi. Bu nedenle iki platformda gerçek Expo Go testi başarılıdır denmiyor.

GitHub Actions iş akışı regresyon + bağımlılık kontrolü + her iki native platformun JS bundle üretimini çalıştıracak şekilde eklendi. Bu rapor yazılırken CI sonucu henüz doğrulanmadı. Bundle üretimi de gerçek cihaz testi yerine geçmez.

### Geliştirici komutları

```sh
npm ci
npx expo install --check
TZ=Europe/Istanbul node --experimental-vm-modules --test tests/regression.cjs
npx expo export --platform android --output-dir dist/android
npx expo export --platform ios --output-dir dist/ios
npx expo start --go --clear
```

SDK 57 ile uyumlu Expo Go sürümünü kullanın. Android Expo Go içinden QR tarayın; iOS'ta Kamera ile QR açın. Bilgisayar ve cihazlar aynı ağa bağlı olmalıdır. İşletme saatleri için cihaz saat dilimini Europe/Istanbul olarak ayarlayın; uygulama cihazın yerel saatini kullanır. Farklı saat dilimleri arasında dolaşan işletme kullanımında ayrıca sabit işletme saat dilimi modeli gerekir.

### İki cihazda kabul testi (henüz yapılmadı)

- İsim/telefon/yaş/kupa doğrulaması, kayıt oluşturma, Türkçe arama, düzenleme/silme.
- Rehber izni kabul/red, formu iptal etme ve kaydetme.
- Gece 00:30'da doğru gün; gün/saat seçimi ve Android geri tuşu; iOS spinner.
- Geçmiş ve çakışan randevu reddi; bitiş-başlangıç eşitliğinin kabulü; sıralama/takvim işaretleri.
- Hızlı çift Kaydet; uygulamayı kapatıp açınca aynı kayıtların geri gelmesi.
- 5–10 dakika ileride randevu: yerel hatırlatmayı ön/arka planda görme; izin reddinde randevunun yine kaydedilmesi.
- Randevuyu iptal edince bildirim kalmaması; seansı tamamlayıp randevuyu kaldırınca seansın korunması.
- WhatsApp ve SMS'te gerçek gün/saat, uluslararası numara, kullanıcı tarafından gönderim.

## Kalan mimari eksikler / sınırlar

AsyncStorage şifreli bir sağlık verisi kasası değildir. KVKK, açık rıza, cihaz kilidi, uygulama erişim kontrolü, şifreleme ve yedekleme ayrıca tasarlanmalıdır. Sunucu/senkronizasyon, yedek geri yükleme, tekil müşteri profili, randevu yeniden planlama ve çok personelli kaynak yönetimi yoktur. Eski sürümde kimliksiz bırakılmış bildirimler yeni randevu kimliğiyle eşlenemez; otomatik genel bildirim silme uygulanmadı. Yeni randevular kimliklidir. iOS bekleyen yerel bildirim sınırı ve Android exact-alarm ayarları yüksek hacimli kullanımda ayrıca gerçek cihazda test edilmelidir.

## Kaynaklar

- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://docs.expo.dev/versions/v57.0.0/sdk/date-time-picker/
- https://docs.expo.dev/versions/v57.0.0/sdk/contacts/
- https://github.com/react-native-datetimepicker/datetimepicker
- https://core.telegram.org/bots/faq
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
