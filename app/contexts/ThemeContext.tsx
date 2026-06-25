import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { apolloClient } from '@/graphql/client/apollo';
import { resolveMediaUrl } from '@/graphql/client/media';
import {
  themeModeStorage,
  orgSettingsStorage,
  ThemeMode,
  CachedOrgSettings,
} from '@/graphql/client/storage';
import { ORGANIZATION_SETTINGS } from '@/graphql/queries';
import { OrganizationSettingsResult } from '@/graphql/generated/operations';

export type { ThemeMode };

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  overlay: string;
}

// Web'in koyu temasındaki ile aynı aile: nötr antrasit/charcoal, lacivert
// tonu yok (bkz. bootstrap.min.css / app.min.css'teki #141724 -> #1a1a1a
// düzeltmesi).
const DARK_BASE: Omit<ThemeColors, 'accent' | 'accentText'> = {
  background: '#1a1a1a',
  surface: '#27282A',
  surfaceAlt: '#262626',
  border: '#333333',
  textPrimary: '#ffffff',
  textSecondary: '#a3a3a3',
  textMuted: '#737373',
  overlay: 'rgba(0,0,0,0.6)',
};

const LIGHT_BASE: Omit<ThemeColors, 'accent' | 'accentText'> = {
  background: '#f3f4f6',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f6',
  border: '#e5e7eb',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  overlay: 'rgba(0,0,0,0.4)',
};

// org ayarları henüz hiç çekilememişse (ilk açılış + ağ yok) kullanılan eski
// turkuaz varsayılan — uygulama hiçbir zaman renksiz kalmasın diye.
const FALLBACK_ACCENT = '#0891b2';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  colors: ThemeColors;
  logoUrl: string | null;
  orgName: string | null;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

async function fetchOrgSettings(): Promise<CachedOrgSettings | null> {
  const { data } = await apolloClient.query<OrganizationSettingsResult>({
    query: ORGANIZATION_SETTINGS,
    fetchPolicy: 'network-only',
  });
  return data?.organizationSettings ?? null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [org, setOrg] = useState<CachedOrgSettings | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [storedMode, cachedOrg] = await Promise.all([
        themeModeStorage.get(),
        orgSettingsStorage.get(),
      ]);
      if (!active) return;
      if (storedMode) setModeState(storedMode);
      if (cachedOrg) setOrg(cachedOrg);

      try {
        const fresh = await fetchOrgSettings();
        if (!active || !fresh) return;
        // Cache yoksa (ilk açılış) ya da sunucudaki organizasyon cache'tekinden
        // farklıysa (updatedAt değişmiş -> "is_org_changed") cache'i güncelle.
        if (!cachedOrg || fresh.updatedAt !== cachedOrg.updatedAt) {
          await orgSettingsStorage.set(fresh);
          setOrg(fresh);
        }
      } catch {
        // Ağ yok / sunucuya erişilemiyor: cache'teki (varsa) değerle devam.
      } finally {
        if (active) setIsReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    themeModeStorage.set(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const colors = useMemo<ThemeColors>(() => {
    const base = mode === 'dark' ? DARK_BASE : LIGHT_BASE;
    return {
      ...base,
      accent: org?.themeColor || FALLBACK_ACCENT,
      accentText: '#ffffff',
    };
  }, [mode, org]);

  // logo_dark: koyu arkaplan üzerinde görünür logo; logo_light: açık arkaplan içindir.
  const logoUrl = useMemo(() => {
    const raw = mode === 'dark' ? org?.logoMinDarkUrl : org?.logoMinLightUrl;
    return resolveMediaUrl(raw ?? null);
  }, [mode, org]);

  const value = useMemo<ThemeContextType>(
    () => ({ mode, setMode, toggleMode, colors, logoUrl, orgName: org?.name ?? null, isReady }),
    [mode, setMode, toggleMode, colors, logoUrl, org, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
