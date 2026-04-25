import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import RNFS from 'react-native-fs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme';
import { TYPOGRAPHY, SPACING, FONTS } from '../constants';
import { imageGenerationService, ImageGenerationState } from '../services/imageGenerationService';
import { useAppStore, useRemoteServerStore } from '../stores';
import { triggerHaptic } from '../utils/haptics';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { unzip } from 'react-native-zip-archive';
import { Button, ModelSelectorModal } from '../components';
import { modelManager, activeModelService, llmService, generationService } from '../services';
import { localDreamGeneratorService } from '../services/localDreamGenerator';
import { buildEnhancementMessages, cleanEnhancedPrompt } from '../services/imageGenerationHelpers';
import { ONNXImageModel } from '../types';
import logger from '../utils/logger';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ImageStudio'>;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ImageStudioScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [useLLMEnhancement, setUseLLMEnhancement] = useState(
    useAppStore.getState().settings.enhanceImagePrompts || false
  );

  const {
    activeImageModelId,
    setActiveImageModelId,
    downloadedImageModels,
    addDownloadedImageModel,
    deviceInfo,
    generatedImages,
    removeGeneratedImage,
    addGeneratedImage,
  } = useAppStore();
  
  const [genState, setGenState] = useState<ImageGenerationState>(imageGenerationService.getState());
  const [isPicking, setIsPicking] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [importProgress, setImportProgress] = useState<{ fraction: number; fileName: string } | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<'idle' | 'enhancing' | 'generating' | 'upscaling'>('idle');
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('none');

  const insets = useSafeAreaInsets();
  const activeModel = downloadedImageModels.find(m => m.id === activeImageModelId);
  
  // Altura aproximada del header (padding vertical + texto/iconos) para compensar el teclado
  const HEADER_HEIGHT = 64; 
  
  useEffect(() => {
    const unsub = imageGenerationService.subscribe((state) => {
      setGenState(state);
    });
    return unsub;
  }, []);

  const enhancePromptWithLLM = async (rawInput: string): Promise<string | null> => {
    const isLocalLoaded = llmService.isModelLoaded();
    const activeServerId = useRemoteServerStore.getState().activeServerId;

    if (!isLocalLoaded && !activeServerId) {
      logger.warn('[ImageStudio] No local or remote LLM available for enhancement');
      Alert.alert('Modelo no disponible', 'Carga un modelo local o conecta un servidor remoto para usar la mejora de prompts.');
      return null;
    }

    setLoadingPhase('enhancing');
    try {
      const messages = buildEnhancementMessages(rawInput, []);
      const response = await generationService.generateStringResponse(messages);
      const cleaned = cleanEnhancedPrompt(response);
      return cleaned || null;
    } catch (error) {
      logger.error('[ImageStudio] Prompt enhancement failed:', error);
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || genState.isGenerating || loadingPhase !== 'idle') return;
    triggerHaptic('impactMedium');
    
    setEnhancedPrompt(null);
    let finalPrompt = prompt.trim();
    let finalNegative = '';

    const styleOpt = [
      { id: 'none', label: 'Ninguno' },
      { id: 'photorealistic', label: 'Realista', prompt: 'masterpiece, best quality, ultra-detailed, realistic, 8k, raw photo, highly detailed', negative: 'cartoon, drawing, anime, ugly, lowres, blurry' },
      { id: 'anime', label: 'Anime/2D', prompt: 'masterpiece, best quality, anime style, highly detailed, beautiful colors, perfect anatomy', negative: 'realistic, photo, 3d, out of focus, duplicate' },
      { id: 'cinematic', label: 'Cinemático', prompt: 'cinematic lighting, dramatic tone, 4k, epic scene, highly detailed, movie still', negative: 'flat colors, overexposed, lowres, sketch' }
    ].find(s => s.id === selectedStyleId);

    if (styleOpt && styleOpt.prompt) {
      finalPrompt += `, ${styleOpt.prompt}`;
      finalNegative = styleOpt.negative || '';
    }

    if (activeModel?.defaultPrompt) {
      finalPrompt = `${activeModel.defaultPrompt}, ${finalPrompt}`;
    }
    if (activeModel?.defaultNegativePrompt) {
      finalNegative = finalNegative ? `${finalNegative}, ${activeModel.defaultNegativePrompt}` : activeModel.defaultNegativePrompt;
    }

    try {
      if (useLLMEnhancement) {
        const enhanced = await enhancePromptWithLLM(finalPrompt);
        if (enhanced) {
          finalPrompt = enhanced;
          setEnhancedPrompt(enhanced);
        }
      }

      setLoadingPhase('generating');
      await imageGenerationService.generateImage({
        prompt: finalPrompt,
        negativePrompt: finalNegative,
        skipEnhancement: true // We manually enhanced if required
      });
    } catch (error) {
       logger.error('[ImageStudio] Error en flujo de generación:', error);
       // El servicio ya maneja sus propios errores internos de estado.
    } finally {
      setLoadingPhase('idle');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const handleCancel = () => {
    triggerHaptic('impactLight');
    imageGenerationService.cancelGeneration();
  };

  const handleSelectFromGallery = (image: any) => {
    triggerHaptic('selection');
    imageGenerationService.clearResult();
    imageGenerationService.loadResultFromHistory(image);
  };

  const handleSaveImage = async () => {
    const imagePath = genState.result?.imagePath;
    if (!imagePath) return;
    triggerHaptic('notificationSuccess');
    try {
      const destDir = Platform.OS === 'ios'
        ? RNFS.LibraryDirectoryPath + '/Caches'
        : RNFS.PicturesDirectoryPath;
      const fileName = `ia_local_${Date.now()}.png`;
      const destPath = `${destDir}/${fileName}`;
      await RNFS.copyFile(imagePath, destPath);
      if (Platform.OS === 'android') {
        await RNFS.scanFile(destPath);
      }
      Alert.alert('Imagen guardada', 'La imagen se ha guardado en tu galería.');
    } catch (error) {
      logger.error('Error saving image:', error);
      Alert.alert('Error', 'No se pudo guardar la imagen en la galería.');
    }
  };

  const handleDeleteImage = async (imageId?: string) => {
    const targetImage = imageId 
      ? generatedImages.find(img => img.id === imageId)
      : genState.result;

    if (!targetImage?.imagePath) return;

    Alert.alert(
      '¿Borrar imagen?',
      'Esta acción eliminará permanentemente la imagen del almacenamiento del dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Borrar', 
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('impactMedium');
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            try {
              const exists = await RNFS.exists(targetImage.imagePath);
              if (exists) {
                await RNFS.unlink(targetImage.imagePath);
              }
              removeGeneratedImage(targetImage.id);
              if (genState.result?.id === targetImage.id) {
                imageGenerationService.clearResult();
              }
              // Si borramos de la galería necesitamos refrescar o la UI ya reaccionará al store
            } catch (error) {
              logger.error('Error deleting image:', error);
              Alert.alert('Error', 'No se pudo eliminar el archivo físico.');
            }
          }
        }
      ]
    );
  };

  const handleShareImage = async () => {
    const imagePath = genState.result?.imagePath;
    if (!imagePath) return;
    triggerHaptic('impactLight');
    try {
      await Share.share({ url: `file://${imagePath}`, title: 'Imagen generada con IA' });
    } catch { /* usuario canceló */ }
  };

  const handleUpscaleImage = async () => {
    const imagePath = genState.result?.imagePath;
    if (!imagePath) return;
    
    // Find highest downloaded upscaler
    const availableUpscalers = downloadedImageModels.filter(m => m.backend === 'upscaler');
    if (availableUpscalers.length === 0) {
      Alert.alert('Sin Upscaler', 'Ve a la pantalla de Modelos y descarga un modelo Upscaler (ej. RealESRGAN/UltraSharp) para usar esta función.');
      return;
    }
    const upscaler = availableUpscalers[0];

    try {
      setLoadingPhase('upscaling');
      triggerHaptic('impactMedium');
      const upscaledUri = await localDreamGeneratorService.upscaleImage(imagePath, upscaler.modelPath);
      
      const newGenImg = {
        id: `img_${Date.now()}`,
        imagePath: upscaledUri.replace('file://', ''),
        prompt: `Upscaled: ${genState.result?.prompt}`,
        negativePrompt: genState.result?.negativePrompt,
        seed: genState.result?.seed || 0,
        steps: genState.result?.steps || 20,
        width: (genState.result?.width || 512) * 4,
        height: (genState.result?.height || 512) * 4,
        modelId: genState.result?.modelId || 'upscale',
        createdAt: new Date().toISOString()
      };
      
      addGeneratedImage(newGenImg);
      imageGenerationService.loadResultFromHistory(newGenImg);
      triggerHaptic('notificationSuccess');
      Alert.alert('Éxito', `Imagen escalada exitosamente usando ${upscaler.name}.`);
    } catch (e: any) {
      logger.error('Error upscaling image:', e);
      Alert.alert('Error', e.message || 'Error al escalar la imagen.');
    } finally {
      setLoadingPhase('idle');
    }
  };

  const handleResetMotor = () => {
    Alert.alert(
      'Refuerzo de Motor NPU',
      '¿Deseas reiniciar el backend de IA? Esto puede solucionar errores de ejecución si el hardware se quedó bloqueado por otra tarea.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Reiniciar', 
          onPress: async () => {
            triggerHaptic('impactHeavy');
            try {
              await localDreamGeneratorService.restartBackend();
              // No mostramos alerta inmediata de éxito para no interrumpir el proceso de auto-healing
            } catch (e) {
              Alert.alert('Error', 'No se pudo reiniciar el motor.');
            }
          }
        }
      ]
    );
  };

  const handlePickModel = async () => {
    if (isPicking) return;
    setIsPicking(true);
    setShowModelPicker(false);
    try {
      const result = await pick({
        type: [types.allFiles],
      });

      if (!result || result.length === 0) return;
      const file = result[0];
      const fileName = file.name || 'modelo_desconocido';
      const fileUri = file.uri;
      const fileSize = file.size || 0;

      const lowerName = fileName.toLowerCase();
      const isZip = lowerName.endsWith('.zip');
      const isSafetensors = lowerName.endsWith('.safetensors');
      const isValidExt = isZip || isSafetensors || lowerName.endsWith('.onnx') || lowerName.endsWith('.bin') || lowerName.endsWith('.mnn');

      if (!isValidExt) {
        Alert.alert('Archivo no compatible', 'Formatos soportados: .zip, .safetensors, .onnx, .bin, .mnn');
        return;
      }

      if (deviceInfo && deviceInfo.totalMemory > 0) {
        const threshold = deviceInfo.totalMemory * 0.8;
        if (fileSize > threshold) {
          const proceed = await new Promise((resolve) => {
            Alert.alert(
              'Aviso de Memoria',
              `El archivo (${(fileSize / 1024 / 1024 / 1024).toFixed(1)}GB) supera el 80% de tu memoria total. ¿Deseas continuar?`,
              [
                { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
                { text: 'Continuar', onPress: () => resolve(true) }
              ]
            );
          });
          if (!proceed) return;
        }
      }

      const modelId = `local_${Date.now()}`;
      const imageModelsDir = modelManager.getImageModelsDirectory();
      const modelFolder = `${imageModelsDir}/${modelId}`;
      if (!(await RNFS.exists(imageModelsDir))) await RNFS.mkdir(imageModelsDir);
      
      let finalModelPath = modelFolder;
      let backend: 'mnn' | 'qnn' | 'coreml' | undefined;

      if (isZip) {
        setImportProgress({ fraction: 0.2, fileName });
        const zipPath = `${imageModelsDir}/${modelId}.zip`;
        await RNFS.copyFile(fileUri, zipPath);
        
        setImportProgress({ fraction: 0.5, fileName });
        if (!(await RNFS.exists(modelFolder))) await RNFS.mkdir(modelFolder);
        
        await unzip(zipPath, modelFolder);
        await RNFS.unlink(zipPath).catch(() => {});
        
        const dirContents = await RNFS.readDir(modelFolder);
        const hasMLModelC = dirContents.some(f => f.name.endsWith('.mlmodelc') || f.isDirectory() && f.name.includes('.mlmodelc'));
        if (hasMLModelC || Platform.OS === 'ios') {
          backend = 'coreml';
        } else {
          const hasMNN = dirContents.some(f => f.name.endsWith('.mnn'));
          const hasQNN = dirContents.some(f => f.name.endsWith('.bin') || f.name.includes('qnn'));
          if (hasMNN) backend = 'mnn';
          else if (hasQNN) backend = 'qnn';
        }
        setImportProgress({ fraction: 0.9, fileName });
      } else {
        if (!(await RNFS.exists(modelFolder))) await RNFS.mkdir(modelFolder);
        const destPath = `${modelFolder}/${fileName}`;
        await RNFS.copyFile(fileUri, destPath);
        
        if (Platform.OS === 'ios') {
          backend = 'coreml';
        } else if (lowerName.endsWith('.mnn')) {
          backend = 'mnn';
        } else if (lowerName.endsWith('.bin') && lowerName.includes('qnn')) {
          backend = 'qnn';
        } else if (isSafetensors) {
          backend = 'mnn';
          Alert.alert('Aviso', 'Modelo .safetensors cargado. Se usará backend MNN/CPU por defecto.');
        }
      }

      const newModel: ONNXImageModel = {
        id: modelId,
        name: fileName.replace(/\.[^/.]+$/, "").replaceAll(/[_-]/g, ' '),
        description: `Modelo importado localmente: ${fileName}`,
        modelPath: finalModelPath,
        downloadedAt: new Date().toISOString(),
        size: fileSize,
        backend,
      };

      await modelManager.addDownloadedImageModel(newModel);
      addDownloadedImageModel(newModel);
      setActiveImageModelId(newModel.id);
      
      triggerHaptic('notificationSuccess');
      Alert.alert('Éxito', `Modelo "${newModel.name}" cargado correctamente.`);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      logger.error('Error picking image model:', error);
      Alert.alert('Error', 'No se pudo cargar el modelo seleccionado.');
    } finally {
      setIsPicking(false);
      setImportProgress(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Image Studio</Text>
          {activeModel && (
            <TouchableOpacity style={styles.modelSelectorHeader} onPress={() => setShowModelPicker(true)} disabled={isPicking}>
               <Text style={[styles.modelNameHeader, { color: colors.textMuted }]} numberOfLines={1}>
                 {activeModel.name}
               </Text>
               <Icon name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetMotor} disabled={genState.isGenerating}>
          <Icon name="refresh-cw" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? HEADER_HEIGHT + insets.top : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.imageViewer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {genState.previewPath || genState.result?.imagePath ? (
              <Image 
                source={{ uri: genState.result ? `file://${genState.result.imagePath}` : genState.previewPath! }} 
                style={styles.generatedImage} 
                resizeMode="contain" 
              />
            ) : (
              <View style={styles.placeholderContainer}>
                {!activeModel && !genState.isGenerating ? (
                  <TouchableOpacity style={[styles.loadModelButton, { borderColor: colors.primary }]} onPress={() => setShowModelPicker(true)} disabled={isPicking}>
                    <Icon name="folder-plus" size={48} color={colors.primary} />
                    <Text style={[styles.loadModelText, { color: colors.primary }]}>Selector de Modelo</Text>
                    <Text style={[styles.loadModelSubtext, { color: colors.textMuted }]}>
                      Toca para elegir un modelo instalado o cargar uno nuevo
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Icon name="image" size={48} color={colors.textMuted} />
                    <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                      {genState.isGenerating ? genState.status : 'Tu lienzo está en blanco.'}
                    </Text>
                  </>
                )}
              </View>
            )}
            
            {(genState.isGenerating || loadingPhase === 'enhancing') && (
              <View style={styles.generatingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.generatingText, { color: colors.primary }]}>
                  {loadingPhase === 'enhancing' ? 'Mejorando prompt con IA...' : (genState.status || 'Generando imagen...')}
                </Text>
                {genState.progress && (
                  <Text style={[styles.progressText, { color: colors.textMuted }]}>
                    Paso {genState.progress.step} de {genState.progress.totalSteps}
                  </Text>
                )}
              </View>
            )}
            {enhancedPrompt && !genState.isGenerating && (
              <View style={[styles.enhancedPromptBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={styles.enhancedPromptHeader}>
                  <Icon name="sparkles" size={14} color={colors.primary} />
                  <Text style={[styles.enhancedPromptLabel, { color: colors.primary }]}>PROMPT MEJORADO POR IA</Text>
                </View>
                <Text style={[styles.enhancedPromptText, { color: colors.text }]} numberOfLines={3}>
                  {enhancedPrompt}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.modeSelector}>
            <TouchableOpacity 
              style={[
                styles.modeButton, 
                { backgroundColor: !useLLMEnhancement ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }
              ]}
              onPress={() => { triggerHaptic('selection'); setUseLLMEnhancement(false); }}
            >
              <Icon name="zap" size={16} color={!useLLMEnhancement ? colors.background : colors.text} />
              <Text style={[styles.modeText, { color: !useLLMEnhancement ? colors.background : colors.text }]}>Modo Directo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.modeButton, 
                { backgroundColor: useLLMEnhancement ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }
              ]}
              onPress={() => { triggerHaptic('selection'); setUseLLMEnhancement(true); }}
            >
              <Icon name="cpu" size={16} color={useLLMEnhancement ? colors.background : colors.text} />
              <Text style={[styles.modeText, { color: useLLMEnhancement ? colors.background : colors.text }]}>LLM Asistido</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: SPACING.md }}>
            <Text style={[styles.stylePickerTitle, { color: colors.textMuted }]}>Estilo Visual</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stylePickerScroll}>
              {[
                { id: 'none', label: 'Ninguno' },
                { id: 'photorealistic', label: 'Realista', prompt: 'masterpiece, best quality, ultra-detailed, realistic, 8k, raw photo, highly detailed', negative: 'cartoon, drawing, anime, ugly, lowres, blurry' },
                { id: 'anime', label: 'Anime/2D', prompt: 'masterpiece, best quality, anime style, highly detailed, beautiful colors, perfect anatomy', negative: 'realistic, photo, 3d, out of focus, duplicate' },
                { id: 'cinematic', label: 'Cinemático', prompt: 'cinematic lighting, dramatic tone, 4k, epic scene, highly detailed, movie still', negative: 'flat colors, overexposed, lowres, sketch' }
              ].map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.stylePickerPill,
                    { 
                      backgroundColor: selectedStyleId === opt.id ? colors.primary + '20' : colors.surface,
                      borderColor: selectedStyleId === opt.id ? colors.primary : colors.borderLight,
                      borderWidth: selectedStyleId === opt.id ? 2 : 1
                    }
                  ]}
                  onPress={() => setSelectedStyleId(opt.id)}
                >
                  <Text style={{ 
                    color: selectedStyleId === opt.id ? colors.primary : colors.text,
                    fontWeight: selectedStyleId === opt.id ? 'bold' : 'normal'
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {generatedImages.length > 0 && (
            <View style={styles.gallerySection}>
               <View style={styles.galleryHeader}>
                  <Text style={[styles.galleryTitle, { color: colors.text }]}>Tu Galería</Text>
                  <Text style={[styles.galleryCount, { color: colors.textMuted }]}>{generatedImages.length} imágenes</Text>
               </View>
               
               <View style={styles.galleryGrid}>
                  {generatedImages.map((img) => (
                    <TouchableOpacity 
                      key={img.id} 
                      style={[
                        styles.galleryItem, 
                        { borderColor: genState.result?.id === img.id ? colors.primary : colors.borderLight }
                      ]}
                      onPress={() => handleSelectFromGallery(img)}
                    >
                      <Image source={{ uri: `file://${img.imagePath}` }} style={styles.galleryThumbnail} />
                      <TouchableOpacity 
                        style={[styles.deleteGalleryItem, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
                        onPress={() => handleDeleteImage(img.id)}
                      >
                         <Icon name="x" size={14} color="#FFF" />
                      </TouchableOpacity>
                      {genState.result?.id === img.id && (
                        <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                      )}
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
          )}

        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.background }]}
            placeholder={useLLMEnhancement ? "Describe tu idea vagamente..." : "Una ciudad cyberpunk fotorrealista..."}
            placeholderTextColor={colors.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={1000}
            editable={!genState.isGenerating && loadingPhase === 'idle'}
          />
          <View style={styles.actionRow}>
            {genState.isGenerating ? (
               <Button title="Cancelar" variant="secondary" onPress={handleCancel} style={{ flex: 1 }} />
            ) : (
               <Button 
                title="Generar Imagen" 
                variant="primary" 
                onPress={handleGenerate} 
                style={{ flex: 1 }} 
                disabled={!prompt.trim() || loadingPhase !== 'idle'} 
              />
            )}
          </View>
          {!!genState.result?.imagePath && !genState.isGenerating && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.saveRow}>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleSaveImage()}>
                <Icon name="download" size={16} color={colors.text} />
                <Text style={[styles.saveButtonText, { color: colors.text }]}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: loadingPhase === 'upscaling' ? colors.border : colors.surface, borderColor: colors.primary }]} 
                onPress={handleUpscaleImage}
                disabled={loadingPhase === 'upscaling'}
              >
                {loadingPhase === 'upscaling' ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="maximize" size={16} color={colors.primary} />}
                <Text style={[styles.saveButtonText, { color: colors.primary }]}>{loadingPhase === 'upscaling' ? 'Escalando...' : 'Upscale'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleShareImage()}>
                <Icon name="share-2" size={16} color={colors.text} />
                <Text style={[styles.saveButtonText, { color: colors.text }]}>Compartir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.surface, borderColor: colors.error || '#FF4444' }]} onPress={() => handleDeleteImage()}>
                <Icon name="trash-2" size={16} color={colors.error || '#FF4444'} />
                <Text style={[styles.saveButtonText, { color: colors.error || '#FF4444' }]}>Borrar</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      <ModelSelectorModal
        visible={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        onImportImageModel={handlePickModel}
        onSelectModel={() => {}} 
        onUnloadModel={() => activeModelService.unloadTextModel()}
        isLoading={activeModelService.getActiveModels().image.isLoading || activeModelService.getActiveModels().text.isLoading}
        currentModelPath={null}
        initialTab="image"
      />

      {importProgress && (
        <View style={styles.importProgressOverlay}>
          <View style={[styles.importProgressBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.importProgressTitle, { color: colors.text }]}>Importando Modelo...</Text>
            <Text style={[styles.importProgressFile, { color: colors.textMuted }]} numberOfLines={1}>{importProgress.fileName}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${importProgress.fraction * 100}%` }]} />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
  },
  resetButton: {
    padding: 4,
    borderRadius: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  modelSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
  },
  modelNameHeader: {
    ...TYPOGRAPHY.meta,
    fontSize: 12,
    maxWidth: 150,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  importProgressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    zIndex: 1000,
  },
  importProgressBox: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: 20,
    alignItems: 'center',
  },
  importProgressTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xs,
  },
  importProgressFile: {
    ...TYPOGRAPHY.meta,
    marginBottom: SPACING.lg,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  imageViewer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  generatedImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  placeholderText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  loadModelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    width: '100%',
  },
  loadModelText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
  },
  loadModelSubtext: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  progressText: {
    ...TYPOGRAPHY.body,
    color: '#FFF',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    gap: 8,
  },
  modeText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  inputContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  input: {
    ...TYPOGRAPHY.body,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    minHeight: 100,
    maxHeight: 160,
    textAlignVertical: 'top',
  },
  actionRow: {
    marginTop: SPACING.md,
    flexDirection: 'row',
  },
  saveRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingVertical: 4,
    minHeight: 45,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveButtonText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  stylePickerTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.xs,
    marginLeft: 4,
  },
  stylePickerScroll: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  stylePickerPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    zIndex: 10,
  },
  generatingText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  enhancedPromptBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
  },
  enhancedPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  enhancedPromptLabel: {
    ...TYPOGRAPHY.meta,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  enhancedPromptText: {
    ...TYPOGRAPHY.bodySmall,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  gallerySection: {
    marginTop: SPACING.lg,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: 4,
  },
  galleryTitle: {
    ...TYPOGRAPHY.h3,
  },
  galleryCount: {
    ...TYPOGRAPHY.meta,
    fontSize: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryThumbnail: {
    width: '100%',
    height: '100%',
  },
  deleteGalleryItem: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});
