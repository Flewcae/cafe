import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Users, RefreshCw, Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Room } from '@/types/api';

// Demo data
const DEMO_ROOMS: Room[] = [
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
      { id: 't2', name: 'M2', capacity: 2, status: 'occupied', statusDisplay: 'Dolu', statusColor: '#ef4444', shape: 'round', shapeDisplay: 'Yuvarlak', isActive: true, posX: 150, posY: 50, width: 70, height: 70, rotation: 0, qrToken: 'qr2', hasOpenOrder: true, openOrderId: 'o1' },
      { id: 't3', name: 'M3', capacity: 6, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'rect', shapeDisplay: 'Dikdortgen', isActive: true, posX: 250, posY: 50, width: 120, height: 80, rotation: 0, qrToken: 'qr3', hasOpenOrder: false, openOrderId: null },
      { id: 't4', name: 'M4', capacity: 4, status: 'reserved', statusDisplay: 'Rezerve', statusColor: '#6366f1', shape: 'square', shapeDisplay: 'Kare', isActive: true, posX: 50, posY: 180, width: 80, height: 80, rotation: 0, qrToken: 'qr4', hasOpenOrder: false, openOrderId: null },
    ],
  },
  {
    id: '2',
    name: 'Teras',
    description: 'Acik hava alani',
    isActive: true,
    canvasWidth: 600,
    canvasHeight: 400,
    tableCount: 8,
    totalCapacity: 32,
    tables: [
      { id: 't5', name: 'T1', capacity: 4, status: 'available', statusDisplay: 'Uygun', statusColor: '#22c55e', shape: 'round', shapeDisplay: 'Yuvarlak', isActive: true, posX: 50, posY: 50, width: 80, height: 80, rotation: 0, qrToken: 'qr5', hasOpenOrder: false, openOrderId: null },
      { id: 't6', name: 'T2', capacity: 6, status: 'occupied', statusDisplay: 'Dolu', statusColor: '#ef4444', shape: 'rect', shapeDisplay: 'Dikdortgen', isActive: true, posX: 180, posY: 50, width: 120, height: 80, rotation: 0, qrToken: 'qr6', hasOpenOrder: true, openOrderId: 'o2' },
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
    tables: [],
  },
];

export default function RoomsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>(DEMO_ROOMS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba, {user?.firstName || 'Kullanici'}</Text>
          <Text style={styles.headerTitle}>Salonlar</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <RefreshCw color="#0891b2" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0891b2"
            colors={['#0891b2']}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomCard}
            onPress={() => router.push(`/room/${item.id}` as const)}
          >
            <View style={styles.roomIconContainer}>
              <Building2 color="#0891b2" size={32} />
            </View>
            <Text style={styles.roomName}>{item.name}</Text>
            <Text style={styles.roomDescription} numberOfLines={1}>
              {item.description || 'Masa duzeni'}
            </Text>
            <View style={styles.roomStats}>
              <Users color="#64748b" size={14} />
              <Text style={styles.roomStatsText}>
                {item.tableCount} Masa - {item.totalCapacity} Kisi
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
  greeting: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 2,
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
  row: {
    gap: 12,
  },
  roomCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roomIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0e7490',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomName: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 4,
  },
  roomDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  roomStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomStatsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748b',
  },
});
