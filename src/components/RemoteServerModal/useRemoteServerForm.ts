import { useState, useCallback, useEffect } from 'react';
import { remoteServerManager } from '../../services/remoteServerManager';
import { useRemoteServerStore } from '../../stores';
import { RemoteServer, RemoteModel } from '../../types';
import { isPrivateNetworkEndpoint } from '../../services/httpClient';
import { AlertState, initialAlertState, showAlert } from '../CustomAlert';

interface FormOptions {
  server?: RemoteServer;
  visible: boolean;
  onSave?: (server: RemoteServer) => void;
  onClose: () => void;
}

export function useRemoteServerForm({ server, visible, onSave, onClose }: FormOptions) {
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<RemoteModel[]>([]);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  // Initialize form when editing existing server
  useEffect(() => {
    if (server) {
      setName(server.name);
      setEndpoint(server.endpoint);
      setNotes(server.notes || '');
      // API key is not loaded back for security - user must re-enter if they want to change it
    } else {
      // Reset form for new server
      setName('');
      setEndpoint('');
      setNotes('');
    }
    setErrors({});
    setTestResult(null);
    setDiscoveredModels([]);
  }, [server, visible]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'El nombre del servidor es obligatorio';
    }
    if (endpoint.trim()) {
      try {
        // Validate URL format by parsing it - constructor throws on invalid URLs
        new URL(endpoint); // eslint-disable-line no-new
      } catch {
        newErrors.endpoint = 'Formato de URL no válido';
      }
    } else {
      newErrors.endpoint = 'La URL del Endpoint es obligatoria';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, endpoint]);

  const handleTestConnection = useCallback(async () => {
    if (!validateForm()) return;
    setIsTesting(true);
    setTestResult(null);
    setDiscoveredModels([]);
    try {
      const result = await remoteServerManager.testConnectionByEndpoint(endpoint);
      if (result.success) {
        setTestResult({ success: true, message: `Conectado (${result.latency}ms)` });
        if (result.models) setDiscoveredModels(result.models);
      } else {
        setTestResult({ success: false, message: result.error || 'Error de conexión' });
      }
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setIsTesting(false);
    }
  }, [endpoint, validateForm]);

  const saveServer = useCallback(async () => {
    try {
      if (server) {
        await remoteServerManager.updateServer(server.id, { name, endpoint, notes });
        if (discoveredModels.length > 0) {
          useRemoteServerStore.getState().setDiscoveredModels(server.id, discoveredModels);
        }
        onSave?.(server);
      } else {
        const newServer = await remoteServerManager.addServer({
          name, endpoint, providerType: 'openai-compatible', notes: notes || undefined,
        });
        if (discoveredModels.length > 0) {
          useRemoteServerStore.getState().setDiscoveredModels(newServer.id, discoveredModels);
        }
        // Silently probe health so status shows immediately instead of "Unknown"
        remoteServerManager.testConnection(newServer.id).catch(() => { });
        onSave?.(newServer);
      }
      onClose();
    } catch (error) {
      setAlertState(showAlert('Error', error instanceof Error ? error.message : 'Error al guardar el servidor'));
    }
  }, [server, name, endpoint, notes, discoveredModels, onSave, onClose]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    // Warn if connecting to public internet
    if (endpoint && !isPrivateNetworkEndpoint(endpoint)) {
      setAlertState(showAlert(
        'Advertencia de red pública',
        'Este endpoint parece estar en la internet pública. Tus datos se enviarán a un servidor remoto. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => saveServer() },
        ]
      ));
    } else {
      saveServer();
    }

  }, [validateForm, endpoint]);

  return {
    name, setName,
    endpoint, setEndpoint,
    notes, setNotes,
    errors,
    isTesting,
    testResult,
    discoveredModels,
    handleTestConnection,
    handleSave,
    isPublicNetwork: !!(endpoint && !isPrivateNetworkEndpoint(endpoint)),
    alertState,
    dismissAlert: () => setAlertState(initialAlertState),
  };
}
