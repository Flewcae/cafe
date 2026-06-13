import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Receipt, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';
import { Order } from '@/types/api';

// Demo orders
const DEMO_ORDERS: Order[] = [
  {
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
    items: [],
    receipts: [],
  },
  {
    id: 'o2',
    code: 'AD-002',
    orderType: 'table',
    typeDisplay: 'Masa',
    status: 'served',
    statusDisplay: 'Servis Edildi',
    statusColor: '#22c55e',
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
    items: [],
    receipts: [],
  },
  {
    id: 'o3',
    code: 'AD-003',
    orderType: 'table',
    typeDisplay: 'Masa',
    status: 'open',
    statusDisplay: 'Acik',
    statusColor: '#94a3b8',
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
    items: [],
    receipts: [],
  },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock color="#94a3b8" size={14} />;
      case 'preparing':
        return <Clock color="#fbbf24" size={14} />;
      case 'served':
        return <CheckCircle color="#22c55e" size={14} />;
      case 'cancelled':
        return <XCircle color="#ef4444" size={14} />;
      default:
        return <Clock color="#94a3b8" size={14} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aktif Adisyonlar</Text>
        <TouchableOpacity onPress={onRefresh}>
          <RefreshCw color="#0891b2" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0891b2"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Receipt color="#334155" size={64} />
            <Text style={styles.emptyText}>Aktif adisyon yok</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/order/${item.id}` as const)}
          >
            <View style={styles.orderHeader}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderCode}>{item.code}</Text>
                <Text style={styles.orderTable}>Masa {item.tableName}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.statusColor + '20' }]}>
                {getStatusIcon(item.status)}
                <Text style={[styles.statusText, { color: item.statusColor }]}>
                  {item.statusDisplay}
                </Text>
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
                <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.paymentBar}>
              <Text style={styles.paymentLabel}>Odenen: {item.totalPaid} TL</Text>
              <Text style={[styles.balance, item.isFullyPaid ? styles.paid : styles.unpaid]}>
                {item.isFullyPaid ? 'Odendi' : `Bakiye: ${item.balance} TL`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 64,
    gap: 16,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#64748b',
  },
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
  orderInfo: {
    flex: 1,
  },
  orderCode: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#ffffff',
  },
  orderTable: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  detailRow: {
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#e2e8f0',
  },
  paymentBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  paymentLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
  },
  balance: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  paid: {
    color: '#22c55e',
  },
  unpaid: {
    color: '#f87171',
  },
});
