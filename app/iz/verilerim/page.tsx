'use client';

import { useCallback, useState } from 'react';
import { useVault } from '@/components/iz/VaultProvider';
import { serializeVault } from '@/lib/iz/store';
import styles from '../iz.module.css';

export default function VerilerimPage() {
  const { vault, ready, reset } = useVault();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  const exportVault = useCallback(() => {
    const blob = new Blob([serializeVault(vault)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iz-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [vault]);

  const deleteAll = useCallback(async () => {
    await reset();
    setConfirming(false);
    setCleared(true);
  }, [reset]);

  if (!ready) {
    return <div className={styles.empty}>Yükleniyor…</div>;
  }

  const rows = [
    {
      label: 'Referans yüz betimleyicisi',
      value: vault.reference ? '1 kayıt (128 sayı)' : 'Yok',
      detail: vault.reference
        ? `${new Date(vault.reference.createdAt).toLocaleString('tr-TR')} tarihinde oluşturuldu`
        : 'Henüz yüz kaydı yapılmadı',
    },
    {
      label: 'Beyan edilen hesaplar',
      value: `${vault.identity.handles.length} hesap`,
      detail: vault.identity.displayName
        ? `Ad: ${vault.identity.displayName}`
        : 'Ad girilmedi',
    },
    {
      label: 'Tarama sonuçları',
      value: `${vault.scans[0]?.results.length ?? 0} sonuç`,
      detail: vault.scans[0]
        ? `${new Date(vault.scans[0].createdAt).toLocaleString('tr-TR')} tarihli`
        : 'Tarama yapılmadı',
    },
    {
      label: 'Taklit bulguları',
      value: `${vault.findings.length} kayıt`,
      detail: 'Yalnızca olası taklit sonuçları saklanır',
    },
  ];

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Veri kontrolü</p>
        <h1 className={styles.title}>Verilerim</h1>
        <p className={styles.lede}>
          Bu uygulamanın sizin hakkınızda tuttuğu her şey burada listelenir. Tamamı
          tarayıcınızda durur; sunucuda hesabınız veya kaydınız yoktur.
        </p>
      </header>

      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <strong className={styles.noticeTitle}>Silme gerçekten siler</strong>
        Sunucuda kopya tutulmadığı için &quot;verilerimi sil&quot; işlemi tamdır: tarayıcı
        deposu temizlendiğinde geriye hiçbir yerde kayıt kalmaz.
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Saklanan veriler</h2>
        <div className={styles.spacer} />
        <div className={styles.resultList}>
          {rows.map((row) => (
            <div key={row.label} className={styles.resultRow}>
              <div className={styles.resultMain}>
                <div className={styles.resultName}>{row.label}</div>
                <div className={styles.resultHandle}>{row.detail}</div>
              </div>
              <span className={`${styles.badge} ${styles.badgeNeutral}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>İşlemler</h2>
        <div className={styles.spacer} />

        {cleared && (
          <div className={`${styles.notice} ${styles.noticeInfo}`}>
            Tüm yerel verileriniz silindi.
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost}`}
            onClick={exportVault}
          >
            JSON olarak dışa aktar
          </button>

          {confirming ? (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={deleteAll}
              >
                Evet, hepsini sil
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost}`}
                onClick={() => setConfirming(false)}
              >
                Vazgeç
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={() => {
                setConfirming(true);
                setCleared(false);
              }}
            >
              Tüm verilerimi sil
            </button>
          )}
        </div>

        <div className={styles.spacer} />
        <p className={styles.hint}>
          Dışa aktarılan dosya yüz betimleyicinizi de içerir. Betimleyici fotoğrafa geri
          çevrilemez ama yine de kimliğinizle ilişkili bir veridir — paylaşırken dikkatli olun.
        </p>
      </section>
    </>
  );
}
