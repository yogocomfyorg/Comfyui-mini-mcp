# 🍎 ComfyUI Model Tools for Mac

**MCP Server for macOS** - Download and manage ComfyUI models with HuggingFace integration

## 🚀 Quick Start for Mac

### Prerequisites
- **macOS** (optimized for macOS 10.15+)
- **Node.js 18+** (install via Homebrew recommended)

### 1. Install Node.js (if not already installed)

**Option A: Homebrew (Recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

**Option B: Official Installer**
- Download from [nodejs.org](https://nodejs.org/)
- Choose the macOS installer (.pkg)

**Option C: Node Version Manager (NVM)**
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install latest Node.js
nvm install node
nvm use node
```

### 2. Setup ComfyUI Model Tools

```bash
# Make installation script executable
chmod +x install.sh

# Run the Mac-optimized installer
./install.sh
```

### 3. Verify Installation

```bash
# Test your setup
node verify-setup.js
```

You should see: 🎉 All Tests Passed!

## 🔧 MCP Client Configuration

### 🎯 **WORKING CONFIGURATION** (Tested & Verified)

**Config file location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**✅ CORRECT Configuration (Use Absolute Paths):**
```json
{
  "mcpServers": {
    "comfyui-model-tools": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/yourname/path/to/comfyui-model-tools-mac/build/index.js"]
    }
  }
}
```

**🔍 Find Your Paths:**
```bash
# Get Node.js path
which node
# Common results:
# /opt/homebrew/bin/node (Apple Silicon Mac)
# /usr/local/bin/node (Intel Mac)

# Get your project path
cd /path/to/comfyui-model-tools-mac
pwd
# Example: /Users/milan/Documents/comf/comfyui-model-tools-mac
```

### Claude Desktop (macOS)

**Replace with YOUR actual paths:**
```json
{
  "mcpServers": {
    "comfyui-model-tools": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/milan/Documents/comf/comfyui-model-tools-mac/build/index.js"]
    }
  }
}
```

### Augment (VS Code)

1. Open VS Code Settings
2. Go to Extensions → Augment → MCP Configuration
3. Add this configuration (with YOUR paths):

```json
{
  "mcpServers": {
    "comfyui-model-tools": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/yourname/path/to/comfyui-model-tools-mac/build/index.js"]
    }
  }
}
```

### ⚠️ **IMPORTANT: Why Absolute Paths?**

**❌ DON'T USE** relative paths with `cwd` - they cause "Cannot find module" errors:
```json
// This DOESN'T work reliably:
{
  "command": "node",
  "args": ["build/index.js"],
  "cwd": "/path/to/comfyui-model-tools-mac"
}
```

**✅ DO USE** absolute paths - they work consistently:
```json
// This WORKS:
{
  "command": "/opt/homebrew/bin/node",
  "args": ["/full/path/to/comfyui-model-tools-mac/build/index.js"]
}
```

## 🎯 Usage Examples

### Download Models from HuggingFace

```bash
# Download a FLUX model
download_huggingface_model modelId="black-forest-labs/FLUX.1-dev"

# Download a LoRA with auto-detection
download_huggingface_model modelId="gokaygokay/Flux-Detailer-LoRA"

# Download to specific ComfyUI installation
download_huggingface_model modelId="stabilityai/stable-diffusion-xl-base-1.0" comfyuiPath="/Users/yourname/ComfyUI"
```

### List Installed Models

```bash
# List all models
list_installed_models

# Filter by type
list_installed_models modelType="lora"
list_installed_models modelType="checkpoint"
list_installed_models modelType="vae"
```

## 📁 Common macOS ComfyUI Locations

The tool will auto-detect ComfyUI in these common Mac locations:

- `~/ComfyUI` (user home directory)
- `/Applications/ComfyUI`
- `~/Applications/ComfyUI`
- `~/Desktop/ComfyUI`
- `~/Downloads/ComfyUI`

## 🛠 Troubleshooting

### 🚨 **"Cannot find module" Error - SOLVED!**

**Problem:** MCP client shows "Cannot find module" error
**Root Cause:** Using relative paths with `cwd` parameter
**✅ Solution:** Use absolute paths only

```bash
# ❌ This causes errors:
{
  "command": "node",
  "args": ["build/index.js"],
  "cwd": "/path/to/project"
}

