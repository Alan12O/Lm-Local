import React, { useEffect } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, RefreshControl, TouchableOpacity, InteractionManager, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { AttachStep, useSpotlightTour } from 'react-native-spotlight-tour';
import { Card, ModelCard, Button } from '../../components';
import { AnimatedEntry } from '../../components/AnimatedEntry';
import { CustomAlert, hideAlert } from '../../components/CustomAlert';
import { consumePendingSpotlight, peekPendingSpotlight, setPendingSpotlight } from '../../components/onboarding/spotlightState';
import { DOWNLOAD_MANAGER_STEP_INDEX } from '../../components/onboarding/spotlightConfig';
import { useTheme, useThemedStyles } from '../../theme';
import { CREDIBILITY_LABELS } from '../../constants';
import { ModelInfo, ModelFile, DownloadedModel } from '../../types';
import { createStyles } from './styles';
import { ModelsScreenViewModel } from './useModelsScreen';
import { TextFiltersSection } from './TextFiltersSection';
import { FilterState } from './types';
import { formatNumber } from './utils';

type Props = Pick<ModelsScreenViewModel,
  | 'searchQuery' | 'setSearchQuery'
  | 'isLoading' | 'isRefreshing'
  | 'hasSearched'
  | 'selectedModel' | 'setSelectedModel'
  | 'modelFiles' | 'setModelFiles'
  | 'isLoadingFiles'
  | 'filterState'
  | 'textFiltersVisible' | 'setTextFiltersVisible'
  | 'filteredResults' | 'recommendedAsModelInfo'
  | 'ramGB' | 'deviceRecommendation'
  | 'hasActiveFilters'
  | 'downloadedModels' | 'downloadProgress'
  | 'alertState' | 'setAlertState'
  | 'focusTrigger'
  | 'handleSearch' | 'handleRefresh'
  | 'handleSelectModel' | 'handleDownload' | 'handleRepairMmProj' | 'handleCancelDownload' | 'handleDeleteModel' | 'handleOpenRepo'
  | 'downloadIds'
  | 'clearFilters'
  | 'toggleFilterDimension' | 'toggleOrg'
  | 'setTypeFilter' | 'setSourceFilter' | 'setSizeFilter' | 'setQuantFilter'
  | 'isModelDownloaded' | 'getDownloadedModel'
>;

interface DetailProps {
  selectedModel: ModelInfo;
  modelFiles: ModelFile[];
  isLoadingFiles: boolean;
  filterState: FilterState;
  ramGB: number;
  downloadProgress: Props['downloadProgress'];
  alertState: Props['alertState'];
  setAlertState: Props['setAlertState'];
  onBack: () => void;
  getDownloadedModel: (modelId: string, fileName: string) => DownloadedModel | undefined;
  isModelDownloaded: (modelId: string, fileName: string) => boolean;
  handleDownload: (model: ModelInfo, file: ModelFile) => void;
  handleRepairMmProj: (model: ModelInfo, file: ModelFile) => void;
  handleCancelDownload: (downloadKey: string) => void;
  handleDeleteModel: (modelId: string) => void;
  handleOpenRepo: (modelId: string) => void;
  downloadIds: Record<string, number>;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}

