import React, { useEffect, useState } from 'react';
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
import { TABLE_UPDATES } from '@/graphql/subscriptions';
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
  TableUpdatesResult,
  TableUpdatesVars,
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
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';

// Backend Receipt.METHOD_CHOICES: cash | card | other
const PAYMENT_METHODS: { key: string; label: string }[] = [
  { key: 'cash', label: 'Nakit' },
  { key: 'card', label: 'Kart' },
  { key: 'other', label: 'Diğer' },
];

export default function TableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { canAddWaiter, canChangeWaiter, canDeleteWaiter, canChangeOrders } = usePermissions();
  const { colors } = useTheme();
  const styles = getStyles(colors);

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

  // `table_updates` masaya bağlıdır (order id'sine değil) — bu yüzden
  // masada henüz açık adisyon yokken de abone olunabilir. Böylece müşteri
  // QR'dan ilk siparişi verdiği an ya da başka biri (web garson paneli,
  // mutfak, admin) bu masayı değiştirdiğinde sayfa anlık haberdar olur.
  const { data: subData } = useSubscription<TableUpdatesResult, TableUpdatesVars>(TABLE_UPDATES, {
    variables: { tableId: id ?? '' },
    skip: !id,
  });

  const [detail, setDetail] = useState<TableDetailResult['tableDetail']>(null);

  // İki kaynaktan (query/mutation cache güncellemesi vs. WS push) hangisi en
  // son değiştiyse o kullanılır — sabit bir öncelik, mutation sonrası cache
  // tazeliğinin sıradaki WS push'una kadar görünmemesine yol açar.
  useEffect(() => {
    if (data?.tableDetail) setDetail(data.tableDetail);
  }, [data]);

  useEffect(() => {
    if (subData?.tableUpdates) setDetail(subData.tableUpdates);
  }, [subData]);

  const table = detail?.table ?? null;
  const menu = detail?.menu ?? [];
  const openOrder = detail?.openOrder ?? null;

  const [openTableOrder] = useMutation<OpenTableOrderResult, OpenTableOrderVars>(OPEN_TABLE_ORDER);
  const [addOrderItem] = useMutation<AddOrderItemResult, AddOrderItemVars>(ADD_ORDER_ITEM);
  const [updateOrderItem] = useMutation<UpdateOrderItemResult, UpdateOrderItemVars>(UPDATE_ORDER_ITEM);
  const [deleteOrderItem] = useMutation<DeleteOrderItemResult, DeleteOrderItemVars>(DELETE_ORDER_ITEM);
  const [sendToKitchen] = useMutation<SendToKitchenResult, SendToKitchenVars>(SEND_TO_KITCHEN);
  const [addPayment] = useMutation<AddPaymentResult, AddPaymentVars>(ADD_PAYMENT);

  useEffect(()=>{
    if (openOrder) {
      setPaymentAmount(openOrder.balance)
    }
  },[openOrder])

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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!table) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ? 'Masa yüklenemedi' : 'Masa bulunamadı'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.accent} size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasPendingItems = openOrder?.items.some((i) => i.status === 'pending');
  // Ödeme butonu yalnızca TÜM kalemler teslim edildiğinde (order.status === 'served')
  // aktif olmalı — sync_status_from_items, aktif kalemlerin hepsi 'served' olmadan
  // adisyonu 'served' yapmaz (bkz. orders/models.py).
  const canPay = !!openOrder && openOrder.status === 'served' && !openOrder.isFullyPaid;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={colors.accent} size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Masa {table.name}</Text>
          <View style={styles.tableInfo}>
            <Users color={colors.textSecondary} size={14} />
            <Text style={styles.headerSubtitle}>{table.capacity} Kişi</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => refetch()}>
          <RefreshCw color={colors.accent} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} tintColor={colors.accent} />
        }
      >
        {!openOrder ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aktif Adisyon Yok</Text>
            <Text style={styles.emptySubtitle}>Bu masada açık adisyon bulunmuyor.</Text>
            {canAddWaiter ? (
              <TouchableOpacity
                style={[styles.openOrderButton, busy && styles.disabled]}
                onPress={handleOpenOrder}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <>
                    <Plus color={colors.accentText} size={20} />
                    <Text style={styles.openOrderText}>Yeni Adisyon Aç</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPermText}>Adisyon açma yetkiniz yok.</Text>
            )}
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
                        {canChangeWaiter && (
                          <TouchableOpacity
                            style={styles.quantityBtn}
                            disabled={busy}
                            onPress={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                          >
                            <Minus color={colors.textMuted} size={14} />
                          </TouchableOpacity>
                        )}
                        <Text style={styles.itemQuantity}>{item.quantity}</Text>
                        {canChangeWaiter && (
                          <TouchableOpacity
                            style={styles.quantityBtn}
                            disabled={busy}
                            onPress={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                          >
                            <Plus color={colors.textMuted} size={14} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>{item.unitPrice} TL</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <Text style={styles.itemTotal}>{item.lineTotal} TL</Text>
                        {canDeleteWaiter && (
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            disabled={busy}
                            onPress={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 color="#f87171" size={16} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {item.note && <Text style={styles.itemNote}>Not: {item.note}</Text>}
                  </View>
                ))
              )}
            </View>

            {canAddWaiter && (
              <TouchableOpacity
                style={styles.addMenuItem}
                onPress={() => setShowMenuModal(true)}
                disabled={busy}
              >
                <Plus color={colors.accent} size={20} />
                <Text style={styles.addMenuText}>Menüden Ekle</Text>
              </TouchableOpacity>
            )}

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

      {openOrder && ((canChangeWaiter && hasPendingItems) || canChangeOrders) && (
        <View style={styles.actionBar}>
          {canChangeWaiter && hasPendingItems && (
            <TouchableOpacity
              style={[styles.actionButton, busy && styles.disabled]}
              onPress={handleSendToKitchen}
              disabled={busy}
            >
              <ChefHat color={colors.accentText} size={20} />
              <Text style={styles.actionButtonText}>Mutfağa Gönder</Text>
            </TouchableOpacity>
          )}
          {canChangeOrders && (
            <TouchableOpacity
              style={[styles.actionButton, styles.paymentButton, (busy || !canPay) && styles.disabled]}
              onPress={() => setShowPaymentModal(true)}
              disabled={busy || !canPay}
            >
              <CreditCard color={colors.accentText} size={20} />
              <Text style={styles.actionButtonText}>
                {canPay ? 'Ödeme Al' : 'Önce Servis Edilmeli'}
              </Text>
            </TouchableOpacity>
          )}
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
              <X color={colors.textSecondary} size={24} />
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
                  <ArrowLeft color={colors.accent} size={20} />
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
                      <Plus color={colors.accentText} size={16} />
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
              <X color={colors.textSecondary} size={24} />
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
              placeholderTextColor={colors.textMuted}
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
                <ActivityIndicator color={colors.accentText} />
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

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 16 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#f87171' },
  disabled: { opacity: 0.6 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  backText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.accent },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backBtn: { padding: 4, marginRight: 12 },
  headerContent: { flex: 1 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.textPrimary },
  tableInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: colors.textPrimary },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  noPermText: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  openOrderButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  openOrderText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.accentText },
  orderHeader: { marginBottom: 16 },
  orderCode: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.textPrimary },
  orderStatus: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  itemsSection: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.textSecondary, marginBottom: 12 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted },
  itemCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border },
  itemMain: { flexDirection: 'row', alignItems: 'center' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 8, padding: 4 },
  quantityBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border, borderRadius: 4 },
  itemQuantity: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.textPrimary, width: 24, textAlign: 'center' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.textPrimary },
  itemPrice: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  itemActions: { alignItems: 'flex-end' },
  itemTotal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accent, marginBottom: 4 },
  deleteBtn: { padding: 4 },
  itemNote: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  addMenuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.accent, marginBottom: 24 },
  addMenuText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.accent },
  totalsSection: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  totalLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  totalValue: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.textPrimary },
  totalValueBold: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.textPrimary },
  balanceRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 16 },
  balanceLabel: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.textPrimary },
  balanceValue: { fontFamily: 'Inter-Bold', fontSize: 20 },
  paid: { color: '#22c55e' },
  unpaid: { color: '#f87171' },
  actionBar: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.surface, position: 'absolute', bottom: 0, left: 0, right: 0 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16 },
  paymentButton: { backgroundColor: '#22c55e' },
  actionButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accentText },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: colors.textPrimary },
  modalContent: { padding: 16 },
  categoryCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  categoryName: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.textPrimary, marginBottom: 4 },
  categoryCount: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  backCategory: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backCategoryText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accent },
  selectedCategoryTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.textPrimary, marginBottom: 16 },
  productCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  productInfo: { flex: 1 },
  productName: { fontFamily: 'Inter-Medium', fontSize: 16, color: colors.textPrimary, marginBottom: 2 },
  productPrice: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.accent },
  addProductBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  paymentInfo: { alignItems: 'center', marginBottom: 24 },
  paymentLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary, marginTop: 12 },
  paymentTotal: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.textPrimary },
  paymentBalance: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#f87171' },
  inputLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  paymentInput: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, fontFamily: 'Inter-SemiBold', fontSize: 24, color: colors.textPrimary, textAlign: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  methodButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  methodButton: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  methodButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  methodButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textSecondary },
  methodButtonTextActive: { color: colors.accentText },
  confirmPaymentButton: { backgroundColor: '#22c55e', borderRadius: 12, padding: 18, alignItems: 'center' },
  confirmPaymentText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.accentText },
});
