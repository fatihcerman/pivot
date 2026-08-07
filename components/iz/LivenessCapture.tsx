'use client';

/**
 * Canlılık doğrulamalı yüz kaydı.
 *
 * Neden canlılık testi var: bu araç yalnızca KENDİ yüzünüzü kaydetmeniz
 * için tasarlandı. Sıradan bir "fotoğraf yükle" akışı, başkasının
 * fotoğrafını yükleyip onun yüzünü aramak için kullanılabilirdi. Kamera
 * karşısında istenen hareketleri yapma zorunluluğu, kaydedilen yüzün
 * ekranın başındaki kişiye ait olmasını sağlar.
 *
 * Sınırı dürüstçe söylemek gerekir: bu test basılı fotoğrafa ve statik
 * görsele karşı etkilidir, kararlı bir saldırganın önceden hazırlanmış
 * videosuna karşı değildir. Ayrıntı için docs/iz-gizlilik.md.
 *
 * Görüntü hiçbir zaman ağa çıkmaz; yalnızca 128 sayılık betimleyici
 * üretilir ve o da tarayıcıda kalır.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  analyzeFrame,
  averageDescriptors,
  captureDescriptor,
  isChallengeNeutral,
  isChallengeSatisfied,
  loadFaceModels,
  pickChallenges,
  THRESHOLDS,
} from '@/lib/iz/face';
import {
  LIVENESS_CHALLENGE_LABELS,
  type FaceDescriptor,
  type LivenessChallenge,
} from '@/lib/iz/types';
import styles from '@/app/iz/iz.module.css';

/** Her hareket için üst süre sınırı. */
const CHALLENGE_TIMEOUT_MS = 30_000;
/** Ortalaması alınacak betimleyici örneği sayısı. */
const SAMPLE_TARGET = 5;
const FRAME_INTERVAL_MS = 180;

type Phase =
  | 'idle'
  | 'loading'
  | 'challenge'
  | 'sampling'
  | 'done'
  | 'error';

export interface LivenessResult {
  descriptor: FaceDescriptor;
  passedChallenges: LivenessChallenge[];
  sampleCount: number;
}

interface Props {
  onComplete: (result: LivenessResult) => void;
}

