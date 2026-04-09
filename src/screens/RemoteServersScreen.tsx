/**
 * Remote Servers Settings Screen
 *
 * Manage connections to remote LLM servers (Ollama, LM Studio, etc.)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useThemedStyles } from '../theme';
import { useRemoteServerStore } from '../stores';
import { RemoteServerModal } from '../components/RemoteServerModal';
import { RootStackParamList } from '../navigation/types';
import { remoteServerManager } from '../services/remoteServerManager';
import { discoverLANServers } from '../services/networkDiscovery';
import { CustomAlert, AlertState, initialAlertState, showAlert } from '../components/CustomAlert';
import { createStyles } from './RemoteServersScreen.styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RemoteServers'>;

export const RemoteServersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { servers, serverHealth, testConnection, activeServerId, setActiveServerId } = useRemoteServerStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<typeof servers[0] | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  // Auto-check all server statuses when screen opens
  useEffect(() => {
    servers.forEach(server => {
      testConnection(server.id).catch(() => { });
    });

  }, []);

  const handleTestServer = useCallback(async (serverId: string) => {
    setTestingId(serverId);
    try {
      const result = await testConnection(serverId);
      if (result.success) {
        setAlertState(showAlert('Éxito', `Conectado con éxito (${result.latency}ms)`));
      } else {
        setAlertState(showAlert('Error de conexión', result.error || 'Error desconocido'));
      }
    } catch (error) {
      setAlertState(showAlert('Error', error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setTestingId(null);
    }
  }, [testConnection]);

  const handleScanNetwork = useCallback(async () => {
    setIsScanning(true);
    try {
      const discovered = await discoverLANServers();
      if (discovered.length === 0) {
        setAlertState(showAlert('No se encontraron servidores', 'No se encontraron servidores LLM en tu red local.'));
        return;
      }
      const existingEndpoints = new Set(servers.map(s => s.endpoint));
      const newServers = discovered.filter(d => !existingEndpoints.has(d.endpoint));
      if (newServers.length === 0) {
        setAlertState(showAlert('Ya añadidos', 'Todos los servidores descubiertos ya están en tu lista.'));
        return;
      }
      const added = await Promise.all(
        newServers.map(d =>
          remoteServerManager.addServer({
            name: d.name,
            endpoint: d.endpoint,
            providerType: 'openai-compatible',
          })
        )
      );
      added.forEach(s => remoteServerManager.testConnection(s.id).catch(() => { }));
      setAlertState(showAlert('Búsqueda completa', `Se añadió ${newServers.length} servidor${newServers.length > 1 ? 'es' : ''}.`));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setAlertState(showAlert('Escaneo fallido', message));
    } finally {
      setIsScanning(false);
    }
  }, [servers]);

  const handleDeleteServer = useCallback((server: typeof servers[0]) => {
    setAlertState(showAlert(
      'Eliminar servidor',
      `¿Estás seguro de que quieres eliminar "${server.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (activeServerId === server.id) setActiveServerId(null);
            await remoteServerManager.removeServer(server.id);
          },
        },
      ]
    ));
  }, [activeServerId, setActiveServerId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Servidores remotos</Text>
      </View>


      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {servers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="wifi" size={32} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Sin servidores remotos</Text>
            <Text style={styles.emptyText}>
              Conéctate a Ollama, LM Studio u otros servidores LLM en tu red
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Icon name="plus" size={20} color={theme.colors.background} />
              <Text style={styles.addButtonText}>Añadir servidor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanNetwork} disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Icon name="wifi" size={20} color={theme.colors.text} />
              )}
              <Text style={styles.scanButtonText}>{isScanning ? 'Escaneando...' : 'Escanear red'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {servers.map((server) => {
              const isTesting = testingId === server.id;
              const health = serverHealth[server.id];

              let statusColor = styles.statusDotUnknown;
              if (health?.isHealthy === true) statusColor = styles.statusDotActive;
              else if (health?.isHealthy === false) statusColor = styles.statusDotInactive;

              let statusText = 'Desconocido';
              if (isTesting) statusText = 'Probando...';
              else if (health?.isHealthy === true) statusText = 'Conectado';
              else if (health?.isHealthy === false) statusText = 'Desconectado';

              return (
                <View key={server.id} style={styles.serverItem}>
                  <View style={styles.serverHeader}>
                    <View style={styles.serverInfo}>
                      <Text style={styles.serverName}>{server.name}</Text>
                      <Text style={styles.serverEndpoint}>{server.endpoint}</Text>
                    </View>
                  </View>

                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, statusColor]} />
                    <Text style={styles.statusText}>{statusText}</Text>
                  </View>

                  <View style={styles.serverActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleTestServer(server.id)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <ActivityIndicator size="small" color={theme.colors.text} />
                      ) : (
                        <>
                          <Icon name="refresh-cw" size={16} color={theme.colors.text} />
                          <Text style={styles.actionButtonText}>Probar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setEditingServer(server)}
                    >
                      <Icon name="edit-2" size={16} color={theme.colors.text} />
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteServer(server)}
                    >
                      <Icon name="trash-2" size={16} color={theme.colors.error} />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Icon name="plus" size={20} color={theme.colors.background} />
              <Text style={styles.addButtonText}>Añadir otro servidor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanNetwork} disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Icon name="wifi" size={20} color={theme.colors.text} />
              )}
              <Text style={styles.scanButtonText}>{isScanning ? 'Escaneando...' : 'Escanear red'}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Sobre los servidores remotos</Text>
          <Text style={styles.infoText}>
            Conéctate a servidores LLM que se ejecuten en tu red local, como Ollama o LM Studio.{'\n\n'}
            Asegúrate de que tu servidor esté funcionando y sea accesible desde tu dispositivo. Por seguridad, solo conéctate a servidores en redes de confianza.
          </Text>
        </View>
      </ScrollView>

      <RemoteServerModal
        visible={showAddModal || !!editingServer}
        onClose={() => {
          setShowAddModal(false);
          setEditingServer(null);
        }}
        server={editingServer || undefined}
        onSave={() => {
          setShowAddModal(false);
          setEditingServer(null);
        }}
      />

      <CustomAlert
        {...alertState}
        onClose={() => setAlertState(initialAlertState)}
      />
    </SafeAreaView>
  );
};

export default RemoteServersScreen;
