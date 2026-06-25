import { gql } from '@apollo/client';
import { ORDER_FIELDS, ROOM_FIELDS, TABLE_FIELDS, CATEGORY_FIELDS } from '../fragments';

/** Canlı adisyon: abone olunca ve her değişiklikte tam order yayınlar. */
export const ORDER_UPDATES = gql`
  subscription OrderUpdates($orderId: ID!) {
    orderUpdates(orderId: $orderId) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

/**
 * Canlı masa detayı: order id'sine değil masaya bağlıdır — bu yüzden masada
 * henüz açık adisyon yokken de abone olunabilir. Müşterinin QR'dan ilk
 * siparişi vermesi, garsonun mutfağa göndermesi, mutfağın hazır işaretlemesi
 * gibi TÜM değişiklikler (kaynak ne olursa olsun) bunu tetikler.
 */
export const TABLE_UPDATES = gql`
  subscription TableUpdates($tableId: ID!) {
    tableUpdates(tableId: $tableId) {
      table {
        ...TableFields
      }
      openOrder {
        ...OrderFields
      }
      menu {
        ...CategoryFields
      }
    }
  }
  ${TABLE_FIELDS}
  ${ORDER_FIELDS}
  ${CATEGORY_FIELDS}
`;

/** Canlı salon planı: abone olunca ve her değişiklikte tam room yayınlar. */
export const ROOM_UPDATES = gql`
  subscription RoomUpdates($roomId: ID!) {
    roomUpdates(roomId: $roomId) {
      ...RoomFields
    }
  }
  ${ROOM_FIELDS}
`;

/** Canlı aktif adisyon listesi (masaya bağlı + paket): Mutfak/Adisyonlar sekmeleri. */
export const ACTIVE_ORDERS_UPDATES = gql`
  subscription ActiveOrdersUpdates {
    activeOrdersUpdates {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;
