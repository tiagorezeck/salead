"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Theme = "light" | "dark";

export function useTheme() {
  // Initialize from document.documentElement class or localStorage so it never resets to light
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    if (document.documentElement.classList.contains("dark")) return "dark";
    const stored = localStorage.getItem("comet_theme");
    if (stored === "dark" || stored === "light") return stored;
    return "dark"; // Default system theme
  });

  // Keep state in sync with external changes or document class
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeFromDom = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    syncThemeFromDom();

    const observer = new MutationObserver(syncThemeFromDom);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Fetch saved user preference from Supabase if logged in
  useEffect(() => {
    async function loadTheme() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('theme')
            .eq('id', user.id)
            .single();
          
          if (data?.theme === "dark" || data?.theme === "light") {
            setTheme(data.theme as Theme);
            if (data.theme === "dark") {
              document.documentElement.classList.add("dark");
              localStorage.setItem("comet_theme", "dark");
            } else {
              document.documentElement.classList.remove("dark");
              localStorage.setItem("comet_theme", "light");
            }
          }
        }
      } catch (err) {
        console.warn("Could not load user theme from profile:", err);
      }
    }
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const currentIsDark = document.documentElement.classList.contains("dark");
    const next: Theme = currentIsDark ? "light" : "dark";
    setTheme(next);
    
    if (next === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("comet_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("comet_theme", "light");
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ theme: next }).eq('id', user.id);
      }
    } catch {}
  };

  return { theme, toggleTheme };
}
