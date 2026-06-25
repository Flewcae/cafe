import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Receipt, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';
import { useActiveOrders } from '@/hooks/useActiveOrders';
import { statusHex } from '@/theme/statusColors';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, loading, error, refetch } = useActiveOrders();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const getStatusIcon = (status: string, color: string) => {
    switch (status) {
      case 'served':
        return <CheckCircle color={color} size={14} />;
      case 'cancelled':
        return <XCircle color={color} size={14} />;
      default:
        return <Clock color={color} size={14} />;
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aktif Adisyonlar</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <RefreshCw color={colors.accent} size={24} />
        </TouchableOpacity>
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Adisyonlar yüklenemedi.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => refetch()} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Receipt color={colors.border} size={64} />
              <Text style={styles.emptyText}>Aktif adisyon yok</Text>
            </View>
          }
          renderItem={({ item }) => {
            const color = statusHex(item.statusColor);
            return (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => router.push(`/order/${item.id}` as const)}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderCode}>{item.code}</Text>
                    <Text style={styles.orderTable}>Masa {item.tableName || '-'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    {getStatusIcon(item.status, color)}
                    <Text style={[styles.statusText, { color }]}>{item.statusDisplay}</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kalem:</Text>
                    <Text style={styles.detailValue}>{item.itemCount}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tutar:</Text>
                    <Text style={styles.detailValue}>{item.total} TL</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Saat:</Text>
                    <Text style={styles.detailValue}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.paymentBar}>
                  <Text style={styles.paymentLabel}>Ödenen: {item.totalPaid} TL</Text>
                  <Text style={[styles.balance, item.isFullyPaid ? styles.paid : styles.unpaid]}>
                    {item.isFullyPaid ? 'Ödendi' : `Bakiye: ${item.balance} TL`}
                  </Text>
                </View>
              </TouchableOpacity>
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
  orderInfo: { flex: 1 },
  orderCode: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.textPrimary },
  orderTable: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  orderDetails: { flexDirection: 'row', gap: 24, marginBottom: 12 },
  detailRow: { alignItems: 'center' },
  detailLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  detailValue: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.textPrimary },
  paymentBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  balance: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  paid: { color: '#22c55e' },
  unpaid: { color: '#f87171' },
});
