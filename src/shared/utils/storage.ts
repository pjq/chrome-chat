import { STORAGE_KEYS } from '@/shared/constants';
import type { LLMSettings } from '@/shared/types/llm';

/**
 * Type-safe get from chrome.storage.local
 */
export async function getFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Type-safe set to chrome.storage.local
 */
export async function setToStorage<T>(key: string, value: T): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error(`Error writing to storage (${key}):`, error);
    throw error;
  }
}

/**
 * Get LLM settings from storage
 */
export async function getSettings(): Promise<LLMSettings | null> {
  return getFromStorage<LLMSettings | null>(STORAGE_KEYS.SETTINGS, null);
}

/**
 * Save LLM settings to storage
 */
export async function saveSettings(settings: LLMSettings): Promise<void> {
  return setToStorage(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Clear all storage
 */
export async function clearStorage(): Promise<void> {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
}
