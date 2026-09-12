// src/components/marketing/visual-canvas/useLPVisualHistory.ts

import { useState, useCallback, useEffect, useRef } from "react";

export function useLPVisualHistory<T>(initialPresent: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);
  const isInternalUpdate = useRef(false);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Atualização com gravação de histórico
  const set = useCallback((newPresentOrFn: T | ((prev: T) => T), recordHistory = true) => {
    setPresent((prev) => {
      const next = typeof newPresentOrFn === "function" ? (newPresentOrFn as any)(prev) : newPresentOrFn;
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return prev;
      }
      if (recordHistory) {
        setPast((oldPast) => [...oldPast.slice(-30), prev]); // mantém últimos 30 snapshots
        setFuture([]);
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((oldFuture) => [present, ...oldFuture]);
    setPresent(previous);
  }, [canUndo, past, present]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast((oldPast) => [...oldPast, present]);
    setFuture(newFuture);
    setPresent(next);
  }, [canRedo, future, present]);

  // Listener global para atalhos de teclado Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não intercepta se o usuário estiver digitando dentro de um input ou textarea nativo
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (modifier && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return {
    state: present,
    setState: set,
    undo,
    redo,
    canUndo,
    canRedo,
    pastCount: past.length,
    futureCount: future.length,
  };
}
