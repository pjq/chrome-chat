# Web Content Chat & Markdown Extension

A Chrome extension that enables you to chat with web page content using LLMs and convert pages to markdown.

## Features

- **Chat with Web Content**: Extract and chat about any web page using LLMs
- **Multiple LLM Providers**: Support for OpenRouter and OpenAI-compatible APIs
- **Markdown Export**: Convert web pages to markdown and download
- **Side Panel UI**: Modern Chrome side panel interface
- **Content Extraction**: Uses Mozilla's Readability algorithm for clean content extraction

## Installation

### Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Load extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Production Build

```bash
npm run build
```

The extension will be built to the `dist` folder.

## Usage

1. **Configure Settings**:
   - Click the extension icon to open the side panel
   - Click the settings icon (gear)
   - Enter your API key and configure your LLM provider
   - Choose your preferred model
   - Customize the system prompt if desired

2. **Chat with Page Content**:
   - Navigate to any web page
   - Open the side panel
   - The extension will automatically extract the main content
   - Start asking questions about the page in the chat interface

3. **Download as Markdown**:
   - Click the "Download as Markdown" button at the bottom
   - The page content will be converted and downloaded as a .md file

## Configuration

### Supported LLM Providers

- **OpenRouter**: Access to multiple LLM models (OpenAI, Anthropic, Google, Meta, etc.)
  - Get API key: https://openrouter.ai/keys
  - Default endpoint: `https://openrouter.ai/api/v1/chat/completions`

- **OpenAI Compatible**: Any API that follows the OpenAI chat completions format
  - Examples: OpenAI, Azure OpenAI, LocalAI, etc.
  - Default endpoint: `https://api.openai.com/v1/chat/completions`

### Settings

- **Provider**: Choose between OpenRouter or OpenAI Compatible API
- **API Endpoint**: Base URL for the API
- **API Key**: Your authentication key
- **Model**: The LLM model to use (varies by provider)
- **System Prompt**: Instructions for how the assistant should behave

## Architecture

```
Side Panel (React) ←→ Background Service Worker ←→ Content Script
     ↓                         ↓                           ↓
  Chat UI              LLM API Calls              Page Content Extraction
  Settings             Message Routing            (Readability)
  Markdown DL          Storage Management
```

## Technology Stack

- **Build**: Vite + @crxjs/vite-plugin
- **Framework**: React 18 + TypeScript
- **UI**: Tailwind CSS
- **State**: Zustand
- **Content Extraction**: @mozilla/readability
- **Markdown**: Turndown
- **Chrome API**: Manifest V3 with Side Panel API

## Development

### Project Structure

```
src/
├── background/          # Service worker
│   ├── index.ts
│   ├── messageHandler.ts
│   └── llmService.ts
├── content/            # Content script
│   ├── index.ts
│   └── contentExtractor.ts
├── sidepanel/          # React UI
│   ├── App.tsx
│   ├── components/
│   ├── hooks/
│   └── store/
└── shared/             # Shared code
    ├── types/
    ├── utils/
    └── constants/
```

### Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Security

- API keys are stored locally in `chrome.storage.local` (not synced)
- All API calls are made from the background service worker
- Content is sanitized using Readability before processing
- HTTPS is required for all API endpoints

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
