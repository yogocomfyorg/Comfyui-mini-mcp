#!/bin/bash

# ComfyUI Model Tools MCP Server Setup for Mac
# Optimized installation script for macOS users

set -e  # Exit on any error

echo "========================================"
echo "ComfyUI Model Tools MCP Server (Mac)"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_mac() {
    echo -e "${PURPLE}🍎${NC} $1"
}

print_mac "macOS ComfyUI Model Tools Setup"
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_warning "This script is optimized for macOS. For other platforms, use the main installation."
    echo "Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Check if Homebrew is installed (recommended for Mac)
if command -v brew &> /dev/null; then
    print_status "Homebrew detected"
    BREW_AVAILABLE=true
else
    print_info "Homebrew not found (optional but recommended)"
    BREW_AVAILABLE=false
fi

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo ""
    echo "📦 Install Node.js using one of these methods:"
    if [ "$BREW_AVAILABLE" = true ]; then
        echo "  1. Homebrew (recommended): brew install node"
    fi
    echo "  2. Official installer: https://nodejs.org/"
    echo "  3. Node Version Manager: https://github.com/nvm-sh/nvm"
    echo ""
    echo "After installation, restart this script."
    exit 1
fi

NODE_VERSION=$(node --version)
print_status "Node.js found: $NODE_VERSION"

# Check Node.js version
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required"
    echo "Current version: $NODE_VERSION"
    echo ""
    if [ "$BREW_AVAILABLE" = true ]; then
        echo "Update with Homebrew: brew upgrade node"
    else
        echo "Please update Node.js from: https://nodejs.org/"
    fi
    exit 1
fi

print_status "Node.js version is compatible"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    echo "npm should come with Node.js. Please reinstall Node.js."
    exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
if npm install; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    echo ""
    echo "Troubleshooting tips:"
    echo "  - Check your internet connection"
    echo "  - Try: npm install --verbose"
    echo "  - Clear npm cache: npm cache clean --force"
    exit 1
fi

# Make scripts executable
chmod +x start-server.sh 2>/dev/null || true
chmod +x verify-setup.sh 2>/dev/null || true

# Test the server
echo ""
echo "Testing server functionality..."
if node verify-setup.js; then
    print_status "Server test completed successfully"
else
    print_warning "Server test had issues, but installation completed"
    echo "You may need to configure ComfyUI paths manually"
fi

echo ""
echo "========================================"
print_mac "Installation Complete!"
echo "========================================"
echo ""
echo "🎯 Next steps:"
echo "1. Add this server to your MCP client configuration"
echo "2. Use the configuration examples in config/mac-examples.json"
echo "3. Test the tools: download_huggingface_model and list_installed_models"
echo ""
echo "📁 Configuration path for this installation:"
echo "$(pwd)"
echo ""
echo "🔧 Example MCP configuration for Mac:"
echo "{"
echo "  \"mcpServers\": {"
echo "    \"comfyui-model-tools\": {"
echo "      \"command\": \"node\","
echo "      \"args\": [\"build/index.js\"],"
echo "      \"cwd\": \"$(pwd)\""
echo "    }"
echo "  }"
echo "}"
echo ""
print_mac "macOS-specific notes:"
echo "  - Claude Desktop config: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  - Use forward slashes (/) in all paths"
echo "  - ComfyUI typically installed in: ~/ComfyUI or /Applications/ComfyUI"
echo ""
print_status "Setup complete! Check README-MAC.md for detailed Mac instructions."
