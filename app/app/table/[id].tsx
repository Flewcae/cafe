import React, { useState } from 'react';
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
import { useQuery, useSubscription, useMutation } from '@apollo/client';
import {
  ArrowLeft,
  Plus,
  Minus,
  ChefHat,
  CreditCard,
  Trash2,
  RefreshCw,
  Users,
  X,
} from 'lucide-react-native';
import { TABLE_DETAIL } from '@/graphql/queries';
import { ORDER_UPDATES } from '@/graphql/subscriptions';
import {
  OPEN_TABLE_ORDER,
  ADD_ORDER_ITEM,
  UPDATE_ORDER_ITEM,
  DELETE_ORDER_ITEM,
  SEND_TO_KITCHEN,
  ADD_PAYMENT,
} from '@/graphql/mutations';
import {
  TableDetailResult,
  TableDetailVars,
  OrderUpdatesResult,
  OrderUpdatesVars,
  OpenTableOrderResult,
  OpenTableOrderVars,
  AddOrderItemResult,
  AddOrderItemVars,
  UpdateOrderItemResult,
  UpdateOrderItemVars,
  DeleteOrderItemResult,
  DeleteOrderItemVars,
  SendToKitchenResult,
  SendToKitchenVars,
  AddPaymentResult,
  AddPaymentVars,
} from '@/graphql/generated/operations';
import { errorMessage } from '@/graphql/client/errors';
import { statusHex } from '@/theme/statusColors';
import { Category, Product } from '@/types/api';

// Backend Receipt.METHOD_CHOICES: cash | card | other
const PAYMENT_METHODS: { key: string; label: string }[] = [
  { key: 'cash', label: 'Nakit' },
  { key: 'card', label: 'Kart' },
  { key: 'other', label: 'Diğer' },
];

