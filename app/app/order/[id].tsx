import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useSubscription, useMutation } from '@apollo/client';
import { ArrowLeft, RefreshCw, Clock, ChefHat, CheckCircle, Users } from 'lucide-react-native';
import { ORDER } from '@/graphql/queries';
import { ORDER_UPDATES } from '@/graphql/subscriptions';
import { MARK_SERVED } from '@/graphql/mutations';
import {
  OrderResult,
  OrderVars,
  OrderUpdatesResult,
  OrderUpdatesVars,
  MarkServedResult,
  MarkServedVars,
} from '@/graphql/generated/operations';
import { statusHex } from '@/theme/statusColors';
import { errorMessage } from '@/graphql/client/errors';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useQuery<OrderResult, OrderVars>(ORDER, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const { data: subData } = useSubscription<OrderUpdatesResult, OrderUpdatesVars>(ORDER_UPDATES, {
    variables: { orderId: id ?? '' },
    skip: !id,
  });

  const [markServed] = useMutation<MarkServedResult, MarkServedVars>(MARK_SERVED);

  const order = subData?.orderUpdates ?? data?.order ?? null;

  const handleMarkServed = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await markServed({ variables: { orderId: order.id } });
      // Subscription zaten güncelleyecek; yine de garanti için refetch.
      await refetch();
      Alert.alert('Başarılı', 'Sipariş servis edildi olarak işaretlendi.');
    } catch (err) {
      Alert.alert('Hata', errorMessage(err, 'İşlem tamamlanamadı.'));
    } finally {
      setBusy(false);
    }
  };

  const getStatusIcon = (status: string, color: string) => {
    switch (status) {
      case 'preparing':
        return <ChefHat color={color} size={16} />;
      case 'served':
        return <CheckCircle color={color} size={16} />;
      default:
        return <Clock color={color} size={16} />;
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ? 'Adisyon yüklenemedi' : 'Adisyon bulunamadı'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#0891b2" size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const orderColor = statusHex(order.statusColor);
  const hasPendingItems = order.items.some((i) => i.status === 'pending');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#0891b2" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Adisyon {order.code}</Text>
          <Text style={styles.headerSubtitle}>Masa {order.tableName || '-'}</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()}>
          <RefreshCw color="#0891b2" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} tintColor="#0891b2" />
        }
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusRow}>
              {getStatusIcon(order.status, orderColor)}
              <Text style={styles.statusLabel}>{order.statusDisplay}</Text>
            </View>
            <Text style={styles.statusDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.statusInfo}>
            <View style={styles.statusInfoItem}>
              <Users color="#94a3b8" size={14} />
              <Text style={styles.statusInfoText}>Masa {order.tableName || '-'}</Text>
            </View>
            <Text style={styles.statusInfoText}>{order.itemCount} Kalem</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Siparişler</Text>
          {order.items.map((item) => {
            const itemColor = statusHex(item.statusColor);
            return (
              <View key={item.id} style={[styles.itemCard, { borderLeftColor: itemColor }]}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>@ {item.unitPrice} TL</Text>
                  </View>
                  <Text style={styles.itemTotal}>{item.lineTotal} TL</Text>
                </View>
                {item.note && <Text style={styles.itemNote}>Not: {item.note}</Text>}
                <View style={styles.itemStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: itemColor + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: itemColor }]}>
                      {item.statusDisplay}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Ara Toplam</Text>
            <Text style={styles.totalValue}>{order.subtotal} TL</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalValueBold}>{order.total} TL</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Ödenen</Text>
            <Text style={[styles.totalValue, { color: '#22c55e' }]}>{order.totalPaid} TL</Text>
          </View>
          <View style={[styles.totalRow, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>Bakiye</Text>
            <Text style={[styles.balanceValue, order.isFullyPaid ? styles.paid : styles.unpaid]}>
              {order.isFullyPaid ? 'Ödendi' : `${order.balance} TL`}
            </Text>
          </View>
        </View>

        {order.receipts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ödemeler</Text>
            {order.receipts.map((receipt) => (
              <View key={receipt.id} style={styles.receiptCard}>
                <View style={styles.receiptInfo}>
                  <Text style={styles.receiptCode}>{receipt.code}</Text>
                  <Text style={styles.receiptMethod}>{receipt.methodDisplay}</Text>
                </View>
                <Text style={styles.receiptAmount}>{receipt.amount} TL</Text>
                <Text style={styles.receiptDate}>{formatDate(receipt.paidAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {order.isOpen && hasPendingItems && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, busy && styles.actionButtonDisabled]}
            onPress={handleMarkServed}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <CheckCircle color="#ffffff" size={20} />
                <Text style={styles.actionButtonText}>Servis Edildi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', gap: 16 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#f87171' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0891b2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerContent: { flex: 1 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  statusCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: '#e2e8f0' },
  statusDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b' },
  statusInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  statusInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusInfoText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  section: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#94a3b8', marginBottom: 12 },
  itemCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderWidth: 1, borderColor: '#334155' },
  itemMain: { flexDirection: 'row', alignItems: 'center' },
  itemQuantity: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#0891b2', width: 40 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#e2e8f0' },
  itemPrice: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b' },
  itemTotal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#94a3b8' },
  itemNote: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  itemStatus: { marginTop: 12 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  totalsCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  totalLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  totalValue: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#e2e8f0' },
  totalValueBold: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#ffffff' },
  balanceRow: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 8, paddingTop: 16 },
  balanceLabel: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#e2e8f0' },
  balanceValue: { fontFamily: 'Inter-Bold', fontSize: 20 },
  paid: { color: '#22c55e' },
  unpaid: { color: '#f87171' },
  receiptCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  receiptInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  receiptCode: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#e2e8f0' },
  receiptMethod: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8' },
  receiptAmount: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#22c55e', marginTop: 8 },
  receiptDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 4 },
  actionBar: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b', position: 'absolute', bottom: 0, left: 0, right: 0 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 16 },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#ffffff' },
});