# ✅ This works:
{
  "command": "/opt/homebrew/bin/node",
  "args": ["/full/path/to/project/build/index.js"]
}
```

### Find Your Correct Paths
```bash
# 1. Find Node.js location
which node
# Results: /opt/homebrew/bin/node or /usr/local/bin/node

# 2. Find project location
cd /path/to/comfyui-model-tools-mac
pwd
# Example: /Users/milan/Documents/comf/comfyui-model-tools-mac

# 3. Test the exact command that will be used
/opt/homebrew/bin/node /Users/milan/Documents/comf/comfyui-model-tools-mac/build/index.js
# Should start the MCP server without errors
```

### Permission Issues
```bash
# Fix script permissions
chmod +x install.sh
chmod +x start-server.sh
chmod +x verify-setup.js
```

### Node.js Issues
```bash
# Check Node.js version
node --version

# Update Node.js with Homebrew
brew upgrade node

# Or reinstall
brew uninstall node
brew install node
```

### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

### ComfyUI Not Found
```bash
# Specify ComfyUI path manually
download_huggingface_model modelId="model-name" comfyuiPath="/path/to/your/ComfyUI"
```

## 🍎 macOS-Specific Features

- **Homebrew integration** - Detects and suggests Homebrew for Node.js installation
- **macOS path detection** - Automatically finds ComfyUI in common Mac locations
- **Terminal.app optimized** - Works perfectly with macOS Terminal and iTerm2
- **Finder integration** - Easy to navigate to installation folder
- **Spotlight searchable** - Scripts are indexed by Spotlight

## 📋 File Structure

```
comfyui-model-tools-mac/
├── README-MAC.md          ← This file
├── install.sh             ← Mac installation script
├── start-server.sh        ← Mac startup script
├── verify-setup.js        ← Mac-optimized verification
├── package.json           ← Node.js dependencies
├── build/                 ← Compiled server code
│   ├── index.js
│   ├── tools/
│   └── utils/
├── config/                ← Configuration examples
│   └── mac-examples.json
└── state/                 ← Server state files
    └── server-state.json
```

## 🔗 Available Tools

1. **download_huggingface_model** - Download models from HuggingFace Hub
2. **list_installed_models** - List and filter your installed ComfyUI models

## 🆘 Need Help?

1. **Installation issues**: Run `./install.sh` again
2. **Server won't start**: Run `node verify-setup.js`
3. **ComfyUI not found**: Use `comfyuiPath` parameter in tool calls
4. **Permission denied**: Run `chmod +x *.sh`

## ✅ Success Indicators

When everything works correctly:
- ✅ `node verify-setup.js` shows all green checkmarks
- ✅ **Test command works:** `/opt/homebrew/bin/node /full/path/to/build/index.js` starts server
- ✅ **Absolute paths used** in MCP configuration (no `cwd` parameter)
- ✅ Tools appear in your MCP client
- ✅ Downloads go to correct ComfyUI model folders
- ✅ Model listing shows your installed models

## 🔑 **Key Findings & Best Practices**

### ✅ **What Works (Tested & Verified)**
1. **Use absolute paths only** - both for Node.js and script paths
2. **No `cwd` parameter needed** when using absolute paths
3. **Test the exact command first** before adding to MCP config
4. **Common Node.js locations:**
   - Apple Silicon Mac: `/opt/homebrew/bin/node`
   - Intel Mac: `/usr/local/bin/node`

### ❌ **What Doesn't Work**
1. Relative paths with `cwd` parameter
2. Just `"node"` without full path (unreliable)
3. Relative script paths like `"build/index.js"`

### 🧪 **Testing Your Configuration**
```bash
# Before adding to MCP config, test this exact command:
/opt/homebrew/bin/node /Users/yourname/path/to/comfyui-model-tools-mac/build/index.js

# Should output: "MCP Server starting..." (not "Cannot find module")
```

---

**🍎 Optimized for macOS** - This version is specifically designed for Mac users with macOS-specific paths, commands, and optimizations.
