import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mail,
  Phone,
  Shield,
  LogOut,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Cikis',
      'Cikis yapmak istediginizden emin misiniz?',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Cikis Yap',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user.firstName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.fullName || 'Kullanici'}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.isStaff && (
          <View style={styles.staffBadge}>
            <Shield color="#22c55e" size={12} />
            <Text style={styles.staffText}>Personel</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Bilgiler</Text>

        <View style={styles.infoItem}>
          <Mail color="#64748b" size={20} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>E-posta</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>

        {user.phone && (
          <View style={styles.infoItem}>
            <Phone color="#64748b" size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Telefon</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          </View>
        )}
      </View>

      {user.permissions.length > 0 && (
        <View style={styles.permissionsSection}>
          <Text style={styles.sectionTitle}>Yetkiler</Text>
          <View style={styles.permissionsList}>
            {user.permissions.map((perm, index) => (
              <View key={index} style={styles.permissionBadge}>
                <Text style={styles.permissionText}>{perm}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color="#f87171" size={20} />
        <Text style={styles.logoutText}>Cikis Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#ffffff',
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0891b2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#ffffff',
  },
  userName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  staffText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#22c55e',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#e2e8f0',
  },
  permissionsSection: {
    marginBottom: 24,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#94a3b8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  logoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#f87171',
  },
});
