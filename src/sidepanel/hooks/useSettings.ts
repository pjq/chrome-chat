import { useSettingsStore } from '../store/settingsStore';

/**
 * Hook wrapper for settings store
 * Provides a cleaner API for components
 */
export function useSettings() {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    loadSettings,
    resetSettings,
  } = useSettingsStore();

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    loadSettings,
    resetSettings,
  };
}
