import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useSubscription, useMutation } from '@apollo/client';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  ChefHat,
  CheckCircle,
  Users,
  CreditCard,
  X,
  Banknote,
  Wallet,
} from 'lucide-react-native';
import { ORDER } from '@/graphql/queries';
import { ORDER_UPDATES } from '@/graphql/subscriptions';
import { MARK_SERVED, ADD_PAYMENT } from '@/graphql/mutations';
import {
  OrderResult,
  OrderVars,
  OrderUpdatesResult,
  OrderUpdatesVars,
  MarkServedResult,
  MarkServedVars,
  AddPaymentResult,
  AddPaymentVars,
} from '@/graphql/generated/operations';
import { statusHex } from '@/theme/statusColors';
import { errorMessage } from '@/graphql/client/errors';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';

const PAYMENT_METHODS: { value: string; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Nakit', icon: Banknote },
  { value: 'card', label: 'Kredi Kartı', icon: CreditCard },
  { value: 'other', label: 'Diğer', icon: Wallet },
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { canChangeWaiter, canChangeOrders } = usePermissions();
  const { colors } = useTheme();
  const styles = getStyles(colors);

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
  const [addPayment] = useMutation<AddPaymentResult, AddPaymentVars>(ADD_PAYMENT);

  const [order, setOrder] = useState<OrderResult['order']>(null);

  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);

  // Hangi kaynak (query/mutation cache güncellemesi vs. WS push) en son
  // değiştiyse o kullanılır — bkz. useActiveOrders.ts'teki aynı düzeltme.
  useEffect(() => {
    if (data?.order) setOrder(data.order);
  }, [data]);

  useEffect(() => {
    if (subData?.orderUpdates) setOrder(subData.orderUpdates);
  }, [subData]);

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

  const openPaymentModal = () => {
    if (!order) return;
    setPaymentAmount(order.balance);
    setPaymentMethod(PAYMENT_METHODS[0].value);
    setPaymentNote('');
    setPaymentVisible(true);
  };

  const handleAddPayment = async () => {
    if (!order) return;
    const numericAmount = Number(paymentAmount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin.');
      return;
    }
    if (numericAmount > Number(order.balance)) {
      Alert.alert('Hata', 'Tutar, kalan bakiyeyi aşamaz.');
      return;
    }
    setPaymentBusy(true);
    try {
      await addPayment({
        variables: {
          orderId: order.id,
          amount: paymentAmount.replace(',', '.'),
          method: paymentMethod,
          note: paymentNote || null,
        },
      });
      await refetch();
      setPaymentVisible(false);
      Alert.alert('Başarılı', 'Ödeme alındı.');
    } catch (err) {
      Alert.alert('Hata', errorMessage(err, 'Ödeme alınamadı.'));
    } finally {
      setPaymentBusy(false);
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ? 'Adisyon yüklenemedi' : 'Adisyon bulunamadı'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.accent} size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const orderColor = statusHex(order.statusColor);
  // Servis butonu yalnızca mutfak her kalemi 'ready' yaptıktan sonra (order.status === 'ready')
  // aktif olmalı — hazırlanıyorken garson servis edildi diyemez. Yetkisi (waiter:change)
  // yoksa buton hiç gösterilmez — backend'in zaten reddedeceği bir aksiyon önerilmez.
  const canServe = order.status === 'ready';
  const showServeButton = canChangeWaiter && canServe;
  // Ödeme butonu yalnızca TÜM kalemler teslim edildiğinde (order.status === 'served')
  // aktif olmalı — sync_status_from_items, aktif kalemlerin hepsi 'served' olmadan
  // adisyonu 'served' yapmaz (bkz. orders/models.py). orders:change yetkisi yoksa
  // buton hiç gösterilmez.
  const canPay = order.status === 'served' && !order.isFullyPaid;
  const showPaymentButton = canChangeOrders && order.isOpen && !order.isFullyPaid;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={colors.accent} size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Adisyon {order.code}</Text>
          <Text style={styles.headerSubtitle}>Masa {order.tableName || '-'}</Text>
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
              <Users color={colors.textSecondary} size={14} />
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

      {order.isOpen && (showServeButton || showPaymentButton) && (
        <View style={styles.actionBar}>
          {showServeButton && (
            <TouchableOpacity
              style={[styles.actionButton, busy && styles.actionButtonDisabled]}
              onPress={handleMarkServed}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <>
                  <CheckCircle color={colors.accentText} size={20} />
                  <Text style={styles.actionButtonText}>Servis Edildi</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {showPaymentButton && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.paymentActionButton,
                !canPay && styles.actionButtonDisabled,
              ]}
              onPress={openPaymentModal}
              disabled={!canPay}
            >
              <CreditCard color={colors.accentText} size={20} />
              <Text style={styles.actionButtonText}>
                {canPay ? 'Ödeme Al' : 'Önce Servis Edilmeli'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={paymentVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ödeme Al</Text>
              <TouchableOpacity onPress={() => setPaymentVisible(false)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBalanceText}>Kalan Bakiye: {order.balance} TL</Text>

            <Text style={styles.modalLabel}>Tutar</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={styles.fullAmountButton}
                onPress={() => setPaymentAmount(order.balance)}
              >
                <Text style={styles.fullAmountButtonText}>Tümü</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Ödeme Yöntemi</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.methodChip, active && styles.methodChipActive]}
                    onPress={() => setPaymentMethod(m.value)}
                  >
                    <Icon color={active ? colors.accentText : colors.textSecondary} size={16} />
                    <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Not (opsiyonel)</Text>
            <TextInput
              style={styles.noteInput}
              value={paymentNote}
              onChangeText={setPaymentNote}
              placeholder="Not ekleyin..."
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.confirmButton, paymentBusy && styles.actionButtonDisabled]}
              onPress={handleAddPayment}
              disabled={paymentBusy}
            >
              {paymentBusy ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <Text style={styles.confirmButtonText}>Ödemeyi Onayla</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.accent },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerContent: { flex: 1 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.textPrimary },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  statusCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: colors.textPrimary },
  statusDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  statusInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  statusInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusInfoText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  section: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.textSecondary, marginBottom: 12 },
  itemCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border },
  itemMain: { flexDirection: 'row', alignItems: 'center' },
  itemQuantity: { fontFamily: 'Inter-Bold', fontSize: 16, color: colors.accent, width: 40 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Inter-Medium', fontSize: 16, color: colors.textPrimary },
  itemPrice: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  itemTotal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textSecondary },
  itemNote: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  itemStatus: { marginTop: 12 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  totalsCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  totalLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  totalValue: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.textPrimary },
  totalValueBold: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.textPrimary },
  balanceRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 16 },
  balanceLabel: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.textPrimary },
  balanceValue: { fontFamily: 'Inter-Bold', fontSize: 20 },
  paid: { color: '#22c55e' },
  unpaid: { color: '#f87171' },
  receiptCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  receiptInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  receiptCode: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textPrimary },
  receiptMethod: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary },
  receiptAmount: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#22c55e', marginTop: 8 },
  receiptDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted, marginTop: 4 },
  actionBar: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.surface, position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.background },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 16 },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accentText },
  paymentActionButton: { backgroundColor: colors.accent },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: colors.textPrimary },
  modalBalanceText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#f59e0b', marginBottom: 16 },
  modalLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textSecondary, marginTop: 12, marginBottom: 8 },
  amountRow: { flexDirection: 'row', gap: 10 },
  amountInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  fullAmountButton: {
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  fullAmountButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textPrimary },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  methodChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  methodChipText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textSecondary },
  methodChipTextActive: { color: colors.accentText },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textPrimary,
  },
  confirmButton: {
    marginTop: 20,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.accentText },
});