const ModelDetailView: React.FC<DetailProps> = ({
  selectedModel, modelFiles, isLoadingFiles, filterState, ramGB,
  downloadProgress, alertState, setAlertState, onBack,
  getDownloadedModel, isModelDownloaded, handleDownload, handleRepairMmProj, handleCancelDownload, handleDeleteModel, handleOpenRepo, downloadIds,
  styles, colors,
}) => {
  const { goTo } = useSpotlightTour();

  // If user arrived here via onboarding spotlight flow, show file card spotlight
  // Pre-set the next pending (Download Manager icon) so it fires regardless of
  // how the user dismisses step 9 (button or backdrop tap).
  useEffect(() => {
    const pending = consumePendingSpotlight();
    if (pending !== null) {
      setPendingSpotlight(DOWNLOAD_MANAGER_STEP_INDEX);
      const task = InteractionManager.runAfterInteractions(() => goTo(pending));
      return () => task.cancel();
    }
  }, []);

  const getFileCardState = (item: ModelFile) => {
    const downloadKey = `${selectedModel.id}/${item.name}`;
    const repairKey = `${selectedModel.id}/${item.name}-mmproj`;
    const progress = downloadProgress[downloadKey] || downloadProgress[repairKey];
    const downloaded = isModelDownloaded(selectedModel.id, item.name);
    const downloadedModel = getDownloadedModel(selectedModel.id, item.name);
    const needsVisionRepair = downloaded && !!item.mmProjFile && !downloadedModel?.mmProjPath;
    const canCancel = !!progress && downloadIds[downloadKey] != null;
    return { downloadKey, progress, downloaded, downloadedModel, needsVisionRepair, canCancel };
  };

  const renderFileItem = ({ item, index }: { item: ModelFile; index: number }) => {
    const s = getFileCardState(item);
    const onDownload = !s.downloaded && !s.progress ? () => {
      handleDownload(selectedModel, item);
      if (peekPendingSpotlight() !== null) setTimeout(onBack, 800);
    } : undefined;
    const card = (
      <ModelCard
        model={{ id: selectedModel.id, name: item.name.replace('.gguf', ''), author: selectedModel.author, credibility: selectedModel.credibility }}
        file={item} downloadedModel={s.downloadedModel} isDownloaded={s.downloaded}
        isDownloading={!!s.progress} downloadProgress={s.progress?.progress}
        downloadBytes={s.progress ? { downloaded: s.progress.bytesDownloaded, total: s.progress.totalBytes } : undefined}
        isCompatible={item.size / (1024 ** 3) < ramGB * 0.6} testID={`file-card-${index}`}
        onDownload={onDownload}
        onDelete={s.downloaded ? () => handleDeleteModel(`${selectedModel.id}/${item.name}`) : undefined}
        onRepairVision={s.needsVisionRepair && !s.progress ? () => handleRepairMmProj(selectedModel, item) : undefined}
        onCancel={s.canCancel ? () => handleCancelDownload(s.downloadKey) : undefined}
        onOpenRepo={() => handleOpenRepo(selectedModel.id)}
      />
    );
    return index === 0 ? <AttachStep index={9} fill>{card}</AttachStep> : card;
  };

  return (
    <View testID="model-detail-screen" style={styles.flex1}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} testID="model-detail-back" style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, styles.flex1]} numberOfLines={1}>{selectedModel.name}</Text>
      </View>
      <Card style={styles.modelInfoCard}>
        <View style={styles.authorRow}>
          <Text style={styles.modelAuthor}>{selectedModel.author}</Text>
          {selectedModel.credibility && (
            <View style={[styles.credibilityBadge, { backgroundColor: `${CREDIBILITY_LABELS[selectedModel.credibility.source].color}25` }]}>
              {selectedModel.credibility.source === 'lmstudio' && <Text style={[styles.credibilityIcon, { color: CREDIBILITY_LABELS[selectedModel.credibility.source].color }]}>★</Text>}
              {selectedModel.credibility.source === 'official' && <Text style={[styles.credibilityIcon, { color: CREDIBILITY_LABELS[selectedModel.credibility.source].color }]}>✓</Text>}
              {selectedModel.credibility.source === 'verified-quantizer' && <Text style={[styles.credibilityIcon, { color: CREDIBILITY_LABELS[selectedModel.credibility.source].color }]}>◆</Text>}
              <Text style={[styles.credibilityText, { color: CREDIBILITY_LABELS[selectedModel.credibility.source].color }]}>
                {CREDIBILITY_LABELS[selectedModel.credibility.source].label}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.modelDescription}>{selectedModel.description}</Text>
        <View style={styles.modelStats}>
          <Text style={styles.statText}>{formatNumber(selectedModel.downloads)} descargas</Text>
          <Text style={styles.statText}>{formatNumber(selectedModel.likes)} me gusta</Text>
        </View>
      </Card>
      <Text style={styles.sectionTitle}>Archivos Disponibles</Text>
      <Text style={styles.sectionSubtitle}>
        Elige un nivel de cuantización. Q4_K_M es recomendado para móviles.
        {modelFiles.some(f => f.mmProjFile) && ' Los archivos de visión incluyen mmproj.'}
      </Text>
      {isLoadingFiles ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={modelFiles.filter(f => f.size > 0 && f.size / (1024 ** 3) < ramGB * 0.6 && (filterState.quant === 'all' || f.name.includes(filterState.quant)))}
          renderItem={renderFileItem}
          keyExtractor={item => item.name}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Card style={styles.emptyCard}><Text style={styles.emptyText}>No se encontraron archivos compatibles para este modelo.</Text></Card>}
        />
      )}
      <CustomAlert {...alertState} onClose={() => setAlertState(hideAlert())} />
    </View>
  );
};

