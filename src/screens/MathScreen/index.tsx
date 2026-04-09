import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme, useThemedStyles } from '../../theme';
import { createStyles } from './styles';
import { RootStackParamList } from '../../navigation/types';
import { triggerHaptic } from '../../utils/haptics';
import { MathRenderer } from '../../components/MathRenderer';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MATH_SYMBOLS = [
  { label: 'x²', value: '^2' },
  { label: 'xⁿ', value: '^{}' },
  { label: '√x', value: '\\sqrt{}' },
  { label: 'ⁿ√x', value: '\\sqrt[n]{}' },
  { label: 'dy/dx', value: '\\frac{dy}{dx}' },
  { label: '∫', value: '\\int ' },
  { label: 'Σ', value: '\\sum ' },
  { label: 'lim', value: '\\lim_{x \\to 0} ' },
  { label: 'π', value: '\\pi ' },
  { label: '∞', value: '\\infty ' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
];

export const MathScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const [latex, setLatex] = useState('');

  const insertSymbol = (value: string) => {
    triggerHaptic('impactLight');
    setLatex(prev => prev + value);
  };

  const clearEditor = () => {
    triggerHaptic('impactMedium');
    setLatex('');
  };

  const solveWithAI = () => {
    if (!latex.trim()) return;
    triggerHaptic('notificationSuccess');
    
    // Construct a structured prompt for the AI
    const prompt = `Por favor, resuelve y explica paso a paso la siguiente fórmula matemática:\n\n$$\n${latex}\n$$\n\nProporciona una explicación detallada del razonamiento.`;
    
    // Navigate to Chat screen with the initial message and autoSend flag
    navigation.navigate('Chat', { 
      conversationId: undefined, 
      initialMessage: prompt,
      autoSend: true 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Laboratorio Matemático</Text>
        <View style={{ flex: 1 }} />
        {latex.length > 0 && (
          <TouchableOpacity onPress={clearEditor}>
            <Icon name="trash-2" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Real-time Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Vista Previa</Text>
            {latex.trim().length > 0 ? (
              <MathRenderer latex={latex} />
            ) : (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>
                Escribe una fórmula para previsualizar...
              </Text>
            )}
          </View>

          {/* LaTeX Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe en LaTeX (ej: e=mc^2)..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={latex}
              onChangeText={setLatex}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Quick Symbols */}
          <Text style={styles.toolbarTitle}>Herramientas Rápidas</Text>
          <View style={styles.symbolGrid}>
            {MATH_SYMBOLS.map((symbol) => (
              <TouchableOpacity
                key={symbol.label}
                style={styles.symbolButton}
                onPress={() => insertSymbol(symbol.value)}
              >
                <Text style={styles.symbolText}>{symbol.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={solveWithAI}
              disabled={!latex.trim()}
            >
              <Icon name="zap" size={20} color={colors.background} />
              <Text style={styles.primaryButtonText}>Resolver con IA Local</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => triggerHaptic('impactLight')} 
            >
              <Icon name="camera" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Tomar Foto del Problema</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
