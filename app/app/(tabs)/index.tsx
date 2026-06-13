import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@apollo/client';
import { Building2, Users, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ROOMS } from '@/graphql/queries';
import { RoomsResult } from '@/graphql/generated/operations';

export default function RoomsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data, loading, error, refetch, networkStatus } = useQuery<RoomsResult>(ROOMS, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  // Bu sekmeye her dönüşte tazele (başka ekranda durum değişmiş olabilir).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const rooms = data?.rooms ?? [];
  const refreshing = networkStatus === 4; // NetworkStatus.refetch

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba, {user?.firstName || 'Kullanıcı'}</Text>
          <Text style={styles.headerTitle}>Salonlar</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()}>
          <RefreshCw color="#0891b2" size={24} />
        </TouchableOpacity>
      </View>

      {loading && rooms.length === 0 ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#0891b2" />
        </View>
      ) : error && rooms.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Salonlar yüklenemedi.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refetch()}
              tintColor="#0891b2"
              colors={['#0891b2']}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Building2 color="#334155" size={64} />
              <Text style={styles.emptyText}>Aktif salon yok</Text>
            </View>
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
                {item.description || 'Masa düzeni'}
              </Text>
              <View style={styles.roomStats}>
                <Users color="#64748b" size={14} />
                <Text style={styles.roomStatsText}>
                  {item.tableCount} Masa - {item.totalCapacity} Kişi
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8', marginBottom: 2 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 28, color: '#ffffff' },
  listContent: { padding: 16, paddingBottom: 100 },
  row: { gap: 12 },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 16 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#f87171' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#64748b' },
  retryButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0891b2' },
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
  roomName: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#ffffff', marginBottom: 4 },
  roomDescription: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  roomStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomStatsText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b' },
});
