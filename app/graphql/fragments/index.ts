import { gql } from '@apollo/client';

export const USER_FIELDS = gql`
  fragment UserFields on UserType {
    id
    email
    firstName
    lastName
    fullName
    phone
    gender
    isStaff
    imageUrl
    permissions
  }
`;

export const PRODUCT_FIELDS = gql`
  fragment ProductFields on ProductType {
    id
    name
    description
    price
    imageUrl
    preparationTime
    isActive
    isAvailable
    statusColor
    statusLabel
  }
`;

export const CATEGORY_FIELDS = gql`
  fragment CategoryFields on CategoryType {
    id
    name
    description
    products {
      ...ProductFields
    }
  }
  ${PRODUCT_FIELDS}
`;

export const ORDER_ITEM_FIELDS = gql`
  fragment OrderItemFields on OrderItemType {
    id
    productId
    name
    unitPrice
    quantity
    note
    status
    statusDisplay
    statusColor
    lineTotal
  }
`;

export const RECEIPT_FIELDS = gql`
  fragment ReceiptFields on ReceiptType {
    id
    code
    method
    methodDisplay
    amount
    note
    paidAt
  }
`;

export const ORDER_FIELDS = gql`
  fragment OrderFields on OrderType {
    id
    code
    orderType
    typeDisplay
    status
    statusDisplay
    statusColor
    isOpen
    note
    tableId
    tableName
    itemCount
    subtotal
    total
    totalPaid
    balance
    isFullyPaid
    createdAt
    items {
      ...OrderItemFields
    }
    receipts {
      ...ReceiptFields
    }
  }
  ${ORDER_ITEM_FIELDS}
  ${RECEIPT_FIELDS}
`;

export const TABLE_FIELDS = gql`
  fragment TableFields on TableType {
    id
    name
    capacity
    status
    statusDisplay
    statusColor
    shape
    shapeDisplay
    isActive
    posX
    posY
    width
    height
    rotation
    qrToken
    hasOpenOrder
    openOrderId
  }
`;

export const ROOM_FIELDS = gql`
  fragment RoomFields on RoomType {
    id
    name
    description
    isActive
    canvasWidth
    canvasHeight
    tableCount
    totalCapacity
    tables {
      ...TableFields
    }
  }
  ${TABLE_FIELDS}
`;
