// Internationalization module for chrome-chat

// Type definition for our translations
export interface TranslationKeys {
  'app.title': string;
  'app.description': string;
  'components.input.placeholder': string;
  'components.input.error': string;
  'components.button.send': string;
  'components.button.cancel': string;
  'components.button.save': string;
  'components.button.saveChanges': string;
  'components.button.clearCache': string;
  'components.button.resetApp': string;
  'components.button.yesClearHistory': string;
  'components.button.yesResetEverything': string;
  'components.button.attachImage': string;
  'components.chatInput.placeholder': string;
  'components.chatInput.instructions': string;
  'components.chatMessage.copied': string;
  'components.chatMessage.copyFailed': string;
  'components.chatMessage.imageAlt': string;
  'components.settings.title': string;
  'components.settings.instructionsLabel': string;
  'components.settings.instructionsPlaceholder': string;
  'components.settings.dataManagement.title': string;
  'components.settings.dataManagement.description': string;
  'components.settings.dataManagement.chatHistory.title': string;
  'components.settings.dataManagement.chatHistory.sessionsCount': string;
  'components.settings.dataManagement.chatHistory.confirmClear.title': string;
  'components.settings.dataManagement.chatHistory.confirmClear.message': string;
  'components.settings.dataManagement.chatHistory.confirmClear.confirmButton': string;
  'components.settings.dataManagement.resetApp.title': string;
  'components.settings.dataManagement.resetApp.description': string;
  'components.settings.dataManagement.resetApp.confirmClear.title': string;
  'components.settings.dataManagement.resetApp.confirmClear.message': string;
  'components.settings.dataManagement.resetApp.confirmClear.items.0': string;
  'components.settings.dataManagement.resetApp.confirmClear.items.1': string;
  'components.settings.dataManagement.resetApp.confirmClear.items.2': string;
  'components.settings.dataManagement.resetApp.confirmClear.items.3': string;
  'components.settings.dataManagement.resetApp.confirmClear.warning': string;
  'components.settings.dataManagement.resetApp.confirmClear.confirmButton': string;
  'components.spinner.loading': string;
  'errors.generic': string;
  'errors.saveFailed': string;
  'errors.loadFailed': string;
  'notifications.saved': string;
  'notifications.cleared': string;
}

// Supported locales
const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// Current locale state
let currentLocale: SupportedLocale = 'en';
let translations: Record<string, string> = {};

// Helper function to flatten nested objects
function flattenObject(obj: any, prefix: string = ''): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }

  return flattened;
}

// Function to load locale dynamically
async function loadLocale(locale: SupportedLocale): Promise<Record<string, string>> {
  try {
    // Dynamically import the locale file
    const localeModule = await import(`../locales/${locale}.json`);
    return flattenObject(localeModule.default);
  } catch (error) {
    console.warn(`Locale file for '${locale}' not found, falling back to 'en'`);
    
    // Fallback to English if requested locale doesn't exist
    if (locale !== 'en') {
      try {
        const fallbackModule = await import(`../locales/en.json`);
        return flattenObject(fallbackModule.default);
      } catch (fallbackError) {
        console.error('Fallback to English failed', fallbackError);
        return {};
      }
    }
    
    return {};
  }
}

// Initialize with the user's preferred language
async function initializeLocale() {
  // Determine the best locale based on browser preferences
  const browserLocales = navigator.languages || [navigator.language];
  let detectedLocale: SupportedLocale | undefined;
  
  for (const locale of browserLocales) {
    const primaryLocale = locale.split('-')[0].split('_')[0]; // Extract primary language code
    
    if (SUPPORTED_LOCALES.includes(primaryLocale as SupportedLocale)) {
      detectedLocale = primaryLocale as SupportedLocale;
      break;
    }
  }
  
  // Default to 'en' if no supported locale is detected
  currentLocale = detectedLocale || 'en';
  
  // Load the translations for the detected locale
  translations = await loadLocale(currentLocale);
}

// Initialize locale detection on module load
initializeLocale().catch(console.error);

// Translation function
export function t<T extends keyof TranslationKeys>(
  key: T,
  params?: Record<string, any>
): TranslationKeys[T] {
  let translation = translations[key] || key;

  // Simple parameter replacement
  if (params) {
    for (const param in params) {
      // Handle pluralization
      if (param === 'count' && translation.includes('{count, plural,')) {
        const count = params[param];
        const pluralPattern = /\{count, plural, one \{([^}]*)\} other \{([^}]*)\}\}/;
        const match = translation.match(pluralPattern);
        
        if (match) {
          const oneForm = match[1];
          const otherForm = match[2];
          translation = translation.replace(
            pluralPattern,
            count === 1 ? oneForm : otherForm
          );
        }
      }
      
      // Simple parameter replacement
      translation = translation.replace(`{${param}}`, params[param]);
    }
  }

  return translation as TranslationKeys[T];
}

// Function to add additional locales
export function addLocale(locale: string, localeTranslations: Record<string, string>) {
  // Extend the translations object with new locale data
  Object.assign(translations, flattenObject(localeTranslations));
}

// Function to get current locale
export function getCurrentLocale(): SupportedLocale {
  return currentLocale;
}

// Function to set locale and reload translations
export async function setLocale(locale: string): Promise<void> {
  if (SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    currentLocale = locale as SupportedLocale;
    translations = await loadLocale(currentLocale);
  } else {
    console.warn(`Locale '${locale}' is not supported. Falling back to 'en'.`);
    currentLocale = 'en';
    translations = await loadLocale('en');
  }
}

// Function to get all supported locales
export function getSupportedLocales(): readonly SupportedLocale[] {
  return [...SUPPORTED_LOCALES];
}