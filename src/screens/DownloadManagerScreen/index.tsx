import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Card } from '../../components';
import { CustomAlert, hideAlert } from '../../components/CustomAlert';
import { useTheme, useThemedStyles } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { createStyles } from './styles';
import { ActiveDownloadCard, CompletedDownloadCard, formatBytes } from './items';
import { useDownloadManager } from './useDownloadManager';
import LinearGradient from 'react-native-linear-gradient';

export const DownloadManagerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    isRefreshing,
    activeItems,
    completedItems,
    alertState,
    setAlertState,
    handleRefresh,
    handleRemoveDownload,
    handleDeleteItem,
    handleRepairVision,
    totalStorageUsed,
  } = useDownloadManager();

  return (
    <View style={styles.container} testID="downloaded-models-screen">
      <LinearGradient
        colors={isDark ? ['#1A1A1A', '#121212'] : ['#FFFFFF', '#F5F5F7']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.flex1} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Gestor de descargas</Text>
        </View>

        <FlatList
          data={[{ key: 'content' }]}
          renderItem={() => (
            <View style={styles.content}>
              {/* Storage Info Summary */}
              {completedItems.length > 0 && (
                <View style={styles.storageSection}>
                  <View style={styles.storageRow}>
                    <Icon name="hard-drive" size={16} color={colors.textMuted} />
                    <Text style={styles.storageText}>
                      Uso de almacenamiento: {formatBytes(totalStorageUsed)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Active Downloads */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Descargas activas</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{activeItems.length}</Text>
                  </View>
                </View>
                {activeItems.length > 0 ? (
                  activeItems.map(item => (
                    <View key={`active-${item.modelId}-${item.fileName}`}>
                      <ActiveDownloadCard item={item} onRemove={handleRemoveDownload} />
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Icon name="inbox" size={32} color={`${colors.text}15`} />
                    <Text style={styles.emptyText}>No hay descargas activas</Text>
                  </View>
                )}
              </View>

              {/* Completed Downloads */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Modelos descargados</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{completedItems.length}</Text>
                  </View>
                </View>
                {completedItems.length > 0 ? (
                  completedItems.map(item => (
                    <View key={`completed-${item.modelId}-${item.fileName}`}>
                      <CompletedDownloadCard item={item} onDelete={handleDeleteItem} onRepairVision={handleRepairVision} />
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Icon name="package" size={32} color={`${colors.text}15`} />
                    <Text style={styles.emptyText}>Aún no hay modelos</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={item => item.key}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={Platform.OS !== 'android'}
        />

        <CustomAlert
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          buttons={alertState.buttons}
          onClose={() => setAlertState(hideAlert())}
        />
      </SafeAreaView>
    </View>
  );
};
