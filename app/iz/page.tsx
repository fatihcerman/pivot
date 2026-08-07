'use client';

import Link from 'next/link';
import { useVault } from '@/components/iz/VaultProvider';
import styles from './iz.module.css';

export default function IzHomePage() {
  const { vault, ready } = useVault();

  const scan = vault.scans[0];
  const publicCount = scan?.results.filter((r) => r.status === 'found').length ?? 0;

  const steps = [
    {
      href: '/iz/kayit',
      index: '01',
      title: 'Yüz kaydı',
      body: 'Kendi yüzünüzü kamera ve canlılık testiyle bir kez kaydedin. Görüntü cihazınızdan çıkmaz.',
      status: vault.reference
        ? { label: 'Tamamlandı', className: styles.badgeOk }
        : { label: 'Bekliyor', className: styles.badgeNeutral },
    },
    {
      href: '/iz/tarama',
      index: '02',
      title: 'Hesap taraması',
      body: 'Kendi kullanıcı adlarınızın hangi platformlarda herkese açık göründüğünü öğrenin.',
      status: scan
        ? {
            label: `${publicCount} herkese açık`,
            className: publicCount > 0 ? styles.badgeWarn : styles.badgeOk,
          }
        : { label: 'Bekliyor', className: styles.badgeNeutral },
    },
    {
      href: '/iz/taklit',
      index: '03',
      title: 'Taklit kontrolü',
      body: 'Şüphelendiğiniz bir profilin sizin fotoğrafınızı kullanıp kullanmadığını kontrol edin.',
      status:
        vault.findings.length > 0
          ? { label: `${vault.findings.length} bulgu`, className: styles.badgeDanger }
          : { label: vault.reference ? 'Hazır' : 'Yüz kaydı gerekli', className: styles.badgeNeutral },
    },
    {
      href: '/iz/rapor',
      index: '04',
      title: 'Rapor ve talep metni',
      body: 'Bulgularınızın özetini görün ve KVKK kaldırma/silme talebi taslağı oluşturun.',
      status: { label: 'Her zaman açık', className: styles.badgeNeutral },
    },
  ];

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Dijital İz Denetimi</p>
        <h1 className={styles.title}>
          İnternette sizden ne görünüyor?
        </h1>
        <p className={styles.lede}>
          İZ, kendi dijital izinizi denetlemeniz için bir araçtır: hangi hesaplarınız
          herkese açık, o hesaplarda dışarıdan ne okunuyor, adınıza sizin fotoğrafınızı
          kullanan sahte bir hesap var mı. Yüz işlemlerinin tamamı tarayıcınızda çalışır.
        </p>
      </header>

      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <strong className={styles.noticeTitle}>Bu araç yabancıları tanımlamaz</strong>
        Bir fotoğraftan başkasının kimliğini bulma özelliği yoktur. Kaydedebileceğiniz tek
        yüz kendi yüzünüz, sorgulayabileceğiniz tek hesap kendi hesabınızdır.{' '}
        <Link href="/iz/ilkeler" className={styles.link}>
          İlkeler ve sınırlar →
        </Link>
      </div>

      {ready && !vault.reference && (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          <strong className={styles.noticeTitle}>Başlamak için</strong>
          Taklit kontrolü için önce yüz kaydı gerekiyor. Hesap taraması ise kayıt olmadan
          da çalışır.
        </div>
      )}

      <div className={styles.cardGrid}>
        {steps.map((step) => (
          <Link key={step.href} href={step.href} className={styles.stepCard}>
            <div className={styles.rowBetween}>
              <span className={styles.stepIndex}>{step.index}</span>
              {ready && (
                <span className={`${styles.badge} ${step.status.className}`}>
                  {step.status.label}
                </span>
              )}
            </div>
            <h2 className={styles.stepTitle}>{step.title}</h2>
            <p className={styles.stepBody}>{step.body}</p>
          </Link>
        ))}
      </div>

      <div className={styles.spacer} />

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Verileriniz nerede duruyor?</h2>
        <div className={styles.spacer} />
        <p className={styles.hint}>
          Hiçbir yerde hesabınız açılmaz. Yüz betimleyiciniz, beyan ettiğiniz kullanıcı
          adları ve tarama sonuçlarınız yalnızca bu tarayıcının yerel deposunda tutulur.
          Sunucu yalnızca iki iş yapar: girdiğiniz kullanıcı adının herkese açık profilinin
          olup olmadığına bakar ve incelemek istediğiniz profilin görselini size aktarır.
        </p>
        <div className={styles.spacer} />
        <div className={styles.actions}>
          <Link href="/iz/verilerim" className={`${styles.button} ${styles.buttonGhost}`}>
            Verilerimi gör ve sil
          </Link>
        </div>
      </section>
    </>
  );
}
