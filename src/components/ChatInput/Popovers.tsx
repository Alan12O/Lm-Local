import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme';
import { ImageModeState } from '../../types';
import { useAppStore } from '../../stores';
import { triggerHaptic } from '../../utils/haptics';
import { FONTS } from '../../constants';

// ─── Shared Styles ──────────────────────────────────────────────────────────

const SHADOW_COLOR = '#000';

export const popoverStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  popover: {
    position: 'absolute',
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.mono,
  },
  badge: {
    minWidth: 32,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    fontWeight: '700',
  },
});

// ─── Quick Settings Popover ─────────────────────────────────────────────────

interface QuickSettingsPopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorY: number;
  anchorX: number;
  imageMode: ImageModeState;
  onImageModeToggle: () => void;
  imageModelLoaded: boolean;
  supportsThinking: boolean;
  supportsToolCalling: boolean;
  enabledToolCount: number;
  onToolsPress?: () => void;
}

function getImageModeBadge(mode: ImageModeState, colors: any) {
  if (mode === 'force') return { label: 'ON', bg: colors.primary };
  if (mode === 'disabled') return { label: 'OFF', bg: colors.textMuted };
  return { label: 'Auto', bg: `${colors.textMuted}80` };
}

function getToolsStyle(supported: boolean, count: number, colors: any) {
  let iconColor = colors.textMuted;
  let badgeBg = colors.textMuted;
  let labelColor = colors.textMuted;
  let badgeLabel = 'N/A';

  if (supported) {
    const hasEnabledTools = count > 0;
    iconColor = hasEnabledTools ? colors.primary : colors.text;
    badgeBg = hasEnabledTools ? colors.primary : colors.textMuted;
    labelColor = colors.text;
    badgeLabel = String(count);
  }

  return { iconColor, badgeBg, labelColor, badgeLabel };
}

function getThinkingBadge(enabled: boolean, level: string, colors: any) {
  if (!enabled) return { label: 'OFF', bg: colors.textMuted };
  switch (level) {
    case 'super_lite': return { label: 'LITE', bg: colors.primary };
    case 'reduced': return { label: 'RED', bg: colors.primary };
    case 'medium': return { label: 'MED', bg: colors.primary };
    case 'normal': return { label: 'NORM', bg: colors.primary };
    case 'super_extended': return { label: 'EXT', bg: colors.primary };
    default: return { label: 'ON', bg: colors.primary };
  }
}

