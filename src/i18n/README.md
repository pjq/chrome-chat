# Internationalization (i18n) System

This document describes the internationalization system implemented in chrome-chat.

## Overview

The i18n system allows for easy translation of UI text strings into multiple languages. It provides a centralized way to manage all text content in the application.

## Structure

- `en.json`: Contains English translations organized by component
- `i18n.ts`: Core translation functions and utilities
- `useTranslation.ts`: React hook to access translations
- `README.md`: This documentation

## Usage

### In Components

To use translations in components:

```typescript
import { useTranslation } from '@/i18n/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('app.description')}</p>
    </div>
  );
}
```

### With Parameters

To use translations with dynamic parameters:

```typescript
// For simple parameter replacement
const message = t('components.settings.dataManagement.chatHistory.sessionsCount', { 
  count: sessions.length 
});

// Pluralization is supported using ICU syntax
// Example: "You have {count} {count, plural, one {message} other {messages}}"
```

### Adding Translated Buttons

The Button component supports translation keys:

```typescript
<Button translationKey="components.button.send">Send</Button>
```

## Adding New Languages

To add a new language:

1. Create a new locale file (e.g., `fr.json`, `es.json`) in the `src/locales/` directory
2. Copy the structure from `en.json` and translate the values
3. Update the i18n system to load the new locale

## String Keys Convention

String keys follow a dot notation hierarchy:
- `component.section.property` (e.g., `components.button.send`)
- This helps organize translations by UI component and purpose

## Best Practices

- Use descriptive keys that indicate where the text appears
- Keep translations concise but clear
- Use ICU message syntax for pluralization
- Test with various languages to ensure proper display