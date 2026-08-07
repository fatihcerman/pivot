import type { Metadata } from 'next';
import Link from 'next/link';
import { VaultProvider } from '@/components/iz/VaultProvider';
import IzNav from '@/components/iz/IzNav';
import styles from './iz.module.css';

export const metadata: Metadata = {
  title: 'İZ | Dijital İz Denetimi',
  description:
    'Kendi yüzünüzü ve kendi hesaplarınızı denetleyin: hangi bilgileriniz herkese açık, adınıza sahte hesap var mı, nasıl kaldırtırsınız.',
  robots: { index: false, follow: false },
};

export default function IzLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultProvider>
      <div className={styles.shell}>
        <IzNav />
        <main className={styles.main}>
          <div className={styles.wrap}>{children}</div>
        </main>
        <footer className={styles.footer}>
          <div className={`${styles.wrap} ${styles.footerRow}`}>
            <span>
              Yüz verileriniz cihazınızdan çıkmaz. Sunucuda hesabınız yoktur.
            </span>
            <div className={styles.footerLinks}>
              <Link href="/iz/verilerim" className={styles.link}>
                Verilerimi sil
              </Link>
              <Link href="/iz/ilkeler" className={styles.link}>
                İlkeler ve sınırlar
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </VaultProvider>
  );
}