export const TextModelsTab: React.FC<Props> = (props) => {
  const {
    searchQuery, setSearchQuery, isLoading, isRefreshing, hasSearched,
    selectedModel, setSelectedModel, modelFiles, setModelFiles, isLoadingFiles,
    filterState, textFiltersVisible, setTextFiltersVisible,
    filteredResults, recommendedAsModelInfo, ramGB, deviceRecommendation,
    hasActiveFilters, downloadedModels, downloadProgress,
    alertState, setAlertState, focusTrigger,
    handleSearch, handleRefresh, handleSelectModel, handleDownload, handleRepairMmProj, handleCancelDownload, handleDeleteModel,
    handleOpenRepo,
    downloadIds,
    clearFilters, toggleFilterDimension, toggleOrg,
    setTypeFilter, setSourceFilter, setSizeFilter, setQuantFilter,
    isModelDownloaded, getDownloadedModel,
  } = props;

  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { goTo } = useSpotlightTour();

  const renderModelItem = ({ item, index }: { item: ModelInfo; index: number }) => {
    const card = (
      <AnimatedEntry index={index} staggerMs={30} trigger={focusTrigger}>
        <ModelCard
          model={item}
          isDownloaded={downloadedModels.some(m => m.id.startsWith(item.id))}
          onPress={() => handleSelectModel(item)}
          onOpenRepo={() => handleOpenRepo(item.id)}
          testID={`model-card-${index}`}
          compact
        />
      </AnimatedEntry>
    );

    // Spotlight the first recommended model card for the "Download a model" onboarding step
    if (index === 0) {
      return <AttachStep index={0} fill>{card}</AttachStep>;
    }
    return card;
  };

  const onBack = () => {
    const pending = consumePendingSpotlight();
    setSelectedModel(null);
    setModelFiles([]);
    if (pending !== null) {
      InteractionManager.runAfterInteractions(() => goTo(pending));
    }
  };

  if (selectedModel) {
    return (
      <ModelDetailView
        selectedModel={selectedModel}
        modelFiles={modelFiles}
        isLoadingFiles={isLoadingFiles}
        filterState={filterState}
        ramGB={ramGB}
        downloadProgress={downloadProgress}
        alertState={alertState}
        setAlertState={setAlertState}
        onBack={onBack}
        getDownloadedModel={getDownloadedModel}
        isModelDownloaded={isModelDownloaded}
        handleDownload={handleDownload}
        handleRepairMmProj={handleRepairMmProj}
        handleCancelDownload={handleCancelDownload}
        handleDeleteModel={handleDeleteModel}
        handleOpenRepo={handleOpenRepo}
        downloadIds={downloadIds}
        styles={styles}
        colors={colors}
      />
    );
  }

  return (
    <>
      {/* Main list / search UI */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar modelos..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            testID="search-input"
          />
          <TouchableOpacity
            style={[styles.filterToggle, (textFiltersVisible || hasActiveFilters) && styles.filterToggleActive]}
            onPress={() => setTextFiltersVisible(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="text-filter-toggle"
          >
            <Icon name="sliders" size={16} color={(textFiltersVisible || hasActiveFilters) ? colors.primary : colors.textMuted} />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {textFiltersVisible && (
        <TextFiltersSection
          filterState={filterState}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          toggleFilterDimension={toggleFilterDimension}
          toggleOrg={toggleOrg}
          setTypeFilter={setTypeFilter}
          setSourceFilter={setSourceFilter}
          setSizeFilter={setSizeFilter}
          setQuantFilter={setQuantFilter}
        />
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando modelos...</Text>
        </View>
      ) : (
        <FlatList
          data={hasSearched ? filteredResults : recommendedAsModelInfo}
          renderItem={renderModelItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          testID="models-list"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          removeClippedSubviews={Platform.OS !== 'android'}
          ListHeaderComponent={hasSearched ? null : (
            <View>
              <View style={styles.deviceBanner}>
                <Text style={styles.deviceBannerText}>
                  {Math.round(ramGB)}GB RAM — modelos de hasta {deviceRecommendation.maxParameters}B recomendados ({deviceRecommendation.recommendedQuantization})
                </Text>
              </View>
              {recommendedAsModelInfo.length > 0 && <Text style={styles.recommendedTitle}>Recomendado para tu dispositivo</Text>}
            </View>
          )}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {(() => {
                  if (!hasSearched) return 'No hay modelos recomendados disponibles.';
                  if (hasActiveFilters) return 'Ningún modelo coincide con tus filtros. Intenta ajustarlos o limpiarlos.';
                  return 'No se encontraron modelos. Intenta con un término de búsqueda diferente.';
                })()}
              </Text>
            </Card>
          }
        />
      )}
    </>
  );
};
