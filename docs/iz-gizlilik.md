# İZ — Tehdit modeli ve gizlilik tasarımı

Bu belge, `/iz` altındaki **Dijital İz Denetimi** modülünün neden bu şekilde
tasarlandığını, hangi güvenceleri verdiğini ve nerede durduğunu anlatır.

## 1. Çıkış noktası ve reddedilen tasarım

Bu modül, "bir fotoğraftan kişinin kimliğini ve sosyal medya hesaplarını bulan
araç" isteğinden yola çıktı (bkz. thoughtfuldev/eagleeye gibi OSINT araçları).

Bu tasarım, gizlilik önlemleri eklenerek düzeltilebilir bir şey değildir:

> Fotoğraftaki kişiyi tanımlayan bir sistemde rıza verecek olan kişi, ekranın
> başındaki kullanıcı değil, **fotoğraftaki kişidir**. Sistemin o rızayı alma
> yolu yoktur. Onay kutusu, kullanım şartı veya günlük kaydı bunu değiştirmez.

Bu yüzden yön tersine çevrildi. Aynı teknik yığın (yüz tespiti → betimleyici →
benzerlik karşılaştırması) kullanılır, ancak:

| | Reddedilen tasarım | İZ |
|---|---|---|
| Kaydedilen yüz | Hedef kişinin (rızasız) | Kullanıcının kendi yüzü (canlılık testiyle) |
| Sorgu yönü | 1:N — yabancı yüz koleksiyonunda arama | 1:1 — yalnızca kullanıcının kendi referansına karşı |
| Sorgulanan hesaplar | Hedefin hesapları | Kullanıcının kendi beyan ettiği hesapları |
| Çıktı | Bir yabancının kimliği | Kullanıcının kendi görünürlüğü |
| Fayda sahibi | Takip eden | Takip edilen |

## 2. Veri akışı

```
Kamera / yüklenen görsel
        │  (cihazdan hiç çıkmaz)
        ▼
  face-api.js  ──►  128 sayılık betimleyici
        │
        ▼
   IndexedDB (yalnızca tarayıcı)
```

Sunucuya giden tek veriler:

| Uç nokta | Giden veri | Sunucunun yaptığı |
|---|---|---|
| `POST /api/iz/scan` | Kullanıcının kendi beyan ettiği kullanıcı adları | Herkese açık profil adresine istek atar, "var/yok" döner |
| `GET /api/iz/avatar` | İncelenecek profilin adresi | Görseli getirip aktarır; **yüz işlemi yapmaz, saklamaz** |
| `POST /api/iz/letter` | Kullanıcının kendi girdiği metin alanları | KVKK talep metni taslağı üretir |

Sunucuda **kullanıcı hesabı, oturum, çerez veya veri tabanı kaydı yoktur.**
Yüz betimleyicisi hiçbir uç noktaya gönderilmez.

## 3. Uygulanan sınırlar

Bunlar yalnızca arayüz metni değil, kodda zorlanan kurallardır:

1. **Referans yüz yalnızca kameradan kaydedilir.**
   `LivenessCapture` dışında referans oluşturan bir yol yoktur; fotoğraf
   yükleyerek referans yüz kaydedilemez. Bu, başkasının fotoğrafıyla kayıt
   açılmasını engeller.
   → `components/iz/LivenessCapture.tsx`

2. **Canlılık testi, nötr → hareket geçişi arar.**
   Her hareket için önce nötr hâl gözlenmek zorundadır. Sabit bir görsel sabit
   ölçüm üretir ve bu geçişi hiçbir zaman sağlayamaz.
   → `lib/iz/face.ts` (`isChallengeNeutral` / `isChallengeSatisfied`)

3. **Karşılaştırma her zaman 1:1'dir.**
   Kodda yabancı yüzlerden oluşan bir koleksiyon yoktur. Karşılaştırılan tek
   çift: incelenen görsel ↔ kullanıcının kendi referansı.
   → `app/iz/taklit/page.tsx`

4. **Eşleşmeyen yüzler kaydedilmez.**
   Sonuç `no_match` ise hiçbir şey saklanmaz. Yalnızca kullanıcının kendi
   yüzüyle eşleşen ve kendi beyan etmediği hesaplar bulgu olarak tutulur.

5. **Tarama beyan olmadan çalışmaz.**
   `attested !== true` gelen istek sunucuda 403 ile reddedilir. Kural
   arayüzde değil sunucuda uygulanır ki arayüzü atlayan istemci de aşamasın.
   → `app/api/iz/scan/route.ts`

6. **Platform engelleri aşılmaz.**
   Otomatik sorguları engelleyen platformlar `blocked` olarak işaretlenir ve
   kullanıcıya elle kontrol bağlantısı verilir. Bot koruması atlatılmaz.

7. **Kullanıcı verdiği adresler SSRF'e karşı denetlenir.**
   Şema, port ve çözümlenen IP her yönlendirme adımında yeniden doğrulanır;
   dahili ağ ve bulut metadata adresleri reddedilir.
   → `lib/iz/safe-fetch.ts`

## 4. Dürüstçe: neyi karşılamıyor

- **Canlılık testi video saldırısına dayanıklı değildir.** Basılı fotoğrafa ve
  statik görsele karşı etkilidir; kararlı bir saldırganın önceden hazırladığı
  videoya karşı değildir. Bu bir kimlik doğrulama sistemi değil, kötüye
  kullanımı zorlaştıran bir engeldir. Gerçek bir kimlik doğrulaması gerekiyorsa
  derinlik sensörü veya sunucu taraflı canlılık analizi gerekir.

- **Yüz karşılaştırması olasılıksaldır.** Benzeyen yüzler yanlış pozitif,
  kötü ışık/açı yanlış negatif üretebilir. Bu yüzden eşik 0.6 yerine daha
  temkinli 0.55 seçildi ve arayüz sonucu "kanıt" değil "işaret" olarak sunar.

- **Tarama eksiksiz değildir.** Yalnızca `lib/iz/platforms.ts` içindeki
  platformlar ve yalnızca kullanıcının girdiği kullanıcı adları kontrol edilir.
  "Bulunamadı", internette iz olmadığı anlamına gelmez.

- **Hız sınırı süreç belleğindedir.** Tek örnekli dağıtımda yeterlidir; çok
  örnekli bir dağıtımda paylaşımlı bir sayaç (Redis vb.) gerekir.

- **Üretilen KVKK metinleri hukuki tavsiye değildir.** Taslaktır; gönderilmeden
  önce okunmalı ve gerekirse hukukçuya danışılmalıdır.

## 5. Yeni özellik eklerken

Bu modüle eklenecek her özellik şu testten geçmelidir:

> Bu özellik, kullanıcının **kendisi hakkında** bilgi vermek yerine
> **bir başkası hakkında** bilgi vermeye başlıyor mu?

Cevap evetse özellik bu modüle ait değildir. Özellikle şunlar bilinçli olarak
yoktur ve eklenmemelidir:

- Yüz görselinden internette kimlik arama (tersine yüz araması)
- Birden fazla kişinin yüzünü saklayan bir koleksiyon
- Beyan edilmemiş kullanıcı adları için toplu tarama
- Bulunan profillerden kişisel bilgi çıkarma/biriktirme
