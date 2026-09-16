import { useEffect, useState, useRef, useCallback } from 'react';
import {
  getDriveConfig,
  fetchFromGoogleDrive,
  pushToGoogleDrive,
  saveDriveConfig,
  type DriveConfig,
} from '@/services/googleDriveDatabaseService';

export function useDriveAutoSync<T extends object>(
  currentState: T,
  onDataLoaded: (newState: T) => void
) {
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [config, setConfig] = useState<DriveConfig>(getDriveConfig());
  
  const isSyncingRef = useRef(false);
  const lastStateJsonRef = useRef<string>('');
  const currentStateRef = useRef<T>(currentState);

  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  // Escuta atualizações de configuração
  useEffect(() => {
    const handleConfigUpdate = () => {
      setConfig(getDriveConfig());
    };
    window.addEventListener('salead_drive_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('salead_drive_config_updated', handleConfigUpdate);
  }, []);

  // Polling em background a cada 30 segundos com backoff em caso de erro
  const consecutiveErrorsRef = useRef(0);

  const fetchLatest = useCallback(async (isManual = false) => {
    const cfg = getDriveConfig();
    if (!cfg.webappUrl || (!cfg.autoSync && !isManual) || isSyncingRef.current) return;

    // Se houver erros consecutivos, limita tentativas em background
    if (!isManual && consecutiveErrorsRef.current > 3) {
      return;
    }

    try {
      isSyncingRef.current = true;
      setSyncState('syncing');
      const remoteData = await fetchFromGoogleDrive<T>(cfg.webappUrl);
      if (remoteData && typeof remoteData === 'object') {
        const remoteJson = JSON.stringify(remoteData);
        if (remoteJson !== lastStateJsonRef.current) {
          lastStateJsonRef.current = remoteJson;
          onDataLoaded(remoteData);
        }
        setSyncState('synced');
        setLastSyncTime(new Date());
        consecutiveErrorsRef.current = 0;
      } else {
        setSyncState('synced');
        consecutiveErrorsRef.current = 0;
      }
    } catch {
      consecutiveErrorsRef.current += 1;
      setSyncState('offline');
    } finally {
      isSyncingRef.current = false;
    }
  }, [onDataLoaded]);

  useEffect(() => {
    fetchLatest();
    // Aumenta intervalo para 30s para evitar flood de rede e logs excessivos
    const interval = setInterval(() => {
      fetchLatest(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLatest]);

  // Debounced auto-save quando o estado local mudar
  useEffect(() => {
    const cfg = getDriveConfig();
    if (!cfg.webappUrl || !cfg.autoSync) return;

    const currentJson = JSON.stringify(currentState);
    if (!currentJson || currentJson === '{}' || currentJson === lastStateJsonRef.current) return;

    const timeout = setTimeout(async () => {
      if (isSyncingRef.current) return;
      lastStateJsonRef.current = currentJson;
      setSyncState('syncing');
      try {
        await pushToGoogleDrive(cfg.webappUrl, currentState);
        setSyncState('synced');
        setLastSyncTime(new Date());
      } catch {
        setSyncState('error');
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [currentState]);

  const forceSync = useCallback(async () => {
    const cfg = getDriveConfig();
    if (!cfg.webappUrl) throw new Error("Configure a URL do Google Apps Script primeiro.");
    setSyncState('syncing');
    try {
      if (currentStateRef.current && Object.keys(currentStateRef.current).length > 0) {
        await pushToGoogleDrive(cfg.webappUrl, currentStateRef.current);
      }
      await fetchLatest(true);
      setSyncState('synced');
      setLastSyncTime(new Date());
    } catch (err: any) {
      setSyncState('error');
      throw err;
    }
  }, [fetchLatest]);

  return {
    syncState,
    lastSyncTime,
    forceSync,
    config,
    isConfigured: Boolean(config.webappUrl)
  };
}
