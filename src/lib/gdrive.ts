"use client";

import { toast } from "sonner";

export interface DriveConfig {
  clientId: string;
  apiKey: string;
  folderId: string;
  connected: boolean;
}

const DRIVE_CONFIG_KEY = "comet_gdrive_config";

export async function getDriveConfig(): Promise<DriveConfig> {
  if (typeof window === "undefined") {
    return { clientId: "", apiKey: "", folderId: "", connected: false };
  }
  try {
    const raw = localStorage.getItem(DRIVE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { clientId: "", apiKey: "", folderId: "", connected: false };
}

export async function saveDriveConfig(config: DriveConfig) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(DRIVE_CONFIG_KEY, JSON.stringify(config));
    } catch {}
  }
}

// Simulação de conexão (OAuth real exigiria redirecionamento)
export async function connectGoogleDrive(config: DriveConfig): Promise<string> {
  console.log("[Google Drive] Conectando com Client ID:", config.clientId);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return "mock_active_token_" + Date.now();
}

export async function createFolderStructure(config: DriveConfig, token: string): Promise<string> {
  console.log("[Google Drive] Criando pastas usando token:", token);
  await new Promise(resolve => setTimeout(resolve, 1200));
  return "folder_id_" + Math.random().toString(36).substring(7);
}

export async function executeBackupToDrive(data: any, folderId: string, token: string): Promise<string> {
  console.log("[Google Drive] Executando backup na pasta:", folderId);
  await new Promise(resolve => setTimeout(resolve, 2000));
  const fileName = `COMET_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  return fileName;
}

export async function restoreBackupFromDrive(folderId: string, token: string): Promise<any> {
  console.log("[Google Drive] Buscando backups na pasta:", folderId);
  await new Promise(resolve => setTimeout(resolve, 1800));
  // Retorna nulo no mock para não sobrescrever dados reais sem intenção
  return { mock: true };
}

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size: number;
}

export async function listDriveBackups(folderId: string, token: string): Promise<DriveBackupFile[]> {
  console.log("[Google Drive] Listando backups na pasta:", folderId);
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Mock data - em produção faria chamada real para a API do Drive
  return [
    {
      id: "backup_1",
      name: "COMET_BACKUP_2024-01-15T10-30-00.json",
      createdTime: "2024-01-15T10:30:00.000Z",
      size: 245760
    },
    {
      id: "backup_2",
      name: "COMET_BACKUP_2024-01-14T10-30-00.json",
      createdTime: "2024-01-14T10:30:00.000Z",
      size: 238912
    }
  ];
}

export async function deleteDriveBackup(fileId: string, token: string): Promise<void> {
  console.log("[Google Drive] Excluindo backup:", fileId);
  await new Promise(resolve => setTimeout(resolve, 800));
  // Em produção faria DELETE na API do Drive
}