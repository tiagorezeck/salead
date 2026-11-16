"use client";

import { useState, useEffect } from "react";
import {
  getDriveConfig,
  initializeSharedDriveConfig,
  testDriveConnection,
  type DriveConfig,
} from "@/services/googleDriveDatabaseService";
import { cloudStore } from "@/services/cloudStorageService";

export function useDriveSync() {
  const [config, setConfig] = useState<DriveConfig>(getDriveConfig());
  const [cloudStatus, setCloudStatus] = useState(cloudStore.getStatus());
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    initializeSharedDriveConfig()
      .then((cfg) => {
        if (cfg && cfg.webappUrl) {
          setConfig(cfg);
        }
      })
      .catch(() => {});

    const unsubscribeCloud = cloudStore.subscribe(() => {
      setCloudStatus(cloudStore.getStatus());
      setConfig(getDriveConfig());
    });

    const hO = () => setIsOnline(true);
    const hF = () => setIsOnline(false);
    window.addEventListener("online", hO);
    window.addEventListener("offline", hF);

    const handleCfgUpdate = (e: any) => {
      setConfig(e.detail || getDriveConfig());
      setCloudStatus(cloudStore.getStatus());
    };
    window.addEventListener("salead_drive_config_updated", handleCfgUpdate);

    return () => {
      unsubscribeCloud();
      window.removeEventListener("online", hO);
      window.removeEventListener("offline", hF);
      window.removeEventListener("salead_drive_config_updated", handleCfgUpdate);
    };
  }, []);

  const webappUrl = config.webappUrl || cloudStatus.webappUrl;
  const isConfigured = Boolean(webappUrl);
  const syncStatus = !isConfigured
    ? "idle"
    : !isOnline
    ? "offline"
    : cloudStatus.syncing || cloudStatus.bootstrapping
    ? "syncing"
    : cloudStatus.lastError
    ? "error"
    : config.syncStatus || "synced";

  const testConnection = async () => {
    if (!webappUrl) return false;
    try {
      const res = await testDriveConnection(webappUrl, config.apiToken);
      return Boolean(res?.success);
    } catch {
      return false;
    }
  };

  return {
    syncStatus,
    lastSync: cloudStatus.lastSyncTimestamp
      ? new Date(cloudStatus.lastSyncTimestamp)
      : config.lastSyncTimestamp
      ? new Date(config.lastSyncTimestamp)
      : null,
    isOnline,
    isConfigured,
    isConnected: isConfigured && syncStatus !== "error",
    webappUrl,
    config,
    cloudStatus,
    spreadsheetUrl: config.spreadsheetUrl || cloudStatus.spreadsheetUrl,
    spreadsheetName: config.spreadsheetName || cloudStatus.spreadsheetName,
    testConnection,
  };
}
