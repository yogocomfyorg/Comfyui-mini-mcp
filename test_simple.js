#!/usr/bin/env node

import { registerModelDownloadTools } from "./build/tools/modelDownload.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import chalk from "chalk";

// Mock MCP server for testing
class MockMcpServer {
    constructor() {
        this.tools = new Map();
    }
    
    tool(name, description, schema, handler) {
        this.tools.set(name, { name, description, schema, handler });
        console.log(chalk.green(`✅ Registered tool: ${name}`));
    }
    
    async callTool(name, params) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }
        return await tool.handler(params);
    }
}

async function testDownload() {
    console.log(chalk.cyan("🧪 Testing download_huggingface_model directly\n"));
    
    // Check environment
    console.log(chalk.gray("🔧 Environment:"));
    console.log(chalk.gray(`   HTTP_PROXY: ${process.env.HTTP_PROXY || 'Not set'}`));
    console.log(chalk.gray(`   HTTPS_PROXY: ${process.env.HTTPS_PROXY || 'Not set'}\n`));
    
    // Create mock server and register tools
    const server = new MockMcpServer();
    await registerModelDownloadTools(server);
    
    // Test cases
    const testCases = [
        {
            name: "Stable Diffusion v1.5 (redirected)",
            params: {
                modelId: "stable-diffusion-v1-5/stable-diffusion-v1-5",
                outputDir: "./test_downloads",
                autoDetect: false,
                overwrite: true
            }
        },
        {
            name: "Playground v2.5",
            params: {
                modelId: "playgroundai/playground-v2.5-1024px-aesthetic", 
                outputDir: "./test_downloads",
                autoDetect: false,
                overwrite: true
            }
        }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(chalk.cyan(`\n📋 Test ${i + 1}: ${testCase.name}`));
        console.log(chalk.gray(`   Params: ${JSON.stringify(testCase.params, null, 2)}`));
        
        try {
            const result = await server.callTool("download_huggingface_model", testCase.params);
            
            if (result.isError) {
                console.log(chalk.red(`❌ Test ${i + 1} failed:`));
                console.log(chalk.red(result.content[0].text));
            } else {
                console.log(chalk.green(`✅ Test ${i + 1} passed:`));
                console.log(chalk.gray(result.content[0].text));
            }
            
        } catch (error) {
            console.log(chalk.red(`❌ Test ${i + 1} exception: ${error.message}`));
        }
        
        // Add delay between tests
        if (i < testCases.length - 1) {
            console.log(chalk.gray(`\n⏳ Waiting 3 seconds before next test...`));
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log(chalk.cyan(`\n🏁 Testing completed!`));
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
    // Test specific model
    const modelId = args[0];
    const outputDir = args[1] || "./test_downloads";
    
    console.log(chalk.cyan(`🧪 Testing specific model: ${modelId}`));
    console.log(chalk.gray(`   Output: ${outputDir}`));
    
    const server = new MockMcpServer();
    await registerModelDownloadTools(server);
    
    try {
        const result = await server.callTool("download_huggingface_model", {
            modelId,
            outputDir,
            autoDetect: false,
            overwrite: true
        });
        
        if (result.isError) {
            console.log(chalk.red(`❌ Test failed:`));
            console.log(chalk.red(result.content[0].text));
            process.exit(1);
        } else {
            console.log(chalk.green(`✅ Test passed:`));
            console.log(chalk.gray(result.content[0].text));
        }
    } catch (error) {
        console.log(chalk.red(`❌ Test exception: ${error.message}`));
        process.exit(1);
    }
} else {
    // Run full test suite
    testDownload().catch(error => {
        console.error(chalk.red(`❌ Test suite failed: ${error.message}`));
        process.exit(1);
    });
} 