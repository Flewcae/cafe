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
import { ChefHat, Clock, CheckCircle, RefreshCw } from 'lucide-react-native';
import { Order, OrderItem } from '@/types/api';

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
    totalPaid: '0.00',
    balance: '145.00',
    isFullyPaid: false,
    createdAt: new Date().toISOString(),
    items: [
      { id: 'i1', productId: 'p1', name: 'Izgara Tavuk', unitPrice: '85.00', quantity: 1, note: 'Az baharatli', status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '85.00' },
      { id: 'i2', productId: 'p2', name: 'Sezar Salata', unitPrice: '45.00', quantity: 1, note: null, status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '45.00' },
      { id: 'i3', productId: 'p3', name: 'Cola', unitPrice: '15.00', quantity: 1, note: null, status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '15.00' },
    ],
    receipts: [],
  },
  {
    id: 'o2',
    code: 'AD-002',
    orderType: 'table',
    typeDisplay: 'Masa',
    status: 'preparing',
    statusDisplay: 'Hazirlaniyor',
    statusColor: '#f59e0b',
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
    createdAt: new Date(Date.now() - 300000).toISOString(),
    items: [
      { id: 'i4', productId: 'p4', name: 'Karides Guvec', unitPrice: '95.00', quantity: 1, note: null, status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '95.00' },
      { id: 'i5', productId: 'p5', name: 'Ayran', unitPrice: '25.00', quantity: 1, note: null, status: 'preparing', statusDisplay: 'Hazirlaniyor', statusColor: '#f59e0b', lineTotal: '25.00' },
    ],
    receipts: [],
  },
];

export default function KitchenScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleMarkServed = (orderId: string) => {
    setOrders(orders.filter(o => o.id !== orderId));
  };

  const pendingItems = (order: Order) =>
    order.items.filter(item => item.status === 'preparing');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mutfak</Text>
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
            <ChefHat color="#334155" size={64} />
            <Text style={styles.emptyText}>Hazirlanan siparis yok</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <TouchableOpacity onPress={() => router.push(`/order/${item.id}` as const)}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderCode}>{item.code}</Text>
                  <Text style={styles.orderTable}>Masa {item.tableName}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Clock color="#fbbf24" size={14} />
                  <Text style={styles.statusText}>Hazirlaniyor</Text>
                </View>
              </View>

              <View style={styles.itemsList}>
                {pendingItems(item).map((orderItem) => (
                  <View key={orderItem.id} style={styles.itemRow}>
                    <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                    <Text style={styles.itemName}>{orderItem.name}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serveButton}
              onPress={() => handleMarkServed(item.id)}
            >
              <CheckCircle color="#ffffff" size={20} />
              <Text style={styles.serveButtonText}>Servis Edildi</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#713f12',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#fbbf24',
  },
  itemsList: {
    gap: 8,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQuantity: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#0891b2',
    width: 32,
  },
  itemName: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#e2e8f0',
    flex: 1,
  },
  serveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 12,
  },
  serveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
});
