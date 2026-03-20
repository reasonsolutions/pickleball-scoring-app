#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Fixture Venues Update - Quick Start Script         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"

# Check if firebase-service-account.json exists
if [ ! -f "firebase-service-account.json" ]; then
    echo -e "${RED}❌ Error: firebase-service-account.json not found${NC}"
    echo -e "${YELLOW}📝 Please follow these steps:${NC}"
    echo -e "${YELLOW}1. Go to Firebase Console: https://console.firebase.google.com/${NC}"
    echo -e "${YELLOW}2. Select project: pickleball-app-9ccf7${NC}"
    echo -e "${YELLOW}3. Click gear icon → Project Settings → Service Accounts${NC}"
    echo -e "${YELLOW}4. Click 'Generate New Private Key'${NC}"
    echo -e "${YELLOW}5. Save the JSON file as firebase-service-account.json in this directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Service account file found${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js is installed${NC}"

# Check if firebase-admin is installed
if ! npm list firebase-admin &> /dev/null; then
    echo -e "${YELLOW}📦 Installing firebase-admin...${NC}"
    npm install firebase-admin
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install firebase-admin${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ firebase-admin is installed${NC}"

# Run verification
echo -e "\n${BLUE}🔍 Running setup verification...${NC}"
node verify-fixture-venues-setup.mjs

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Verification failed${NC}"
    exit 1
fi

# Ask for confirmation
echo -e "\n${CYAN}════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}⚠️  This will update venue information in your fixtures${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
read -p "Do you want to proceed? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# Run the update script
echo -e "${BLUE}🚀 Starting fixture venue update...${NC}"
node update-fixture-venues.mjs

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Update completed successfully${NC}"
else
    echo -e "\n${RED}❌ Update failed${NC}"
    exit 1
fi
