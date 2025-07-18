#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import chalk from "chalk";
import { registerModelDownloadTools } from "./tools/modelDownload.js";

const SERVER_NAME = "comfyui-model-tools-mcp";
const SERVER_VERSION = "1.0.0";

// Create server instance
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

// Enhanced global error handler
process.on('uncaughtException', async (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.error(chalk.yellow('\n🛑 Received SIGINT, shutting down gracefully...'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error(chalk.yellow('\n🛑 Received SIGTERM, shutting down gracefully...'));
  process.exit(0);
});

// Initialize server with minimal tools
async function initializeServer() {
  try {
    console.error(chalk.blue("🔧 Registering model download tools..."));
    
    // Register only the two required tools
    await registerModelDownloadTools(server);
    
    console.error(chalk.green("✅ Model download tools registered successfully"));
    
  } catch (error) {
    console.error(chalk.red("❌ Failed to register tools:"), error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.error(chalk.blue(`🚀 Starting ${SERVER_NAME} v${SERVER_VERSION}...`));
    console.error(chalk.gray("📋 Available tools: download_huggingface_model, list_installed_models"));

    // Initialize server
    await initializeServer();
    console.error(chalk.green("✅ Server initialization completed"));

    // Create transport
    console.error(chalk.blue("🔌 Setting up MCP transport..."));
    const transport = new StdioServerTransport();

    // Connect server to transport
    let connected = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!connected && retryCount < maxRetries) {
      try {
        await server.connect(transport);
        connected = true;
        console.error(chalk.green("✅ MCP server connected and ready"));
      } catch (error) {
        retryCount++;
        console.error(chalk.yellow(`⚠️ Connection attempt ${retryCount} failed:`, error.message));
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error) {
    console.error(chalk.red("💥 Fatal error:"), error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error(chalk.red("💥 Startup failed:"), error);
  process.exit(1);
});
