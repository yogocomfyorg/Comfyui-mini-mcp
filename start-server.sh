#!/bin/bash

# ComfyUI Model Tools MCP Server Startup Script for Mac
# Optimized for macOS environments

set -e  # Exit on any error

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

print_mac "Starting ComfyUI Model Tools MCP Server (Mac)"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo ""
    echo "📦 Install Node.js:"
    echo "  - Homebrew: brew install node"
    echo "  - Official: https://nodejs.org/"
    echo "  - NVM: https://github.com/nvm-sh/nvm"
    exit 1
fi

NODE_VERSION=$(node --version)
print_info "Node.js version: $NODE_VERSION"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not found. Installing..."
    if npm install; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        echo "Try running: ./install.sh"
        exit 1
    fi
fi

# Check if build directory exists
if [ ! -d "build" ]; then
    print_error "Build directory not found"
    echo "Please ensure the build/ directory is included in the deployment package"
    exit 1
fi

# Check if main server file exists
if [ ! -f "build/index.js" ]; then
    print_error "Main server file not found: build/index.js"
    echo "Please ensure the build files are properly included"
    exit 1
fi

print_status "All checks passed. Starting server..."
echo ""
print_info "🔗 Server running with STDIO transport"
print_info "⌨️  Use Ctrl+C to stop the server"
print_info "📱 Optimized for macOS environments"
echo ""

# Start the server
exec node build/index.js
