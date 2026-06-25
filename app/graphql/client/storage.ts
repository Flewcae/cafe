import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cafe_pos_token';
const THEME_MODE_KEY = 'cafe_pos_theme_mode';
const ORG_SETTINGS_KEY = 'cafe_pos_org_settings';

export type ThemeMode = 'light' | 'dark';

export interface CachedOrgSettings {
  name: string;
  themeColor: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  logoMinLightUrl: string | null;
  logoMinDarkUrl: string | null;
  faviconUrl: string | null;
  updatedAt: string;
}

/**
 * Knox auth token kalıcı saklama.
 * Eski kod React Native'de var olmayan `localStorage` kullanıyordu (cihazda
 * çöküyordu); AsyncStorage hem native hem web'de çalışır.
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      // sessizce yut — token bellekte (Apollo context) zaten geçerli
    }
  },
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      // no-op
    }
  },
};

/** Kullanıcının açık/koyu tema seçimi — cihazda kalıcı. */
export const themeModeStorage = {
  async get(): Promise<ThemeMode | null> {
    try {
      const v = await AsyncStorage.getItem(THEME_MODE_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch {
      return null;
    }
  },
  async set(mode: ThemeMode): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch {
      // no-op
    }
  },
};

/**
 * Organizasyon marka rengi/logoları — ilk açılışta sunucudan çekilip
 * cihazda cachelenir. Sonraki açılışlarda sunucudaki `updatedAt` cache'tekinden
 * farklıysa (organizasyon ayarları değişmiş) yeniden çekilip cache güncellenir.
 */
export const orgSettingsStorage = {
  async get(): Promise<CachedOrgSettings | null> {
    try {
      const raw = await AsyncStorage.getItem(ORG_SETTINGS_KEY);
      return raw ? (JSON.parse(raw) as CachedOrgSettings) : null;
    } catch {
      return null;
    }
  },
  async set(settings: CachedOrgSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(ORG_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // no-op
    }
  },
};
