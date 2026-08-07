This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Uygulamalar

Depo iki uygulamayı barındırır:

- **PIVOT** (`/`) — AI destekli oyun haberleri.
- **İZ** (`/iz`) — Dijital İz Denetimi: kullanıcının **kendi** dijital ayak izini
  denetlemesi için bir araç.

### İZ — Dijital İz Denetimi

Kullanıcı kendi yüzünü canlılık testiyle bir kez kaydeder; ardından kendi
kullanıcı adlarının hangi platformlarda herkese açık göründüğünü görür, şüpheli
bir profilin kendi fotoğrafını kullanıp kullanmadığını kontrol eder ve gerekirse
KVKK kaldırma/silme talebi taslağı üretir.

Tasarımın belirleyici kuralı: **araç yabancıları tanımlamaz.** Kaydedilebilen tek
yüz kullanıcının kendi yüzü, sorgulanabilen tek hesap kullanıcının kendi
hesabıdır. Karşılaştırma her zaman 1:1'dir ve yüz verisi tarayıcıdan çıkmaz.
Gerekçe, tehdit modeli ve kodda zorlanan sınırlar için
[`docs/iz-gizlilik.md`](docs/iz-gizlilik.md).

Yüz modeli ağırlıkları `npm install` sırasında `node_modules` içinden
`public/models` altına kopyalanır (`npm run face-models` ile elle de
çalıştırılabilir); dış bir CDN'e istek yapılmaz. Kamera erişimi tarayıcı
tarafından güvenli bağlam gerektirir — üretimde HTTPS, geliştirmede
`http://localhost` çalışır.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
