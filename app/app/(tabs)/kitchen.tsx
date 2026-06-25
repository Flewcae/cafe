import React, { useCallback, useState } from 'react';
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
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';

const PREPARING = 'preparing';
const READY = 'ready';

export default function KitchenScreen() {
  const router = useRouter();
  const { orders, loading, error, refetch } = useActiveOrders();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { canChangeWaiter } = usePermissions();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [markServed] = useMutation<MarkServedResult, MarkServedVars>(MARK_SERVED);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  // Mutfak: hazırlanıyor ya da hazır durumundaki adisyonlar.
  // Servis Edildi aksiyonu yalnızca adisyon 'ready' olduğunda (mutfak tüm
  // kalemleri hazır işaretlediğinde) anlamlıdır — 'preparing' iken garson
  // müdahale edemez, bu yüzden kalemleri durumdan bağımsız gösteriyor ama
  // butonu adisyon durumuna göre kilitliyoruz.
  const visibleItems = (order: Order) =>
    order.items.filter((item) => item.status === PREPARING || item.status === READY);
  const kitchenOrders = orders.filter(
    (o) => o.status === PREPARING || o.status === READY
  );

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
          <RefreshCw color={colors.accent} size={24} />
        </TouchableOpacity>
      </View>

      {loading && kitchenOrders.length === 0 ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.accent} />
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
            <RefreshControl refreshing={loading} onRefresh={() => refetch()} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <ChefHat color={colors.border} size={64} />
              <Text style={styles.emptyText}>Hazırlanan sipariş yok</Text>
            </View>
          }
          renderItem={({ item }) => {
            const ready = item.status === READY;
            return (
            <View style={styles.orderCard}>
              <TouchableOpacity onPress={() => router.push(`/order/${item.id}` as const)}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderCode}>{item.code}</Text>
                    <Text style={styles.orderTable}>Masa {item.tableName || '-'}</Text>
                  </View>
                  <View style={[styles.statusBadge, ready && styles.statusBadgeReady]}>
                    {ready ? (
                      <CheckCircle color="#4ade80" size={14} />
                    ) : (
                      <Clock color="#fbbf24" size={14} />
                    )}
                    <Text style={[styles.statusText, ready && styles.statusTextReady]}>
                      {ready ? 'Hazır' : 'Hazırlanıyor'}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {visibleItems(item).map((orderItem) => (
                    <View key={orderItem.id} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                      <Text style={styles.itemName}>{orderItem.name}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              {/* Mutfak tüm kalemleri 'hazır' işaretlemeden (order.status === 'ready')
                  garson servis edildi diyemez — buton bu duruma kilitli. waiter:change
                  yetkisi yoksa buton hiç gösterilmez. */}
              {canChangeWaiter && (
                <TouchableOpacity
                  style={[
                    styles.serveButton,
                    (!ready || busyId === item.id) && styles.serveButtonDisabled,
                  ]}
                  onPress={() => handleMarkServed(item.id)}
                  disabled={!ready || busyId === item.id}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator color={colors.accentText} />
                  ) : (
                    <>
                      <CheckCircle color={colors.accentText} size={20} />
                      <Text style={styles.serveButtonText}>
                        {ready ? 'Servis Edildi' : 'Mutfakta Hazırlanıyor'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            );
          }}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.textPrimary },
  listContent: { padding: 16, paddingBottom: 100 },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 64, gap: 16 },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 16, color: colors.textMuted },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#f87171' },
  retryButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accent },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCode: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.textPrimary },
  orderTable: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
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
  statusBadgeReady: { backgroundColor: '#14532d' },
  statusTextReady: { color: '#4ade80' },
  itemsList: { gap: 8, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemQuantity: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accent, width: 32 },
  itemName: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textPrimary, flex: 1 },
  serveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  serveButtonDisabled: { opacity: 0.6 },
  serveButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accentText },
});
