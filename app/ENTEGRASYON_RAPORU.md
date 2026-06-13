# Expo ↔ Django GraphQL Entegrasyon Raporu

Expo uygulaması, **mock veri ve simülasyon içermeden** Django GraphQL backend'ine
bağlandı. Backend `cafe/schema.py` tek doğruluk kaynağı olarak alındı; hiçbir
endpoint, alan veya mutation uydurulmadı.

## Kurulum (önce bunu yapın)

```bash
cd app
# Yeni bağımlılıklar
npx expo install @react-native-async-storage/async-storage
npm install @apollo/client graphql graphql-ws

# Endpoint'i tanımlayın (.env.example örnek alınarak):
cp .env.example .env
# .env içinde EXPO_PUBLIC_API_URL'i kendi adresinizle değiştirin

npx expo start
```

> Backend'i ASGI ile çalıştırın (subscription'lar için şart):
> `uvicorn cafe.asgi:application --host 0.0.0.0 --port 8000`
> WSGI (`runserver`) yalnızca HTTP query/mutation çalıştırır, WS subscription çalışmaz.

---

## Eklenen GraphQL katmanı (`app/graphql/`)

```
graphql/
  client/   apollo.ts (HTTP+WS split link, knox auth), storage.ts (AsyncStorage), errors.ts
  fragments/ index.ts (tüm type'lar için fragment)
  queries/   index.ts (me, rooms, room, table, tableDetail, order, menu)
  mutations/ index.ts (login, logout, openTableOrder, addOrderItem, updateOrderItem,
             deleteOrderItem, setOrderStatus, sendToKitchen, markServed, addPayment,
             cancelOrder, setTableStatus)
  subscriptions/ index.ts (orderUpdates, roomUpdates)
  generated/ operations.ts (tüm operasyonların sonuç/değişken tipleri — any yok)
theme/statusColors.ts  (Bootstrap renk adı -> hex)
hooks/useActiveOrders.ts (rooms'tan aktif adisyon türetme)
```

---

## Dosya dosya değişiklikler

### `contexts/AuthContext.tsx`
- **Eski:** Sabit `DEMO_USER`; `login` her şifreyi kabul edip `demo-token-<timestamp>`
  üretiyordu. `localStorage` kullanıyordu (RN'de yok → cihazda çöker). `me` hiç çağrılmıyordu.
- **Yeni:** Gerçek `login` mutation'ı; knox token AsyncStorage'a yazılır; açılışta
  saklı token ile `me` query'si çalıştırılıp oturum geri yüklenir; `logout` backend
  mutation'ını çağırır, token'ı ve Apollo cache'ini temizler.
- **Değişiklik:** Tüm sahte auth kaldırıldı, backend `AuthPayload` ile bağlandı.

### `app/_layout.tsx`
- **Eski:** Yalnızca `AuthProvider`.
- **Yeni:** Ağacın tepesine `ApolloProvider` eklendi.
- **Değişiklik:** Apollo client tüm uygulamaya sağlandı.

### `app/(tabs)/index.tsx` (Salonlar)
- **Eski:** `DEMO_ROOMS` sabit dizi; `onRefresh` `setTimeout` ile sahte yükleme.
- **Yeni:** `useQuery(ROOMS)`; loading/error/empty/refetch durumları; sekmeye
  dönüşte `useFocusEffect` ile tazeleme; pull-to-refresh gerçek `refetch`.
- **Değişiklik:** Mock veri ve sahte refresh kaldırıldı.

### `app/(tabs)/kitchen.tsx` (Mutfak)
- **Eski:** `DEMO_ORDERS`; "Servis Edildi" yalnızca local state'ten siliyordu.
- **Yeni:** `useActiveOrders` ile aktif adisyonlardan hazırlanan kalemler; "Servis
  Edildi" gerçek `markServed` mutation'ını çağırır; busy/empty/error durumları.
- **Değişiklik:** Mock veri ve local state simülasyonu kaldırıldı.

### `app/(tabs)/orders.tsx` (Adisyonlar)
- **Eski:** `DEMO_ORDERS` sabit; `statusColor` hex hardcoded.
- **Yeni:** `useActiveOrders`; `statusColor` (backend Bootstrap adı) `statusHex` ile
  hex'e çevrilir; loading/error/empty/refetch.
- **Değişiklik:** Mock veri kaldırıldı, renkler backend değerinden türetildi.

### `app/order/[id].tsx` (Adisyon detayı)
- **Eski:** `DEMO_ORDERS` record; `handleMarkServed` local state günceller.
- **Yeni:** `useQuery(ORDER)` + **`ORDER_UPDATES` subscription** (canlı); "Servis
  Edildi" gerçek `markServed` mutation'ı; renkler `statusHex`.
- **Değişiklik:** Mock veri kaldırıldı, realtime bağlandı.

### `app/room/[id].tsx` (Salon planı)
- **Eski:** İkinci bir kopya `DEMO_ROOMS_DATA`; `@/types/api`'den var olmayan
  `DEMO_ROOMS` import'u (kırık referans). Masa durumu `available` (backend'de yok).
