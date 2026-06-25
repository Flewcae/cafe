/**
 * GraphQL operasyonlarının sonuç ve değişken tipleri.
 * Backend schema (cafe/schema.py) tek doğruluk kaynağıdır; bu tipler ona
 * birebir karşılık gelir ve domain modelleri types/api.ts'ten yeniden kullanılır.
 */
import {
  User,
  Room,
  Table,
  Order,
  Category,
  AuthPayload,
  Result,
  OrganizationSettings,
} from '@/types/api';

// --- Queries ---------------------------------------------------------------
export interface MeResult {
  me: User | null;
}

export interface OrganizationSettingsResult {
  organizationSettings: OrganizationSettings | null;
}

export interface RoomsResult {
  rooms: Room[];
}

export interface RoomResult {
  room: Room | null;
}
export interface RoomVars {
  id: string;
}

export interface TableResult {
  table: Table | null;
}
export interface TableVars {
  id: string;
}

export interface TableDetailResult {
  tableDetail: {
    table: Table;
    openOrder: Order | null;
    menu: Category[];
  } | null;
}
export interface TableDetailVars {
  tableId: string;
}

export interface OrderResult {
  order: Order | null;
}
export interface OrderVars {
  id: string;
}

export interface ActiveOrdersResult {
  activeOrders: Order[];
}

export interface MenuResult {
  menu: Category[];
}

// --- Mutations -------------------------------------------------------------
export interface LoginResult {
  login: AuthPayload;
}
export interface LoginVars {
  email: string;
  password: string;
}

export interface LogoutResult {
  logout: Result;
}

export interface OpenTableOrderResult {
  openTableOrder: Order;
}
export interface OpenTableOrderVars {
  tableId: string;
}

export interface AddOrderItemResult {
  addOrderItem: Order;
}
export interface AddOrderItemVars {
  orderId: string;
  productId: string;
  quantity?: number;
  note?: string | null;
}

export interface UpdateOrderItemResult {
  updateOrderItem: Order;
}
export interface UpdateOrderItemVars {
  itemId: string;
  quantity?: number;
  status?: string;
  note?: string | null;
}

export interface DeleteOrderItemResult {
  deleteOrderItem: Order;
}
export interface DeleteOrderItemVars {
  itemId: string;
}

export interface SetOrderStatusResult {
  setOrderStatus: Order;
}
export interface SetOrderStatusVars {
  orderId: string;
  status: string;
}

export interface SendToKitchenResult {
  sendToKitchen: Order;
}
export interface SendToKitchenVars {
  orderId: string;
}

export interface MarkServedResult {
  markServed: Order;
}
export interface MarkServedVars {
  orderId: string;
}

export interface AddPaymentResult {
  addPayment: Order;
}
export interface AddPaymentVars {
  orderId: string;
  amount: string; // Decimal scalar -> string
  method?: string;
  note?: string | null;
}

export interface CancelOrderResult {
  cancelOrder: Order;
}
export interface CancelOrderVars {
  orderId: string;
}

export interface SetTableStatusResult {
  setTableStatus: Table;
}
export interface SetTableStatusVars {
  tableId: string;
  status: string;
}

// --- Subscriptions ---------------------------------------------------------
export interface OrderUpdatesResult {
  orderUpdates: Order;
}
export interface OrderUpdatesVars {
  orderId: string;
}

export interface RoomUpdatesResult {
  roomUpdates: Room;
}
export interface RoomUpdatesVars {
  roomId: string;
}

export interface TableUpdatesResult {
  tableUpdates: {
    table: Table;
    openOrder: Order | null;
    menu: Category[];
  } | null;
}
export interface TableUpdatesVars {
  tableId: string;
}

export interface ActiveOrdersUpdatesResult {
  activeOrdersUpdates: Order[];
}
