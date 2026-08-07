'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import LivenessCapture, { type LivenessResult } from '@/components/iz/LivenessCapture';
import { useVault } from '@/components/iz/VaultProvider';
import { LIVENESS_CHALLENGE_LABELS } from '@/lib/iz/types';
import styles from '../iz.module.css';

export default function KayitPage() {
  const { vault, ready, update } = useVault();
  const [saved, setSaved] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleComplete = useCallback(
    async (result: LivenessResult) => {
      await update((current) => ({
        ...current,
        reference: {
          descriptor: result.descriptor,
          passedChallenges: result.passedChallenges,
          sampleCount: result.sampleCount,
          createdAt: new Date().toISOString(),
        },
      }));
      setSaved(true);
    },
    [update]
  );

  const removeReference = useCallback(async () => {
    await update((current) => ({ ...current, reference: null }));
    setSaved(false);
    setConsent(false);
  }, [update]);

  const existing = vault.reference;

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Adım 1</p>
        <h1 className={styles.title}>Yüz kaydı</h1>
        <p className={styles.lede}>
          Taklit kontrolünün karşılaştırma yapabilmesi için kendi yüzünüzü bir kez
          kaydetmeniz gerekir. Kayıt kamera üzerinden ve canlılık testiyle yapılır;
          fotoğraf yükleyerek kayıt yapılamaz.
        </p>
      </header>

      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <strong className={styles.noticeTitle}>Bu veri cihazınızdan çıkmıyor</strong>
        Kamera görüntüsü hiçbir zaman sunucuya gönderilmez. Yüzünüzden yalnızca 128
        sayıdan oluşan, görüntüye geri çevrilemeyen bir betimleyici üretilir ve bu
        betimleyici tarayıcınızın yerel deposunda kalır. Fotoğrafınız hiç saklanmaz.
      </div>

      {!ready ? (
        <div className={styles.empty}>Yükleniyor…</div>
      ) : existing ? (
        <section className={styles.card}>
          <div className={styles.rowBetween}>
            <div>
              <h2 className={styles.sectionTitle}>Kayıtlı yüzünüz var</h2>
              <p className={styles.muted}>
                {new Date(existing.createdAt).toLocaleString('tr-TR')} tarihinde,{' '}
                {existing.sampleCount} örnekten oluşturuldu.
              </p>
            </div>
            <span className={`${styles.badge} ${styles.badgeOk}`}>Hazır</span>
          </div>

          <div className={styles.spacer} />

          <p className={styles.hint}>
            Doğrulanan hareketler:{' '}
            {existing.passedChallenges
              .map((challenge) => LIVENESS_CHALLENGE_LABELS[challenge])
              .join(', ') || 'kayıt yok'}
          </p>

          <div className={styles.spacer} />

          <div className={styles.actions}>
            <Link
              href="/iz/taklit"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Taklit kontrolüne geç
            </Link>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={removeReference}
            >
              Kaydı sil ve yeniden yap
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Kamera ile kayıt</h2>
          <p className={styles.hint}>
            Ekranda çıkan hareketleri sırayla yapın. Bu hareketler, kaydedilen yüzün
            ekranın başındaki kişiye ait olduğunu doğrular — başkasının fotoğrafıyla
            kayıt yapılmasını engeller.
          </p>

          <div className={styles.spacer} />

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span className={styles.checkText}>
              Kaydedeceğim yüzün <strong>bana ait</strong> olduğunu ve bu aracı yalnızca
              kendi dijital izimi denetlemek için kullanacağımı onaylıyorum.
            </span>
          </label>

          <div className={styles.spacer} />

          {consent ? (
            <LivenessCapture onComplete={handleComplete} />
          ) : (
            <p className={styles.muted}>
              Kamerayı başlatmak için yukarıdaki onayı vermeniz gerekiyor.
            </p>
          )}
        </section>
      )}

      {saved && (
        <div className={`${styles.notice} ${styles.noticeInfo}`} style={{ marginTop: '1.25rem' }}>
          <strong className={styles.noticeTitle}>Kaydedildi</strong>
          Referans yüzünüz tarayıcınıza kaydedildi. Artık taklit kontrolü yapabilirsiniz.
        </div>
      )}
    </>
  );
}