- **Yeni:** `useQuery(ROOM)` + **`ROOM_UPDATES` subscription**; masa rengi
  `hasOpenOrder` ise amber, aksi halde backend `status_color` → hex; legend backend
  durumlarına (`empty/occupied/reserved/disabled`) göre güncellendi.
- **Değişiklik:** Kırık import ve mock kaldırıldı, realtime bağlandı.

### `app/table/[id].tsx` (Masa / POS)
- **Eski:** `DEMO_TABLES` + `DEMO_MENU`; adisyon açma, ürün ekleme, adet, silme,
  mutfağa gönderme ve ödeme **hepsi** local state simülasyonuydu (`AD-xxxx` rastgele
  kod üretimi dahil).
- **Yeni:** `useQuery(TABLE_DETAIL)` (masa + açık adisyon + menü tek sorguda) +
  `ORDER_UPDATES` subscription. İşlemler gerçek mutation'lara bağlandı:
  `openTableOrder`, `addOrderItem`, `updateOrderItem`, `deleteOrderItem`,
  `sendToKitchen`, `addPayment`. Ödeme yöntemleri backend'e uyduruldu
  (`cash/card/other`; mock'taki `digital` kaldırıldı). Tutar `Decimal` skalar için
  string olarak gönderiliyor.
- **Değişiklik:** Tüm mock ve simülasyon kaldırıldı, tam CRUD backend'e bağlandı.

### `package.json`
- **Eski:** GraphQL client yok; kullanılmayan `@supabase/supabase-js` vardı.
- **Yeni:** `@apollo/client`, `graphql`, `graphql-ws`, `@react-native-async-storage/async-storage`
  eklendi; `@supabase/supabase-js` (hiç kullanılmıyordu) kaldırıldı.

### Değişmeyen ama uyumlu dosyalar
- **`app/(tabs)/profile.tsx`** — zaten gerçek `user` alanlarını ve `logout`'u
  kullanıyor; yeni AuthContext ile sorunsuz çalışır.
- **`app/(tabs)/_layout.tsx`**, **`app/(auth)/login.tsx`** — `useAuth` arayüzü aynı
  kaldığından değişiklik gerekmedi.
- **`types/api.ts`** — alanlar Strawberry camelCase çıktısıyla zaten birebir uyumlu.

---

## Backend ile uyum / sınırlamalar (uydurma yapılmadı)

1. **`statusColor` hex değil:** Backend bu alanları Bootstrap renk ADI olarak döndürür
   (`success/danger/warning/info/primary/secondary`). Schema değiştirilmeden frontend'de
   `theme/statusColors.ts` ile hex'e çevrildi.
2. **Adisyon listesi query'si yok:** Query type'ında `orders` listesi yoktur. Aktif
   adisyonlar `rooms` → `order(id)` ile yeniden kurulur (`useActiveOrders`).
   **Paket/gel-al adisyonlar** masaya bağlı olmadığından bu yolla listelenemez; schema
   bunları listeleyen bir alan sunmuyor. (Backend'e `orders`/`takeawayOrders` query'si
   eklenirse bu sekmeler doğrudan beslenebilir.)
3. **Masa durumu değerleri:** Backend `empty/occupied/reserved/disabled`; mock'taki
   `available` kaldırıldı.
4. **Ödeme yöntemi:** Backend `cash/card/other`; mock'taki `digital` `other`'a çevrildi.
5. **Auth formatı:** knox token; HTTP'de `Authorization: Token <key>`, WS'de
   `connectionParams.Authorization` (backend `_ws_user` bunu okur).
