'use client';

/**
 * Yerel kasaya erişim için React bağlamı.
 *
 * Kasa yalnızca tarayıcıda olduğundan, ilk render sunucuda boş kasa ile
 * yapılır ve veri yüklenene kadar `ready` false kalır. Sayfalar bu bayrağı
 * beklemeden karar vermemeli (yoksa "kayıt yok" ekranı bir an yanıp söner).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearVault, loadVault, updateVault } from '@/lib/iz/store';
import { EMPTY_VAULT, type LocalVault } from '@/lib/iz/types';

interface VaultContextValue {
  vault: LocalVault;
  ready: boolean;
  update: (mutate: (vault: LocalVault) => LocalVault) => Promise<void>;
  reset: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [vault, setVault] = useState<LocalVault>(EMPTY_VAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadVault().then((loaded) => {
      if (active) {
        setVault(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(
    async (mutate: (vault: LocalVault) => LocalVault) => {
      const next = await updateVault(mutate);
      setVault(next);
    },
    []
  );

  const reset = useCallback(async () => {
    await clearVault();
    setVault(structuredClone(EMPTY_VAULT));
  }, []);

  const value = useMemo(
    () => ({ vault, ready, update, reset }),
    [vault, ready, update, reset]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault yalnızca VaultProvider içinde kullanılabilir.');
  }
  return context;
}