export default function TableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useQuery<TableDetailResult, TableDetailVars>(
    TABLE_DETAIL,
    {
      variables: { tableId: id ?? '' },
      skip: !id,
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    }
  );

  const queryOrder = data?.tableDetail?.openOrder ?? null;
  const subOrderId = queryOrder?.id ?? '';

  const { data: subData } = useSubscription<OrderUpdatesResult, OrderUpdatesVars>(ORDER_UPDATES, {
    variables: { orderId: subOrderId },
    skip: !subOrderId,
  });

  const table = data?.tableDetail?.table ?? null;
  const menu = data?.tableDetail?.menu ?? [];
  const openOrder = subData?.orderUpdates ?? queryOrder;

  const [openTableOrder] = useMutation<OpenTableOrderResult, OpenTableOrderVars>(OPEN_TABLE_ORDER);
  const [addOrderItem] = useMutation<AddOrderItemResult, AddOrderItemVars>(ADD_ORDER_ITEM);
  const [updateOrderItem] = useMutation<UpdateOrderItemResult, UpdateOrderItemVars>(UPDATE_ORDER_ITEM);
  const [deleteOrderItem] = useMutation<DeleteOrderItemResult, DeleteOrderItemVars>(DELETE_ORDER_ITEM);
  const [sendToKitchen] = useMutation<SendToKitchenResult, SendToKitchenVars>(SEND_TO_KITCHEN);
  const [addPayment] = useMutation<AddPaymentResult, AddPaymentVars>(ADD_PAYMENT);

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    try {
      await fn();
      await refetch();
      return true;
    } catch (err) {
      Alert.alert('Hata', errorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleOpenOrder = () =>
    run(() => openTableOrder({ variables: { tableId: id ?? '' } }), 'Adisyon açılamadı.');

  const handleAddItem = async (product: Product) => {
    if (!openOrder) return;
    setShowMenuModal(false);
    setSelectedCategory(null);
    await run(
      () =>
        addOrderItem({
          variables: { orderId: openOrder.id, productId: product.id, quantity: 1 },
        }),
      'Ürün eklenemedi.'
    );
  };

  const handleUpdateQuantity = (itemId: string, current: number, delta: number) => {
    const next = Math.max(1, current + delta);
    if (next === current) return;
    run(() => updateOrderItem({ variables: { itemId, quantity: next } }), 'Adet güncellenemedi.');
  };

  const handleDeleteItem = (itemId: string) =>
    run(() => deleteOrderItem({ variables: { itemId } }), 'Kalem silinemedi.');

  const handleSendToKitchen = () => {
    if (!openOrder) return;
    run(() => sendToKitchen({ variables: { orderId: openOrder.id } }), 'Mutfağa gönderilemedi.');
  };

  const handleAddPayment = async () => {
    if (!openOrder) return;
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin.');
      return;
    }
    const ok = await run(
      () =>
        addPayment({
          variables: {
            orderId: openOrder.id,
            amount: amount.toFixed(2), // Decimal -> string
            method: paymentMethod,
          },
        }),
      'Ödeme alınamadı.'
    );
    if (ok) {
      setShowPaymentModal(false);
      setPaymentAmount('');
    }
  };

  if (loading && !table) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!table) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ? 'Masa yüklenemedi' : 'Masa bulunamadı'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#0891b2" size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasPendingItems = openOrder?.items.some((i) => i.status === 'pending');

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
            <Text style={styles.headerSubtitle}>{table.capacity} Kişi</Text>
          </View>
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
        {!openOrder ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aktif Adisyon Yok</Text>
            <Text style={styles.emptySubtitle}>Bu masada açık adisyon bulunmuyor.</Text>
            <TouchableOpacity
              style={[styles.openOrderButton, busy && styles.disabled]}
              onPress={handleOpenOrder}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Plus color="#ffffff" size={20} />
                  <Text style={styles.openOrderText}>Yeni Adisyon Aç</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.orderHeader}>
              <Text style={styles.orderCode}>{openOrder.code}</Text>
              <Text style={styles.orderStatus}>
                {openOrder.statusDisplay} - {openOrder.itemCount} Kalem
              </Text>
            </View>

            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Siparişler</Text>
              {openOrder.items.length === 0 ? (
                <Text style={styles.emptyText}>Henüz sipariş eklenmedi.</Text>
              ) : (
                openOrder.items.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.itemCard, { borderLeftColor: statusHex(item.statusColor) }]}
                  >
                    <View style={styles.itemMain}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityBtn}
                          disabled={busy}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                        >
                          <Minus color="#64748b" size={14} />
                        </TouchableOpacity>
                        <Text style={styles.itemQuantity}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityBtn}
                          disabled={busy}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                        >
                          <Plus color="#64748b" size={14} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>{item.unitPrice} TL</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <Text style={styles.itemTotal}>{item.lineTotal} TL</Text>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          disabled={busy}
                          onPress={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 color="#f87171" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {item.note && <Text style={styles.itemNote}>Not: {item.note}</Text>}
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.addMenuItem}
              onPress={() => setShowMenuModal(true)}
              disabled={busy}
            >
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
                <Text style={styles.totalLabel}>Ödenen</Text>
                <Text style={[styles.totalValue, { color: '#22c55e' }]}>{openOrder.totalPaid} TL</Text>
              </View>
              <View style={[styles.totalRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>Bakiye</Text>
                <Text style={[styles.balanceValue, openOrder.isFullyPaid ? styles.paid : styles.unpaid]}>
                  {openOrder.isFullyPaid ? 'Ödendi' : `${openOrder.balance} TL`}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {openOrder && (
        <View style={styles.actionBar}>
          {hasPendingItems && (
            <TouchableOpacity
              style={[styles.actionButton, busy && styles.disabled]}
              onPress={handleSendToKitchen}
              disabled={busy}
            >
              <ChefHat color="#ffffff" size={20} />
              <Text style={styles.actionButtonText}>Mutfağa Gönder</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.paymentButton, busy && styles.disabled]}
            onPress={() => setShowPaymentModal(true)}
            disabled={busy}
          >
            <CreditCard color="#ffffff" size={20} />
            <Text style={styles.actionButtonText}>Ödeme Al</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menü Modalı */}
      <Modal visible={showMenuModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Menü</Text>
            <TouchableOpacity
              onPress={() => {
                setShowMenuModal(false);
                setSelectedCategory(null);
              }}
            >
              <X color="#94a3b8" size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {!selectedCategory ? (
              menu.length === 0 ? (
                <Text style={styles.emptyText}>Menü boş.</Text>
              ) : (
                menu.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryCount}>{category.products.length} Ürün</Text>
                  </TouchableOpacity>
                ))
              )
            ) : (
              <>
                <TouchableOpacity style={styles.backCategory} onPress={() => setSelectedCategory(null)}>
                  <ArrowLeft color="#0891b2" size={20} />
                  <Text style={styles.backCategoryText}>Kategoriler</Text>
                </TouchableOpacity>
                <Text style={styles.selectedCategoryTitle}>{selectedCategory.name}</Text>
                {selectedCategory.products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productCard, !product.isAvailable && styles.disabled]}
                    disabled={!product.isAvailable || busy}
                    onPress={() => handleAddItem(product)}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>
                        {product.price} TL{!product.isAvailable ? ` · ${product.statusLabel}` : ''}
                      </Text>
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

      {/* Ödeme Modalı */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ödeme Al</Text>
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
            <Text style={styles.inputLabel}>Ödeme Tutarı</Text>
            <TextInput
              style={styles.paymentInput}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#64748b"
            />
            <Text style={styles.inputLabel}>Ödeme Yöntemi</Text>
            <View style={styles.methodButtons}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodButton, paymentMethod === m.key && styles.methodButtonActive]}
                  onPress={() => setPaymentMethod(m.key)}
                >
                  <Text
                    style={[
                      styles.methodButtonText,
                      paymentMethod === m.key && styles.methodButtonTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmPaymentButton, busy && styles.disabled]}
              onPress={handleAddPayment}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmPaymentText}>Ödemeyi Onayla</Text>
              )}
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
  disabled: { opacity: 0.6 },
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
