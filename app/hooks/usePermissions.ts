import { useAuth } from '@/contexts/AuthContext';
import { Perm, Action } from '@/constants/permissions';

/**
 * Mobil uygulamanın konuştuğu GraphQL API'sinde (cafe/schema.py) fiilen
 * kontrol edilen yetkiler: waiter:view/add/change/delete ve orders:change.
 * (tables:change `set_table_status` için var ama mobilde henüz bir UI'a
 * bağlı değil.) Bu hook, backend'in `_require(info, Perm.X, Action.Y)`
 * çağrılarıyla birebir aynı kuralları istemci tarafında uygular — böylece
 * butonlar, sunucunun zaten reddedeceği bir işlemi göstermez/aktif etmez.
 */
export function usePermissions() {
  const { user } = useAuth();

  const has = (perm: string, action: string) =>
    !!user?.permissions.includes(`${perm}:${action}`);

  return {
    has,
    canViewWaiter: has(Perm.WAITER, Action.VIEW),
    canAddWaiter: has(Perm.WAITER, Action.ADD),
    canChangeWaiter: has(Perm.WAITER, Action.CHANGE),
    canDeleteWaiter: has(Perm.WAITER, Action.DELETE),
    canChangeOrders: has(Perm.ORDERS, Action.CHANGE),
    canChangeTables: has(Perm.TABLES, Action.CHANGE),
  };
}
