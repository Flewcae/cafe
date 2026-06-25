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
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';
import {
  Mail,
  Phone,
  Shield,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { mode, toggleMode, colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors);

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
        <Text style={styles.sectionTitle}>Görünüm</Text>
        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[styles.themeOption, mode === 'dark' && styles.themeOptionActive]}
            onPress={() => mode !== 'dark' && toggleMode()}
          >
            <Moon color={mode === 'dark' ? colors.accentText : colors.textSecondary} size={18} />
            <Text style={[styles.themeOptionText, mode === 'dark' && styles.themeOptionTextActive]}>
              Koyu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.themeOption, mode === 'light' && styles.themeOptionActive]}
            onPress={() => mode !== 'light' && toggleMode()}
          >
            <Sun color={mode === 'light' ? colors.accentText : colors.textSecondary} size={18} />
            <Text style={[styles.themeOptionText, mode === 'light' && styles.themeOptionTextActive]}>
              Açık
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Bilgiler</Text>

        <View style={styles.infoItem}>
          <Mail color={colors.textMuted} size={20} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>E-posta</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>

        {user.phone && (
          <View style={styles.infoItem}>
            <Phone color={colors.textMuted} size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Telefon</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          </View>
        )}
      </View>

      

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color="#f87171" size={20} />
        <Text style={styles.logoutText}>Cikis Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontFamily: 'Inter-Bold',
      fontSize: 32,
      color: colors.accentText,
    },
    userName: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    userEmail: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
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
      color: colors.textSecondary,
      marginBottom: 12,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    themeOptionActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    themeOptionText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.textSecondary,
    },
    themeOptionTextActive: {
      color: colors.accentText,
      fontFamily: 'Inter-SemiBold',
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 2,
    },
    infoValue: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textPrimary,
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
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    permissionText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.textSecondary,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface,
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
