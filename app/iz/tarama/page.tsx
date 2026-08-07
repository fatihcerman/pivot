'use client';

import { useCallback, useMemo, useState } from 'react';
import { useVault } from '@/components/iz/VaultProvider';
import { getPlatform, HANDLE_PATTERN, PLATFORMS } from '@/lib/iz/platforms';
import { createId } from '@/lib/iz/store';
import type { DeclaredHandle, PresenceResult, PresenceStatus } from '@/lib/iz/types';
import styles from '../iz.module.css';

const STATUS_BADGE: Record<PresenceStatus, { label: string; className: string }> = {
  found: { label: 'Herkese açık', className: 'badgeWarn' },
  not_found: { label: 'Bulunamadı', className: 'badgeNeutral' },
  blocked: { label: 'Elle kontrol', className: 'badgeNeutral' },
  error: { label: 'Hata', className: 'badgeDanger' },
};

export default function TaramaPage() {
  const { vault, ready, update } = useVault();

  const [displayName, setDisplayName] = useState('');
  const [rows, setRows] = useState<DeclaredHandle[]>([]);
  const [attested, setAttested] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PresenceResult[] | null>(null);

  // Kasadan gelen veriyi forma bir kez aktar.
  const [hydrated, setHydrated] = useState(false);
  if (ready && !hydrated) {
    setHydrated(true);
    setDisplayName(vault.identity.displayName);
    setRows(
      vault.identity.handles.length > 0
        ? vault.identity.handles
        : [{ id: createId(), platformId: PLATFORMS[0].id, handle: '' }]
    );
    setAttested(Boolean(vault.identity.attestedAt));
    setResults(vault.scans[0]?.results ?? null);
  }

  const filledRows = useMemo(
    () => rows.filter((row) => row.handle.trim().length > 0),
    [rows]
  );

  const invalidRow = useMemo(
    () => filledRows.find((row) => !HANDLE_PATTERN.test(row.handle.trim())),
    [filledRows]
  );

  const addRow = useCallback(() => {
    setRows((current) => [
      ...current,
      { id: createId(), platformId: PLATFORMS[0].id, handle: '' },
    ]);
  }, []);

  const updateRow = useCallback(
    (id: string, patch: Partial<DeclaredHandle>) => {
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, ...patch } : row))
      );
    },
    []
  );

  const removeRow = useCallback((id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  }, []);

  const runScan = useCallback(async () => {
    setError(null);

    if (!attested) {
      setError('Taramadan önce hesapların size ait olduğunu onaylamanız gerekiyor.');
      return;
    }
    if (filledRows.length === 0) {
      setError('En az bir kullanıcı adı girin.');
      return;
    }
    if (invalidRow) {
      setError(
        `"${invalidRow.handle}" geçerli bir kullanıcı adı değil. Yalnızca harf, rakam, nokta, alt çizgi ve tire kullanın.`
      );
      return;
    }

    setScanning(true);
    try {
      const response = await fetch('/api/iz/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attested: true,
          handles: filledRows.map((row) => ({
            platformId: row.platformId,
            handle: row.handle.trim(),
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Tarama başarısız oldu.');
        return;
      }

      const scanResults: PresenceResult[] = payload.results;
      setResults(scanResults);

      const attestedAt = new Date().toISOString();
      await update((current) => ({
        ...current,
        identity: {
          displayName: displayName.trim(),
          handles: filledRows.map((row) => ({ ...row, handle: row.handle.trim() })),
          attestedAt,
        },
        // Yalnızca son tarama saklanır; geçmiş biriktirmeye gerek yok.
        scans: [{ id: createId(), results: scanResults, createdAt: attestedAt }],
      }));
    } catch {
      setError('Tarama sırasında bağlantı hatası oluştu.');
    } finally {
      setScanning(false);
    }
  }, [attested, displayName, filledRows, invalidRow, update]);

  const foundCount = results?.filter((result) => result.status === 'found').length ?? 0;

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Adım 2</p>
        <h1 className={styles.title}>Hesap taraması</h1>
        <p className={styles.lede}>
          Kendi kullanıcı adlarınızın hangi platformlarda herkese açık bir profil olarak
          göründüğünü ve o profillerde dışarıdan hangi bilgilerin okunabildiğini gösterir.
        </p>
      </header>

      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <strong className={styles.noticeTitle}>Yalnızca kendi hesaplarınız</strong>
        Bu tarama sadece sizin girdiğiniz kullanıcı adlarını kontrol eder ve yalnızca
        &quot;bu adda herkese açık profil var mı&quot; sorusunu yanıtlar. Ad veya fotoğrafla
        kişi araması yapmaz. Onay kutusu işaretlenmeden istek sunucu tarafında reddedilir.
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Kimlik bilgileriniz</h2>

        <div className={styles.spacer} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">
            Ad Soyad (isteğe bağlı)
          </label>
          <input
            id="displayName"
            className={styles.input}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Talep metinlerinde kullanılır"
          />
          <span className={styles.hint}>
            Yalnızca KVKK talep metni oluştururken kullanılır, hiçbir yere gönderilmez.
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Kullanıcı adlarınız</span>
          {rows.map((row) => (
            <div key={row.id} className={styles.handleRow}>
              <select
                className={styles.select}
                value={row.platformId}
                onChange={(event) => updateRow(row.id, { platformId: event.target.value })}
                aria-label="Platform"
              >
                {PLATFORMS.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                value={row.handle}
                onChange={(event) => updateRow(row.id, { handle: event.target.value })}
                placeholder="kullanici_adi"
                aria-label="Kullanıcı adı"
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => removeRow(row.id)}
                aria-label="Satırı sil"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost}`}
            onClick={addRow}
          >
            + Hesap ekle
          </button>
        </div>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={attested}
            onChange={(event) => setAttested(event.target.checked)}
          />
          <span className={styles.checkText}>
            Yukarıdaki hesapların <strong>bana ait olduğunu</strong> beyan ederim ve bu
            taramayı kendi dijital izimi görmek için yapıyorum.
          </span>
        </label>

        {error && (
          <>
            <div className={styles.spacer} />
            <div className={`${styles.notice} ${styles.noticeDanger}`}>{error}</div>
          </>
        )}

        <div className={styles.spacer} />

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={runScan}
            disabled={scanning || !attested || filledRows.length === 0}
          >
            {scanning ? 'Taranıyor…' : 'Taramayı başlat'}
          </button>
          <span className={styles.muted}>
            {filledRows.length} hesap kontrol edilecek
          </span>
        </div>
      </section>

      {results && (
        <section className={styles.card}>
          <div className={styles.rowBetween}>
            <h2 className={styles.sectionTitle}>Sonuçlar</h2>
            <span
              className={`${styles.badge} ${
                foundCount > 0 ? styles.badgeWarn : styles.badgeOk
              }`}
            >
              {foundCount} herkese açık
            </span>
          </div>

          <div className={styles.spacer} />

          <div className={styles.resultList}>
            {results.map((result) => {
              const badge = STATUS_BADGE[result.status];
              const platform = getPlatform(result.platformId);
              return (
                <article
                  key={`${result.platformId}-${result.handle}`}
                  className={styles.resultRow}
                >
                  <div className={styles.resultMain}>
                    <div className={styles.resultName}>{result.platformName}</div>
                    <div className={styles.resultHandle}>{result.handle}</div>
                  </div>
                  <span
                    className={`${styles.badge} ${
                      styles[badge.className as keyof typeof styles]
                    }`}
                  >
                    {badge.label}
                  </span>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.link}
                  >
                    Profili aç ↗
                  </a>
                  <p className={styles.resultDetail}>{result.detail}</p>

                  {result.status === 'found' && result.exposedFields && (
                    <div className={styles.exposedList}>
                      {result.exposedFields.map((field) => (
                        <span key={field} className={styles.exposedTag}>
                          {field}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.status === 'found' && platform?.privacyUrl && (
                    <a
                      href={platform.privacyUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={styles.link}
                    >
                      Gizlilik ayarlarını aç ↗
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
