import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme, useThemedStyles } from '../../theme';
import { createStyles } from './styles';
import { RootStackParamList } from '../../navigation/types';
import { triggerHaptic } from '../../utils/haptics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ArtifactsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();

  const sections = [
    {
      id: 'math',
      title: 'Matemáticas',
      description: 'Laboratorio con editor LaTeX y fórmulas.',
      icon: 'percent',
      color: colors.primary,
      onPress: () => {
        triggerHaptic('impactLight');
        navigation.navigate('Math');
      },
    },
    {
      id: 'image-studio',
      title: 'Image Studio',
      description: 'Generación de imágenes locales.',
      icon: 'image',
      color: '#A855F7', // Purple
      onPress: () => {
        triggerHaptic('impactLight');
        navigation.navigate('ImageStudio');
      },
    },
    {
      id: 'projects',
      title: 'Proyectos',
      description: 'Gestiona tus documentos y bases de datos.',
      icon: 'folder',
      color: '#FBBF24', // Amber
      onPress: () => {
        triggerHaptic('impactLight');
        navigation.navigate('Projects');
      },
    },
    {
      id: 'characters',
      title: 'Personajes',
      description: 'Tus compañeros de IA personalizados.',
      icon: 'users',
      color: '#F472B6', // Pink
      onPress: () => {
        triggerHaptic('impactLight');
        navigation.navigate('Characters');
      },
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Artefactos</Text>
        <Text style={styles.subtitle}>Herramientas creativas y organización.</Text>
      </View>

      <View style={styles.grid}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.card}
            onPress={section.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${section.color}20` }]}>
              <Icon name={section.icon} size={24} color={section.color} />
            </View>
            <View style={styles.info}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardDescription}>{section.description}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};
