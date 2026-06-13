import { gql } from '@apollo/client';
import { ORDER_FIELDS, ROOM_FIELDS } from '../fragments';

/** Canlı adisyon: abone olunca ve her değişiklikte tam order yayınlar. */
export const ORDER_UPDATES = gql`
  subscription OrderUpdates($orderId: ID!) {
    orderUpdates(orderId: $orderId) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
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
