import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Plus, Minus, ChefHat, CheckCircle, Trash2, CreditCard, RefreshCw, Users, X } from 'lucide-react-native';
import { Table, TableDetail, Order, Category, OrderItem } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';

// Demo data
const DEMO_TABLES: Record<string, { table: Table; openOrder: Order | null }> = {
  't1': {
    table: { id: 't1', name: 'M1', capacity: 4, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'square', shapeDisplay: 'Kare', isActive: true, posX: 50, posY: 50, width: 80, height: 80, rotation: 0, qrToken: 'qr1', hasOpenOrder: false, openOrderId: null },
    openOrder: null,
  },
  't2': {
    table: { id: 't2', name: 'M2', capacity: 2, status: 'occupied', statusDisplay: 'Dolu', statusColor: '#f59e0b', shape: 'round', shapeDisplay: 'Yuvarlak', isActive: true, posX: 180, posY: 50, width: 70, height: 70, rotation: 0, qrToken: 'qr2', hasOpenOrder: true, openOrderId: 'o1' },
    openOrder: {
      id: 'o1',
      code: 'AD-001',
      orderType: 'table',
      typeDisplay: 'Masa',
      status: 'open',
      statusDisplay: 'Acik',
      statusColor: '#94a3b8',
      isOpen: true,
      note: null,
      tableId: 't2',
      tableName: 'M2',
      itemCount: 3,
      subtotal: '145.00',
      total: '145.00',
      totalPaid: '50.00',
      balance: '95.00',
      isFullyPaid: false,
      createdAt: new Date().toISOString(),
      items: [
        { id: 'i1', productId: 'p1', name: 'Izgara Tavuk', unitPrice: '85.00', quantity: 1, note: 'Az baharatli', status: 'pending', statusDisplay: 'Bekliyor', statusColor: '#94a3b8', lineTotal: '85.00' },
        { id: 'i2', productId: 'p2', name: 'Sezar Salata', unitPrice: '45.00', quantity: 1, note: null, status: 'pending', statusDisplay: 'Bekliyor', statusColor: '#94a3b8', lineTotal: '45.00' },
        { id: 'i3', productId: 'p3', name: 'Cola', unitPrice: '15.00', quantity: 1, note: null, status: 'pending', statusDisplay: 'Bekliyor', statusColor: '#94a3b8', lineTotal: '15.00' },
      ],
      receipts: [],
    },
  },
};

