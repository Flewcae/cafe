/**
 * Backend authorizement/constants.py ile birebir eşleşir. UserType.permissions
 * (bkz. cafe/schema.py build_user) bu kod:eylem çiftlerini "code:action"
 * string listesi olarak döner (örn. "waiter:change").
 */
export const Perm = {
  TABLES: 'tables',
  MENU: 'menu',
  ORDERS: 'orders',
  WAITER: 'waiter',
  KITCHEN: 'kitchen',
  USERS: 'users',
  SYSTEM_SETTINGS: 'system_settings',
  AUTHORIZEMENT: 'authorizement',
  EMAIL: 'email',
  SMS: 'sms',
  NOTIFICATION: 'notification',
} as const;

export const Action = {
  ADD: 'add',
  CHANGE: 'change',
  DELETE: 'delete',
  VIEW: 'view',
} as const;
