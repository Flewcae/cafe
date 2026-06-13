import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMutation } from '@apollo/client';
import { ChefHat, Clock, CheckCircle, RefreshCw } from 'lucide-react-native';
import { useActiveOrders } from '@/hooks/useActiveOrders';
import { MARK_SERVED } from '@/graphql/mutations';
import { MarkServedResult, MarkServedVars } from '@/graphql/generated/operations';
import { errorMessage } from '@/graphql/client/errors';
import { Order } from '@/types/api';

const PREPARING = 'preparing';

export default function KitchenScreen() {
  const router = useRouter();
  const { orders, loading, error, refetch } = useActiveOrders();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [markServed] = useMutation<MarkServedResult, MarkServedVars>(MARK_SERVED);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  useEffect(()=>{
    console.log('orders', orders);
    console.log('orders', orders);
    
  },[orders])
  // Mutfak: yalnızca hazırlanan kalemi olan adisyonlar.
  const preparingItems = (order: Order) =>
    order.items.filter((item) => item.status === PREPARING);
  const kitchenOrders = orders.filter((o) => preparingItems(o).length > 0);

  const handleMarkServed = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await markServed({ variables: { orderId } });
      await refetch();
    } catch (err) {
      Alert.alert('Hata', errorMessage(err, 'Servis işaretlenemedi.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mutfak</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <RefreshCw color="#0891b2" size={24} />
        </TouchableOpacity>
      </View>

      {loading && kitchenOrders.length === 0 ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#0891b2" />
        </View>
      ) : error && kitchenOrders.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Veriler yüklenemedi.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={kitchenOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => refetch()} tintColor="#0891b2" />
          }
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <ChefHat color="#334155" size={64} />
              <Text style={styles.emptyText}>Hazırlanan sipariş yok</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <TouchableOpacity onPress={() => router.push(`/order/${item.id}` as const)}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderCode}>{item.code}</Text>
                    <Text style={styles.orderTable}>Masa {item.tableName || '-'}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Clock color="#fbbf24" size={14} />
                    <Text style={styles.statusText}>Hazırlanıyor</Text>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {preparingItems(item).map((orderItem) => (
                    <View key={orderItem.id} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                      <Text style={styles.itemName}>{orderItem.name}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.serveButton, busyId === item.id && styles.serveButtonDisabled]}
                onPress={() => handleMarkServed(item.id)}
                disabled={busyId === item.id}
              >
                {busyId === item.id ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle color="#ffffff" size={20} />
                    <Text style={styles.serveButtonText}>Servis Edildi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 28, color: '#ffffff' },
  listContent: { padding: 16, paddingBottom: 100 },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 64, gap: 16 },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#64748b' },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#f87171' },
  retryButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0891b2' },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCode: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#ffffff' },
  orderTable: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#713f12',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fbbf24' },
  itemsList: { gap: 8, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemQuantity: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0891b2', width: 32 },
  itemName: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#e2e8f0', flex: 1 },
  serveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 12,
  },
  serveButtonDisabled: { opacity: 0.6 },
  serveButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#ffffff' },
});
