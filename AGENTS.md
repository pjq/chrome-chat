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
- MCP (Model Context Protocol) server support for extending AI capabilities

## Architecture

### Chrome Extension Structure (Manifest V3)

```
├── src/
│   ├── background/          # Service worker
│   │   ├── index.ts         # Message routing, port handling
│   │   ├── llmService.ts    # Streaming API calls (SSE)
│   │   ├── mcpService.ts    # MCP server connection & tool calling
│   │   └── messageHandler.ts
│   ├── content/             # Content scripts
│   │   ├── index.ts         # Message listener
│   │   └── contentExtractor.ts  # @mozilla/readability + form extraction
│   ├── sidepanel/           # React UI (main interface)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Settings/
│   │   │   │   ├── MCPSettings.tsx  # MCP server configuration UI
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useMCPServers.ts     # MCP server state management
│   │   │   └── ...
│   │   └── store/           # Zustand state management
│   └── shared/              # Shared types and utils
│       ├── types/
│       │   ├── mcp.ts       # MCP server & tool types
│       │   └── ...
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

**MCP Settings:**
- servers: Array of MCP server configurations
- enabledByDefault: Whether MCP tools are enabled by default
- toolCallingMode: 'native' (API tools param) or 'prompt' (system prompt + regex parsing)

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

### 5. MCP (Model Context Protocol) Integration

**MCP Service** (background/mcpService.ts):
- Manages connections to remote MCP servers via HTTP/SSE
- Supports auto-detection of transport type (StreamableHTTP vs SSE)
- Lists available tools and resources from connected servers
- Handles tool invocations with timeout support
- Maintains server state (connected, disconnected, connecting, error)

**Tool Calling Modes:**
1. **Prompt Mode** (default): Tools are injected into system prompt, AI outputs XML tags, regex parser extracts calls
2. **Native Mode**: Tools passed via API's native tools parameter (requires API support)

**MCP Server Configuration:**
```typescript
interface MCPServer {
  id: string;
  name: string;
  url: string;                      // HTTP/SSE endpoint URL
  enabled: boolean;
  description?: string;
  headers?: Record<string, string>; // Custom headers (auth tokens)
  transportType?: 'auto' | 'streamableHttp' | 'sse';
  timeout?: number;                 // Tool call timeout (default: 30s)
}
```

**UI Components:**
- `MCPSettings.tsx`: Server management UI with collapsible tools list
  - Servers displayed with connection status badges
  - Tool count badge when connected
  - Collapsible tools section (collapsed by default)
  - Each tool shows name, description, and expandable parameters
  - Parameter details include type, required status, and descriptions
- `useMCPServers.ts`: Hook for fetching server states, connecting/disconnecting

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

### IMPORTANT: Always Build After Code Changes

**After making ANY code changes, always run the build command:**
```bash
npm run build
```

This ensures:
- TypeScript compilation succeeds
- No build errors are introduced
- The extension can be tested immediately
- Changes are ready for the user to reload in Chrome

Never skip the build step - the user needs the built extension to test your changes!

### Adding a New Component

1. Create component in appropriate directory (`src/sidepanel/components/`)
2. Use TypeScript with proper interfaces
3. Import from `@/shared/` for shared types/utils (path alias configured)
4. Follow existing patterns (functional components, hooks)
5. **Run `npm run build` to verify changes compile correctly**

### Adding a New Message Type

1. Add enum to `src/shared/types/messages.ts`
2. Create interface extending `BaseMessage`
3. Add to `ExtensionMessage` union type
4. Handle in `background/messageHandler.ts` or content script
5. **Run `npm run build` to verify changes compile correctly**

### Modifying LLM Settings

1. Update `LLMSettings` interface in `src/shared/types/llm.ts`
2. Update `DEFAULT_SETTINGS` in `src/shared/constants/index.ts`
3. Add UI component in `src/sidepanel/components/Settings/`
4. Update `SettingsPanel.tsx` to include new field
5. **Run `npm run build` to verify changes compile correctly**

### Adding New AI Provider

1. Add to `LLMProvider` enum in `src/shared/types/llm.ts`
2. Add default endpoint to `DEFAULT_ENDPOINTS`
3. Add popular models to `POPULAR_MODELS`
4. Update provider dropdown in `LLMProviderSettings.tsx`
5. Test API compatibility in `background/llmService.ts`
6. **Run `npm run build` to verify changes compile correctly**

## Build and Development

### Commands
```bash
npm run dev      # Development with HMR
npm run build    # Production build (REQUIRED after every code change)
npm run preview  # Preview production build
```

**CRITICAL: Always run `npm run build` after making code changes!** The user needs the built extension to test. Never skip this step.

### Build Output
```
dist/
├── manifest.json           # Processed manifest
├── src/sidepanel/index.html
├── assets/                 # Bundled JS/CSS
├── icons/
└── service-worker-loader.js
```

### Loading Extension (User Instructions)
1. Build: `npm run build`
2. Chrome → Extensions → Developer mode → Load unpacked
3. Select `dist/` folder
4. After code changes: Build again, then click reload icon in Chrome extensions page

### Development Workflow
1. Make code changes
2. **ALWAYS run `npm run build`** (don't skip this!)
3. Inform user that build is complete
4. User reloads extension in Chrome to test changes

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

**MCP Servers:**
- [ ] Servers can be added/edited/deleted
- [ ] Connection status updates correctly
- [ ] Tools list is collapsible and displays tool count
- [ ] Tool parameters show with correct types and required markers
- [ ] Transport auto-detection works for different server types
- [ ] Custom headers are sent with requests
- [ ] Tool calls timeout after configured duration

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
- Collapsible sections use `<details>` elements with custom CSS for arrow rotation
- Status badges use semantic colors (green=enabled, blue=connected, red=error, yellow=connecting)

## Common Pitfalls

1. **Chrome API context**: Background worker can't access DOM, content scripts can't access chrome.storage directly
2. **Message passing**: Always check if port/tab exists before sending messages
3. **State updates**: Use functional updates for Zustand to avoid race conditions
4. **Streaming**: Buffer incomplete SSE lines, handle disconnect properly
5. **Content script timing**: May not be ready immediately, add retry logic
6. **Storage limits**: chrome.storage.local has quota limits, monitor usage (MAX_SESSIONS = 50)
7. **MCP Transport**: Some servers only support SSE, others only StreamableHTTP - use 'auto' for fallback behavior
8. **Tool Timeouts**: Long-running MCP tools need appropriate timeout configuration (default 30s, max 5min)

## Git Workflow

- Main branch: `main`
- Commit messages: Clear, descriptive (use provided template in commits)
- Always include Claude co-author in commits

## Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Model Context Protocol (MCP) Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Recent Improvements (v1.1.2)

**Content Extraction:**
- Enhanced form field extraction (textareas, inputs, selects)
- Smart label detection with 7 methods including parent traversal
- Better support for web apps (GitHub, dashboards, documentation sites)
- Fallback extraction with 15+ content selectors
- Minimum content length validation (500 chars)

**Storage Management:**
- Automatic session cleanup (MAX_SESSIONS = 50)
- QuotaExceededError handling with emergency recovery
- Custom storage wrapper for robust persistence

**UI Improvements:**
- Auto-growing input box (2-10 rows with scrolling)
- Copy button for page content with visual feedback
- Fixed blank screen on refresh
- MCP servers list with collapsible tools display

**MCP Integration (v1.1.0):**
- Full MCP server support with HTTP/SSE transports
- Tool calling via prompt mode and native mode
- Server configuration UI with status badges
- Custom headers and timeout configuration
- Collapsible tools list with parameter details

## Future Enhancements

Potential areas for improvement:
- Code splitting to reduce bundle size (currently ~544KB)
- Image support in content extraction
- Voice input/output
- Multiple pages in one conversation
- Custom system prompts per session
- Export chat history
- Search within chat history
- Keyboard shortcuts
- MCP resources support (currently only tools are supported)
