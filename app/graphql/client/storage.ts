import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cafe_pos_token';

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
