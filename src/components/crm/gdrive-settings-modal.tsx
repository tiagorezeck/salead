"use client";

import React from "react";
import { GoogleDriveSyncModal } from "./google-drive-sync-modal";

interface GDriveSettingsModalProps {
  onClose: () => void;
}

export function GDriveSettingsModal({ onClose }: GDriveSettingsModalProps) {
  return <GoogleDriveSyncModal isOpen={true} onClose={onClose} />;
}
