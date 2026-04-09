import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AttachStep, useSpotlightTour } from 'react-native-spotlight-tour';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { consumePendingSpotlight } from '../components/onboarding/spotlightState';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { useProjectStore } from '../stores';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProjectEdit'>;
type RouteProps = RouteProp<RootStackParamList, 'ProjectEdit'>;

export const ProjectEditScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const projectId = route.params?.projectId;
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { goTo } = useSpotlightTour();
  const { getProject, createProject, updateProject } = useProjectStore();
  const existingProject = projectId ? getProject(projectId) : null;

  // If user arrived here via onboarding spotlight flow, show name input spotlight
  useEffect(() => {
    const pending = consumePendingSpotlight();
    if (pending !== null) {
      const task = InteractionManager.runAfterInteractions(() => goTo(pending));
      return () => task.cancel();
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
  });

  useEffect(() => {
    if (existingProject) {
      setFormData({
        name: existingProject.name,
        description: existingProject.description,
        systemPrompt: existingProject.systemPrompt,
      });
    }
  }, [existingProject]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      setAlertState(showAlert('Error', 'Por favor, introduce un nombre para el proyecto'));
      return;
    }
    if (!formData.systemPrompt.trim()) {
      setAlertState(showAlert('Error', 'Por favor, introduce una instrucción del sistema'));
      return;
    }

    if (existingProject) {
      updateProject(existingProject.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        systemPrompt: formData.systemPrompt.trim(),
      });
    } else {
      createProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
        systemPrompt: formData.systemPrompt.trim(),
      });
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {existingProject ? 'Editar proyecto' : 'Nuevo proyecto'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveText}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Text style={styles.label}>Nombre *</Text>
          <AttachStep index={8} fill>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="ej. Aprendizaje de español, Revisión de código"
              placeholderTextColor={colors.textMuted}
            />
          </AttachStep>

          {/* Description */}
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={styles.input}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Breve descripción de este proyecto"
            placeholderTextColor={colors.textMuted}
          />

          {/* System Prompt */}
          <Text style={styles.label}>Instrucción del sistema *</Text>
          <Text style={styles.hint}>
            Este contexto se envía a la IA al inicio de cada chat en este proyecto.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.systemPrompt}
            onChangeText={(text) => setFormData({ ...formData, systemPrompt: text })}
            placeholder="Introduce las instrucciones o el contexto para la IA..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.tip}>
            Consejo: Sé específico sobre lo que quieres que haga la IA, cómo debe responder y cualquier contexto que necesite.
          </Text>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert {...alertState} onClose={() => setAlertState(hideAlert())} />
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.small,
    zIndex: 1,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  cancelText: {
    ...TYPOGRAPHY.body,
    color: colors.textMuted,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontWeight: '400' as const,
  },
  saveText: {
    ...TYPOGRAPHY.body,
    color: colors.primary,
    fontWeight: '400' as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: colors.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
    textTransform: 'uppercase' as const,
  },
  hint: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: SPACING.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 180,
    maxHeight: 280,
    textAlignVertical: 'top' as const,
  },
  tip: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  bottomPadding: {
    height: SPACING.xxl,
  },
});