export default function LivenessCapture({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Sekmeden ayrılınca kamera kapansın.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopCamera();
    };
  }, [stopCamera]);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Kare analizinin geçerli olması için ortak ön koşullar. */
  const validateFrame = (
    faceFound: boolean,
    faceCount: number,
    faceRatio: number
  ): string | null => {
    if (!faceFound) return 'Yüzünüz görünmüyor — kameraya bakın.';
    if (faceCount > 1) {
      return 'Karede birden fazla yüz var. Yalnızca siz görünmelisiniz.';
    }
    if (faceRatio < THRESHOLDS.minFaceRatio) return 'Biraz yaklaşın.';
    return null;
  };

  const runSession = useCallback(async () => {
    cancelledRef.current = false;
    setError(null);
    setSampleCount(0);
    setCurrentIndex(0);
    setPhase('loading');
    setStatus('Yüz modelleri yükleniyor…');

    let stream: MediaStream;
    try {
      await loadFaceModels();
    } catch (modelError) {
      setError(
        modelError instanceof Error ? modelError.message : 'Yüz modelleri yüklenemedi.'
      );
      setPhase('error');
      return;
    }

    try {
      setStatus('Kamera izni bekleniyor…');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch {
      setError(
        'Kameraya erişilemedi. Tarayıcı iznini kontrol edin; kayıt için kamera zorunludur.'
      );
      setPhase('error');
      return;
    }

    if (cancelledRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // Bazı tarayıcılar otomatik oynatmayı reddeder; kullanıcı etkileşimi
      // zaten butonla geldiği için burada genelde sorun çıkmaz.
    }

    const sequence = pickChallenges(3);
    setChallenges(sequence);
    setPhase('challenge');

    const passed: LivenessChallenge[] = [];

    for (let index = 0; index < sequence.length; index += 1) {
      const challenge = sequence[index];
      setCurrentIndex(index);

      let neutralSeen = false;
      const deadline = Date.now() + CHALLENGE_TIMEOUT_MS;
      let satisfied = false;

      while (!satisfied) {
        if (cancelledRef.current) {
          stopCamera();
          return;
        }
        if (Date.now() > deadline) {
          setError(
            `"${LIVENESS_CHALLENGE_LABELS[challenge]}" adımı zaman aşımına uğradı. Baştan deneyebilirsiniz.`
          );
          setPhase('error');
          stopCamera();
          return;
        }

        const frame = await analyzeFrame(video);
        const problem = validateFrame(
          frame.faceFound,
          frame.faceCount,
          frame.metrics?.faceRatio ?? 0
        );

        if (problem || !frame.metrics) {
          setStatus(problem ?? 'Yüz okunamadı.');
          await wait(FRAME_INTERVAL_MS);
          continue;
        }

        // Önce nötr hâl görülmeli: sabit bir görsel bu geçişi üretemez.
        if (!neutralSeen) {
          if (isChallengeNeutral(challenge, frame.metrics)) {
            neutralSeen = true;
            setStatus('Şimdi hareketi yapın.');
          } else {
            setStatus('Doğal bir ifadeyle kameraya bakın.');
          }
          await wait(FRAME_INTERVAL_MS);
          continue;
        }

        if (isChallengeSatisfied(challenge, frame.metrics)) {
          satisfied = true;
          passed.push(challenge);
          setStatus('Tamam.');
          await wait(400);
        } else {
          await wait(FRAME_INTERVAL_MS);
        }
      }
    }

    // ── Örnekleme ──
    setPhase('sampling');
    setStatus('Yüzünüz kaydediliyor, sabit durun…');

    const descriptors: FaceDescriptor[] = [];
    const samplingDeadline = Date.now() + 20_000;

    while (descriptors.length < SAMPLE_TARGET) {
      if (cancelledRef.current) {
        stopCamera();
        return;
      }
      if (Date.now() > samplingDeadline) break;

      const descriptor = await captureDescriptor(video);
      if (descriptor) {
        descriptors.push(descriptor);
        setSampleCount(descriptors.length);
      }
      await wait(250);
    }

    stopCamera();

    if (descriptors.length < 3) {
      setError('Yeterli sayıda net kare alınamadı. Daha aydınlık bir ortamda deneyin.');
      setPhase('error');
      return;
    }

    setPhase('done');
    setStatus('Kayıt tamamlandı.');
    onComplete({
      descriptor: averageDescriptors(descriptors),
      passedChallenges: passed,
      sampleCount: descriptors.length,
    });
  }, [onComplete, stopCamera]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stopCamera();
    setPhase('idle');
    setStatus('');
  }, [stopCamera]);

  const activeChallenge = challenges[currentIndex];
  const running = phase === 'challenge' || phase === 'sampling' || phase === 'loading';

  return (
    <div>
      <div className={styles.captureStage}>
        <video ref={videoRef} className={styles.video} playsInline muted />
        <div className={styles.captureOverlay}>
          {phase === 'challenge' && activeChallenge ? (
            <div className={styles.challengePrompt}>
              {LIVENESS_CHALLENGE_LABELS[activeChallenge]}
            </div>
          ) : (
            <span />
          )}
          {status ? <div className={styles.captureStatus}>{status}</div> : <span />}
        </div>
      </div>

      {challenges.length > 0 && phase !== 'idle' && (
        <div className={styles.challengeList}>
          {challenges.map((challenge, index) => {
            const done = index < currentIndex || phase === 'sampling' || phase === 'done';
            const active = index === currentIndex && phase === 'challenge';
            return (
              <span
                key={challenge}
                className={`${styles.challengeChip} ${
                  done ? styles.challengeChipDone : ''
                } ${active ? styles.challengeChipActive : ''}`}
              >
                {done ? '✓' : index + 1} {LIVENESS_CHALLENGE_LABELS[challenge]}
              </span>
            );
          })}
        </div>
      )}

      {phase === 'sampling' && (
        <p className={styles.muted}>
          Örnek {sampleCount}/{SAMPLE_TARGET} alındı.
        </p>
      )}

      {error && (
        <div className={`${styles.notice} ${styles.noticeDanger}`}>
          <strong className={styles.noticeTitle}>Kayıt tamamlanamadı</strong>
          {error}
        </div>
      )}

      <div className={styles.actions}>
        {!running && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={runSession}
          >
            {phase === 'error' || phase === 'done' ? 'Tekrar dene' : 'Kamerayı başlat'}
          </button>
        )}
        {running && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost}`}
            onClick={cancel}
          >
            İptal et
          </button>
        )}
      </div>
    </div>
  );
}
