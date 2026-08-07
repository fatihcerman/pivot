/**
 * Tarayıcı içi yüz motoru.
 *
 * Bu dosyadaki hiçbir fonksiyon ağa çıkmaz. Kamera görüntüsü ve yüklenen
 * görseller yalnızca kullanıcının cihazında işlenir; dışarı çıkan tek şey
 * kullanıcının açıkça kaydettiği 128 boyutlu betimleyicidir ve o da
 * yalnızca tarayıcının IndexedDB'sinde kalır.
 *
 * Kütüphane yalnızca istemcide, dinamik import ile yüklenir (SSR'da yok).
 */

import type { FaceDescriptor, LivenessChallenge } from './types';

type FaceApi = typeof import('@vladmandic/face-api');

/** Modeller kendi origin'imizden servis edilir (bkz. scripts/sync-face-models.mjs). */
const MODEL_URL = '/models';

let apiPromise: Promise<FaceApi> | null = null;
let modelsReady = false;

export class FaceEngineError extends Error {}

async function getApi(): Promise<FaceApi> {
  if (typeof window === 'undefined') {
    throw new FaceEngineError('Yüz motoru yalnızca tarayıcıda çalışır.');
  }
  if (!apiPromise) {
    apiPromise = import('@vladmandic/face-api');
  }
  return apiPromise;
}

/** Model ağırlıklarını yükler. Tekrar çağrılması ucuzdur. */
export async function loadFaceModels(): Promise<void> {
  const faceapi = await getApi();
  if (modelsReady) return;

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
  } catch (error) {
    throw new FaceEngineError(
      'Yüz modelleri yüklenemedi. `npm install` sonrası public/models klasörünün oluştuğundan emin olun.' +
        (error instanceof Error ? ` (${error.message})` : '')
    );
  }

  modelsReady = true;
}

async function detectorOptions() {
  const faceapi = await getApi();
  return new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
}

// ── Canlılık ölçütleri ──────────────────────────────────────────────────
// 68 noktalı landmark şeması üzerinden hesaplanır.

export interface FaceMetrics {
  /** Göz açıklık oranı — kırpma tespiti. Küçük = kapalı. */
  eyeAspectRatio: number;
  /** Ağız açıklık oranı. Büyük = açık. */
  mouthAspectRatio: number;
  /** Baş dönüşü. Pozitif = kişi kendi soluna döndü. */
  yaw: number;
  /** Gülümseme olasılığı (0–1). */
  smile: number;
  /** Yüzün karedeki genişlik oranı — çok uzaksa güvenilmez. */
  faceRatio: number;
}

export interface FrameAnalysis {
  faceFound: boolean;
  /** Karede birden fazla yüz varsa kayıt reddedilir. */
  faceCount: number;
  metrics: FaceMetrics | null;
  box: { x: number; y: number; width: number; height: number } | null;
}

