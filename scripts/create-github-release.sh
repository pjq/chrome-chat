#!/bin/bash

# Create GitHub Release for existing tag
# Usage: ./scripts/create-github-release.sh v1.0.1

set -e

TAG_NAME=${1:-v1.0.1}
VERSION=${TAG_NAME#v}
RELEASE_ZIP="releases/chat-with-pages-v${VERSION}.zip"

if [ ! -f "$RELEASE_ZIP" ]; then
    echo "Error: Release file not found: $RELEASE_ZIP"
    exit 1
fi

echo "Creating GitHub Release for $TAG_NAME..."

# Create release using curl (works without gh CLI)
RESPONSE=$(curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/pjq/chrome-chat/releases \
  -d @- <<EOF
{
  "tag_name": "$TAG_NAME",
  "name": "Chat with Pages $TAG_NAME",
  "body": "# Chat with Pages $TAG_NAME 🎉\n\n## ✨ Features\n\n- 💬 **Chat with Pages**: Have natural conversations about any webpage using AI\n- 📚 **Chat History**: Save and switch between multiple chat sessions\n- 🔄 **Retry & Copy**: Retry failed responses or copy any message to clipboard\n- 🎨 **Markdown Rendering**: Beautiful formatting with code syntax highlighting\n- 📥 **Export to Markdown**: Download pages as clean markdown files\n- 🔌 **Multiple AI Services**: Support for OpenAI Compatible and OpenRouter APIs\n- ⚡ **Streaming Responses**: Real-time message streaming for better UX\n- 💾 **Persistent Storage**: Chat history saved across browser sessions\n\n## 🚀 Getting Started\n\n1. Download the extension package below\n2. Extract the zip file\n3. Load in Chrome:\n   - Open \`chrome://extensions/\`\n   - Enable \"Developer mode\"\n   - Click \"Load unpacked\"\n   - Select the extracted folder\n4. Configure your AI service in settings\n5. Start chatting with webpages!\n\n## 📖 Documentation\n\nSee [README.md](https://github.com/pjq/chrome-chat#readme) for complete documentation.\n\n## 🔒 Security\n\n- API keys stored locally (not synced)\n- No data collection or tracking\n- Direct API calls from your browser\n\n## 🙏 Acknowledgments\n\nBuilt with ❤️ using [Claude Code](https://claude.com/claude-code)",
  "draft": false,
  "prerelease": false
}
EOF
)

RELEASE_ID=$(echo "$RESPONSE" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
UPLOAD_URL=$(echo "$RESPONSE" | grep -o '"upload_url": *"[^"]*"' | head -1 | sed 's/"upload_url": *"\([^{]*\).*/\1/')

if [ -z "$RELEASE_ID" ]; then
    echo "Error creating release:"
    echo "$RESPONSE"
    exit 1
fi

echo "Release created with ID: $RELEASE_ID"
echo "Uploading asset..."

# Upload the zip file
curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/zip" \
  --data-binary @"$RELEASE_ZIP" \
  "${UPLOAD_URL}?name=chat-with-pages-v${VERSION}.zip"

echo ""
echo "✓ GitHub Release created successfully!"
echo "https://github.com/pjq/chrome-chat/releases/tag/$TAG_NAME"
