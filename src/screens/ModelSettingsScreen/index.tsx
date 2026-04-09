import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { AttachStep, useSpotlightTour } from 'react-native-spotlight-tour';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../../components/CustomAlert';
import { consumePendingSpotlight } from '../../components/onboarding/spotlightState';
import { useTheme, useThemedStyles } from '../../theme';
import { useAppStore } from '../../stores';
import { createStyles } from './styles';
import { SystemPromptSection } from './SystemPromptSection';
import { ImageGenerationSection } from './ImageGenerationSection';
import { TextGenerationSection } from './TextGenerationSection';

export const ModelSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { goTo } = useSpotlightTour();
  const resetSettings = useAppStore((s) => s.resetSettings);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  const [promptOpen, setPromptOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

  // If user arrived here via onboarding spotlight flow, show accordion spotlight
  useEffect(() => {
    const pending = consumePendingSpotlight();
    if (pending !== null) {
      const task = InteractionManager.runAfterInteractions(() => goTo(pending));
      return () => task.cancel();
    }
  }, []);

  const handleReset = () => {
    setAlertState(showAlert(
      'Restablecer todos los ajustes',
      'Esto restaurará todos los ajustes de modelo a sus valores predeterminados. Es posible que debas recargar el modelo para que los cambios surtan efecto.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => { resetSettings(); setAlertState(hideAlert()); },
        },
      ],
    ));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ajustes de modelo</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SISTEMA</Text>
          <AttachStep index={6} fill>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setPromptOpen(!promptOpen)}
              activeOpacity={0.7}
              testID="system-prompt-accordion"
            >
              <Text style={styles.accordionTitle}>System Prompt</Text>
              <Icon
                name={promptOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </AttachStep>
          {promptOpen && (
            <View style={{ marginTop: -8, marginBottom: 16 }}>
              <SystemPromptSection />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GENERACIÓN</Text>
          
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setTextOpen(!textOpen)}
            activeOpacity={0.7}
            testID="text-generation-accordion"
          >
            <Text style={styles.accordionTitle}>Texto</Text>
            <Icon
              name={textOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {textOpen && (
            <View style={{ marginTop: -8, marginBottom: 16 }}>
              <TextGenerationSection />
            </View>
          )}

          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setImageOpen(!imageOpen)}
            activeOpacity={0.7}
            testID="image-generation-accordion"
          >
            <Text style={styles.accordionTitle}>Imagen</Text>
            <Icon
              name={imageOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {imageOpen && (
            <View style={{ marginTop: -8, marginBottom: 16 }}>
              <ImageGenerationSection />
            </View>
          )}
        </View>

        <Button
          title="Restablecer valores predeterminados"
          variant="ghost"
          size="small"
          onPress={handleReset}
          testID="reset-settings-button"
          style={styles.resetButton}
          titleStyle={{ color: colors.textMuted, fontSize: 13 }}
        />
      </ScrollView>
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={() => setAlertState(hideAlert())}
      />
    </SafeAreaView>

  );
};
