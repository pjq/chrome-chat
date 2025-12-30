# Chat with Pages - Agent Guide

This document provides context for AI assistants (like Claude) working on this Chrome extension codebase.

## Project Overview

**Chat with Pages** is a Chrome extension that allows users to chat with any webpage using AI. It extracts page content, enables natural language conversations about the content, and provides markdown export capabilities.

**Key Features:**
- Chat with webpage content using AI (OpenAI Compatible / OpenRouter)
- Multiple chat sessions with persistent history
- Streaming responses for better UX
- Retry failed or regenerate responses
- Copy messages to clipboard
- Markdown rendering with syntax highlighting
- Export pages to markdown format

## Architecture

### Chrome Extension Structure (Manifest V3)

```
├── src/
│   ├── background/          # Service worker
│   │   ├── index.ts         # Message routing, port handling
│   │   ├── llmService.ts    # Streaming API calls (SSE)
│   │   └── messageHandler.ts
│   ├── content/             # Content scripts
│   │   ├── index.ts         # Message listener
│   │   └── contentExtractor.ts  # @mozilla/readability
│   ├── sidepanel/           # React UI (main interface)
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── store/           # Zustand state management
│   └── shared/              # Shared types and utils
│       ├── types/
│       ├── constants/
│       └── utils/
└── public/
    ├── manifest.json        # Chrome extension manifest
    └── icons/
```

### Communication Flow

1. **User opens side panel** → Side panel loads React app
2. **Content extraction** → Side panel → Content script → Readability → Side panel
3. **Chat message** → Side panel → Background worker → LLM API (streaming) → Side panel
4. **Session storage** → Zustand → chrome.storage.local (persistent)

### Key Technologies

- **React 18** + **TypeScript** - UI framework
- **Vite** + **@crxjs/vite-plugin** - Build system optimized for Chrome extensions
- **Tailwind CSS** + **@tailwindcss/typography** - Styling
- **Zustand** - State management with persistence middleware
- **react-markdown** + **remark-gfm** + **rehype-highlight** - Markdown rendering
- **@mozilla/readability** - Content extraction (Firefox reader mode algorithm)
- **turndown** - HTML to Markdown conversion

## State Management

### chatStore.ts (Session-based architecture)

```typescript
interface ChatSession {
  id: string;              // Unique session ID
  title: string;           // Page title
  messages: ChatMessage[]; // Conversation history
  content: ExtractedContent | null;
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  // ... methods
}
```

**Key patterns:**
- One session per webpage URL
- Sessions persisted to chrome.storage.local
- Functional state updates to avoid race conditions: `setState((prev) => ({ ...prev, field }))`

### settingsStore.ts

Stores LLM configuration:
- provider (openai_compatible | openrouter)
- apiEndpoint
- apiKey
- model
- systemPrompt

## Important Patterns

### 1. Chrome Extension Message Passing

**One-time messages** (usePageContent.ts):
```typescript
chrome.tabs.sendMessage(tabId, { type: MessageType.EXTRACT_CONTENT })
```

**Long-lived connections for streaming** (useChat.ts):
```typescript
const port = chrome.runtime.connect({ name: 'chat-stream' });
port.onMessage.addListener((response) => { /* handle chunks */ });
port.postMessage({ type: MessageType.SEND_CHAT_MESSAGE, ... });
```

### 2. Streaming Implementation

**Background worker** (background/llmService.ts):
- Fetches from LLM API with `stream: true`
- Reads Server-Sent Events (SSE) format
- Parses `data: ` prefixed JSON chunks
- Forwards chunks via port to UI

**UI** (useChat.ts):
- Creates placeholder assistant message
- Updates message content in real-time as chunks arrive
- Uses `updateLastMessage()` to modify streaming message

### 3. State Update Pattern

**Always use functional updates** to avoid race conditions:
```typescript
// ❌ BAD - uses stale state
setFormData({ ...formData, provider });
setFormData({ ...formData, apiEndpoint }); // Overwrites provider!

// ✅ GOOD - uses latest state
setFormData((prev) => ({ ...prev, provider }));
setFormData((prev) => ({ ...prev, apiEndpoint }));
```

### 4. Error Handling in Messages

Messages can have an `error` field:
```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  error?: string;  // Stores error message if failed
}
```

## UI/UX Guidelines

### User-Friendly Language

The extension uses **plain, friendly language** instead of technical jargon:
- "AI Service" not "LLM Provider"
- "Access Key" not "API Key"
- "Service URL" not "API Endpoint"
- "Reading this page..." not "Extracting page content..."
- "Oops!" not "Error:"
- "Try this:" not "Quick fixes:"

