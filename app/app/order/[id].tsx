import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, RefreshCw, Clock, ChefHat, CheckCircle, Users } from 'lucide-react-native';
import { Order } from '@/types/api';

// Demo orders
const DEMO_ORDERS: Record<string, Order> = {
  'o1': {
    id: 'o1',
    code: 'AD-001',
    orderType: 'table',
    typeDisplay: 'Masa',
    status: 'preparing',
    statusDisplay: 'Hazirlaniyor',
    statusColor: '#f59e0b',
    isOpen: true,
    note: null,
    tableId: 't1',
    tableName: 'M2',
    itemCount: 3,
    subtotal: '145.00',
    total: '145.00',
    totalPaid: '50.00',
    balance: '95.00',
    isFullyPaid: false,
    createdAt: new Date().toISOString(),
    items: [
      { id: 'i1', productId: 'p1', name: 'Izgara Tavuk', unitPrice: '85.00', quantity: 1, note: 'Az baharatli', status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '85.00' },
      { id: 'i2', productId: 'p2', name: 'Sezar Salata', unitPrice: '45.00', quantity: 1, note: null, status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '45.00' },
      { id: 'i3', productId: 'p3', name: 'Cola', unitPrice: '15.00', quantity: 1, note: null, status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '15.00' },
    ],
    receipts: [
      { id: 'r1', code: 'RC-001', method: 'cash', methodDisplay: 'Nakit', amount: '50.00', note: null, paidAt: new Date().toISOString() },
    ],
  },
  'o2': {
    id: 'o2',
    code: 'AD-002',
    orderType: 'table',
    typeDisplay: 'Masa',
    status: 'open',
    statusDisplay: 'Acik',
    statusColor: '#94a3b8',
    isOpen: true,
    note: null,
    tableId: 't2',
    tableName: 'T2',
    itemCount: 2,
    subtotal: '120.00',
    total: '120.00',
    totalPaid: '0.00',
    balance: '120.00',
    isFullyPaid: false,
    createdAt: new Date(Date.now() - 600000).toISOString(),
    items: [
      { id: 'i4', productId: 'p4', name: 'Karides Guvec', unitPrice: '95.00', quantity: 1, note: null, status: 'pending', statusDisplay: 'Bekliyor', statusColor: '#94a3b8', lineTotal: '95.00' },
      { id: 'i5', productId: 'p7', name: 'Ayran', unitPrice: '25.00', quantity: 1, note: null, status: 'pending', statusDisplay: 'Bekliyor', statusColor: '#94a3b8', lineTotal: '25.00' },
    ],
    receipts: [],
  },
  'o3': {
    id: 'o3',
    code: 'AD-003',
    orderType: 'table',
    typeDisplay: 'Masa',
    status: 'served',
    statusDisplay: 'Servis Edildi',
    statusColor: '#22c55e',
    isOpen: true,
    note: null,
    tableId: 't3',
    tableName: 'VIP-1',
    itemCount: 5,
    subtotal: '350.00',
    total: '350.00',
    totalPaid: '350.00',
    balance: '0.00',
    isFullyPaid: true,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    items: [
      { id: 'i6', productId: 'p5', name: 'Kofte Tabagi', unitPrice: '75.00', quantity: 2, note: null, status: 'served', statusDisplay: 'Servis Edildi', statusColor: '#22c55e', lineTotal: '150.00' },
      { id: 'i7', productId: 'p6', name: 'Coban Salata', unitPrice: '35.00', quantity: 2, note: null, status: 'served', statusDisplay: 'Servis Edildi', statusColor: '#22c55e', lineTotal: '70.00' },
      { id: 'i8', productId: 'p8', name: 'Turk Kahvesi', unitPrice: '35.00', quantity: 1, note: 'Sekerli', status: 'served', statusDisplay: 'Servis Edildi', statusColor: '#22c55e', lineTotal: '35.00' },
    ],
    receipts: [
      { id: 'r2', code: 'RC-002', method: 'card', methodDisplay: 'Kredi Karti', amount: '200.00', note: null, paidAt: new Date(Date.now() - 900000).toISOString() },
      { id: 'r3', code: 'RC-003', method: 'cash', methodDisplay: 'Nakit', amount: '150.00', note: null, paidAt: new Date(Date.now() - 600000).toISOString() },
    ],
  },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const data = DEMO_ORDERS[id || ''];
    setOrder(data || null);
    setIsLoading(false);
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleMarkServed = () => {
    if (!order) return;
    const updatedItems = order.items.map(item => ({
      ...item,
      status: 'served',
      statusDisplay: 'Servis Edildi',
      statusColor: '#22c55e',
    }));
    setOrder({
      ...order,
      status: 'served',
      statusDisplay: 'Servis Edildi',
      statusColor: '#22c55e',
      items: updatedItems,
    });
    Alert.alert('Basarili', 'Siparis servis edildi olarak isaretlendi.');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock color="#94a3b8" size={16} />;
      case 'preparing': return <ChefHat color="#fbbf24" size={16} />;
      case 'served': return <CheckCircle color="#22c55e" size={16} />;
      default: return <Clock color="#94a3b8" size={16} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Adisyon bulunamadi</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#0891b2" size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasPendingItems = order.items.some(i => i.status === 'pending');

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
        <TouchableOpacity onPress={onRefresh}>
          <RefreshCw color="#0891b2" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusRow}>
              {getStatusIcon(order.status)}
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
          <Text style={styles.sectionTitle}>Siparisler</Text>
          {order.items.map((item) => (
            <View key={item.id} style={[styles.itemCard, { borderLeftColor: item.statusColor }]}>
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
                <View style={[styles.statusBadge, { backgroundColor: item.statusColor + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: item.statusColor }]}>{item.statusDisplay}</Text>
                </View>
              </View>
            </View>
          ))}
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
            <Text style={styles.totalLabel}>Odenen</Text>
            <Text style={[styles.totalValue, { color: '#22c55e' }]}>{order.totalPaid} TL</Text>
          </View>
          <View style={[styles.totalRow, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>Bakiye</Text>
            <Text style={[styles.balanceValue, order.isFullyPaid ? styles.paid : styles.unpaid]}>
              {order.isFullyPaid ? 'Odendi' : `${order.balance} TL`}
            </Text>
          </View>
        </View>

        {order.receipts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Odemeler</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkServed}>
            <CheckCircle color="#ffffff" size={20} />
            <Text style={styles.actionButtonText}>Servis Edildi</Text>
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
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  backText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0891b2' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
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
  actionButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#ffffff' },
});
