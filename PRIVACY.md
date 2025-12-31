# Privacy Policy for Chat with Pages

**Last Updated: December 31, 2024**

## Overview

Chat with Pages ("the Extension") is committed to protecting your privacy. This privacy policy explains how the Extension handles your data.

## Data Collection and Usage

### Data We Collect Locally

The Extension stores the following data **locally on your device only**:

1. **Chat History**
   - Your conversations with the AI
   - Extracted webpage content from pages you chat about
   - Message timestamps
   - Stored in: Chrome's local storage (not synced)

2. **User Settings**
   - AI service provider selection (OpenAI, OpenRouter, etc.)
   - API endpoint URLs
   - API keys
   - System prompt preferences
   - Model selection
   - Stored in: Chrome's local storage (not synced)

3. **Webpage Content**
   - Title, URL, and readable text content from webpages you actively choose to chat about
   - Only extracted when you open the Extension's side panel
   - Stored temporarily in local storage as part of chat sessions

### Data We Do NOT Collect

- We do **NOT** collect any personal information
- We do **NOT** track your browsing history
- We do **NOT** collect data from webpages unless you actively open the Extension
- We do **NOT** transmit any data to our servers (we don't have any servers)
- We do **NOT** sell or share your data with third parties

## How Your Data is Used

### Local Processing

All data processing happens locally in your browser:
- Chat history is saved locally for your convenience
- Settings are stored locally for personalization
- No data leaves your device except when you send messages to your chosen AI service

### Third-Party AI Services

When you send a chat message:
1. The Extension sends your message and relevant webpage content to **your chosen AI service** (OpenAI, OpenRouter, etc.)
2. This is done using **your own API key**
3. Data transmission happens **directly from your browser** to the AI service
4. We act only as a client interface - we don't intercept or store this data

**Important:** The privacy policies of your chosen AI service apply to data sent to them:
- OpenAI Privacy Policy: https://openai.com/policies/privacy-policy
- OpenRouter Privacy Policy: https://openrouter.ai/privacy

## Data Storage and Security

### Local Storage Only

- All data is stored using Chrome's `storage.local` API
- Data is **NOT synced** across devices
- Data remains on your device until you:
  - Delete individual chat sessions
  - Clear the Extension's storage
  - Uninstall the Extension

### API Keys

- Your API keys are stored locally on your device
- API keys are **never** transmitted to us
- API keys are only used to authenticate with your chosen AI service
- You have full control to update or delete your API keys at any time

### Security Measures

- API keys are stored in local storage (not synced to cloud)
- All API communications use HTTPS
- No analytics or tracking code is included
- No third-party advertising or tracking services

## User Control and Data Deletion

You have complete control over your data:

### Delete Chat History
- Click the trash icon on individual chat sessions to delete them
- Each deletion removes the conversation and associated webpage content

### Delete All Data
1. Go to `chrome://extensions/`
2. Find "Chat with Pages"
3. Click "Remove" to uninstall and delete all local data

### Clear Settings
- Navigate to Settings in the Extension
- Update or clear your API key and preferences
- Changes take effect immediately

## Permissions Explanation

The Extension requests the following Chrome permissions:

- **activeTab**: To access the current tab's URL and title
- **sidePanel**: To display the chat interface
- **storage**: To save chat history and settings locally
- **scripting**: To extract readable content from webpages
- **host_permissions (<all_urls>)**: To extract content from any webpage you visit

**All permissions are used solely for the Extension's core functionality.**

## Children's Privacy

The Extension does not knowingly collect information from children under 13. If you are a parent or guardian and believe your child has used the Extension, please contact us.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last Updated" date at the top of this document. Continued use of the Extension after changes constitutes acceptance of the updated policy.

## Data Retention

- Chat history: Retained locally until you delete it
- Settings: Retained locally until you change or delete them
- No server-side data retention (we don't have servers)

## International Users

The Extension operates entirely locally in your browser. Data is only transmitted to AI services based on your configuration and their locations.

## Your Rights

Under various privacy laws (GDPR, CCPA, etc.), you have rights regarding your data:

- **Right to Access**: All your data is accessible through the Extension interface
- **Right to Delete**: You can delete any or all data at any time
- **Right to Portability**: Use the "Download as Markdown" feature to export conversations
- **Right to Opt-Out**: Simply don't use the Extension or uninstall it

## Contact Information

For questions, concerns, or requests regarding this privacy policy or your data:

- **GitHub Issues**: https://github.com/pjq/chrome-chat/issues
- **Repository**: https://github.com/pjq/chrome-chat

## Third-Party Services

The Extension integrates with AI services you choose to configure:

### Your Responsibilities
- You are responsible for obtaining and managing API keys
- You are responsible for reviewing and accepting the AI service's terms and privacy policy
- You are responsible for any costs associated with API usage

### Our Role
- We provide the interface to connect to these services
- We do not collect, store, or process data sent to these services
- We do not have access to your API keys or conversations

## Compliance

This Extension:
- Complies with Chrome Web Store Developer Program Policies
- Does not contain ads, malware, or tracking code
- Uses permissions only for stated functionality
- Provides transparent data handling practices

## Open Source

The Extension is open source. You can review the entire codebase at:
https://github.com/pjq/chrome-chat

This transparency allows you to verify our privacy practices.

---

**Summary**: Chat with Pages stores data locally on your device, does not collect personal information, does not have servers, and only transmits data to AI services you explicitly configure using your own API keys.
