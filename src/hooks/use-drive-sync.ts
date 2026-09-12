"use client";

import { useState, useEffect } from 'react';
import { getDriveConfig, initializeSharedDriveConfig, pushToGoogleDrive, type DriveConfig } from '@/services/googleDriveDatabaseService';

export function useDriveSync() {
  const [config, setConfig] = useState<DriveConfig>(getDriveConfig());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inicializa / busca configuração centralizada no servidor para sincronizar todos os navegadores
    initializeSharedDriveConfig().then(cfg => {
      if (cfg && cfg.webappUrl) {
        setConfig(cfg);
      }
    }).catch(() => {});

    const hO = () => setIsOnline(true);
    const hF = () => setIsOnline(false);
    window.addEventListener('online', hO);
    window.addEventListener('offline', hF);
    
    const handleCfgUpdate = (e: any) => {
      setConfig(e.detail || getDriveConfig());
    };
    window.addEventListener('salead_drive_config_updated', handleCfgUpdate);

    return () => { 
      window.removeEventListener('online', hO); 
      window.removeEventListener('offline', hF);
      window.removeEventListener('salead_drive_config_updated', handleCfgUpdate);
    };
  }, []);

  const isConfigured = Boolean(config.webappUrl);
  const syncStatus = !isConfigured ? 'idle' : (!isOnline ? 'offline' : (config.syncStatus || 'synced'));

  return {
    syncStatus,
    lastSync: config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp) : null,
    isOnline,
    isConfigured,
    config,
    spreadsheetUrl: config.spreadsheetUrl,
    spreadsheetName: config.spreadsheetName
  };
}
