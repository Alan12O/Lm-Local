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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme';
import { TYPOGRAPHY, SPACING, FONTS } from '../constants';
import { imageGenerationService, ImageGenerationState } from '../services/imageGenerationService';
import { useAppStore } from '../stores';
import { triggerHaptic } from '../utils/haptics';
import { Button } from '../components';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ImageStudio'>;
};

export const ImageStudioScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [useLLMEnhancement, setUseLLMEnhancement] = useState(
    useAppStore.getState().settings.enhanceImagePrompts || false
  );
  
  const [genState, setGenState] = useState<ImageGenerationState>(imageGenerationService.getState());
  
  useEffect(() => {
    const unsub = imageGenerationService.subscribe((state) => {
      setGenState(state);
    });
    return unsub;
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || genState.isGenerating) return;
    triggerHaptic('impactMedium');
    
    // Temporarily override the app setting just for this generation if needed
    const appStore = useAppStore.getState();
    const originalSetting = appStore.settings.enhanceImagePrompts;
    if (originalSetting !== useLLMEnhancement) {
      appStore.updateSettings({ enhanceImagePrompts: useLLMEnhancement });
    }

    await imageGenerationService.generateImage({
      prompt: prompt.trim()
    });

    if (originalSetting !== useLLMEnhancement) {
      appStore.updateSettings({ enhanceImagePrompts: originalSetting });
    }
  };

  const handleCancel = () => {
    triggerHaptic('impactLight');
    imageGenerationService.cancelGeneration();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Image Studio</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Visualizer Area */}
          <View style={[styles.imageViewer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {genState.previewPath || genState.result?.imagePath ? (
              <Image 
                source={{ uri: genState.result ? `file://${genState.result.imagePath}` : genState.previewPath! }} 
                style={styles.generatedImage} 
                resizeMode="contain" 
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon name="image" size={48} color={colors.textMuted} />
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  {genState.isGenerating ? genState.status : 'Tu lienzo está en blanco.'}
                </Text>
              </View>
            )}
            
            {genState.isGenerating && (
              <View style={[styles.progressOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.progressText}>{genState.status}</Text>
                {genState.progress && (
                  <Text style={styles.progressStepCount}>
                    {genState.progress.step} / {genState.progress.totalSteps}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Mode Selector */}
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

        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.background }]}
            placeholder={useLLMEnhancement ? "Describe tu idea vagamente..." : "A photorealistic cyberpunk city..."}
            placeholderTextColor={colors.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={1000}
            editable={!genState.isGenerating}
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
                disabled={!prompt.trim()} 
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
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
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  progressText: {
    ...TYPOGRAPHY.body,
    color: '#FFF',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  progressStepCount: {
    ...TYPOGRAPHY.meta,
    fontFamily: FONTS.mono,
    color: '#FFF',
    marginTop: SPACING.sm,
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
});
