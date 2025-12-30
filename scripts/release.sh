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

# Summary
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Release v${NEW_VERSION} completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Release package: ${RELEASE_NAME}${NC}"
echo -e "${YELLOW}Git tag: v${NEW_VERSION}${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Upload ${RELEASE_NAME} to Chrome Web Store"
echo -e "  2. Create GitHub release at: https://github.com/pjq/chrome-chat/releases/new?tag=v${NEW_VERSION}"
echo -e "  3. Attach the release zip file to the GitHub release"
echo ""
echo -e "${BLUE}To undo this release (if needed):${NC}"
echo -e "  git tag -d v${NEW_VERSION}"
echo -e "  git push origin :refs/tags/v${NEW_VERSION}"
echo ""
