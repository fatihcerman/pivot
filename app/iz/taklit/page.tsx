'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useVault } from '@/components/iz/VaultProvider';
import {
  captureDescriptor,
  euclideanDistance,
  loadFaceModels,
  MATCH_THRESHOLD,
  similarityFromDistance,
} from '@/lib/iz/face';
import { detectPlatformFromUrl, extractHandleFromUrl } from '@/lib/iz/platforms';
import { createId } from '@/lib/iz/store';
import type { ImpersonationFinding, ImpersonationVerdict } from '@/lib/iz/types';
import styles from '../iz.module.css';

const VERDICT_TEXT: Record<
  ImpersonationVerdict,
  { label: string; badge: string; message: string }
> = {
  possible_impersonation: {
    label: 'Olası taklit',
    badge: 'badgeDanger',
    message:
      'Bu profildeki yüz sizin referans yüzünüzle eşleşiyor, ancak hesap kendi beyan ettiğiniz hesaplar arasında değil. Sizin fotoğrafınızı kullanan bir hesap olabilir.',
  },
  own_account: {
    label: 'Kendi hesabınız',
    badge: 'badgeOk',
    message:
      'Yüz eşleşti ve bu hesabı zaten kendinize ait olarak beyan etmiştiniz. Beklenen sonuç.',
  },
  no_match: {
    label: 'Eşleşme yok',
    badge: 'badgeNeutral',
    message:
      'Bu profildeki yüz sizin yüzünüzle eşleşmiyor. Bu kişi hakkında başka hiçbir bilgi üretilmez.',
  },
  no_face: {
    label: 'Yüz bulunamadı',
    badge: 'badgeNeutral',
    message:
      'Görselde yüz tespit edilemedi. Profil fotoğrafı yüz içermiyor olabilir; ekran görüntüsü yükleyerek deneyebilirsiniz.',
  },
};

