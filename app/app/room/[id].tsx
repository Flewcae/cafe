import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useSubscription } from '@apollo/client';
import { ArrowLeft, RefreshCw, Users } from 'lucide-react-native';
import { ROOM } from '@/graphql/queries';
import { ROOM_UPDATES } from '@/graphql/subscriptions';
import {
  RoomResult,
  RoomVars,
  RoomUpdatesResult,
  RoomUpdatesVars,
} from '@/graphql/generated/operations';
import { statusHex } from '@/theme/statusColors';
import { Table } from '@/types/api';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';

function clampNum(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function touchDistance(touches: { pageX: number; pageY: number }[]) {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { data, loading, error, refetch } = useQuery<RoomResult, RoomVars>(ROOM, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // Canlı plan: backend her masa/adisyon değişiminde tüm salonu yayınlar.
  const { data: subData } = useSubscription<RoomUpdatesResult, RoomUpdatesVars>(ROOM_UPDATES, {
    variables: { roomId: id ?? '' },
    skip: !id,
  });

  const [room, setRoom] = useState<RoomResult['room']>(null);

  // Hangi kaynak en son değiştiyse o kullanılır — bkz. useActiveOrders.ts.
  useEffect(() => {
    if (data?.room) setRoom(data.room);
  }, [data]);

  useEffect(() => {
    if (subData?.roomUpdates) setRoom(subData.roomUpdates);
  }, [subData]);

  // --- Harita gibi zoom/pan (React Native çekirdeği: PanResponder + Animated;
  // ek native modül gerektirmez, Expo Go'da sorunsuz çalışır) -------------
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Animated.Value'ların "şu anki" değerini senkron okuyabilmek için
  // paralel düz ref'ler (Animated API'sinde resmi senkron getter yok).
  const currentScale = useRef(1);
  const currentTranslate = useRef({ x: 0, y: 0 });
  const minScaleRef = useRef(0.2);
  const maxScaleRef = useRef(4);

  const baseTranslateAtGrant = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  const setScale = (v: number) => {
    currentScale.current = v;
    scaleAnim.setValue(v);
  };
  const setTranslate = (x: number, y: number) => {
    currentTranslate.current = { x, y };
    translateAnim.setValue({ x, y });
  };

  const onViewportLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ width, height });
  };

  // Sayfaya ilk girişte (ya da salon/kanvas boyutu değişince) kanvasın TAM
  // GENİŞLİĞİNİ ekrana sığdır. Canlı veri güncellemelerinde (subscription
  // push'ları) bu efekt TEKRAR tetiklenmez — bağımlılıklar yalnızca
  // id/canvas boyutu/viewport, kullanıcının yaptığı zoom/pan korunur.
  useEffect(() => {
    if (!room || viewport.width <= 0 || viewport.height <= 0) return;
    const fitScale = viewport.width / room.canvasWidth;
    setScale(fitScale);
    setTranslate(0, 0);
    minScaleRef.current = fitScale * 0.4;
    maxScaleRef.current = fitScale * 4;
  }, [room?.id, room?.canvasWidth, room?.canvasHeight, viewport.width, viewport.height]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        baseTranslateAtGrant.current = { ...currentTranslate.current };
        pinchStartDistance.current = null;
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          const d = touchDistance(touches as any);
          if (pinchStartDistance.current == null) {
            pinchStartDistance.current = d;
            pinchStartScale.current = currentScale.current;
            return;
          }
          const ratio = d / pinchStartDistance.current;
          const next = clampNum(
            pinchStartScale.current * ratio,
            minScaleRef.current,
            maxScaleRef.current
          );
          setScale(next);
        } else {
          pinchStartDistance.current = null;
          setTranslate(
            baseTranslateAtGrant.current.x + gestureState.dx,
            baseTranslateAtGrant.current.y + gestureState.dy
          );
        }
      },
      onPanResponderRelease: () => {
        pinchStartDistance.current = null;
      },
      onPanResponderTerminate: () => {
        pinchStartDistance.current = null;
      },
    })
  ).current;

  // Açık adisyonu olan masa amber; aksi halde backend status_color -> hex.
  const getTableColor = (table: Table) =>
    table.hasOpenOrder ? '#3F3FF1' : statusHex(table.statusColor);

  if (loading && !room) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ? 'Salon yüklenemedi' : 'Salon bulunamadı'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.accent} size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={colors.accent} size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{room.name}</Text>
          <Text style={styles.headerSubtitle}>
            {room.tableCount} Masa - {room.totalCapacity} Kişi
          </Text>
        </View>
        <TouchableOpacity onPress={() => refetch()}>
          <RefreshCw color={colors.accent} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.viewport} onLayout={onViewportLayout}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.canvas,
            { width: room.canvasWidth, height: room.canvasHeight },
            {
              transform: [
                { translateX: translateAnim.x },
                { translateY: translateAnim.y },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {room.tables.map((table) => {
            const tableColor = getTableColor(table);
            const tableWidth = Math.max(60, table.width || 80);
            const tableHeight = Math.max(60, table.height || 80);

            return (
              <TouchableOpacity
                key={table.id}
                style={[
                  styles.table,
                  {
                    left: table.posX,
                    top: table.posY,
                    width: tableWidth,
                    height: tableHeight,
                    borderRadius: table.shape === 'round' ? Math.min(tableWidth, tableHeight) / 2 : 12,
                    backgroundColor: tableColor + '30',
                    borderColor: tableColor,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => router.push(`/table/${table.id}` as const)}
              >
                <Text style={[styles.tableName, { color: tableColor }]}>{table.name}</Text>
                <View style={styles.tableInfo}>
                  <Users color={tableColor} size={10} />
                  <Text style={[styles.tableCapacity, { color: tableColor }]}>{table.capacity}</Text>
                </View>
                {table.hasOpenOrder && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>!</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Boş</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Rezerve</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Dolu</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3F3FF1' }]} />
          <Text style={styles.legendText}>Açık Adisyon</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#64748b' }]} />
          <Text style={styles.legendText}>Kullanım Dışı</Text>
        </View>
      </View>
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
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerContent: { flex: 1 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.textPrimary },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary },
  // Kanvası saran, ekranda kalan alanı kaplayan ve dışına taşanı kırpan alan.
  viewport: { flex: 1,alignItems:"center", justifyContent:"center", overflow: 'hidden', backgroundColor: colors.background },
  // Kanvasın kendisi: uygulamanın arkaplan rengiyle aynı — ayrı bir "kart"
  // değil, salonun gerçek boyutunu (canvasWidth x canvasHeight) temsil eder.
  canvas: { backgroundColor: colors.surface, position: 'relative' },
  table: { position: 'absolute', justifyContent: 'center', alignItems: 'center', padding: 4 },
  tableName: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  tableInfo: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tableCapacity: { fontFamily: 'Inter-Regular', fontSize: 10 },
  orderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: colors.textPrimary },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: { alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary },
});
