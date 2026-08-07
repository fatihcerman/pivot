'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useVault } from '@/components/iz/VaultProvider';
import { getPlatform } from '@/lib/iz/platforms';
import styles from '../iz.module.css';

type LetterKind = 'impersonation' | 'erasure';

export default function RaporPage() {
  const { vault, ready } = useVault();

  const [kind, setKind] = useState<LetterKind>('impersonation');
  const [findingId, setFindingId] = useState<string>('');
  const [platformName, setPlatformName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'template' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const scan = vault.scans[0];
  const publicResults = useMemo(
    () => scan?.results.filter((result) => result.status === 'found') ?? [],
    [scan]
  );

  /** Bulgu seçilince ilgili alanları otomatik doldur. */
  const selectFinding = useCallback(
    (id: string) => {
      setFindingId(id);
      const finding = vault.findings.find((item) => item.id === id);
      if (!finding) return;
      setTargetUrl(finding.profileUrl);
      const platform = finding.platformId ? getPlatform(finding.platformId) : undefined;
      setPlatformName(platform?.name ?? '');
    },
    [vault.findings]
  );

  const generate = useCallback(async () => {
    setError(null);
    setCopied(false);
    setBusy(true);
    try {
      const response = await fetch('/api/iz/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          displayName: vault.identity.displayName,
          platformName,
          profileUrl: targetUrl,
          handle:
            vault.identity.handles.find(
              (item) => getPlatform(item.platformId)?.name === platformName
            )?.handle ?? '',
          notes,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Metin oluşturulamadı.');
        return;
      }

      setLetter(payload.letter);
      setSource(payload.source);
    } catch {
      setError('Bağlantı hatası oluştu.');
    } finally {
      setBusy(false);
    }
  }, [kind, notes, platformName, targetUrl, vault.identity]);

  const copyLetter = useCallback(async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
    } catch {
      setError('Panoya kopyalanamadı. Metni elle seçip kopyalayabilirsiniz.');
    }
  }, [letter]);

  if (!ready) {
    return <div className={styles.empty}>Yükleniyor…</div>;
  }

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Adım 4</p>
        <h1 className={styles.title}>Rapor ve talep metni</h1>
        <p className={styles.lede}>
          Bulgularınızın özeti ve platforma ya da veri sorumlusuna gönderebileceğiniz
          KVKK talep metni.
        </p>
      </header>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Durum özeti</h2>
        <div className={styles.spacer} />
        <div className={styles.resultList}>
          <div className={styles.resultRow}>
            <div className={styles.resultMain}>
              <div className={styles.resultName}>Herkese açık profiller</div>
              <div className={styles.resultHandle}>
                {scan
                  ? `${new Date(scan.createdAt).toLocaleDateString('tr-TR')} tarihli tarama`
                  : 'Henüz tarama yapılmadı'}
              </div>
            </div>
            <span
              className={`${styles.badge} ${
                publicResults.length > 0 ? styles.badgeWarn : styles.badgeNeutral
              }`}
            >
              {publicResults.length}
            </span>
          </div>
          <div className={styles.resultRow}>
            <div className={styles.resultMain}>
              <div className={styles.resultName}>Olası taklit bulguları</div>
              <div className={styles.resultHandle}>
                Yüzü sizinle eşleşen, size ait olmayan hesaplar
              </div>
            </div>
            <span
              className={`${styles.badge} ${
                vault.findings.length > 0 ? styles.badgeDanger : styles.badgeNeutral
              }`}
            >
              {vault.findings.length}
            </span>
          </div>
        </div>

        {publicResults.length > 0 && (
          <>
            <div className={styles.spacer} />
            <p className={styles.hint}>
              Herkese açık profiller: {publicResults.map((r) => r.platformName).join(', ')}.
              Bu profillerde adınız, fotoğrafınız ve paylaşımlarınız oturum açmamış
              herkes tarafından görülebiliyor.
            </p>
          </>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Talep metni oluştur</h2>

        <div className={styles.spacer} />

        <div className={styles.field}>
          <span className={styles.label}>Talep türü</span>
          <select
            className={styles.select}
            value={kind}
            onChange={(event) => setKind(event.target.value as LetterKind)}
          >
            <option value="impersonation">
              Sahte/taklit hesabın kaldırılması bildirimi
            </option>
            <option value="erasure">Kişisel verilerimin silinmesi talebi</option>
          </select>
        </div>

        {vault.findings.length > 0 && kind === 'impersonation' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="finding">
              Kayıtlı bulgudan doldur
            </label>
            <select
              id="finding"
              className={styles.select}
              value={findingId}
              onChange={(event) => selectFinding(event.target.value)}
            >
              <option value="">Seçiniz…</option>
              {vault.findings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.handle ?? item.profileUrl}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="platformName">
            Platform
          </label>
          <input
            id="platformName"
            className={styles.input}
            value={platformName}
            onChange={(event) => setPlatformName(event.target.value)}
            placeholder="Instagram, LinkedIn…"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="targetUrl">
            İlgili adres
          </label>
          <input
            id="targetUrl"
            className={styles.input}
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            placeholder="https://..."
            inputMode="url"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="notes">
            Ek açıklama (isteğe bağlı)
          </label>
          <textarea
            id="notes"
            className={styles.textarea}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Durumu kendi cümlelerinizle kısaca anlatın."
          />
        </div>

        {error && <div className={`${styles.notice} ${styles.noticeDanger}`}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={generate}
            disabled={busy}
          >
            {busy ? 'Hazırlanıyor…' : 'Metni oluştur'}
          </button>
          {!vault.identity.displayName && (
            <span className={styles.muted}>
              Ad Soyad girmediyseniz metinde boş bırakılır —{' '}
              <Link href="/iz/tarama" className={styles.link}>
                buradan ekleyebilirsiniz
              </Link>
              .
            </span>
          )}
        </div>
      </section>

      {letter && (
        <section className={styles.card}>
          <div className={styles.rowBetween}>
            <h2 className={styles.sectionTitle}>Oluşturulan metin</h2>
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              {source === 'ai' ? 'Yapay zekâ ile' : 'Hazır şablon'}
            </span>
          </div>

          <div className={styles.spacer} />

          <div className={`${styles.notice} ${styles.noticeWarn}`}>
            <strong className={styles.noticeTitle}>Hukuki tavsiye değildir</strong>
            Bu metin bir taslaktır. Göndermeden önce okuyun, köşeli parantezli alanları
            doldurun ve doğruluğunu kendiniz denetleyin.
          </div>

          <pre className={styles.output}>{letter}</pre>

          <div className={styles.spacer} />

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonGhost}`}
              onClick={copyLetter}
            >
              {copied ? 'Kopyalandı ✓' : 'Panoya kopyala'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
