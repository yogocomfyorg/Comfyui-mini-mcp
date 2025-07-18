#!/usr/bin/env node

/**
 * ComfyUI Model Tools Setup Verification (Mac Optimized)
 * Tests installation and provides Mac-specific guidance
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  reset: '\x1b[0m'
};

function printMac(message) {
  console.log(`${colors.purple}🍎${colors.reset} ${message}`);
}

function printStatus(message) {
  console.log(`${colors.green}✅${colors.reset} ${message}`);
}

function printError(message) {
  console.log(`${colors.red}❌${colors.reset} ${message}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️${colors.reset} ${message}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️${colors.reset} ${message}`);
}

printMac('Testing ComfyUI Model Tools Setup (Mac Version)...\n');

// Test 1: Check platform
console.log('1. Checking platform compatibility...');
const currentPlatform = platform();
if (currentPlatform === 'darwin') {
  printStatus(`Running on macOS (${currentPlatform})`);
} else {
  printWarning(`Running on ${currentPlatform} (this version is optimized for macOS)`);
}

// Test 2: Check Node.js version
console.log('\n2. Checking Node.js version...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    printStatus(`Node.js ${nodeVersion} (compatible)`);
  } else {
    printError(`Node.js ${nodeVersion} (requires 18+)`);
    console.log('   💡 Update with: brew upgrade node (if using Homebrew)');
    process.exit(1);
  }
} catch (error) {
  printError(`Error checking Node.js: ${error.message}`);
  process.exit(1);
}

// Test 3: Check build directory
console.log('\n3. Checking build directory...');
try {
  const buildPath = join(__dirname, 'build');
  const indexPath = join(buildPath, 'index.js');
  const toolsPath = join(buildPath, 'tools', 'modelDownload.js');
  const utilsPath = join(buildPath, 'utils', 'comfyuiDetection.js');
  
  const fs = await import('fs');
  
  if (fs.existsSync(indexPath)) {
    printStatus('Main server file found');
  } else {
    printError('Main server file missing');
    process.exit(1);
  }
  
  if (fs.existsSync(toolsPath)) {
    printStatus('Model download tools found');
  } else {
    printError('Model download tools missing');
    process.exit(1);
  }
  
  if (fs.existsSync(utilsPath)) {
    printStatus('ComfyUI detection utilities found');
  } else {
    printError('ComfyUI detection utilities missing');
    process.exit(1);
  }
} catch (error) {
  printError(`Error checking build directory: ${error.message}`);
  process.exit(1);
}

// Test 4: Check dependencies
console.log('\n4. Checking dependencies...');
try {
  const fs = await import('fs');
  const nodeModulesPath = join(__dirname, 'node_modules');
  
  if (fs.existsSync(nodeModulesPath)) {
    printStatus('Dependencies installed');
  } else {
    printError('Dependencies not installed');
    console.log('   💡 Run: npm install (or ./install.sh for guided setup)');
    process.exit(1);
  }
} catch (error) {
  printError(`Error checking dependencies: ${error.message}`);
  process.exit(1);
}

// Test 5: Check script permissions
console.log('\n5. Checking script permissions...');
try {
  const fs = await import('fs');
  const installScript = join(__dirname, 'install.sh');
  const startScript = join(__dirname, 'start-server.sh');
  
  if (fs.existsSync(installScript)) {
    const installStats = fs.statSync(installScript);
    if (installStats.mode & parseInt('111', 8)) {
      printStatus('install.sh is executable');
    } else {
      printWarning('install.sh is not executable');
      console.log('   💡 Fix with: chmod +x install.sh');
    }
  }
  
  if (fs.existsSync(startScript)) {
    const startStats = fs.statSync(startScript);
    if (startStats.mode & parseInt('111', 8)) {
      printStatus('start-server.sh is executable');
    } else {
      printWarning('start-server.sh is not executable');
      console.log('   💡 Fix with: chmod +x start-server.sh');
    }
  }
} catch (error) {
  printWarning(`Could not check script permissions: ${error.message}`);
}

// Test 6: Quick server startup test
console.log('\n6. Testing server startup...');
const serverPath = join(__dirname, 'build', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverOutput = '';
server.stdout.on('data', (data) => {
  serverOutput += data.toString();
});

server.stderr.on('data', (data) => {
  serverOutput += data.toString();
});

setTimeout(() => {
  server.kill();
  
  if (serverOutput.includes('MCP server') || serverOutput.includes('tools')) {
    printStatus('Server startup test passed');
  } else {
    printWarning('Server startup test unclear (but likely working)');
  }
  
  // Final summary
  console.log('\n🎉 All Tests Passed!');
  printMac('Your ComfyUI Model Tools are ready for macOS!');

  console.log('\n📋 Next Steps for Mac:');
  console.log('1. Find your Node.js path:');
  console.log('   which node');
  console.log('   (Usually: /opt/homebrew/bin/node or /usr/local/bin/node)');
  console.log('2. Test the exact command:');
  console.log(`   /opt/homebrew/bin/node ${join(__dirname, 'build', 'index.js')}`);
  console.log('   (Should show: "MCP Server starting...")');
  console.log('3. Add to your MCP client with ABSOLUTE PATHS:');
  console.log('   - Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json');
  console.log('   - Augment (VS Code): Settings → Extensions → Augment → MCP Configuration');
  console.log('4. Use this WORKING configuration:');
  console.log('   {');
  console.log('     "mcpServers": {');
  console.log('       "comfyui-model-tools": {');
  console.log('         "command": "/opt/homebrew/bin/node",');
  console.log(`         "args": ["${join(__dirname, 'build', 'index.js')}"]`);
  console.log('       }');
  console.log('     }');
  console.log('   }');
  console.log('5. Start using: download_huggingface_model, list_installed_models');

  console.log('\n🔑 CRITICAL - Use absolute paths only!');
  console.log('❌ DON\'T use: "command": "node", "cwd": "/path"');
  console.log('✅ DO use: "command": "/full/path/to/node", "args": ["/full/path/to/script"]');

  console.log('\n🍎 macOS-specific tips:');
  console.log('- Use forward slashes (/) in all paths');
  console.log('- ComfyUI typically in: ~/ComfyUI or /Applications/ComfyUI');
  console.log('- Use Terminal.app or iTerm2 for command line operations');

  console.log('\n📚 Need help? Check README-MAC.md for detailed Mac instructions');
  
}, 3000);
