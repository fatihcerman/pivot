/**
 * Yüz modeli ağırlıklarını node_modules'tan public/models altına kopyalar.
 *
 * Modeller tarayıcıya kendi sunucumuzdan gidiyor; dışarıya (CDN'e) hiçbir
 * istek çıkmıyor. Bu, kullanıcının yüz görselinin cihazından çıkmaması
 * ilkesinin bir parçası: üçüncü taraf hiçbir servis bu akışa dahil değil.
 *
 * postinstall'da otomatik çalışır. public/models .gitignore içindedir.
 */
import { mkdir, copyFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@vladmandic', 'face-api', 'model');
const target = join(root, 'public', 'models');

/** Yalnızca kullandığımız modeller — 7 MB civarı. */
const MODELS = [
  'tiny_face_detector_model',
  'face_landmark_68_model',
  'face_recognition_model',
  'face_expression_model',
];

const files = MODELS.flatMap((name) => [
  `${name}-weights_manifest.json`,
  `${name}.bin`,
]);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(source))) {
    console.warn(
      '[iz] @vladmandic/face-api model klasörü bulunamadı, kopyalama atlandı.'
    );
    return;
  }

  await mkdir(target, { recursive: true });

  let copied = 0;
  for (const file of files) {
    const from = join(source, file);
    if (!(await exists(from))) {
      console.warn(`[iz] eksik model dosyası atlandı: ${file}`);
      continue;
    }
    await copyFile(from, join(target, file));
    copied += 1;
  }

  console.log(`[iz] ${copied} yüz modeli dosyası public/models altına kopyalandı.`);
}

main().catch((error) => {
  // Model kopyalanamazsa kurulum kırılmasın; uygulama çalışma anında
  // anlaşılır bir hata gösterir.
  console.warn('[iz] yüz modelleri kopyalanamadı:', error.message);
});