interface Point {
  x: number;
  y: number;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(eye: Point[]): number {
  // eye: 6 nokta. Dikey açıklıkların ortalaması / yatay genişlik.
  const vertical = (distance(eye[1], eye[5]) + distance(eye[2], eye[4])) / 2;
  const horizontal = distance(eye[0], eye[3]);
  return horizontal === 0 ? 0 : vertical / horizontal;
}

function mouthAspectRatio(mouth: Point[]): number {
  // mouth: 20 nokta (48–67). Dış köşeler 0 ve 6; iç dudak 13..19.
  const horizontal = distance(mouth[0], mouth[6]);
  const vertical = (distance(mouth[2], mouth[10]) + distance(mouth[4], mouth[8])) / 2;
  return horizontal === 0 ? 0 : vertical / horizontal;
}

function computeYaw(jaw: Point[], nose: Point[]): number {
  // Burun ucunun çene hattının iki ucuna uzaklığını karşılaştırır.
  const noseTip = nose[nose.length - 3] ?? nose[0];
  const leftEdge = jaw[0];
  const rightEdge = jaw[jaw.length - 1];
  const toLeft = Math.abs(noseTip.x - leftEdge.x);
  const toRight = Math.abs(rightEdge.x - noseTip.x);
  const total = toLeft + toRight;
  return total === 0 ? 0 : (toLeft - toRight) / total;
}

/**
 * Canlılık döngüsü için tek kare analizi.
 * Betimleyici HESAPLANMAZ — bu döngü saniyede birkaç kez çalışır ve
 * tanıma ağı pahalıdır. Betimleyici yalnızca captureDescriptor ile alınır.
 */
export async function analyzeFrame(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FrameAnalysis> {
  const faceapi = await getApi();
  const options = await detectorOptions();

  const detections = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks()
    .withFaceExpressions();

  if (detections.length === 0) {
    return { faceFound: false, faceCount: 0, metrics: null, box: null };
  }

  // En büyük yüzü baz al.
  const primary = detections.reduce((largest, current) =>
    current.detection.box.area > largest.detection.box.area ? current : largest
  );

  const landmarks = primary.landmarks;
  const box = primary.detection.box;
  const frameWidth = primary.detection.imageWidth || 1;

  const metrics: FaceMetrics = {
    eyeAspectRatio:
      (eyeAspectRatio(landmarks.getLeftEye()) +
        eyeAspectRatio(landmarks.getRightEye())) /
      2,
    mouthAspectRatio: mouthAspectRatio(landmarks.getMouth()),
    yaw: computeYaw(landmarks.getJawOutline(), landmarks.getNose()),
    smile: primary.expressions.happy ?? 0,
    faceRatio: box.width / frameWidth,
  };

  return {
    faceFound: true,
    faceCount: detections.length,
    metrics,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
  };
}

// ── Eşikler ────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  /** Göz bu değerin altına inerse "kapalı" sayılır. */
  eyeClosed: 0.19,
  /** Kırpmanın sayılması için önce bu değerin üstünde açık görülmeli. */
  eyeOpen: 0.25,
  mouthOpen: 0.5,
  mouthClosed: 0.32,
  yawTurned: 0.2,
  yawNeutral: 0.1,
  smiling: 0.7,
  smileNeutral: 0.3,
  /** Yüz karenin en az bu kadarını kaplamalı. */
  minFaceRatio: 0.18,
} as const;

/**
 * Bir hareketin "tamamlandı" sayılması için önce nötr hâlin görülmesi
 * gerekir. Hareketsiz bir fotoğraf sabit ölçüm ürettiği için bu geçişi
 * hiçbir zaman üretemez — testin fotoğrafa karşı koruması buradan gelir.
 */
export function isChallengeNeutral(
  challenge: LivenessChallenge,
  m: FaceMetrics
): boolean {
  switch (challenge) {
    case 'blink':
      return m.eyeAspectRatio > THRESHOLDS.eyeOpen;
    case 'mouth':
      return m.mouthAspectRatio < THRESHOLDS.mouthClosed;
    case 'turn-left':
    case 'turn-right':
      return Math.abs(m.yaw) < THRESHOLDS.yawNeutral;
    case 'smile':
      return m.smile < THRESHOLDS.smileNeutral;
  }
}

export function isChallengeSatisfied(
  challenge: LivenessChallenge,
  m: FaceMetrics
): boolean {
  switch (challenge) {
    case 'blink':
      return m.eyeAspectRatio < THRESHOLDS.eyeClosed;
    case 'mouth':
      return m.mouthAspectRatio > THRESHOLDS.mouthOpen;
    case 'turn-left':
      return m.yaw > THRESHOLDS.yawTurned;
    case 'turn-right':
      return m.yaw < -THRESHOLDS.yawTurned;
    case 'smile':
      return m.smile > THRESHOLDS.smiling;
  }
}

/** Her oturumda rastgele sıra — kaydedilmiş bir videonun tekrarını zorlaştırır. */
export function pickChallenges(count = 3): LivenessChallenge[] {
  const pool: LivenessChallenge[] = ['blink', 'mouth', 'turn-left', 'turn-right', 'smile'];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ── Betimleyici ────────────────────────────────────────────────────────

/** Tek kareden 128 boyutlu betimleyici çıkarır. Yüz yoksa null. */
export async function captureDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDescriptor | null> {
  const faceapi = await getApi();
  const options = await detectorOptions();

  const result = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return result ? Array.from(result.descriptor) : null;
}

/** Birden fazla örneğin ortalaması gürültüyü azaltır. */
export function averageDescriptors(descriptors: FaceDescriptor[]): FaceDescriptor {
  if (descriptors.length === 0) {
    throw new FaceEngineError('Ortalanacak betimleyici yok.');
  }
  const length = descriptors[0].length;
  const sum = new Array<number>(length).fill(0);
  for (const descriptor of descriptors) {
    for (let i = 0; i < length; i += 1) sum[i] += descriptor[i];
  }
  return sum.map((value) => value / descriptors.length);
}

export function euclideanDistance(a: FaceDescriptor, b: FaceDescriptor): number {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    total += diff * diff;
  }
  return Math.sqrt(total);
}

/**
 * Eşleşme eşiği. face_recognition modelinde 0.6 yaygın kabul gören sınırdır;
 * yanlış pozitif bir "taklit" suçlaması ağır sonuç doğurabileceği için
 * biraz daha temkinli davranıyoruz.
 */
export const MATCH_THRESHOLD = 0.55;

/** Uzaklığı kullanıcıya gösterilebilir 0–1 benzerliğe çevirir. */
export function similarityFromDistance(distanceValue: number): number {
  const normalized = 1 - distanceValue / 1.2;
  return Math.max(0, Math.min(1, normalized));
}
