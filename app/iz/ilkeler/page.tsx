import type { Metadata } from 'next';
import styles from '../iz.module.css';

export const metadata: Metadata = {
  title: 'İlkeler ve sınırlar | İZ',
};

const GUARANTEES = [
  {
    title: 'Yüz verisi cihazdan çıkmaz',
    body: 'Kamera görüntüsü ve yüklediğiniz görseller yalnızca tarayıcınızda işlenir. Sunucuya gönderilen tek şey, taklit kontrolünde incelenecek profilin adresidir; yüz karşılaştırması yine sizin cihazınızda yapılır.',
  },
  {
    title: 'Fotoğraf saklanmaz',
    body: 'Yüzünüzden geri döndürülemeyen 128 sayılık bir betimleyici üretilir ve yalnızca o saklanır. Referans fotoğrafınız hiçbir aşamada kaydedilmez.',
  },
  {
    title: 'Yalnızca kendi yüzünüz kaydedilebilir',
    body: 'Kayıt yalnızca kamera üzerinden ve canlılık testiyle yapılır. Fotoğraf yükleyerek referans yüz oluşturulamaz — bu, başkasının fotoğrafıyla kayıt açılmasını engeller.',
  },
  {
    title: 'Yabancı yüz veri tabanı yoktur',
    body: 'Sistemde başka insanların yüzlerinden oluşan bir koleksiyon yoktur. Her karşılaştırma 1:1\'dir: incelenen görsel yalnızca sizin referansınızla kıyaslanır.',
  },
  {
    title: 'Yüzden kimlik aranmaz',
    body: 'Bir yüz görselini alıp internette kimliğini arama özelliği yoktur ve eklenmeyecektir. Yüz size ait değilse verilen tek yanıt "eşleşme yok"tur; o kişi hakkında hiçbir bilgi üretilmez veya kaydedilmez.',
  },
  {
    title: 'Hesap taraması beyana bağlıdır',
    body: 'Kullanıcı adı taraması yalnızca "bu hesaplar bana ait" beyanıyla çalışır. Bu koşul arayüzde değil sunucuda zorunlu tutulur; beyansız istek reddedilir.',
  },
  {
    title: 'Sunucuda kaydınız yoktur',
    body: 'Kullanıcı hesabı, oturum, çerez veya veri tabanı kaydı yoktur. Bu yüzden "verilerimi sil" işlemi eksiksizdir: silinecek uzak kopya bulunmaz.',
  },
  {
    title: 'Platform engelleri aşılmaz',
    body: 'Otomatik sorguları engelleyen platformlarda engel aşılmaya çalışılmaz. Sonuç "elle kontrol edin" olarak işaretlenir ve size bağlantı verilir.',
  },
];

const LIMITS = [
  {
    title: 'Canlılık testinin sınırı',
    body: 'İstenen hareketler basılı fotoğrafa ve statik görsele karşı etkilidir. Önceden hazırlanmış bir video ile kandırılmaya karşı dayanıklı değildir. Bu test bir kimlik doğrulama sistemi değil, kötüye kullanımı zorlaştıran bir engeldir.',
  },
  {
    title: 'Yüz karşılaştırması olasılıksaldır',
    body: 'Benzeyen yüzler yanlış eşleşme, kötü ışık ve açı ise kaçırılmış eşleşme üretebilir. Sonuçlar bir kanıt değil, kendi gözünüzle doğrulamanız gereken bir işarettir.',
  },
  {
    title: 'Tarama eksiksiz değildir',
    body: 'Yalnızca listelenen platformlar ve yalnızca sizin girdiğiniz kullanıcı adları kontrol edilir. "Bulunamadı" sonucu, internette hiçbir izinizin olmadığı anlamına gelmez.',
  },
  {
    title: 'Hukuki tavsiye verilmez',
    body: 'Üretilen KVKK talep metinleri taslaktır. Göndermeden önce içeriğini okumanız ve gerekiyorsa bir hukukçuya danışmanız gerekir.',
  },
];

export default function IlkelerPage() {
  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Şeffaflık</p>
        <h1 className={styles.title}>İlkeler ve sınırlar</h1>
        <p className={styles.lede}>
          Bu araç, yüz tanımayı yalnızca tek bir yönde kullanır: kendi yüzünüzü, kendi
          izinizi denetlemek için. Aşağıdaki maddeler ürünün ne yaptığını ve neyi
          bilerek yapmadığını anlatır.
        </p>
      </header>

      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <strong className={styles.noticeTitle}>Neden böyle tasarlandı</strong>
        Bir fotoğraftan yabancı birinin kimliğini ve hesaplarını bulan araçlarda rıza
        verecek kişi, ekranın başındaki kullanıcı değil fotoğraftaki kişidir — ve o rıza
        hiçbir zaman alınamaz. Bu yüzden İZ, yönü tersine çevirir: kaydedilen yüz
        kullanıcının kendi yüzüdür, sorgulanan hesaplar kullanıcının kendi hesaplarıdır.
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Verdiğimiz güvenceler</h2>
        <div className={styles.spacer} />
        <div className={styles.stack}>
          {GUARANTEES.map((item) => (
            <div key={item.title}>
              <div className={styles.resultName}>{item.title}</div>
              <p className={styles.hint}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Dürüstçe söylenmesi gereken sınırlar</h2>
        <div className={styles.spacer} />
        <div className={styles.stack}>
          {LIMITS.map((item) => (
            <div key={item.title}>
              <div className={styles.resultName}>{item.title}</div>
              <p className={styles.hint}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
