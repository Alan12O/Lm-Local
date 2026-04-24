import { Dispatch, SetStateAction } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import { AlertState, showAlert } from '../../components';
import logger from '../../utils/logger';

export async function saveImageToGallery(
  viewerImageUri: string | null,
  setAlertState: Dispatch<SetStateAction<AlertState>>,
): Promise<void> {
  if (!viewerImageUri) return;
  try {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Permiso de almacenamiento',
          message: 'La aplicación necesita acceso para guardar imágenes',
          buttonNeutral: 'Preguntar más tarde',
          buttonNegative: 'Cancelar',
          buttonPositive: 'Aceptar',
        },
      );
    }
    const sourcePath = viewerImageUri.replace('file://', '');
    const picturesDir = Platform.OS === 'android'
      ? `${RNFS.ExternalStorageDirectoryPath}/Pictures/LmLocal`
      : `${RNFS.DocumentDirectoryPath}/LmLocal_Images`;
    if (!(await RNFS.exists(picturesDir))) {
      await RNFS.mkdir(picturesDir);
    }
    const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const fileName = `generada_${timestamp}.png`;
    await RNFS.copyFile(sourcePath, `${picturesDir}/${fileName}`);
    setAlertState(showAlert(
      'Imagen guardada',
      Platform.OS === 'android'
        ? `Guardado en Pictures/LmLocal/${fileName}`
        : `Guardado en ${fileName}`,
    ));
  } catch (error: any) {
    logger.error('[ChatScreen] Failed to save image:', error);
    setAlertState(showAlert('Error', `Error al guardar la imagen: ${error?.message || 'Error desconocido'}`));
  }
}
