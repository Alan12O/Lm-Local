import React from 'react';
import { View, Text, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { AppSheet } from './AppSheet';
import { useTheme, useThemedStyles } from '../theme';
import { FONTS } from '../constants';
import { AVAILABLE_TOOLS } from '../services/tools';
import type { ThemeColors, ThemeShadows } from '../theme';

interface ToolPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  toolsEnabled: boolean;
  onToggleAllTools: (enabled: boolean) => void;
  enabledTools: string[];
  onToggleTool: (toolId: string) => void;
}

export const ToolPickerSheet: React.FC<ToolPickerSheetProps> = ({
  visible,
  onClose,
  toolsEnabled,
  onToggleAllTools,
  enabledTools,
  onToggleTool,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      enableDynamicSizing
      title="Herramientas"
    >
      <View style={styles.container}>
        {/* Switch maestro */}
        <View style={[styles.masterRow, { borderBottomColor: colors.border }]}>
          <View style={styles.masterLeft}>
            <Icon name="zap" size={20} color={toolsEnabled ? colors.primary : colors.textMuted} />
            <View style={styles.masterTextGroup}>
              <Text style={[styles.masterTitle, { color: colors.text }]}>Activar herramientas</Text>
              <Text style={[styles.masterDesc, { color: colors.textMuted }]}>
                {toolsEnabled ? 'El modelo puede usar herramientas' : 'Sin acceso a herramientas'}
              </Text>
            </View>
          </View>
          <Switch
            testID="tools-master-switch"
            value={toolsEnabled}
            onValueChange={onToggleAllTools}
            trackColor={{ false: colors.border, true: `${colors.primary}80` }}
            thumbColor={toolsEnabled ? colors.primary : colors.textMuted}
          />
        </View>

        {/* Lista de herramientas individuales */}
        {AVAILABLE_TOOLS.map(tool => {
          const isEnabled = toolsEnabled && enabledTools.includes(tool.id);
          return (
            <View
              key={tool.id}
              style={[styles.toolRow, !toolsEnabled && styles.toolRowDisabled]}
              testID={`tool-picker-row-${tool.id}`}
            >
              <View style={styles.toolIcon}>
                <Icon name={tool.icon} size={20} color={isEnabled ? colors.primary : colors.textMuted} />
              </View>
              <View style={styles.toolInfo}>
                <View style={styles.toolNameRow}>
                  <Text style={[styles.toolName, { color: toolsEnabled ? colors.text : colors.textMuted }]} testID={`tool-picker-name-${tool.id}`}>
                    {tool.displayName}
                  </Text>
                  {tool.requiresNetwork && (
                    <Icon name="wifi" size={12} color={colors.textMuted} style={styles.networkIcon} />
                  )}
                </View>
                <Text style={styles.toolDescription}>{tool.description}</Text>
              </View>
              <Switch
                value={isEnabled}
                disabled={!toolsEnabled}
                onValueChange={() => onToggleTool(tool.id)}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={isEnabled ? colors.primary : colors.textMuted}
              />
            </View>
          );
        })}
      </View>
    </AppSheet>
  );
};

const createStyles = (colors: ThemeColors, _shadows: ThemeShadows) => ({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  masterRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  masterLeft: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  masterTextGroup: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 15,
    fontFamily: FONTS.mono,
    fontWeight: '700' as const,
  },
  masterDesc: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    marginTop: 2,
  },
  toolRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolRowDisabled: {
    opacity: 0.4,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  toolInfo: {
    flex: 1,
    marginRight: 12,
  },
  toolNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  toolName: {
    fontSize: 15,
    fontFamily: FONTS.mono,
    fontWeight: '600' as const,
  },
  networkIcon: {
    marginLeft: 6,
  },
  toolDescription: {
    fontSize: 12,
    fontFamily: FONTS.mono,
    color: colors.textMuted,
    marginTop: 2,
  },
});

