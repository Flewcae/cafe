import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { apolloClient } from '@/graphql/client/apollo';
import { ROOMS, ORDER } from '@/graphql/queries';
import {
  RoomsResult,
  OrderResult,
  OrderVars,
} from '@/graphql/generated/operations';
import { Order } from '@/types/api';

/**
 * Backend'de adisyonları listeleyen bir query YOKTUR. Aktif (masaya bağlı)
 * adisyonları `rooms` sorgusundan (her masanın `openOrderId` alanı) toplayıp
 * her biri için `order(id)` çağırarak yeniden kurarız.
 *
 * Sınırlama: paket/gel-al (takeaway) adisyonların masası olmadığından bu
 * yöntemle gelmez — schema bunları listeleyen bir alan sunmuyor.
 */
export function useActiveOrders() {
  const { data, loading, error, refetch } = useQuery<RoomsResult>(ROOMS, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    const ids = (data?.rooms ?? [])
      .flatMap((r) => r.tables)
      .filter((t) => t.hasOpenOrder && t.openOrderId)
      .map((t) => t.openOrderId as string);

    if (ids.length === 0) {
      setOrders([]);
      return;
    }

    let active = true;
    setOrdersLoading(true);
    setOrdersError(null);

    Promise.all(
      ids.map((id) =>
        apolloClient
          .query<OrderResult, OrderVars>({
            query: ORDER,
            variables: { id },
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
          })
          .then((res) => res.data?.order ?? null)
          .catch(() => null)
      )
    )
      .then((list) => {
        if (!active) return;
        const valid = list.filter((o): o is Order => o != null);
        // Açık olmayan (ödenmiş/iptal) gelirse ele
        setOrders(valid.filter((o) => o.isOpen));
      })
      .catch(() => {
        if (active) setOrdersError('Adisyonlar yüklenemedi.');
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [data]);

  const refetchAll = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    orders,
    loading: loading || ordersLoading,
    error: error ? error.message : ordersError,
    refetch: refetchAll,
  };
}
