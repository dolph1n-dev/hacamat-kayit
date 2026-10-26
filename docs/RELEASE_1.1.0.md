# 1.1.0 — APK hazırlığı

## Değişiklikler

- Takvim `firstDay={1}` ile pazartesiden başlar. Locale dizileri JavaScript'in pazar=0 indeksine uygun bırakıldı; tarihler ve gün etiketleri kaydırılmadı.
- `app.json` içindeki görünen uygulama sürümü `1.1.0` oldu.
- Repoda bulunmayan `assets/android-icon-logo.jpeg` referansları kaldırıldı. Android ön plan ikonu, mevcut yeni logo `assets/logo.jpeg` kullanır. Aynı renkli JPEG, arka plan ve monokrom maske olarak tekrar kullanılmaz. Arka plan rengi korunur; ayrı bir alfa maskesi hazırlanana kadar özel temalı ikon tanımı yoktur. Logo ve mevcut diğer görseller değiştirilmedi.
- `preview` profili bağımsız, dahili dağıtılabilir APK üretir; development client değildir. `production` profilinin varsayılan Play Store AAB çıktısı korunur.
- EAS build numaraları uzaktan yönetilir; preview ve production build numaraları otomatik artar. Görünen `1.1.0` sürümü otomatik değiştirilmez.
- Bağımlılıksız yayın ön kontrolü ve 6 yeni regresyon testi eklendi. CI artık gerçek ikon yollarını, Expo config çözümlemesini, Android/iOS JS paketlemesini ve Android native prebuild/ikon üretimini kontrol eder.

## İncelemenin kapsamı ve sınırları

Güncel başlangıç commit'i: `f395764051edcad3e2e8c7637973f0c7cd039791`.
SDK 58, React 19.3.0, React Native 0.88.0 ve güncel Expo paketleri korunmuştur. `package.json` ve `package-lock.json` değiştirilmemiştir. DateTimePicker 9.2.1 ve SDK 58 StatusBar paketlerinin config plugin girişleri kaynaklarından doğrulanmıştır; önceki sürümdeki plugin hatası nedeniyle bunlar körlemesine kaldırılmamıştır.

Kaynak incelemesi kayıt/randevu oluşturma, çakışma kontrolü, yerel tarih, seans tamamlama/iptal, kayıt düzenleme/silme, rehber seçimi, güvenli alan, bildirim planlama ve uygulama yapılandırmasını kapsar. Yerel regresyonlar çalıştırılmıştır. İkon dosyasının varlığı GitHub envanterinden doğrulanmıştır; gerçek görüntü boyutları/görsel kalite testi yapılmamıştır.

Bu ortamda `github.com` ve `registry.npmjs.org` DNS erişimi başarısız oldu. Bu nedenle temiz `npm ci`, gerçek Expo config/prebuild/export, Gradle derlemesi, imzalı APK kurulumu ve cihaz testleri burada tamamlanamadı. CI'ye bu kontroller eklenmiştir; bir workflow'un tanımlanmış olması geçtiği anlamına gelmez. APK build sonucunu EAS'te doğrulayın.

## Build öncesi (Windows CMD veya PowerShell)

```sh
git pull origin main
npm ci
node scripts/check-release.cjs
node --experimental-vm-modules --test tests/*.cjs
npx expo-doctor
npx expo export --platform android --output-dir dist/android
npx eas-cli@latest build --platform android --profile preview
```

EAS hesabınızla giriş istenirse tamamlayın. APK için `preview` kullanın; `production` varsayılan olarak AAB içindir. Gerçek EAS CLI paketi `eas-cli`dir; projedeki eski `eas` isimli npm paketini CLI sanmayın. Node.js en az 22.13.x olmalıdır; CI Node 24 kullanır.

Önceden daha yüksek bir versionCode ile build/yayın varsa, ilk remote sürüm kurulumu öncesinde `npx eas-cli@latest build:version:set` ile son kullanılan Android build numarasını eşitleyin. Yeni APK'nın eskisinin üzerine kurulabilmesi için paket adı ve imzalama anahtarı aynı kalmalıdır. Mevcut EAS Android keystore'unu kullanın; yeni anahtar oluşturmayın.

## APK kurulduktan sonra kısa kontrol

- Takvim başlıkları Pzt → Sal → Çar → Per → Cum → Cmt → Paz olmalı; örneğin 26 Ekim 2026 pazartesi sütununda görünmeli.
- Elle ve rehberden müşteri kaydı; randevuda kayıtlı müşteri seçimi; numara seçimi/izin reddi/iptal denenmeli.
- Randevu oluşturma, çakışma reddi, seans tamamlama ve iptal denenmeli; uygulama kapatılıp açıldığında kayıtlar korunmalı.
- Android sistem tuşları/gesture navigation ve klavyeyle alt navigasyon kontrol edilmeli.
- Bildirim izni verilerek gerçek cihazda hatırlatma denenmeli. Pil tasarrufu/OEM kısıtları teslim saatini etkileyebilir; bu sürüm kesin alarm teslimi garantisi vermez.
- Aynı imzalı önceki kurulumun üzerine güncellemede verilerin korunduğu denenmeli. Uygulamayı kaldırmak veya verisini temizlemek yerel kayıtları silebilir.

Müşteri verisi cihazda AsyncStorage'dadır; bulut senkronizasyonu/yedekleme veya şifreli sağlık kaydı kasası yoktur. Yerel bildirimler işletmeciyi uyarır; WhatsApp/SMS butonları taslak açar, müşteriye otomatik mesaj göndermez. Bu sürüm, bu özellikleri eklemez.
