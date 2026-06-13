import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw, Users } from 'lucide-react-native';
import { Room, Table, DEMO_ROOMS } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';

// Extend the types file with demo data
import { Table as TableType, Room as RoomType } from '@/types/api';

const DEMO_ROOMS_DATA: RoomType[] = [
  {
    id: '1',
    name: 'Ana Salon',
    description: 'Genel kullanim alani',
    isActive: true,
    canvasWidth: 800,
    canvasHeight: 600,
    tableCount: 12,
    totalCapacity: 48,
    tables: [
      { id: 't1', name: 'M1', capacity: 4, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'square', shapeDisplay: 'Kare', isActive: true, posX: 50, posY: 50, width: 80, height: 80, rotation: 0, qrToken: 'qr1', hasOpenOrder: false, openOrderId: null },
      { id: 't2', name: 'M2', capacity: 2, status: 'occupied', statusDisplay: 'Dolu', statusColor: '#f59e0b', shape: 'round', shapeDisplay: 'Yuvarlak', isActive: true, posX: 180, posY: 50, width: 70, height: 70, rotation: 0, qrToken: 'qr2', hasOpenOrder: true, openOrderId: 'o1' },
      { id: 't3', name: 'M3', capacity: 6, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'rect', shapeDisplay: 'Dikdortgen', isActive: true, posX: 300, posY: 50, width: 120, height: 80, rotation: 0, qrToken: 'qr3', hasOpenOrder: false, openOrderId: null },
      { id: 't4', name: 'M4', capacity: 4, status: 'reserved', statusDisplay: 'Rezerve', statusColor: '#6366f1', shape: 'square', shapeDisplay: 'Kare', isActive: true, posX: 50, posY: 180, width: 80, height: 80, rotation: 0, qrToken: 'qr4', hasOpenOrder: false, openOrderId: null },
      { id: 't5', name: 'M5', capacity: 4, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'round', shapeDisplay: 'Yuvarlak', isActive: true, posX: 180, posY: 180, width: 80, height: 80, rotation: 0, qrToken: 'qr5', hasOpenOrder: false, openOrderId: null },
      { id: 't6', name: 'M6', capacity: 8, status: 'occupied', statusDisplay: 'Dolu', statusColor: '#ef4444', shape: 'rect', shapeDisplay: 'Dikdortgen', isActive: true, posX: 300, posY: 180, width: 140, height: 90, rotation: 0, qrToken: 'qr6', hasOpenOrder: true, openOrderId: 'o2' },
    ],
  },
  {
    id: '2',
    name: 'Teras',
    description: 'Acik hava alani',
    isActive: true,
    canvasWidth: 700,
    canvasHeight: 500,
    tableCount: 8,
    totalCapacity: 32,
    tables: [
      { id: 't7', name: 'T1', capacity: 4, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'round', shapeDisplay: 'Yuvarlak', isActive: true, posX: 50, posY: 50, width: 80, height: 80, rotation: 0, qrToken: 'qr7', hasOpenOrder: false, openOrderId: null },
      { id: 't8', name: 'T2', capacity: 6, status: 'occupied', statusDisplay: 'Dolu', statusColor: '#f59e0b', shape: 'rect', shapeDisplay: 'Dikdortgen', isActive: true, posX: 200, posY: 50, width: 120, height: 80, rotation: 0, qrToken: 'qr8', hasOpenOrder: true, openOrderId: 'o3' },
      { id: 't9', name: 'T3', capacity: 2, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'square', shapeDisplay: 'Kare', isActive: true, posX: 50, posY: 180, width: 60, height: 60, rotation: 0, qrToken: 'qr9', hasOpenOrder: false, openOrderId: null },
    ],
  },
  {
    id: '3',
    name: 'VIP Bolum',
    description: 'Ozel etkinlikler icin',
    isActive: true,
    canvasWidth: 400,
    canvasHeight: 400,
    tableCount: 4,
    totalCapacity: 20,
    tables: [
      { id: 't10', name: 'V1', capacity: 6, status: 'reserved', statusDisplay: 'Rezerve', statusColor: '#6366f1', shape: 'round', shapeDisplay: 'Yuvarlak', isActive: true, posX: 50, posY: 50, width: 100, height: 100, rotation: 0, qrToken: 'qr10', hasOpenOrder: false, openOrderId: null },
    ],
  },
];

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Find the room from demo data
    const foundRoom = DEMO_ROOMS_DATA.find(r => r.id === id);
    setRoom(foundRoom || null);
    setIsLoading(false);
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getTableColor = (table: TableType) => {
    if (table.hasOpenOrder) return '#f59e0b';
    switch (table.status) {
      case 'available':
        return '#22c55e';
      case 'occupied':
        return '#ef4444';
      case 'reserved':
        return '#6366f1';
      default:
        return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Salon bulunamadi</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#0891b2" size={20} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#0891b2" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{room.name}</Text>
          <Text style={styles.headerSubtitle}>
            {room.tableCount} Masa - {room.totalCapacity} Kisi
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <RefreshCw color="#0891b2" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0891b2"
          />
        }
      >
        <View style={styles.canvas}>
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
                <Text style={[styles.tableName, { color: tableColor }]}>
                  {table.name}
                </Text>
                <View style={styles.tableInfo}>
                  <Users color={tableColor} size={10} />
                  <Text style={[styles.tableCapacity, { color: tableColor }]}>
                    {table.capacity}
                  </Text>
                </View>
                {table.hasOpenOrder && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>!</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Uygun</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Aktif</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Dolu</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
          <Text style={styles.legendText}>Rezerve</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 16,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#f87171',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#0891b2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  canvas: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    minHeight: 400,
    position: 'relative',
  },
  table: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  tableName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tableCapacity: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
  },
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
  orderBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#ffffff',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94a3b8',
  },
});
