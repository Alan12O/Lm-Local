import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING, FONTS } from '../constants';
import { useCharacterStore, useAppStore, useRemoteServerStore } from '../stores';
import { RootStackParamList } from '../navigation/types';
import { llmService, remoteServerManager } from '../services';
import { getToolsAsOpenAISchema, executeToolCall } from '../services/tools';
import { providerRegistry } from '../services/providers';
import { parseToolCallsFromText } from '../services/generationToolLoop';
import type { Message } from '../types';
import type { ToolCall, ToolResult } from '../services/tools/types';

const THEME_COLORS = ['#3b82f6', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#64748b'];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CharacterEdit'>;
type RouteProps = RouteProp<RootStackParamList, 'CharacterEdit'>;

// ─── Modal de investigación con IA ───────────────────────────────────────────
interface ResearchModalProps {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  projectId?: string;
}

const ResearchModal: React.FC<ResearchModalProps> = ({ visible, onClose, onResult, colors, projectId }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const abortRef = useRef(false);

  const handleClose = () => {
    abortRef.current = true;
    setQuery('');
    setResult('');
    setIsLoading(false);
    onClose();
  };

  const handleResearch = async () => {
    if (!query.trim() || isLoading) return;
    abortRef.current = false;
    setIsLoading(true);
    setResult('');

    const { activeServerId, activeRemoteTextModelId } = useRemoteServerStore.getState();
    const isRemoteActive = !!(activeServerId && activeRemoteTextModelId);
    
    // Recuperar el proveedor: primero por ID del servidor, luego por el activo del registry
    let provider = isRemoteActive ? providerRegistry.getProvider(activeServerId!) : null;
    
    // Si hay un servidor activo pero no está en el registry (ej: app recién abierta),
    // re-inicializar cargando el modelo remoto activo para re-registrar el proveedor
    if (isRemoteActive && !provider) {
      try {
        await remoteServerManager.setActiveRemoteTextModel(activeServerId!, activeRemoteTextModelId!);
        provider = providerRegistry.getProvider(activeServerId!);
      } catch {
        // Si falla la reconexión, el usuario verá el error de "sin modelo" más adelante
      }
    }
    const settings = useAppStore.getState().settings;

    // Solo mostrar "sin modelo" si no hay modelo local Y no hay proveedor remoto disponible
    if (!provider && !llmService.isModelLoaded()) {
      setResult('⚠️ Ningún modelo cargado. Carga un modelo en la pantalla de Chat primero.');
      setIsLoading(false);
      return;
    }

    const { enabledTools = [] } = settings;
    const toolIdsToUse = enabledTools.filter((id: string) => id === 'web_search' || id === 'search_knowledge_base');
    const toolSchemas = getToolsAsOpenAISchema(toolIdsToUse);

    const loopMessages: Message[] = [
      { id: '__sys', role: 'system', content: 'Eres un asistente de investigación. Tu objetivo es proporcionar información estricta y resumida de un tema para usarse como contexto de un personaje de IA. Usa español.\n\nREGLA: Da un pequeño resumen directo de máximo 1 o 2 párrafos con los puntos más importantes. NADA de respuestas amplias ni detalles innecesarios.\n\nSi necesitas datos reales o históricos que no sabes con certeza, DEBES usar sistemáticamente tus herramientas.', timestamp: 0 },
      { id: '__usr', role: 'user', content: query.trim(), timestamp: 0 },
    ];

    let buffer = '';

    try {
      for (let iter = 0; iter < 3; iter++) {
        if (abortRef.current) break;
        let iterationContent = '';
        let currentToolCalls: ToolCall[] = [];

        if (provider) {
          const res = await new Promise<{ fullResponse: string, toolCalls: ToolCall[] }>((resolve, reject) => {
            provider.generate(loopMessages, {
              temperature: settings.temperature,
              maxTokens: settings.maxTokens,
              topP: settings.topP,
              tools: toolSchemas,
              enableThinking: settings.thinkingEnabled && provider.capabilities.supportsThinking
            }, {
              onToken: (token: string) => {
                if (abortRef.current || !token) return;
                iterationContent += token;
                setResult(buffer + iterationContent);
              },
              onReasoning: () => {},
              onComplete: (r: any) => {
                const calls = (r.toolCalls || []).map((tc: any) => ({
                  id: tc.id || `call-${Date.now()}`,
                  name: tc.name,
                  arguments: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments
                }));
                resolve({ fullResponse: r.content, toolCalls: calls });
              },
              onError: reject
            });
          });
          iterationContent = res.fullResponse || '';
          currentToolCalls = res.toolCalls;
        } else {
          const res = await llmService.generateResponseWithTools(loopMessages, {
            tools: toolSchemas,
            onStream: ({ content }) => {
              if (abortRef.current || !content) return;
              iterationContent += content;
              setResult(buffer + iterationContent);
            }
          });
          iterationContent = res.fullResponse || '';
          currentToolCalls = res.toolCalls;

          if (currentToolCalls.length === 0 && iterationContent.includes('<tool_call>')) {
            const parsed = parseToolCallsFromText(iterationContent);
            iterationContent = parsed.cleanText;
            currentToolCalls = parsed.toolCalls;
          }
        }

        if (currentToolCalls.length === 0) {
          buffer += iterationContent;
          setResult(buffer);
          break; // Fin de la investigación
        }

        const toolNames = currentToolCalls.map(t => t.name).join(', ');
        const toolIndicator = `\n\n[🔍 Consultando: ${toolNames}...]`;
        buffer += iterationContent;
        setResult(buffer + toolIndicator);

        loopMessages.push({
          id: `assist-${iter}`,
          role: 'assistant',
          content: iterationContent,
          timestamp: Date.now(),
          toolCalls: currentToolCalls.map(tc => ({ id: tc.id, name: tc.name, arguments: JSON.stringify(tc.arguments) }))
        });

        for (const tc of currentToolCalls) {
          if (abortRef.current) break;
          if (projectId) tc.context = { projectId };
          
          const tcRes = await executeToolCall(tc);
          loopMessages.push({
            id: `tc-${Date.now()}`,
            role: 'tool',
            content: tcRes.error ? `Error: ${tcRes.error}` : tcRes.content,
            toolCallId: tc.id,
            toolName: tc.name,
            timestamp: Date.now()
          });
        }
        
        // Remove the visual tool indicator for the next iteration
        setResult(buffer + '\n\n[✅ Analizando resultados, generando resumen...]');
      }
    } catch {
      if (!abortRef.current) {
        setResult(prev => prev + '\n\n❌ Error al generar la investigación. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (result.trim()) {
      onResult(result.trim());
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: '85%',
          }}>
            {/* Header del modal */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
              <Icon name="search" size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 17, fontFamily: FONTS.mono, fontWeight: '700', flex: 1 }}>
                Investigar con IA
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONTS.mono, marginBottom: 12 }}>
              Dile a la IA qué investigar. El resultado se añadirá al contexto del personaje.
            </Text>

            {/* Campo de búsqueda */}
            <TextInput
              style={{
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 12,
                color: colors.text,
                fontFamily: FONTS.mono,
                fontSize: 14,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
              value={query}
              onChangeText={setQuery}
              placeholder="Ej: Cómo hablan los piratas del siglo XVII..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLoading}
            />

            {/* Botón investigar */}
            <TouchableOpacity
              onPress={handleResearch}
              disabled={isLoading || !query.trim()}
              style={{
                backgroundColor: isLoading || !query.trim() ? colors.border : colors.primary,
                borderRadius: 10,
                padding: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {isLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Icon name="cpu" size={16} color="#fff" />
              }
              <Text style={{ color: '#fff', fontFamily: FONTS.mono, fontWeight: '700', fontSize: 14 }}>
                {isLoading ? 'Investigando...' : 'Investigar'}
              </Text>
            </TouchableOpacity>

            {/* Resultado */}
            {result !== '' && (
              <View style={{
                backgroundColor: colors.background,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isLoading ? colors.border : colors.primary + '60',
                padding: 12,
                marginBottom: 12,
                maxHeight: 200,
              }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  <Text style={{ color: colors.text, fontFamily: FONTS.mono, fontSize: 13, lineHeight: 20 }}>
                    {result}
                  </Text>
                </ScrollView>
              </View>
            )}

            {/* Botones aplicar / cancelar */}
            {result !== '' && !isLoading && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1,
                    borderColor: colors.border, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontFamily: FONTS.mono, fontWeight: '600' }}>Descartar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApply}
                  style={{
                    flex: 2, padding: 12, borderRadius: 10,
                    backgroundColor: colors.primary, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Icon name="plus-circle" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: FONTS.mono, fontWeight: '700' }}>Añadir al contexto</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────
export const CharacterEditScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const characterId = route.params?.characterId;
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const [showResearch, setShowResearch] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { getCharacter, createCharacter, updateCharacter } = useCharacterStore();
  const { downloadedModels } = useAppStore();
  const { activeServerId, activeRemoteTextModelId } = useRemoteServerStore();
  const existingCharacter = characterId ? getCharacter(characterId) : null;
  const isRemoteActive = !!(activeServerId && activeRemoteTextModelId);
  const hasLoadedModel = isRemoteActive || llmService.isModelLoaded();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    firstMessage: '',
    examples: '',
    context: '',
    userRole: '',
    themeColor: THEME_COLORS[0],
  });

  useEffect(() => {
    if (existingCharacter) {
      setFormData({
        name: existingCharacter.name,
        description: existingCharacter.description,
        systemPrompt: existingCharacter.systemPrompt,
        firstMessage: existingCharacter.firstMessage || '',
        examples: existingCharacter.examples || '',
        context: existingCharacter.context || '',
        userRole: existingCharacter.userRole || '',
        themeColor: existingCharacter.themeColor || THEME_COLORS[0],
      });
    }
  }, [existingCharacter]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      setAlertState(showAlert('Error', 'Por favor ingresa el nombre del personaje'));
      return;
    }
    if (!formData.systemPrompt.trim()) {
      setAlertState(showAlert('Error', 'El System Prompt (instrucciones base) es obligatorio'));
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      systemPrompt: formData.systemPrompt.trim(),
      firstMessage: formData.firstMessage.trim(),
      examples: formData.examples.trim(),
      context: formData.context.trim(),
      userRole: formData.userRole.trim(),
      themeColor: formData.themeColor,
    };

    if (existingCharacter) {
      updateCharacter(existingCharacter.id, payload);
    } else {
      createCharacter(payload);
    }

    navigation.goBack();
  };

  /** Agrega el resultado de la investigación al contexto existente (con separador si ya hay texto) */
  const handleResearchResult = (text: string) => {
    setFormData(prev => ({
      ...prev,
      context: prev.context.trim()
        ? `${prev.context.trim()}\n\n---\n${text}`
        : text,
    }));
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
            {existingCharacter ? 'Editar Personaje' : 'Nuevo Personaje'}
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
          {/* Nombre */}
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Ej: Mago Oscuro, Asistente Cyberpunk"
            placeholderTextColor={colors.textMuted}
          />

          {/* Color del Tema */}
          <Text style={styles.label}>Color Temático</Text>
          <View style={styles.colorPickerRow}>
            {THEME_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorCircle, { backgroundColor: c }, formData.themeColor === c && styles.colorCircleSelected]}
                onPress={() => setFormData({ ...formData, themeColor: c })}
              />
            ))}
          </View>

          {/* Descripción */}
          <Text style={styles.label}>Descripción corta</Text>
          <TextInput
            style={styles.input}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Breve resumen del rol"
            placeholderTextColor={colors.textMuted}
          />

          {/* System Prompt */}
          <Text style={styles.label}>Instrucciones (System Prompt) *</Text>
          <Text style={styles.hint}>
            Define quién es el personaje, cómo habla y cuáles son las reglas de simulación que debe seguir a rajatabla.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.systemPrompt}
            onChangeText={(text) => setFormData({ ...formData, systemPrompt: text })}
            placeholder="Eres un guerrero medieval estoico..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Rol del Usuario */}
          <Text style={styles.label}>Rol del Usuario (Opcional)</Text>
          <Text style={styles.hint}>
            Define quién eres tú en esta historia para que el personaje sepa interactuar contigo (Ej: Un mago novato, Un cliente importante).
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.userRole}
            onChangeText={(text) => setFormData({ ...formData, userRole: text })}
            placeholder="Eres un viajero solitario buscando respuestas..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Primer mensaje / Saludo */}
          <Text style={styles.label}>Saludo Inicial</Text>
          <Text style={styles.hint}>
            Para establecer el tono, ¿qué es lo primero que diría? (Opcional)
          </Text>
          <TextInput
            style={[styles.input, styles.mediumArea]}
            value={formData.firstMessage}
            onChangeText={(text) => setFormData({ ...formData, firstMessage: text })}
            placeholder="Bienvenido forastero, mi acero está a tu servicio."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Ejemplos de conversación */}
          <Text style={styles.label}>Ejemplos de Chat</Text>
          <Text style={styles.hint}>
            Añade algunos diálogos de ejemplo para calibrar la IA a su personalidad.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.examples}
            onChangeText={(text) => setFormData({ ...formData, examples: text })}
            placeholder={"User: ¿Qué haces?\nIA: Afilo mi hacha, preparado para la batalla."}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* ─── ZONA DE CONTEXTO ─────────────────────────────────────── */}
          <View style={styles.contextHeader}>
            <View style={styles.contextTitleRow}>
              <Icon name="book-open" size={15} color={colors.primary} />
              <Text style={styles.label}>Contexto</Text>
            </View>
            <Text style={styles.contextBadge}>Opcional</Text>
          </View>
          <Text style={styles.hint}>
            Información de fondo que el personaje siempre «sabrá»: lore, datos históricos, reglas del mundo, etc.
            Se inyecta automáticamente en el system prompt al chatear.
          </Text>

          {/* Textarea de contexto */}
          <TextInput
            style={[styles.input, styles.contextArea]}
            value={formData.context}
            onChangeText={(text) => setFormData({ ...formData, context: text })}
            placeholder="Ej: El mundo de Eldoria fue creado por los dioses hace 3000 años. La magia proviene de cristales llamados Runitas..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Botón "Investigar con IA" */}
          <TouchableOpacity
            style={[
              styles.researchButton,
              !hasLoadedModel && styles.researchButtonDisabled,
            ]}
            onPress={() => {
              if (!hasLoadedModel) {
                setAlertState(showAlert(
                  'Sin modelo cargado',
                  'Primero carga un modelo en la pantalla de Chat para poder usar la investigación con IA.',
                ));
                return;
              }
              setShowResearch(true);
            }}
          >
            <Icon name="search" size={15} color={hasLoadedModel ? colors.primary : colors.textMuted} />
            <Text style={[styles.researchButtonText, !hasLoadedModel && { color: colors.textMuted }]}>
              Investigar con IA
            </Text>
            {!hasLoadedModel && (
              <Text style={styles.researchNoModel}>· Requiere modelo cargado</Text>
            )}
          </TouchableOpacity>
          {/* ─────────────────────────────────────────────────────────── */}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert {...alertState} onClose={() => setAlertState(hideAlert())} />

      <ResearchModal
        visible={showResearch}
        onClose={() => setShowResearch(false)}
        onResult={handleResearchResult}
        colors={colors}
        projectId={existingCharacter?.id}
      />
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
  colorPickerRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginTop: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: colors.text,
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
  mediumArea: {
    minHeight: 100,
    maxHeight: 180,
    textAlignVertical: 'top' as const,
  },
  textArea: {
    minHeight: 180,
    maxHeight: 280,
    textAlignVertical: 'top' as const,
  },
  // ─── Contexto ───────────────────────────────────────────────────
  contextHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  contextTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  contextBadge: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  contextArea: {
    minHeight: 140,
    maxHeight: 260,
    textAlignVertical: 'top' as const,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  researchButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed' as const,
  },
  researchButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  researchButtonText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  researchNoModel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  // ────────────────────────────────────────────────────────────────
  bottomPadding: {
    height: SPACING.xxl,
  },
});
