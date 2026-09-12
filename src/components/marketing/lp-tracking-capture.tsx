"use client";

import { useEffect } from 'react';

export function LPTrackingCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const trackingData: Record<string, string> = {};

    const keys = [
      'src', 'cmp', 'mid', 
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'
    ];

    let hasData = false;
    keys.forEach(key => {
      const val = params.get(key);
      if (val) {
        trackingData[key] = val;
        hasData = true;
      }
    });

    if (hasData) {
      sessionStorage.setItem('comet_lp_tracking', JSON.stringify({
        ...trackingData,
        capturedAt: new Date().toISOString(),
        referrer: document.referrer
      }));
    }
  }, []);

  return null;
}

export function getStoredTracking() {
  if (typeof window === 'undefined') return null;
  const saved = sessionStorage.getItem('comet_lp_tracking');
  return saved ? JSON.parse(saved) : null;
}