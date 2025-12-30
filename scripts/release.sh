#!/bin/bash

# Release script for Chat with Pages Chrome Extension
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Version bump type (default: patch)
BUMP_TYPE=${1:-patch}

if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid version bump type. Use 'patch', 'minor', or 'major'${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting release process...${NC}"
echo ""

# Check if git working directory is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: Git working directory is not clean. Please commit or stash your changes.${NC}"
    git status -s
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"

# Bump version in package.json
echo -e "${BLUE}📝 Bumping version (${BUMP_TYPE})...${NC}"
npm version $BUMP_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: ${NEW_VERSION}${NC}"

# Update version in manifest.json
echo -e "${BLUE}📝 Updating manifest.json...${NC}"
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('./public/manifest.json', 'utf8'));
manifest.version = '${NEW_VERSION}';
fs.writeFileSync('./public/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
"

echo -e "${GREEN}✓ Version updated to ${NEW_VERSION}${NC}"
echo ""

# Run build
echo -e "${BLUE}🔨 Building extension...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Create release zip
echo -e "${BLUE}📦 Creating release package...${NC}"
RELEASE_NAME="chat-with-pages-v${NEW_VERSION}.zip"
cd dist
zip -r "../releases/${RELEASE_NAME}" . -x "*.map" -x ".vite/*"
cd ..

echo -e "${GREEN}✓ Release package created: releases/${RELEASE_NAME}${NC}"
echo ""

# Git operations
echo -e "${BLUE}📋 Committing changes...${NC}"
git add package.json package-lock.json public/manifest.json

git commit -m "Release v${NEW_VERSION}

- Bump version to ${NEW_VERSION}
- Update manifest.json
- Build production assets

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo -e "${GREEN}✓ Changes committed${NC}"
echo ""

# Create git tag
echo -e "${BLUE}🏷️  Creating git tag...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
echo -e "${GREEN}✓ Tag v${NEW_VERSION} created${NC}"
echo ""

# Push to remote
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git push origin main
git push origin "v${NEW_VERSION}"

echo -e "${GREEN}✓ Pushed to GitHub${NC}"
echo ""

# Create GitHub Release
echo -e "${BLUE}📝 Creating GitHub Release...${NC}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  GITHUB_TOKEN not set${NC}"
    echo -e "${YELLOW}   Set it in ~/.zshrc: export GITHUB_TOKEN=\"your_token\"${NC}"
    echo -e "${YELLOW}   Or create release manually at: https://github.com/pjq/chrome-chat/releases/new?tag=v${NEW_VERSION}${NC}"
else
    # Create release using GitHub API
    RESPONSE=$(curl -s -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      https://api.github.com/repos/pjq/chrome-chat/releases \
      -d @- <<EOF
{
  "tag_name": "v${NEW_VERSION}",
  "name": "Chat with Pages v${NEW_VERSION}",
  "body": "# Chat with Pages v${NEW_VERSION} 🎉\n\nFirst official release!\n\n## ✨ Features\n\n- 💬 **Chat with Pages**: Have natural conversations about any webpage using AI\n- 📚 **Chat History**: Save and switch between multiple chat sessions\n- 🔄 **Retry & Copy**: Retry failed responses or copy any message to clipboard\n- 🎨 **Markdown Rendering**: Beautiful formatting with code syntax highlighting\n- 📥 **Export to Markdown**: Download pages as clean markdown files\n- 🔌 **Multiple AI Services**: Support for OpenAI Compatible and OpenRouter APIs\n- ⚡ **Streaming Responses**: Real-time message streaming for better UX\n- 💾 **Persistent Storage**: Chat history saved across browser sessions\n\n## 🚀 Getting Started\n\n1. Download the extension package below\n2. Extract the zip file\n3. Load in Chrome:\n   - Open \`chrome://extensions/\`\n   - Enable \\\"Developer mode\\\"\n   - Click \\\"Load unpacked\\\"\n   - Select the extracted folder\n4. Configure your AI service in settings\n5. Start chatting with webpages!\n\n## 📖 Documentation\n\nSee [README.md](https://github.com/pjq/chrome-chat#readme) for complete documentation.\n\n## 🔒 Security\n\n- API keys stored locally (not synced)\n- No data collection or tracking\n- Direct API calls from your browser\n\n## 🙏 Acknowledgments\n\nBuilt with ❤️ using [Claude Code](https://claude.com/claude-code)",
  "draft": false,
  "prerelease": false
}
EOF
)

    RELEASE_ID=$(echo "$RESPONSE" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
    UPLOAD_URL=$(echo "$RESPONSE" | grep -o '"upload_url": *"[^"]*"' | head -1 | sed 's/"upload_url": *"\([^{]*\).*/\1/')

    if [ -z "$RELEASE_ID" ]; then
        echo -e "${YELLOW}⚠️  Failed to create GitHub Release${NC}"
        echo "$RESPONSE" | head -5
        echo -e "${YELLOW}   Create manually at: https://github.com/pjq/chrome-chat/releases/new?tag=v${NEW_VERSION}${NC}"
    else
        echo -e "${GREEN}✓ GitHub Release created (ID: $RELEASE_ID)${NC}"

        # Upload the zip file
        echo -e "${BLUE}📤 Uploading release asset...${NC}"
        curl -s -X POST \
          -H "Accept: application/vnd.github+json" \
          -H "Authorization: Bearer $GITHUB_TOKEN" \
          -H "X-GitHub-Api-Version: 2022-11-28" \
          -H "Content-Type: application/zip" \
          --data-binary @"releases/${RELEASE_NAME}" \
          "${UPLOAD_URL}?name=${RELEASE_NAME}" > /dev/null

        echo -e "${GREEN}✓ Release asset uploaded${NC}"
    fi
fi
echo ""

# Summary
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Release v${NEW_VERSION} completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Release package: ${RELEASE_NAME}${NC}"
echo -e "${YELLOW}Git tag: v${NEW_VERSION}${NC}"
echo -e "${YELLOW}GitHub Release: https://github.com/pjq/chrome-chat/releases/tag/v${NEW_VERSION}${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Upload ${RELEASE_NAME} to Chrome Web Store"
echo -e "  2. Download: https://github.com/pjq/chrome-chat/releases/download/v${NEW_VERSION}/${RELEASE_NAME}"
echo ""
echo -e "${BLUE}To undo this release (if needed):${NC}"
echo -e "  gh release delete v${NEW_VERSION} --yes"
echo -e "  git tag -d v${NEW_VERSION}"
echo -e "  git push origin :refs/tags/v${NEW_VERSION}"
echo ""
