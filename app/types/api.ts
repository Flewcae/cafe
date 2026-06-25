export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  gender: string | null;
  isStaff: boolean;
  imageUrl: string | null;
  permissions: string[];
}

export interface OrganizationSettings {
  name: string;
  themeColor: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  logoMinLightUrl: string | null;
  logoMinDarkUrl: string | null;
  faviconUrl: string | null;
  updatedAt: string;
}

export interface AuthPayload {
  success: boolean;
  message: string;
  token: string | null;
  user: User | null;
}

export interface Result {
  success: boolean;
  message: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  preparationTime: number | null;
  isActive: boolean;
  isAvailable: boolean;
  statusColor: string;
  statusLabel: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  products: Product[];
}

export interface OrderItem {
  id: string;
  productId: string | null;
  name: string;
  unitPrice: string;
  quantity: number;
  note: string | null;
  status: string;
  statusDisplay: string;
  statusColor: string;
  lineTotal: string;
}

export interface Receipt {
  id: string;
  code: string;
  method: string;
  methodDisplay: string;
  amount: string;
  note: string | null;
  paidAt: string;
}

export interface Order {
  id: string;
  code: string;
  orderType: string;
  typeDisplay: string;
  status: string;
  statusDisplay: string;
  statusColor: string;
  isOpen: boolean;
  note: string | null;
  tableId: string | null;
  tableName: string | null;
  itemCount: number;
  subtotal: string;
  total: string;
  totalPaid: string;
  balance: string;
  isFullyPaid: boolean;
  createdAt: string;
  items: OrderItem[];
  receipts: Receipt[];
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: string;
  statusDisplay: string;
  statusColor: string;
  shape: string;
  shapeDisplay: string;
  isActive: boolean;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  qrToken: string;
  hasOpenOrder: boolean;
  openOrderId: string | null;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  canvasWidth: number;
  canvasHeight: number;
  tableCount: number;
  totalCapacity: number;
  tables: Table[];
}

export interface TableDetail {
  table: Table;
  openOrder: Order | null;
  menu: Category[];
}
