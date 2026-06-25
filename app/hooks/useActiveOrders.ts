import { useCallback, useEffect, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { ACTIVE_ORDERS } from '@/graphql/queries';
import { ACTIVE_ORDERS_UPDATES } from '@/graphql/subscriptions';
import {
  ActiveOrdersResult,
  ActiveOrdersUpdatesResult,
} from '@/graphql/generated/operations';
import { Order } from '@/types/api';

/**
 * Backend `activeOrders` query + `activeOrdersUpdates` subscription: masaya
 * bağlı VE paket/gel-al tüm açık adisyonları tek seferde döner ve her
 * değişiklikte (hangi yoldan gelirse gelsin — mutation, garson web paneli,
 * mutfak paneli) canlı günceller.
 *
 * `subData`, yalnızca WS üzerinden yeni bir push geldiğinde değişir — bir
 * mutation'ın (örn. markServed) cache'e yazdığı tazelik onu otomatik
 * güncellemez. Sabit `subData ?? data` önceliği bu yüzden mutation sonrası
 * bir süre (sıradaki WS push'una kadar) eski veriyi göstermeye devam
 * ediyordu (örn. "servis edildi" butonu hâlâ aktif görünüyordu). Bunun
 * yerine hangi kaynak EN SON değiştiyse onu kullanıyoruz; böylece bir
 * mutation'ın cache güncellemesi (query'nin reaktif `data`'sı üzerinden)
 * sıradaki WS push'unu beklemeden anında yansır.
 */
export function useActiveOrders() {
  const { data, loading, error, refetch } = useQuery<ActiveOrdersResult>(ACTIVE_ORDERS, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const { data: subData } = useSubscription<ActiveOrdersUpdatesResult>(
    ACTIVE_ORDERS_UPDATES
  );

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (data?.activeOrders) setOrders(data.activeOrders);
  }, [data]);

  useEffect(() => {
    if (subData?.activeOrdersUpdates) setOrders(subData.activeOrdersUpdates);
  }, [subData]);

  const refetchAll = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    orders,
    loading,
    error: error ? error.message : null,
    refetch: refetchAll,
  };
}