### Message Styling

- **User messages**: Gray background (`bg-gray-100`)
- **AI messages**: White background with shadow (`bg-white shadow-sm`)
- **Error messages**: Red background (`bg-red-50 border-red-300`)
- **Message width**: `max-w-[90%]` to show more content
- **Tables**: Wrapped in `overflow-x-auto` for horizontal scrolling

### Copy & Retry Features

- **Copy button**: Appears on hover, uses navigator.clipboard API
- **Retry button**: Only on last assistant message, replays conversation history

## Common Tasks

### Adding a New Component

1. Create component in appropriate directory (`src/sidepanel/components/`)
2. Use TypeScript with proper interfaces
3. Import from `@/shared/` for shared types/utils (path alias configured)
4. Follow existing patterns (functional components, hooks)

### Adding a New Message Type

1. Add enum to `src/shared/types/messages.ts`
2. Create interface extending `BaseMessage`
3. Add to `ExtensionMessage` union type
4. Handle in `background/messageHandler.ts` or content script

### Modifying LLM Settings

1. Update `LLMSettings` interface in `src/shared/types/llm.ts`
2. Update `DEFAULT_SETTINGS` in `src/shared/constants/index.ts`
3. Add UI component in `src/sidepanel/components/Settings/`
4. Update `SettingsPanel.tsx` to include new field

### Adding New AI Provider

1. Add to `LLMProvider` enum in `src/shared/types/llm.ts`
2. Add default endpoint to `DEFAULT_ENDPOINTS`
3. Add popular models to `POPULAR_MODELS`
4. Update provider dropdown in `LLMProviderSettings.tsx`
5. Test API compatibility in `background/llmService.ts`

## Build and Development

### Commands
```bash
npm run dev      # Development with HMR
npm run build    # Production build
npm run preview  # Preview production build
```

### Build Output
```
dist/
├── manifest.json           # Processed manifest
├── src/sidepanel/index.html
├── assets/                 # Bundled JS/CSS
├── icons/
└── service-worker-loader.js
```

### Loading Extension
1. Build: `npm run build`
2. Chrome → Extensions → Developer mode → Load unpacked
3. Select `dist/` folder

## Testing Considerations

### Manual Testing Checklist

**Content Extraction:**
- [ ] Works on regular HTTP/HTTPS pages
- [ ] Shows friendly error on chrome:// pages
- [ ] Handles pages with no readable content
- [ ] Retry works after content script loads

**Chat Functionality:**
- [ ] Streaming displays in real-time
- [ ] Messages persist across browser restarts
- [ ] Copy button copies full markdown
- [ ] Retry regenerates last response
- [ ] Error messages display properly

**Session Management:**
- [ ] New page creates new session
- [ ] Switching sessions works correctly
- [ ] Deleting session removes from storage
- [ ] Session list shows recent first

**Settings:**
- [ ] Provider switch updates endpoint
- [ ] Model fetch works with valid credentials
- [ ] Settings persist across restarts
- [ ] Invalid credentials show friendly errors

## Code Quality

### TypeScript
- Use strict types, avoid `any` (except for react-markdown component props)
- Define interfaces for all data structures
- Use discriminated unions for message types

### React
- Functional components only
- Use hooks (useState, useEffect, useRef)
- Custom hooks in `hooks/` directory
- Proper dependency arrays in useEffect

### Styling
- Tailwind CSS utility classes
- Avoid inline styles
- Use prose classes for markdown content
- Consistent spacing and colors

## Common Pitfalls

1. **Chrome API context**: Background worker can't access DOM, content scripts can't access chrome.storage directly
2. **Message passing**: Always check if port/tab exists before sending messages
3. **State updates**: Use functional updates for Zustand to avoid race conditions
4. **Streaming**: Buffer incomplete SSE lines, handle disconnect properly
5. **Content script timing**: May not be ready immediately, add retry logic
6. **Storage limits**: chrome.storage.local has quota limits, monitor usage

## Git Workflow

- Main branch: `main`
- Commit messages: Clear, descriptive (use provided template in commits)
- Always include Claude co-author in commits

## Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Future Enhancements

Potential areas for improvement:
- Code splitting to reduce bundle size (currently 525KB)
- Image support in content extraction
- Voice input/output
- Multiple pages in one conversation
- Custom system prompts per session
- Export chat history
- Search within chat history
- Keyboard shortcuts