export default function TaklitPage() {
  const { vault, ready, update } = useVault();

  const [profileUrl, setProfileUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [finding, setFinding] = useState<ImpersonationFinding | null>(null);

  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const releaseImage = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseImage, [releaseImage]);

  /** Blob'u <img> öğesine yükler — face-api yalnızca yüklenmiş görselde çalışır. */
  const loadImageElement = (source: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      image.src = source;
    });

  /** Ortak karşılaştırma: görselden betimleyici çıkar, referansla kıyasla. */
  const compare = useCallback(
    async (source: string, sourceUrl: string) => {
      const reference = vault.reference;
      if (!reference) return;

      setStep('Yüz modelleri hazırlanıyor…');
      await loadFaceModels();

      setStep('Görseldeki yüz inceleniyor…');
      const image = await loadImageElement(source);
      const descriptor = await captureDescriptor(image);

      const platform = detectPlatformFromUrl(sourceUrl);
      const handle = extractHandleFromUrl(sourceUrl);

      let verdict: ImpersonationVerdict;
      let distance: number | null = null;
      let similarity: number | null = null;

      if (!descriptor) {
        verdict = 'no_face';
      } else {
        distance = euclideanDistance(reference.descriptor, descriptor);
        similarity = similarityFromDistance(distance);

        if (distance > MATCH_THRESHOLD) {
          verdict = 'no_match';
        } else {
          // Eşleşti. Bu hesabı kullanıcı kendisi beyan etmiş mi?
          const isDeclared = vault.identity.handles.some(
            (declared) =>
              handle !== null &&
              declared.handle.toLowerCase() === handle.toLowerCase() &&
              (platform === null || declared.platformId === platform.id)
          );
          verdict = isDeclared ? 'own_account' : 'possible_impersonation';
        }
      }

      const result: ImpersonationFinding = {
        id: createId(),
        profileUrl: sourceUrl,
        platformId: platform?.id ?? null,
        handle,
        distance,
        similarity,
        verdict,
        note: VERDICT_TEXT[verdict].message,
        createdAt: new Date().toISOString(),
      };

      setFinding(result);

      // Yalnızca eyleme dönüşebilecek bulguları saklarız; eşleşmeyen
      // profilleri kaydetmek başkaları hakkında gereksiz kayıt tutmak olur.
      if (verdict === 'possible_impersonation') {
        await update((current) => ({
          ...current,
          findings: [result, ...current.findings].slice(0, 50),
        }));
      }
    },
    [update, vault.identity.handles, vault.reference]
  );

  const checkUrl = useCallback(async () => {
    setError(null);
    setFinding(null);
    releaseImage();
    setImageUrl(null);

    const trimmed = profileUrl.trim();
    if (!trimmed) {
      setError('Bir profil adresi girin.');
      return;
    }

    setBusy(true);
    try {
      setStep('Profil görseli alınıyor…');
      const response = await fetch(`/api/iz/avatar?url=${encodeURIComponent(trimmed)}`);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? 'Profil görseli alınamadı.');
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      setImageUrl(objectUrl);

      await compare(objectUrl, trimmed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Kontrol tamamlanamadı.');
    } finally {
      setBusy(false);
      setStep('');
    }
  }, [compare, profileUrl, releaseImage]);

  const checkFile = useCallback(
    async (file: File) => {
      setError(null);
      setFinding(null);
      releaseImage();

      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setImageUrl(objectUrl);

      setBusy(true);
      try {
        await compare(objectUrl, profileUrl.trim() || '(yüklenen görsel)');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Kontrol tamamlanamadı.');
      } finally {
        setBusy(false);
        setStep('');
      }
    },
    [compare, profileUrl, releaseImage]
  );

  if (!ready) {
    return <div className={styles.empty}>Yükleniyor…</div>;
  }

  if (!vault.reference) {
    return (
      <>
        <header className={styles.pageHead}>
          <p className={styles.eyebrow}>Adım 3</p>
          <h1 className={styles.title}>Taklit kontrolü</h1>
        </header>
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          <strong className={styles.noticeTitle}>Önce yüz kaydı gerekiyor</strong>
          Karşılaştırma yapabilmek için önce kendi yüzünüzü canlılık testiyle
          kaydetmelisiniz. Karşılaştırma her zaman <strong>yalnızca sizin
          yüzünüze karşı</strong> yapılır.
        </div>
        <Link href="/iz/kayit" className={`${styles.button} ${styles.buttonPrimary}`}>
          Yüz kaydına git
        </Link>
      </>
    );
  }

  const verdictInfo = finding ? VERDICT_TEXT[finding.verdict] : null;

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Adım 3</p>
        <h1 className={styles.title}>Taklit kontrolü</h1>
        <p className={styles.lede}>
          Şüphelendiğiniz bir profilin fotoğrafının size ait olup olmadığını kontrol
          edin. Karşılaştırma tarayıcınızda, yalnızca kendi kayıtlı yüzünüze karşı yapılır.
        </p>
      </header>

      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <strong className={styles.noticeTitle}>Bu araç kimlik tespiti yapmaz</strong>
        Verilebilecek tek yanıt &quot;bu yüz size ait mi, değil mi&quot; sorusudur. Yüz
        size ait değilse sonuç yalnızca &quot;eşleşme yok&quot; olur; o kişinin kim olduğu
        araştırılmaz, kaydedilmez, bir yerde aranmaz.
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>İncelenecek profil</h2>

        <div className={styles.spacer} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profileUrl">
            Profil adresi
          </label>
          <input
            id="profileUrl"
            className={styles.input}
            value={profileUrl}
            onChange={(event) => setProfileUrl(event.target.value)}
            placeholder="https://..."
            inputMode="url"
          />
          <span className={styles.hint}>
            Sayfanın herkese açık profil görseli alınır. Platform bunu engelliyorsa
            profilin ekran görüntüsünü yükleyebilirsiniz.
          </span>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={checkUrl}
            disabled={busy}
          >
            {busy ? 'Kontrol ediliyor…' : 'Adresten kontrol et'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            Görsel yükle
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void checkFile(file);
              event.target.value = '';
            }}
          />
          {step && <span className={styles.muted}>{step}</span>}
        </div>

        {error && (
          <>
            <div className={styles.spacer} />
            <div className={`${styles.notice} ${styles.noticeDanger}`}>{error}</div>
          </>
        )}
      </section>

      {(imageUrl || finding) && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Karşılaştırma</h2>

          <div className={styles.spacer} />

          <div className={styles.compareGrid}>
            <div className={styles.comparePane}>
              <div className={styles.comparePaneHead}>Sizin referansınız</div>
              <div className={styles.comparePlaceholder}>
                Yüzünüz görsel olarak saklanmıyor — yalnızca sayısal betimleyici
                tutuluyor.
              </div>
            </div>
            <div className={styles.comparePane}>
              <div className={styles.comparePaneHead}>İncelenen profil</div>
              {imageUrl ? (
                // Blob URL kullanıldığı için next/image değil, düz img.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="İncelenen profil görseli" className={styles.compareImage} />
              ) : (
                <div className={styles.comparePlaceholder}>Görsel yok</div>
              )}
            </div>
          </div>

          {finding && verdictInfo && (
            <>
              <div className={styles.rowBetween}>
                <span
                  className={`${styles.badge} ${
                    styles[verdictInfo.badge as keyof typeof styles]
                  }`}
                >
                  {verdictInfo.label}
                </span>
                {finding.similarity !== null && (
                  <span className={styles.muted}>
                    Benzerlik: %{Math.round(finding.similarity * 100)}
                  </span>
                )}
              </div>

              {finding.similarity !== null && (
                <div className={styles.scoreBar}>
                  <div
                    className={styles.scoreFill}
                    style={{
                      width: `${Math.round(finding.similarity * 100)}%`,
                      background:
                        finding.verdict === 'possible_impersonation'
                          ? 'var(--iz-danger)'
                          : 'var(--iz-accent)',
                    }}
                  />
                </div>
              )}

              <p className={styles.hint}>{finding.note}</p>

              {finding.verdict === 'possible_impersonation' && (
                <>
                  <div className={styles.spacer} />
                  <div className={`${styles.notice} ${styles.noticeWarn}`}>
                    <strong className={styles.noticeTitle}>Kesin kanıt değildir</strong>
                    Yüz karşılaştırması olasılıksaldır; benzeyen yüzler yanlış eşleşme
                    üretebilir. Bir hesabı bildirmeden önce profili kendiniz inceleyin.
                  </div>
                  <Link
                    href="/iz/rapor"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Kaldırma talebi metni oluştur
                  </Link>
                </>
              )}
            </>
          )}
        </section>
      )}

      {vault.findings.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Kayıtlı bulgular</h2>
          <div className={styles.spacer} />
          <div className={styles.resultList}>
            {vault.findings.map((item) => (
              <article key={item.id} className={styles.resultRow}>
                <div className={styles.resultMain}>
                  <div className={styles.resultName}>
                    {item.handle ?? 'Bilinmeyen hesap'}
                  </div>
                  <div className={styles.resultHandle}>{item.profileUrl}</div>
                </div>
                <span className={`${styles.badge} ${styles.badgeDanger}`}>
                  {item.similarity !== null
                    ? `%${Math.round(item.similarity * 100)} benzerlik`
                    : 'Bulgu'}
                </span>
                <span className={styles.muted}>
                  {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
