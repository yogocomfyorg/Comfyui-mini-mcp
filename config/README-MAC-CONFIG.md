# 🍎 macOS MCP Configuration Guide

Complete setup guide for ComfyUI Model Tools on macOS

## 🔧 Configuration Locations

### Claude Desktop (macOS)
**File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```bash
# Navigate to config directory
cd ~/Library/Application\ Support/Claude/

# Edit with your preferred editor
nano claude_desktop_config.json
# or
code claude_desktop_config.json
# or
open -a TextEdit claude_desktop_config.json
```

### Augment (VS Code)
1. Open VS Code
2. Go to Settings (⌘ + ,)
3. Search for "Augment"
4. Find "MCP Configuration"
5. Add the configuration

## 📋 Configuration Examples

### ✅ **WORKING Configuration (Tested & Verified)**

**Use absolute paths only - no `cwd` parameter needed!**

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

### For Intel Mac (Different Node.js Path)

```json
{
  "mcpServers": {
    "comfyui-model-tools": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/yourname/path/to/comfyui-model-tools-mac/build/index.js"]
    }
  }
}
```

### ❌ **BROKEN Configuration (Don't Use)**

**This causes "Cannot find module" errors:**

```json
{
  "mcpServers": {
    "comfyui-model-tools": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "/Users/yourname/path/to/comfyui-model-tools-mac"
    }
  }
}
```

**Why it doesn't work:** Relative paths with `cwd` are unreliable in MCP configurations.

## 🛠 Finding Your Paths

### Get Current Directory Path
```bash
# Navigate to your comfyui-model-tools-mac folder
cd /path/to/comfyui-model-tools-mac

# Get the full path
pwd
```

### Find Node.js Path
```bash
# Find where Node.js is installed
which node

# Common locations:
# /usr/local/bin/node (Homebrew)
# /opt/homebrew/bin/node (Apple Silicon Homebrew)
# /usr/bin/node (System)
```

### Find ComfyUI Installation
```bash
# Common ComfyUI locations on Mac:
ls ~/ComfyUI                    # User home
ls /Applications/ComfyUI        # Applications folder
ls ~/Applications/ComfyUI       # User Applications
ls ~/Desktop/ComfyUI           # Desktop
ls ~/Downloads/ComfyUI         # Downloads
```

## 🔍 Verification Steps

### 1. Test Node.js
```bash
node --version
# Should show v18.0.0 or higher
```

### 2. Test Server
```bash
cd /path/to/comfyui-model-tools-mac
node verify-setup.js
# Should show: 🎉 All Tests Passed!
```

### 3. Test MCP Connection
After adding configuration to your MCP client:
- Restart the MCP client
- Look for "comfyui-model-tools" in available tools
- Try: `download_huggingface_model modelId="test"`

## 🚨 Common Issues & Solutions

### 🔥 **CRITICAL: "Cannot find module" Error - SOLVED!**

**Problem:** MCP client shows "Cannot find module" when starting server
**Root Cause:** Using relative paths with `cwd` parameter
**✅ Solution:** Use absolute paths only, remove `cwd` parameter

```bash
# ❌ This DOESN'T work:
{
  "command": "node",
  "args": ["build/index.js"],
  "cwd": "/path/to/project"
}

# ✅ This WORKS:
{
  "command": "/opt/homebrew/bin/node",
  "args": ["/full/path/to/project/build/index.js"]
}
```

### 🧪 **Test Before Adding to MCP Config**

```bash
# Test the exact command first:
/opt/homebrew/bin/node /Users/yourname/path/to/comfyui-model-tools-mac/build/index.js

# Should output: "MCP Server starting..." (not "Cannot find module")
```

### Issue: "command not found: node"
```bash
# Install Node.js with Homebrew
brew install node

# Or download from nodejs.org
```

### Issue: "Permission denied"
```bash
# Make scripts executable
chmod +x install.sh
chmod +x start-server.sh
```

### Issue: "Path not found"
```bash
# Use absolute paths in configuration
# Get current directory with:
pwd

# Example result: /Users/john/ComfyUI/comfyui-model-tools-mac
```

### Issue: "ComfyUI not detected"
```bash
# Specify ComfyUI path manually in tool calls
download_huggingface_model modelId="model-name" comfyuiPath="/Users/yourname/ComfyUI"
```

## 🍎 macOS-Specific Tips

### Using Finder to Get Paths
1. Navigate to your folder in Finder
2. Right-click the folder
3. Hold Option key
4. Select "Copy ... as Pathname"
5. Paste into configuration

### Terminal Navigation
```bash
# Navigate to home directory
cd ~

# Navigate to Applications
cd /Applications

# Navigate to Desktop
cd ~/Desktop

# Go back one directory
cd ..

# List files and folders
ls -la
```

### Environment Variables
```bash
# Check your PATH
echo $PATH

# Check Node.js location
echo $NODE_PATH
```

## 📱 MCP Client Specific Instructions

### Claude Desktop
1. Quit Claude Desktop completely
2. Edit config file: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Add the configuration
4. Save the file
5. Restart Claude Desktop
6. Tools should appear in the interface

### Augment (VS Code)
1. Open VS Code Settings (⌘ + ,)
2. Search for "MCP"
3. Find Augment MCP Configuration
4. Add the JSON configuration
5. Restart VS Code
6. Tools should be available

## ✅ Success Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install` or `./install.sh`)
- [ ] Scripts are executable (`chmod +x *.sh`)
- [ ] Configuration added to MCP client
- [ ] Correct paths used (absolute paths recommended)
- [ ] MCP client restarted
- [ ] Tools appear in client interface
- [ ] Test download works

## 🔗 Quick Copy-Paste Template

Replace `YOUR_USERNAME` and `YOUR_PATH` with your actual values:

```json
{
  "mcpServers": {
    "comfyui-model-tools": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "/Users/YOUR_USERNAME/YOUR_PATH/comfyui-model-tools-mac"
    }
  }
}
```

---

**Need more help?** Check the main README-MAC.md file or run `node verify-setup.js` for diagnostics.