const DEMO_MENU: Category[] = [
  {
    id: 'c1',
    name: 'Ana Yemekler',
    description: 'Ana yemek secenekleri',
    products: [
      { id: 'p1', name: 'Izgara Tavuk', description: 'Firinda pisirilmis tavuk', price: '85.00', imageUrl: null, preparationTime: 20, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
      { id: 'p4', name: 'Karides Guvec', description: 'Ozel sosla karides', price: '95.00', imageUrl: null, preparationTime: 25, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
      { id: 'p5', name: 'Kofte Tabagi', description: 'Ev yapimi kofte', price: '75.00', imageUrl: null, preparationTime: 15, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
    ],
  },
  {
    id: 'c2',
    name: 'Salatalar',
    description: 'Taze salatalar',
    products: [
      { id: 'p2', name: 'Sezar Salata', description: 'Klasik sezar', price: '45.00', imageUrl: null, preparationTime: 10, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
      { id: 'p6', name: 'Coban Salata', description: 'Geleneksel coban', price: '35.00', imageUrl: null, preparationTime: 5, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
    ],
  },
  {
    id: 'c3',
    name: 'Icecekler',
    description: 'Soguk ve sicak icecekler',
    products: [
      { id: 'p3', name: 'Cola', description: '330ml', price: '15.00', imageUrl: null, preparationTime: 1, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
      { id: 'p7', name: 'Ayran', description: 'Ev yapimi', price: '25.00', imageUrl: null, preparationTime: 2, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
      { id: 'p8', name: 'Turk Kahvesi', description: 'Geleneksel', price: '35.00', imageUrl: null, preparationTime: 5, isActive: true, isAvailable: true, statusColor: '#22c55e', statusLabel: 'Mevcut' },
    ],
  },
];

export default function TableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [tableData, setTableData] = useState<{ table: Table; openOrder: Order | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    const data = DEMO_TABLES[id || ''];
    setTableData(data || null);
    setIsLoading(false);
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleOpenOrder = () => {
    const newOrder: Order = {
      id: 'o-new',
      code: 'AD-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      orderType: 'table',
      typeDisplay: 'Masa',
      status: 'open',
      statusDisplay: 'Acik',
      statusColor: '#94a3b8',
      isOpen: true,
      note: null,
      tableId: id,
      tableName: tableData?.table.name || '',
      itemCount: 0,
      subtotal: '0.00',
      total: '0.00',
      totalPaid: '0.00',
      balance: '0.00',
      isFullyPaid: true,
      createdAt: new Date().toISOString(),
      items: [],
      receipts: [],
    };
    setTableData(prev => prev ? { ...prev, openOrder: newOrder } : null);
  };

  const handleAddItem = (product: { id: string; name: string; price: string }) => {
    if (!tableData?.openOrder) return;
    const newItem: OrderItem = {
      id: 'i-' + Date.now(),
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: 1,
      note: null,
      status: 'pending',
      statusDisplay: 'Bekliyor',
      statusColor: '#94a3b8',
      lineTotal: product.price,
    };
    const updatedItems = [...tableData.openOrder.items, newItem];
    const subtotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
    setTableData(prev => {
      if (!prev || !prev.openOrder) return prev;
      return {
        ...prev,
        openOrder: {
          ...prev.openOrder,
          items: updatedItems,
          itemCount: updatedItems.length,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
          balance: (subtotal - parseFloat(prev.openOrder.totalPaid)).toFixed(2),
          isFullyPaid: subtotal <= parseFloat(prev.openOrder.totalPaid),
        },
      };
    });
    setShowMenuModal(false);
    setSelectedCategory(null);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    if (!tableData?.openOrder) return;
    const updatedItems = tableData.openOrder.items.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          lineTotal: (parseFloat(item.unitPrice) * newQty).toFixed(2),
        };
      }
      return item;
    });
    const subtotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
    setTableData(prev => {
      if (!prev || !prev.openOrder) return prev;
      return {
        ...prev,
        openOrder: {
          ...prev.openOrder,
          items: updatedItems,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
          balance: (subtotal - parseFloat(prev.openOrder.totalPaid)).toFixed(2),
          isFullyPaid: subtotal <= parseFloat(prev.openOrder.totalPaid),
        },
      };
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!tableData?.openOrder) return;
    const updatedItems = tableData.openOrder.items.filter(item => item.id !== itemId);
    const subtotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
    setTableData(prev => {
      if (!prev || !prev.openOrder) return prev;
      return {
        ...prev,
        openOrder: {
          ...prev.openOrder,
          items: updatedItems,
          itemCount: updatedItems.length,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
          balance: (subtotal - parseFloat(prev.openOrder.totalPaid)).toFixed(2),
          isFullyPaid: subtotal <= parseFloat(prev.openOrder.totalPaid),
        },
      };
    });
  };

  const handleSendToKitchen = () => {
    if (!tableData?.openOrder) return;
    const updatedItems = tableData.openOrder.items.map(item => ({
      ...item,
      status: 'preparing',
      statusDisplay: 'Hazirlaniyor',
      statusColor: '#f59e0b',
    }));
    setTableData(prev => {
      if (!prev || !prev.openOrder) return prev;
      return {
        ...prev,
        openOrder: {
          ...prev.openOrder,
          status: 'preparing',
          statusDisplay: 'Hazirlaniyor',
          statusColor: '#f59e0b',
          items: updatedItems,
        },
      };
    });
    Alert.alert('Basarili', 'Siparis mutfağa gonderildi.');
  };

  const handleAddPayment = () => {
    if (!tableData?.openOrder || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    const newTotalPaid = parseFloat(tableData.openOrder.totalPaid) + amount;
    const newBalance = parseFloat(tableData.openOrder.total) - newTotalPaid;
    setTableData(prev => {
      if (!prev || !prev.openOrder) return prev;
      return {
        ...prev,
        openOrder: {
          ...prev.openOrder,
          totalPaid: newTotalPaid.toFixed(2),
          balance: Math.max(0, newBalance).toFixed(2),
          isFullyPaid: newBalance <= 0,
        },
      };
    });
    setShowPaymentModal(false);
    setPaymentAmount('');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!tableData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Masa bulunamadi</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#0891b2" size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { table, openOrder } = tableData;
  const hasPendingItems = openOrder?.items.some(i => i.status === 'pending');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#0891b2" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Masa {table.name}</Text>
          <View style={styles.tableInfo}>
            <Users color="#94a3b8" size={14} />
            <Text style={styles.headerSubtitle}>{table.capacity} Kisi</Text>
          </View>
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
        {!openOrder ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aktif Adisyon Yok</Text>
            <Text style={styles.emptySubtitle}>Bu masada acik adisyon bulunmuyor.</Text>
            <TouchableOpacity style={styles.openOrderButton} onPress={handleOpenOrder}>
              <Plus color="#ffffff" size={20} />
              <Text style={styles.openOrderText}>Yeni Adisyon Ac</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.orderHeader}>
              <Text style={styles.orderCode}>{openOrder.code}</Text>
              <Text style={styles.orderStatus}>{openOrder.statusDisplay} - {openOrder.itemCount} Kalem</Text>
            </View>

            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Siparisler</Text>
              {openOrder.items.length === 0 ? (
                <Text style={styles.emptyText}>Henüz siparis eklenmedi.</Text>
              ) : (
                openOrder.items.map((item) => (
                  <View key={item.id} style={[styles.itemCard, { borderLeftColor: item.statusColor }]}>
                    <View style={styles.itemMain}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => handleUpdateQuantity(item.id, -1)}>
                          <Minus color="#64748b" size={14} />
                        </TouchableOpacity>
                        <Text style={styles.itemQuantity}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => handleUpdateQuantity(item.id, 1)}>
                          <Plus color="#64748b" size={14} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>{item.unitPrice} TL</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <Text style={styles.itemTotal}>{item.lineTotal} TL</Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
                          <Trash2 color="#f87171" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {item.note && <Text style={styles.itemNote}>Not: {item.note}</Text>}
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity style={styles.addMenuItem} onPress={() => setShowMenuModal(true)}>
              <Plus color="#0891b2" size={20} />
              <Text style={styles.addMenuText}>Menüden Ekle</Text>
            </TouchableOpacity>

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Ara Toplam</Text>
                <Text style={styles.totalValue}>{openOrder.subtotal} TL</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Toplam</Text>
                <Text style={styles.totalValueBold}>{openOrder.total} TL</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Odenen</Text>
                <Text style={[styles.totalValue, { color: '#22c55e' }]}>{openOrder.totalPaid} TL</Text>
              </View>
              <View style={[styles.totalRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>Bakiye</Text>
                <Text style={[styles.balanceValue, openOrder.isFullyPaid ? styles.paid : styles.unpaid]}>
                  {openOrder.isFullyPaid ? 'Odendi' : `${openOrder.balance} TL`}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {openOrder && (
        <View style={styles.actionBar}>
          {hasPendingItems && (
            <TouchableOpacity style={styles.actionButton} onPress={handleSendToKitchen}>
              <ChefHat color="#ffffff" size={20} />
              <Text style={styles.actionButtonText}>Mutfağa Gonder</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionButton, styles.paymentButton]} onPress={() => setShowPaymentModal(true)}>
            <CreditCard color="#ffffff" size={20} />
            <Text style={styles.actionButtonText}>Odeme Al</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Modal */}
      <Modal visible={showMenuModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Menü</Text>
            <TouchableOpacity onPress={() => { setShowMenuModal(false); setSelectedCategory(null); }}>
              <X color="#94a3b8" size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {!selectedCategory ? (
              DEMO_MENU.map((category) => (
                <TouchableOpacity key={category.id} style={styles.categoryCard} onPress={() => setSelectedCategory(category)}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>{category.products.length} Ürün</Text>
                </TouchableOpacity>
              ))
            ) : (
              <>
                <TouchableOpacity style={styles.backCategory} onPress={() => setSelectedCategory(null)}>
                  <ArrowLeft color="#0891b2" size={20} />
                  <Text style={styles.backCategoryText}>Kategoriler</Text>
                </TouchableOpacity>
                <Text style={styles.selectedCategoryTitle}>{selectedCategory.name}</Text>
                {selectedCategory.products.map((product) => (
                  <TouchableOpacity key={product.id} style={styles.productCard} onPress={() => handleAddItem(product)}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price} TL</Text>
                    </View>
                    <View style={styles.addProductBtn}>
                      <Plus color="#ffffff" size={16} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Odeme Al</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <X color="#94a3b8" size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Toplam Tutar</Text>
              <Text style={styles.paymentTotal}>{openOrder?.total} TL</Text>
              <Text style={styles.paymentLabel}>Kalan Bakiye</Text>
              <Text style={styles.paymentBalance}>{openOrder?.balance} TL</Text>
            </View>
            <Text style={styles.inputLabel}>Odeme Tutari</Text>
            <TextInput
              style={styles.paymentInput}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#64748b"
            />
            <Text style={styles.inputLabel}>Odeme Yontemi</Text>
            <View style={styles.methodButtons}>
              {['cash', 'card', 'digital'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.methodButton, paymentMethod === method && styles.methodButtonActive]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[styles.methodButtonText, paymentMethod === method && styles.methodButtonTextActive]}>
                    {method === 'cash' ? 'Nakit' : method === 'card' ? 'Kart' : 'Dijital'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmPaymentButton} onPress={handleAddPayment}>
              <Text style={styles.confirmPaymentText}>Odemeyi Onayla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  tableInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#e2e8f0' },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  openOrderButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0891b2', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  openOrderText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#ffffff' },
  orderHeader: { marginBottom: 16 },
  orderCode: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#ffffff' },
  orderStatus: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  itemsSection: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#94a3b8', marginBottom: 12 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },
  itemCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderWidth: 1, borderColor: '#334155' },
  itemMain: { flexDirection: 'row', alignItems: 'center' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', borderRadius: 8, padding: 4 },
  quantityBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#334155', borderRadius: 4 },
  itemQuantity: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#e2e8f0', width: 24, textAlign: 'center' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#e2e8f0' },
  itemPrice: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b' },
  itemActions: { alignItems: 'flex-end' },
  itemTotal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0891b2', marginBottom: 4 },
  deleteBtn: { padding: 4 },
  itemNote: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  addMenuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#0891b2', marginBottom: 24 },
  addMenuText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0891b2' },
  totalsSection: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  totalLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  totalValue: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#e2e8f0' },
  totalValueBold: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#ffffff' },
  balanceRow: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 8, paddingTop: 16 },
  balanceLabel: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#e2e8f0' },
  balanceValue: { fontFamily: 'Inter-Bold', fontSize: 20 },
  paid: { color: '#22c55e' },
  unpaid: { color: '#f87171' },
  actionBar: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b', position: 'absolute', bottom: 0, left: 0, right: 0 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0891b2', borderRadius: 12, paddingVertical: 16 },
  paymentButton: { backgroundColor: '#22c55e' },
  actionButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#ffffff' },
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#ffffff' },
  modalContent: { padding: 16 },
  categoryCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  categoryName: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#ffffff', marginBottom: 4 },
  categoryCount: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  backCategory: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backCategoryText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0891b2' },
  selectedCategoryTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: '#ffffff', marginBottom: 16 },
  productCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  productInfo: { flex: 1 },
  productName: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#e2e8f0', marginBottom: 2 },
  productPrice: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#0891b2' },
  addProductBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0891b2', justifyContent: 'center', alignItems: 'center' },
  paymentInfo: { alignItems: 'center', marginBottom: 24 },
  paymentLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8', marginTop: 12 },
  paymentTotal: { fontFamily: 'Inter-Bold', fontSize: 24, color: '#ffffff' },
  paymentBalance: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#f87171' },
  inputLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  paymentInput: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, fontFamily: 'Inter-SemiBold', fontSize: 24, color: '#ffffff', textAlign: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  methodButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  methodButton: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  methodButtonActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  methodButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#94a3b8' },
  methodButtonTextActive: { color: '#ffffff' },
  confirmPaymentButton: { backgroundColor: '#22c55e', borderRadius: 12, padding: 18, alignItems: 'center' },
  confirmPaymentText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#ffffff' },
});
