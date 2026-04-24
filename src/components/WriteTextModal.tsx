import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Dimensions, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { AppSheet } from './AppSheet';
import { Button } from './Button';
import { useTheme } from '../theme';
import { SPACING, TYPOGRAPHY } from '../constants';
import RNFS from 'react-native-fs';

export interface WriteTextModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (filePath: string, fileName: string) => Promise<void>;
}

export const WriteTextModal: React.FC<WriteTextModalProps> = ({ visible, onClose, onSave }) => {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      const finalTitle = title.trim() || `Nota_${new Date().getTime()}`;
      const fileName = finalTitle.endsWith('.txt') ? finalTitle : `${finalTitle}.txt`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      
      await RNFS.writeFile(filePath, text, 'utf8');
      await onSave(filePath, fileName);
      
      setText('');
      setTitle('');
      onClose();
    } catch (e) {
      console.error(e);
      // Let the parent catch it
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      enableDynamicSizing
      title="Escribir o Pegar Texto"
      closeLabel="Cerrar"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TextInput
            style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Título (opcional)"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <TextInput
            style={[
              styles.textInput, 
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }
            ]}
            placeholder="Pega texto, notas o código aquí..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.footer}>
            <Button 
              title="Cancelar" 
              variant="outline" 
              onPress={onClose} 
              style={styles.cancelBtn} 
            />
            <Button 
              title={isSaving ? "Guardando..." : "Añadir a Conocimiento"} 
              variant="primary" 
              onPress={handleSave} 
              disabled={text.trim().length === 0 || isSaving}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </AppSheet>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    flexDirection: 'column',
  },
  titleInput: {
    ...TYPOGRAPHY.body,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  textInput: {
    ...TYPOGRAPHY.body,
    height: height * 0.35,
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl, // clear safe area
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});
