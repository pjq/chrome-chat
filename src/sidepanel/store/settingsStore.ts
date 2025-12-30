import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMSettings } from '@/shared/types/llm';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import { MessageType } from '@/shared/types/messages';

interface SettingsState {
  settings: LLMSettings;
  isLoading: boolean;
  error: string | null;

  updateSettings: (settings: Partial<LLMSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      /**
       * Update settings and persist to chrome.storage
       */
      updateSettings: async (updates: Partial<LLMSettings>) => {
        set({ isLoading: true, error: null });

        try {
          const newSettings = { ...get().settings, ...updates };

          // Update in chrome.storage via background script
          await chrome.runtime.sendMessage({
            type: MessageType.UPDATE_SETTINGS,
            settings: newSettings,
          });

          set({ settings: newSettings, isLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to update settings';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Load settings from chrome.storage
       */
      loadSettings: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await chrome.runtime.sendMessage({
            type: MessageType.GET_SETTINGS,
          });

          if (response.settings) {
            set({ settings: response.settings, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to load settings';
          set({ error: errorMessage, isLoading: false });
        }
      },

      /**
       * Reset settings to defaults
       */
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS, error: null });
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
