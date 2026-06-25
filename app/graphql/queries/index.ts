import { gql } from '@apollo/client';
import {
  USER_FIELDS,
  ROOM_FIELDS,
  TABLE_FIELDS,
  ORDER_FIELDS,
  CATEGORY_FIELDS,
} from '../fragments';

export const ME = gql`
  query Me {
    me {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const ROOMS = gql`
  query Rooms {
    rooms {
      ...RoomFields
    }
  }
  ${ROOM_FIELDS}
`;

export const ROOM = gql`
  query Room($id: ID!) {
    room(id: $id) {
      ...RoomFields
    }
  }
  ${ROOM_FIELDS}
`;

export const TABLE = gql`
  query Table($id: ID!) {
    table(id: $id) {
      ...TableFields
    }
  }
  ${TABLE_FIELDS}
`;

export const TABLE_DETAIL = gql`
  query TableDetail($tableId: ID!) {
    tableDetail(tableId: $tableId) {
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

export const ORDER = gql`
  query Order($id: ID!) {
    order(id: $id) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const ACTIVE_ORDERS = gql`
  query ActiveOrders {
    activeOrders {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const MENU = gql`
  query Menu {
    menu {
      ...CategoryFields
    }
  }
  ${CATEGORY_FIELDS}
`;

/** Marka rengi/logo: oturum açmadan da (login ekranı) çekilebilir. */
export const ORGANIZATION_SETTINGS = gql`
  query OrganizationSettings {
    organizationSettings {
      name
      themeColor
      logoLightUrl
      logoDarkUrl
      logoMinLightUrl
      logoMinDarkUrl
      faviconUrl
      updatedAt
    }
  }
`;