export const QuickSettingsPopover: React.FC<QuickSettingsPopoverProps> = ({
  visible, onClose, anchorY, anchorX,
  imageMode, onImageModeToggle, imageModelLoaded, supportsThinking,
  supportsToolCalling, enabledToolCount, onToolsPress,
}) => {
  const { colors } = useTheme();
  const { settings, updateSettings } = useAppStore();

  if (!visible) return null;

  const imgBadge = getImageModeBadge(imageMode, colors);
  const tools = getToolsStyle(supportsToolCalling, enabledToolCount, colors);
  const thinking = getThinkingBadge(!!settings.thinkingEnabled, settings.thinkingLevel || 'normal', colors);

  const handleThinkingCycle = () => {
    triggerHaptic('impactLight');
    if (!settings.thinkingEnabled) {
      updateSettings({ thinkingEnabled: true, thinkingLevel: 'super_lite' });
    } else if (settings.thinkingLevel === 'super_lite') {
      updateSettings({ thinkingLevel: 'reduced' });
    } else if (settings.thinkingLevel === 'reduced') {
      updateSettings({ thinkingLevel: 'medium' });
    } else if (settings.thinkingLevel === 'medium') {
      updateSettings({ thinkingLevel: 'normal' });
    } else if (settings.thinkingLevel === 'normal') {
      updateSettings({ thinkingLevel: 'super_extended' });
    } else {
      updateSettings({ thinkingEnabled: false });
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={popoverStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[popoverStyles.popover, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: anchorY + 8,
              right: anchorX,
            }]}>
              <TouchableOpacity
                testID="quick-image-mode"
                style={popoverStyles.row}
                onPress={() => { triggerHaptic('impactLight'); onImageModeToggle(); }}
              >
                <Icon name="image" size={16} color={imageModelLoaded ? colors.text : colors.textMuted} />
                <Text style={[popoverStyles.rowLabel, { color: colors.text }]}>Imagen (IA)</Text>
                <View testID={imageMode === 'force' ? 'image-mode-force-badge' : undefined} style={[popoverStyles.badge, { backgroundColor: imgBadge.bg }]}>
                  <Text style={[popoverStyles.badgeText, { color: colors.background }]}>{imgBadge.label}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                  testID="quick-thinking-toggle"
                  style={popoverStyles.row}
                  onPress={handleThinkingCycle}
                >
                  <Icon name="zap" size={16} color={settings.thinkingEnabled ? colors.primary : colors.textMuted} />
                  <Text style={[popoverStyles.rowLabel, { color: colors.text }]}>Pensamiento</Text>
                  <View style={[popoverStyles.badge, { backgroundColor: thinking.bg }]}>
                    <Text style={[popoverStyles.badgeText, { color: colors.background }]}>
                      {thinking.label}
                    </Text>
                  </View>
                </TouchableOpacity>

              <TouchableOpacity
                testID="quick-tools"
                style={popoverStyles.row}
                onPress={() => {
                  triggerHaptic('impactLight');
                  onClose();
                  if (supportsToolCalling) { onToolsPress?.(); }
                }}
              >
                <Icon name="tool" size={16} color={tools.iconColor} />
                <Text style={[popoverStyles.rowLabel, { color: tools.labelColor }]}>Herramientas</Text>
                <View style={[popoverStyles.badge, { backgroundColor: tools.badgeBg }]}>
                  <Text style={[popoverStyles.badgeText, { color: colors.background }]}>{tools.badgeLabel}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Attach Picker Popover ──────────────────────────────────────────────────

interface AttachPickerPopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorY: number;
  anchorX: number;
  supportsVision: boolean;
  onPhoto: () => void;
  onDocument: () => void;
}

export const AttachPickerPopover: React.FC<AttachPickerPopoverProps> = ({
  visible, onClose, anchorY, anchorX,
  supportsVision, onPhoto, onDocument,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={popoverStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[popoverStyles.popover, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: anchorY + 8,
              right: anchorX,
            }]}>
              <TouchableOpacity
                testID="attach-photo"
                style={popoverStyles.row}
                onPress={() => { onClose(); onPhoto(); }}
              >
                <Icon name="camera" size={16} color={supportsVision ? colors.primary : colors.textMuted} />
                <Text style={[popoverStyles.rowLabel, { color: colors.text }]}>Foto / Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="attach-document"
                style={popoverStyles.row}
                onPress={() => { onClose(); onDocument(); }}
              >
                <Icon name="file" size={16} color={colors.text} />
                <Text style={[popoverStyles.rowLabel, { color: colors.text }]}>Documentos</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Character Actions Popover ──────────────────────────────────────────────

interface CharacterActionsPopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorY: number;
  anchorX: number;
  onAction: (text: string) => void;
}

export const CharacterActionsPopover: React.FC<CharacterActionsPopoverProps> = ({
  visible, onClose, anchorY, anchorX, onAction,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={popoverStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[popoverStyles.popover, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: anchorY + 8,
              left: anchorX,
            }]}>
              <TouchableOpacity
                testID="rp-action-star"
                style={popoverStyles.row}
                onPress={() => { triggerHaptic('impactLight'); onClose(); onAction('* *'); }}
              >
                <Icon name="star" size={16} color={colors.primary} />
                <Text style={[popoverStyles.rowLabel, { color: colors.text }]}>Insertar Acción</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                testID="rp-system-describe"
                style={popoverStyles.row}
                onPress={() => { triggerHaptic('impactLight'); onClose(); onAction('(Sistema: describe con más detalle)'); }}
              >
                <Icon name="info" size={16} color={colors.textMuted} />
                <Text style={[popoverStyles.rowLabel, { color: colors.text }]}>Describe más</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="rp-system-continue"
                style={popoverStyles.row}
                onPress={() => { triggerHaptic('impactLight'); onClose(); onAction('(Sistema: continúa la historia)'); }}
              >
                <Icon name="play" size={16} color={colors.textMuted} />
                <Text style={[popoverStyles.rowLabel, { color: colors.text }]}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

