'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/app/iz/iz.module.css';

const LINKS = [
  { href: '/iz', label: 'Genel Bakış' },
  { href: '/iz/kayit', label: 'Yüz Kaydı' },
  { href: '/iz/tarama', label: 'Hesap Taraması' },
  { href: '/iz/taklit', label: 'Taklit Kontrolü' },
  { href: '/iz/rapor', label: 'Rapor' },
  { href: '/iz/verilerim', label: 'Verilerim' },
];

export default function IzNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={`${styles.wrap} ${styles.navInner}`}>
        <Link href="/iz" className={styles.brand}>
          <span className={styles.brandMark}>İZ</span>
          <span className={styles.brandSub}>Dijital İz Denetimi</span>
        </Link>
        <div className={styles.navLinks}>
          {LINKS.map((link) => {
            const active =
              link.href === '/iz' ? pathname === '/iz' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
