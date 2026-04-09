import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolateColor, interpolate } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { MainTabParamList } from '../../navigation/types';
import { DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { AttachStep } from 'react-native-spotlight-tour';
import { CustomAlert, hideAlert } from '../../components/CustomAlert';
import { useTheme, useThemedStyles } from '../../theme';
import { useModelsScreen } from './useModelsScreen';
import { createStyles } from './styles';
import { initialFilterState } from './constants';
import { TextModelsTab } from './TextModelsTab';
import { ImageModelsTab } from './ImageModelsTab';

import LinearGradient from 'react-native-linear-gradient';

export const ModelsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const vm = useModelsScreen();
  const route = useRoute<RouteProp<MainTabParamList, 'ModelsTab'>>();

  // Reset to model list view when tab loses focus (e.g. user switches away)
  useFocusEffect(
    useCallback(() => {
      const initialTab = route.params?.initialTab;
      if (initialTab) {
        vm.setActiveTab(initialTab);
      }
      return () => {
        vm.setSelectedModel(null);
        vm.setModelFiles([]);
      };

    }, [route.params?.initialTab]),
  );

  const isShowingDetail = vm.activeTab === 'text' && vm.selectedModel !== null;

  // Usa un único shared value para evitar "temblores" por desincronización de cálculos
  const tabProgress = useSharedValue(vm.activeTab === 'image' ? 1 : 0);

  React.useEffect(() => {
    // Usamos withTiming en lugar de withSpring porque el layout de flex hace "parpadear" a los componentes
    // al intentar acomodarse en decimales diminutos al final de la simulación del resorte.
    tabProgress.value = withTiming(vm.activeTab === 'image' ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.quad)
    });
  }, [vm.activeTab]);

  const animatedTextoStyle = useAnimatedStyle(() => ({
    // De flex 2 (texto) a 0.8 (imagen)
    flex: interpolate(tabProgress.value, [0, 1], [2, 0.8]),
    backgroundColor: interpolateColor(tabProgress.value, [0, 1], [styles.tabActiveBg || '#333333', 'transparent']),
    borderColor: interpolateColor(tabProgress.value, [0, 1], ['transparent', styles.tabInactiveBorder || '#666666']),
  }));

  const animatedImagenStyle = useAnimatedStyle(() => ({
    // De flex 0.8 (texto) a 2 (imagen)
    flex: interpolate(tabProgress.value, [0, 1], [0.8, 2]),
    backgroundColor: interpolateColor(tabProgress.value, [0, 1], ['transparent', styles.tabActiveBg || '#333333']),
    borderColor: interpolateColor(tabProgress.value, [0, 1], [styles.tabInactiveBorder || '#666666', 'transparent']),
  }));

  const animatedTextoTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(tabProgress.value, [0, 1], [styles.tabActiveText || '#FFFFFF', styles.tabInactiveText || '#999999']),
  }));

  const animatedImagenTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(tabProgress.value, [0, 1], [styles.tabInactiveText || '#999999', styles.tabActiveText || '#FFFFFF']),
  }));

  const handleTabChange = (tab: 'text' | 'image') => {
    vm.setActiveTab(tab);
    vm.setFilterState(initialFilterState);
    vm.setTextFiltersVisible(false);
    vm.setImageFiltersVisible(false);
  };
  return (
    <View style={styles.container} testID="models-screen">
      <LinearGradient
        colors={isDark ? ['#1A1A1A', '#121212'] : ['#FFFFFF', '#F5F5F7']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.flex1} edges={['top', 'left', 'right']}>
        {/* Collapse header/import/tabs when showing model detail — detail has its own header. */}
        <View style={isShowingDetail ? collapsedStyle.hidden : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={() => vm.navigation.dispatch(DrawerActions.openDrawer())}
                >
                  <Icon name="menu" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>Modelos</Text>
              </View>
              <AttachStep index={10}>
                <TouchableOpacity
                  style={styles.downloadManagerButton}
                  onPress={() => vm.navigation.navigate('DownloadManager')}
                  testID="downloads-icon"
                >
                  <Icon name="download" size={22} color={colors.text} />
                  {vm.totalModelCount > 0 && (
                    <View style={styles.downloadBadge}>
                      <Text style={styles.downloadBadgeText}>{vm.totalModelCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </AttachStep>
            </View>

            {/* Tab Bar Style Pill */}
            <View style={styles.tabBarOutline}>
              <AnimatedPressable
                style={[styles.tabItem, animatedTextoStyle]}
                onPress={() => handleTabChange('text')}
              >
                <Animated.Text 
                  style={[styles.tabText, animatedTextoTextStyle]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Texto
                </Animated.Text>
              </AnimatedPressable>
              
              <AnimatedPressable
                style={[styles.tabItem, animatedImagenStyle]}
                onPress={() => handleTabChange('image')}
              >
                {/* Dummy view exacto en dimensiones para que AttachStep mida correctamente sin interferir con estilos */}
                <AttachStep index={4}>
                  <View style={StyleSheet.absoluteFill} pointerEvents="none" />
                </AttachStep>
                <Animated.Text 
                  style={[styles.tabText, animatedImagenTextStyle]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Imagen
                </Animated.Text>
              </AnimatedPressable>
            </View>



          </View>

          {/* Import Local File */}
          <View>
            {vm.isImporting && vm.importProgress ? (
              <View style={styles.importProgressCard}>
                <View style={styles.importProgressHeader}>
                  <Icon name="file" size={20} color={colors.primary} />
                  <Text style={styles.importProgressText} numberOfLines={1}>
                    Importando {vm.importProgress.fileName}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.round(vm.importProgress.fraction * 100)}%` }]} />
                </View>
                <Text style={styles.importProgressPercent}>
                  {Math.round(vm.importProgress.fraction * 100)}%
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.importButton} onPress={vm.handleImportLocalModel} testID="import-local-model">
                <Icon name="folder-plus" size={20} color={colors.primary} />
                <Text style={styles.importButtonText}>Importar Archivo Local</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* Text Models Tab */}
      {vm.activeTab === 'text' && (
        <TextModelsTab
          searchQuery={vm.searchQuery}
          setSearchQuery={vm.setSearchQuery}
          isLoading={vm.isLoading}
          isRefreshing={vm.isRefreshing}
          hasSearched={vm.hasSearched}
          selectedModel={vm.selectedModel}
          setSelectedModel={vm.setSelectedModel}
          modelFiles={vm.modelFiles}
          setModelFiles={vm.setModelFiles}
          isLoadingFiles={vm.isLoadingFiles}
          filterState={vm.filterState}
          textFiltersVisible={vm.textFiltersVisible}
          setTextFiltersVisible={vm.setTextFiltersVisible}
          filteredResults={vm.filteredResults}
          recommendedAsModelInfo={vm.recommendedAsModelInfo}
          ramGB={vm.ramGB}
          deviceRecommendation={vm.deviceRecommendation}
          hasActiveFilters={vm.hasActiveFilters}
          downloadedModels={vm.downloadedModels}
          downloadProgress={vm.downloadProgress}
          alertState={vm.alertState}
          setAlertState={vm.setAlertState}
          focusTrigger={vm.focusTrigger}
          handleSearch={vm.handleSearch}
          handleRefresh={vm.handleRefresh}
          handleSelectModel={vm.handleSelectModel}
          handleDownload={vm.handleDownload}
          handleRepairMmProj={vm.handleRepairMmProj}
          handleCancelDownload={vm.handleCancelDownload}
          handleDeleteModel={vm.handleDeleteModel}
          downloadIds={vm.downloadIds}
          clearFilters={vm.clearFilters}
          toggleFilterDimension={vm.toggleFilterDimension}
          toggleOrg={vm.toggleOrg}
          setTypeFilter={vm.setTypeFilter}
          setSourceFilter={vm.setSourceFilter}
          setSizeFilter={vm.setSizeFilter}
          setQuantFilter={vm.setQuantFilter}
          isModelDownloaded={vm.isModelDownloaded}
          getDownloadedModel={vm.getDownloadedModel}
          handleOpenRepo={vm.handleOpenRepo}
        />
      )}

      {/* Image Models Tab */}
      {vm.activeTab === 'image' && (
        <ImageModelsTab
          imageSearchQuery={vm.imageSearchQuery}
          setImageSearchQuery={vm.setImageSearchQuery}
          hfModelsLoading={vm.hfModelsLoading}
          hfModelsError={vm.hfModelsError}
          filteredHFModels={vm.filteredHFModels}
          availableHFModels={vm.availableHFModels}
          backendFilter={vm.backendFilter}
          setBackendFilter={vm.setBackendFilter}
          styleFilter={vm.styleFilter}
          setStyleFilter={vm.setStyleFilter}
          sdVersionFilter={vm.sdVersionFilter}
          setSdVersionFilter={vm.setSdVersionFilter}
          imageFilterExpanded={vm.imageFilterExpanded}
          setImageFilterExpanded={vm.setImageFilterExpanded}
          imageFiltersVisible={vm.imageFiltersVisible}
          setImageFiltersVisible={vm.setImageFiltersVisible}
          hasActiveImageFilters={vm.hasActiveImageFilters}
          showRecommendedOnly={vm.showRecommendedOnly}
          setShowRecommendedOnly={vm.setShowRecommendedOnly}
          showRecHint={vm.showRecHint}
          setShowRecHint={vm.setShowRecHint}
          imageRec={vm.imageRec}
          ramGB={vm.ramGB}
          imageRecommendation={vm.imageRecommendation}
          imageModelDownloading={vm.imageModelDownloading}
          imageModelProgress={vm.imageModelProgress}
          handleDownloadImageModel={vm.handleDownloadImageModel}
          loadHFModels={vm.loadHFModels}
          clearImageFilters={vm.clearImageFilters}
          setUserChangedBackendFilter={vm.setUserChangedBackendFilter}
          isRecommendedModel={vm.isRecommendedModel}
          handleOpenRepo={vm.handleOpenRepo}
        />
      )}

      <CustomAlert {...vm.alertState} onClose={() => vm.setAlertState(hideAlert())} />
      <CustomAlert
        visible={vm.showNotifRationale}
        title="Notificaciones de descarga"
        message={"LM Local puede mostrar el progreso de la descarga en tu bandeja de notificaciones mientras usas otras apps.\n\nEsto es opcional; las descargas funcionan bien sin ello."}
        onClose={vm.handleNotifRationaleDismiss}
        buttons={[
          { text: 'No, gracias', style: 'cancel', onPress: vm.handleNotifRationaleDismiss },
          { text: 'Permitir', style: 'default', onPress: vm.handleNotifRationaleAllow },
        ]}
      />
      </SafeAreaView>
    </View>
  );
};

const collapsedStyle = StyleSheet.create({
  hidden: { height: 0, overflow: 'hidden' },
});
