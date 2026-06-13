import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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

  const room = subData?.roomUpdates ?? data?.room ?? null;

  // Açık adisyonu olan masa amber; aksi halde backend status_color -> hex.
  const getTableColor = (table: Table) =>
    table.hasOpenOrder ? '#3F3FF1' : statusHex(table.statusColor);

  if (loading && !room) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error ? 'Salon yüklenemedi' : 'Salon bulunamadı'}</Text>
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
            {room.tableCount} Masa - {room.totalCapacity} Kişi
          </Text>
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
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', gap: 16 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#f87171' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0891b2' },
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
  backBtn: { padding: 4, marginRight: 12 },
  headerContent: { flex: 1 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  canvas: { backgroundColor: '#1e293b', borderRadius: 16, minHeight: 400, position: 'relative' },
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
  orderBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#ffffff' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  legendItem: { alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8' },
});
