import { gql } from '@apollo/client';
import { USER_FIELDS, ORDER_FIELDS, TABLE_FIELDS } from '../fragments';

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      success
      message
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

export const OPEN_TABLE_ORDER = gql`
  mutation OpenTableOrder($tableId: ID!) {
    openTableOrder(tableId: $tableId) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const ADD_ORDER_ITEM = gql`
  mutation AddOrderItem($orderId: ID!, $productId: ID!, $quantity: Int, $note: String) {
    addOrderItem(orderId: $orderId, productId: $productId, quantity: $quantity, note: $note) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const UPDATE_ORDER_ITEM = gql`
  mutation UpdateOrderItem($itemId: ID!, $quantity: Int, $status: String, $note: String) {
    updateOrderItem(itemId: $itemId, quantity: $quantity, status: $status, note: $note) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const DELETE_ORDER_ITEM = gql`
  mutation DeleteOrderItem($itemId: ID!) {
    deleteOrderItem(itemId: $itemId) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const SET_ORDER_STATUS = gql`
  mutation SetOrderStatus($orderId: ID!, $status: String!) {
    setOrderStatus(orderId: $orderId, status: $status) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const SEND_TO_KITCHEN = gql`
  mutation SendToKitchen($orderId: ID!) {
    sendToKitchen(orderId: $orderId) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const MARK_SERVED = gql`
  mutation MarkServed($orderId: ID!) {
    markServed(orderId: $orderId) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const ADD_PAYMENT = gql`
  mutation AddPayment($orderId: ID!, $amount: Decimal!, $method: String, $note: String) {
    addPayment(orderId: $orderId, amount: $amount, method: $method, note: $note) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const CANCEL_ORDER = gql`
  mutation CancelOrder($orderId: ID!) {
    cancelOrder(orderId: $orderId) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const SET_TABLE_STATUS = gql`
  mutation SetTableStatus($tableId: ID!, $status: String!) {
    setTableStatus(tableId: $tableId, status: $status) {
      ...TableFields
    }
  }
  ${TABLE_FIELDS}
`;
