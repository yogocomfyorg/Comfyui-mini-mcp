import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { detectComfyUIInstallation, getModelTypeDirectory, ensureModelDirectory } from "../utils/comfyuiDetection.js";

// Setup proxy configuration for fetch
const createFetchConfig = () => {
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    
    const config = {
        headers: {
            'User-Agent': 'curl/8.7.1',
            'Accept': '*/*'
        }
    };
    
    if (httpsProxy) {
        console.error(`🔗 Using HTTPS proxy: ${httpsProxy}`);
        config.agent = new HttpsProxyAgent(httpsProxy);
    }
    
    return config;
};

// Setup proxy configuration for axios (fallback)
const createAxiosConfig = () => {
    const config = {
        timeout: 300000, // 5 minutes
        maxRedirects: 5, // Keep it simple like curl
        headers: {
            'User-Agent': 'curl/8.7.1', // Use same User-Agent as curl
            'Accept': '*/*'
        }
    };
    
    // Configure proxy if available
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    
    if (httpsProxy) {
        console.error(`🔗 Using HTTPS proxy: ${httpsProxy}`);
        config.httpsAgent = new HttpsProxyAgent(httpsProxy);
    }
    
    return config;
};
// Helper functions - Completely rewritten based on working test
async function downloadFile(url, outputPath, onProgress) {
    let retries = 3;
    let lastError = null;
    while (retries > 0) {
        try {
            console.error(chalk.blue(`🔗 Attempting download from: ${url}`));
            
            const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
            console.error(chalk.blue(`🔗 Using HTTPS proxy: ${httpsProxy}`));
            
            // Step 1: Get redirect (just like test script)
            let finalUrl = url;
            try {
                const agent = new HttpsProxyAgent(httpsProxy);
                await axios.get(url, {
                    httpsAgent: agent,
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'curl/8.7.1',
                        'Accept': '*/*'
                    },
                    maxRedirects: 0  // Don't follow redirects automatically
                });
            } catch (error) {
                if (error.response?.status === 302) {
                    finalUrl = error.response.headers.location;
                    console.error(chalk.blue(`📍 Following redirect to CDN: ${finalUrl.substring(0, 100)}...`));
                } else {
                    throw error;
                }
            }
            
            // Step 2: Download from final URL
            const agent = new HttpsProxyAgent(httpsProxy);
            const response = await axios.get(finalUrl, {
                httpsAgent: agent,
                timeout: 300000,
                headers: {
                    'User-Agent': 'curl/8.7.1',
                    'Accept': '*/*'
                },
                responseType: 'stream'
            });
            const totalSize = parseInt(response.headers['content-length'] || '0', 10);
            let downloadedSize = 0;
            const startTime = Date.now();
            console.error(chalk.blue(`📊 Expected file size: ${formatBytes(totalSize)}`));
            // Ensure output directory exists
            await fs.ensureDir(path.dirname(outputPath));
            const writer = createWriteStream(outputPath);
            // Handle stream errors
            writer.on('error', (error) => {
                throw new Error(`Write stream error: ${error.message}`);
            });
            
            response.data.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (onProgress && totalSize > 0) {
                    const percentage = (downloadedSize / totalSize) * 100;
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = downloadedSize / elapsed;
                    const speedStr = formatBytes(speed) + '/s';
                    onProgress({
                        downloaded: downloadedSize,
                        total: totalSize,
                        percentage,
                        speed: speedStr
                    });
                }
            });
            
            response.data.on('error', (error) => {
                throw new Error(`Download stream error: ${error.message}`);
            });
            
            await pipeline(response.data, writer);
            // Verify file was written correctly
            const stats = await fs.stat(outputPath);
            const actualSize = stats.size;
            console.error(chalk.blue(`✅ Download completed. Actual size: ${formatBytes(actualSize)}`));
            if (actualSize === 0) {
                throw new Error('Downloaded file is empty (0 bytes)');
            }
            if (totalSize > 0 && Math.abs(actualSize - totalSize) > 1024) { // Allow 1KB difference
                console.error(chalk.yellow(`⚠️ Size mismatch: expected ${formatBytes(totalSize)}, got ${formatBytes(actualSize)}`));
            }
            return actualSize;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries--;
            
            // Enhanced error logging
            if (error.response) {
                console.error(chalk.red(`❌ Download attempt failed: ${error.response.status} ${error.response.statusText}`));
                console.error(chalk.red(`   Response headers: ${JSON.stringify(error.response.headers, null, 2)}`));
                if (error.response.data && typeof error.response.data === 'string') {
                    console.error(chalk.red(`   Response body: ${error.response.data.substring(0, 500)}`));
                }
            } else {
                console.error(chalk.red(`❌ Download attempt failed: ${lastError.message}`));
            }
            
            if (retries > 0) {
                console.error(chalk.yellow(`🔄 Retrying... (${retries} attempts remaining)`));
                // Clean up partial file
                try {
                    if (await fs.pathExists(outputPath)) {
                        await fs.remove(outputPath);
                    }
                }
                catch (cleanupError) {
                    console.error(chalk.yellow(`⚠️ Failed to clean up partial file: ${cleanupError}`));
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    throw lastError || new Error('Download failed after all retries');
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
async function getHuggingFaceModelInfo(modelId, filename) {
    const apiUrl = `https://huggingface.co/api/models/${modelId}`;
    console.error(chalk.blue(`🔗 Fetching model info from: ${apiUrl}`));
    
    let model;
    
    // Try fetch first
    try {
        const fetchConfig = createFetchConfig();
        const response = await fetch(apiUrl, {
            ...fetchConfig,
            headers: {
                ...fetchConfig.headers,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        model = await response.json();
    } catch (fetchError) {
        console.error(chalk.yellow(`⚠️ Fetch failed, trying axios: ${fetchError.message}`));
        
        // Fallback to axios
        const axiosConfig = createAxiosConfig();
        const response = await axios({
            ...axiosConfig,
            method: 'GET',
            url: apiUrl,
            timeout: 30000, // 30 seconds timeout for API calls
            headers: {
                ...axiosConfig.headers,
                'Accept': 'application/json'
            }
        });
        model = response.data;
    }
    const files = model.siblings || [];
            let targetFile = files.find((f) => f.rfilename === filename);
        if (!targetFile && files.length > 0) {
            // High priority: main model files
            const mainModelPatterns = [
                /^v\d+-\d+-pruned.*\.(safetensors|ckpt)$/,  // v1-5-pruned-emaonly.safetensors
                /^.*-v\d+.*\.(safetensors|ckpt)$/,          // model-v1.5.safetensors
                /^model\.(safetensors|ckpt)$/,              // model.safetensors
                /^.*\d+px.*\.(safetensors|ckpt)$/           // playground-v2.5-1024px-aesthetic.fp16.safetensors
            ];
            
            // Find main model files
            const mainModelFiles = files.filter(f => {
                const name = f.rfilename;
                const isMainPattern = mainModelPatterns.some(pattern => pattern.test(name));
                const isNotComponent = !name.includes('/') && // Root level files only
                                      !name.includes('safety_checker') &&
                                      !name.includes('text_encoder') &&
                                      !name.includes('feature_extractor');
                return isMainPattern && isNotComponent;
            });
            
            // If no main model files found, look for any .safetensors/.ckpt files not in subdirectories
            const fallbackFiles = files.filter(f => {
                const name = f.rfilename;
                const isModelFile = name.endsWith('.safetensors') || name.endsWith('.ckpt');
                const isRootLevel = !name.includes('/');
                return isModelFile && isRootLevel;
            });
            
            // Choose preferring .safetensors over .ckpt, and 'pruned' files
            const candidateFiles = mainModelFiles.length > 0 ? mainModelFiles : fallbackFiles;
            targetFile = candidateFiles.find(f => f.rfilename.includes('pruned') && f.rfilename.endsWith('.safetensors')) ||
                        candidateFiles.find(f => f.rfilename.endsWith('.safetensors')) ||
                        candidateFiles.find(f => f.rfilename.includes('pruned') && f.rfilename.endsWith('.ckpt')) ||
                        candidateFiles.find(f => f.rfilename.endsWith('.ckpt')) ||
                        candidateFiles[0] ||
                        files[0];
        }
    if (!targetFile) {
        throw new Error(`No suitable file found for model ${modelId}`);
    }
    return {
        name: targetFile.rfilename,
        size: targetFile.size || 0,
        downloadUrl: `https://huggingface.co/${modelId}/resolve/main/${targetFile.rfilename}`,
        modelType: await detectModelTypeEnhanced(targetFile.rfilename, model, modelId),
        description: model.description
    };
}
function detectModelType(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('vae'))
        return 'vae';
    if (lower.includes('lora'))
        return 'lora';
    if (lower.includes('controlnet'))
        return 'controlnet';
    if (lower.includes('upscale'))
        return 'upscale';
    if (lower.includes('clip'))
        return 'clip';
    if (lower.includes('unet'))
        return 'unet';
    return 'checkpoint';
}
/**
 * Enhanced model type detection using HuggingFace metadata and sophisticated pattern matching
 */
async function detectModelTypeEnhanced(filename, modelMetadata, modelId) {
    console.error(chalk.blue(`🔍 Enhanced model type detection for: ${filename}`));
    // Priority 1: Use HuggingFace metadata (tags, pipeline_tag, library_name)
    const metadataType = detectTypeFromMetadata(modelMetadata, modelId);
    if (metadataType !== 'unknown') {
        console.error(chalk.green(`✅ Detected type from metadata: ${metadataType}`));
        return metadataType;
    }
    // Priority 2: Enhanced filename pattern matching
    const filenameType = detectTypeFromFilenameEnhanced(filename);
    if (filenameType !== 'unknown') {
        console.error(chalk.green(`✅ Detected type from filename: ${filenameType}`));
        return filenameType;
    }
    // Priority 3: Model ID pattern analysis
    const modelIdType = detectTypeFromModelId(modelId);
    if (modelIdType !== 'unknown') {
        console.error(chalk.green(`✅ Detected type from model ID: ${modelIdType}`));
        return modelIdType;
    }
    // Priority 4: File size heuristics (as last resort)
    const sizeType = detectTypeFromFileSize(filename, modelMetadata.siblings);
    if (sizeType !== 'unknown') {
        console.error(chalk.yellow(`⚠️ Detected type from file size heuristics: ${sizeType}`));
        return sizeType;
    }
    // Fallback to original simple detection
    const fallbackType = detectModelType(filename);
    console.error(chalk.yellow(`⚠️ Using fallback detection: ${fallbackType}`));
    return fallbackType;
}
/**
 * Detect model type from HuggingFace metadata (tags, pipeline_tag, library_name)
 */
function detectTypeFromMetadata(modelMetadata, modelId) {
    const tags = modelMetadata.tags || [];
    const pipelineTag = modelMetadata.pipeline_tag;
    const libraryName = modelMetadata.library_name;
    // Use modelId for additional context if needed
    const modelIdLower = modelId.toLowerCase();
    // Check pipeline tags first (most reliable)
    if (pipelineTag) {
        switch (pipelineTag.toLowerCase()) {
            case 'text-to-image':
            case 'image-to-image':
            case 'unconditional-image-generation':
                // Check if it's actually a specialized model type first
                if (tags.some((tag) => tag.toLowerCase().includes('lora'))) {
                    return 'lora';
                }
                if (tags.some((tag) => tag.toLowerCase().includes('controlnet'))) {
                    return 'controlnet';
                }
                if (tags.some((tag) => ['super-resolution', 'upscaling', 'esrgan'].includes(tag.toLowerCase()))) {
                    return 'upscale';
                }
                return 'checkpoint';
            case 'image-classification':
            case 'object-detection':
                return 'controlnet';
            case 'feature-extraction':
                if (tags.some((tag) => tag.toLowerCase().includes('vae'))) {
                    return 'vae';
                }
                if (tags.some((tag) => tag.toLowerCase().includes('clip'))) {
                    return 'clip';
                }
                break;
        }
    }
    // Check tags for specific model types
    const tagString = tags.join(' ').toLowerCase();
    // LoRA detection (high priority patterns)
    if (tags.some((tag) => ['lora', 'low-rank-adaptation', 'adapter'].includes(tag.toLowerCase())) || tagString.includes('lora')) {
        return 'lora';
    }
    // VAE detection
    if (tags.some((tag) => ['vae', 'variational-autoencoder', 'autoencoder'].includes(tag.toLowerCase())) || tagString.includes('vae')) {
        return 'vae';
    }
    // ControlNet detection
    if (tags.some((tag) => ['controlnet', 'control-net', 'conditioning'].includes(tag.toLowerCase())) || tagString.includes('controlnet')) {
        return 'controlnet';
    }
    // Upscaler detection
    if (tags.some((tag) => ['upscaler', 'super-resolution', 'esrgan', 'real-esrgan'].includes(tag.toLowerCase())) || tagString.includes('upscal')) {
        return 'upscale';
    }
    // CLIP detection
    if (tags.some((tag) => ['clip', 'text-encoder', 'vision-language'].includes(tag.toLowerCase())) || tagString.includes('clip')) {
        return 'clip';
    }
    // UNet detection
    if (tags.some((tag) => ['unet', 'u-net', 'diffusion-model'].includes(tag.toLowerCase())) || tagString.includes('unet')) {
        return 'unet';
    }
    // Library-based detection
    if (libraryName) {
        switch (libraryName.toLowerCase()) {
            case 'diffusers':
                return 'checkpoint';
            case 'transformers':
                return 'clip';
        }
    }
    // Additional model ID context check
    if (modelIdLower.includes('lora') || modelIdLower.includes('adapter')) {
        return 'lora';
    }
    if (modelIdLower.includes('vae')) {
        return 'vae';
    }
    if (modelIdLower.includes('controlnet')) {
        return 'controlnet';
    }
    return 'unknown';
}
/**
 * Enhanced filename pattern matching with priority-based classification
 */
function detectTypeFromFilenameEnhanced(filename) {
    const lower = filename.toLowerCase();
    const basename = lower.replace(/\.(safetensors|ckpt|pt|pth|bin)$/, '');
    // High-priority patterns (most specific first)
    // LoRA patterns (very specific to avoid false positives)
    if (lower.includes('lora') ||
        lower.includes('lycoris') ||
        lower.includes('locon') ||
        lower.includes('loha') ||
        lower.includes('lokr') ||
        basename.match(/[-_](lora|adapter|rank\d+)[-_]/) ||
        basename.match(/lora[-_]/) ||
        basename.match(/[-_]lora$/)) {
        return 'lora';
    }
    // VAE patterns
    if (lower.includes('vae') ||
        lower.includes('autoencoder') ||
        basename.match(/[-_]vae[-_]/) ||
        basename.match(/vae[-_]/) ||
        basename.match(/[-_]vae$/)) {
        return 'vae';
    }
    // ControlNet patterns
    if (lower.includes('controlnet') ||
        lower.includes('control_net') ||
        lower.includes('control-net') ||
        lower.includes('canny') ||
        lower.includes('depth') ||
        lower.includes('openpose') ||
        lower.includes('scribble') ||
        lower.includes('mlsd') ||
        lower.includes('normal') ||
        lower.includes('seg') ||
        basename.match(/[-_]control[-_]/)) {
        return 'controlnet';
    }
    // Upscaler patterns
    if (lower.includes('upscal') ||
        lower.includes('esrgan') ||
        lower.includes('real-esrgan') ||
        lower.includes('swinir') ||
        lower.includes('ldsr') ||
        lower.includes('scunet') ||
        basename.match(/[-_](upscal|esrgan|swinir)[-_]/) ||
        basename.match(/\d+x[-_]?upscal/)) {
        return 'upscale';
    }
    // CLIP patterns
    if (lower.includes('clip') ||
        lower.includes('text_encoder') ||
        lower.includes('text-encoder') ||
        basename.match(/[-_]clip[-_]/) ||
        basename.match(/clip[-_]/) ||
        basename.match(/[-_]clip$/)) {
        return 'clip';
    }
    // UNet patterns
    if (lower.includes('unet') ||
        lower.includes('u-net') ||
        lower.includes('diffusion_pytorch_model') ||
        basename.match(/[-_]unet[-_]/) ||
        basename.match(/unet[-_]/) ||
        basename.match(/[-_]unet$/)) {
        return 'unet';
    }
    return 'unknown';
}
/**
 * Detect model type from model ID patterns
 */
function detectTypeFromModelId(modelId) {
    const lower = modelId.toLowerCase();
    const parts = lower.split('/');
    const repoName = parts[parts.length - 1] || '';
    // LoRA patterns in model ID
    if (lower.includes('lora') ||
        lower.includes('lycoris') ||
        repoName.includes('lora') ||
        repoName.includes('adapter')) {
        return 'lora';
    }
    // VAE patterns in model ID
    if (lower.includes('vae') ||
        repoName.includes('vae') ||
        repoName.includes('autoencoder')) {
        return 'vae';
    }
    // ControlNet patterns in model ID
    if (lower.includes('controlnet') ||
        lower.includes('control-net') ||
        repoName.includes('controlnet') ||
        repoName.includes('control')) {
        return 'controlnet';
    }
    // Upscaler patterns in model ID
    if (lower.includes('upscal') ||
        lower.includes('esrgan') ||
        repoName.includes('upscal') ||
        repoName.includes('esrgan')) {
        return 'upscale';
    }
    return 'unknown';
}
/**
 * Detect model type from file size heuristics (last resort)
 */
function detectTypeFromFileSize(filename, siblings) {
    const targetFile = siblings?.find((f) => f.rfilename === filename);
    if (!targetFile || !targetFile.size) {
        return 'unknown';
    }
    const sizeInMB = targetFile.size / (1024 * 1024);
    // LoRA files are typically small (< 500MB)
    if (sizeInMB < 500 && filename.toLowerCase().includes('safetensors')) {
        // Additional check: if it's small and has certain patterns, likely LoRA
        const lower = filename.toLowerCase();
        if (lower.includes('rank') ||
            lower.includes('dim') ||
            lower.includes('alpha') ||
            sizeInMB < 200) {
            return 'lora';
        }
    }
    // VAE files are typically medium-sized (100MB - 1GB)
    if (sizeInMB > 100 && sizeInMB < 1000) {
        const lower = filename.toLowerCase();
        if (lower.includes('vae') || lower.includes('autoencoder')) {
            return 'vae';
        }
    }
    return 'unknown';
}
// Register model download tools
export async function registerModelDownloadTools(server) {
    // Download HuggingFace model
    server.tool("download_huggingface_model", "Download a model from HuggingFace Hub with automatic ComfyUI detection", {
        modelId: z.string().describe("HuggingFace model ID (e.g., 'runwayml/stable-diffusion-v1-5')"),
        filename: z.string().optional().describe("Specific filename to download (optional)"),
        outputDir: z.string().optional().describe("Output directory for the model (auto-detected if not provided)"),
        comfyuiPath: z.string().optional().describe("Manual ComfyUI installation path override"),
        autoDetect: z.boolean().default(true).describe("Automatically detect ComfyUI installation (default: true)"),
        overwrite: z.boolean().default(false).describe("Overwrite existing file if it exists")
    }, async ({ modelId, filename, outputDir, comfyuiPath, autoDetect, overwrite }) => {
        try {
            console.error(chalk.blue(`📥 Downloading HuggingFace model: ${modelId}`));
            // Determine target directory with auto-detection
            let effectiveOutputDir = outputDir;
            let detectionResult = null;
            if (!effectiveOutputDir && autoDetect) {
                // Auto-detect ComfyUI installation
                detectionResult = await detectComfyUIInstallation(comfyuiPath);
                if (detectionResult.found && detectionResult.modelsPath) {
                    effectiveOutputDir = detectionResult.modelsPath;
                    console.error(chalk.green(`🔍 Auto-detected ComfyUI models directory: ${effectiveOutputDir}`));
                }
                else {
                    return {
                        content: [{
                                type: "text",
                                text: `❌ ComfyUI installation not found. ${detectionResult.description}\n\n` +
                                    `Please either:\n` +
                                    `1. Specify outputDir parameter manually\n` +
                                    `2. Specify comfyuiPath parameter\n` +
                                    `3. Ensure ComfyUI is installed in a standard location\n\n` +
                                    `Expected structure: ComfyUI/models/[checkpoints|loras|vae|etc.]`
                            }],
                        isError: true
                    };
                }
            }
            else if (!effectiveOutputDir) {
                return {
                    content: [{
                            type: "text",
                            text: `❌ No output directory specified and auto-detection is disabled.\n` +
                                `Please provide either outputDir or comfyuiPath parameter.`
                        }],
                    isError: true
                };
            }
            const modelInfo = await getHuggingFaceModelInfo(modelId, filename);
            const targetDir = getModelTypeDirectory(modelInfo.modelType, effectiveOutputDir);
            const outputPath = path.join(targetDir, modelInfo.name);
            // Ensure target directory exists
            await ensureModelDirectory(targetDir);
            // Check if file already exists
            if (await fs.pathExists(outputPath) && !overwrite) {
                return {
                    content: [{
                            type: "text",
                            text: `Model already exists at ${outputPath}. Use overwrite=true to replace it.`
                        }]
                };
            }
            let lastProgress = 0;
            const actualSize = await downloadFile(modelInfo.downloadUrl, outputPath, (progress) => {
                if (progress.percentage - lastProgress >= 10) {
                    console.error(chalk.yellow(`📊 Progress: ${progress.percentage.toFixed(1)}% (${progress.speed})`));
                    lastProgress = progress.percentage;
                }
            });
            console.error(chalk.green(`✅ Downloaded: ${modelInfo.name}`));
            // Build success message with detection info
            let successMessage = `Successfully downloaded ${modelInfo.name} to ${outputPath}\n`;
            successMessage += `Expected Size: ${formatBytes(modelInfo.size)}\n`;
            successMessage += `Actual Size: ${formatBytes(actualSize)}\n`;
            successMessage += `Type: ${modelInfo.modelType}\n`;
            if (detectionResult && detectionResult.found) {
                successMessage += `\n🔍 ComfyUI Detection:\n`;
                successMessage += `  Installation: ${detectionResult.installationType}\n`;
                successMessage += `  Path: ${detectionResult.comfyuiPath}\n`;
                successMessage += `  Method: ${detectionResult.detectionMethod}`;
            }
            return {
                content: [{
                        type: "text",
                        text: successMessage
                    }]
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`❌ Download failed: ${errorMsg}`));
            return {
                content: [{
                        type: "text",
                        text: `Failed to download model: ${errorMsg}`
                    }],
                isError: true
            };
        }
    });
    // List installed models
    server.tool("list_installed_models", "List all installed models by type with automatic ComfyUI detection", {
        modelsDir: z.string().optional().describe("Models directory path (auto-detected if not provided)"),
        comfyuiPath: z.string().optional().describe("Manual ComfyUI installation path override"),
        modelType: z.string().optional().describe("Filter by model type (checkpoint, lora, vae, etc.)"),
        autoDetect: z.boolean().default(true).describe("Automatically detect ComfyUI installation (default: true)")
    }, async ({ modelsDir, comfyuiPath, modelType, autoDetect }) => {
        try {
            // Determine models directory with auto-detection
            let effectiveModelsDir = modelsDir;
            let detectionResult = null;
            if (!effectiveModelsDir && autoDetect) {
                // Auto-detect ComfyUI installation
                detectionResult = await detectComfyUIInstallation(comfyuiPath);
                if (detectionResult.found && detectionResult.modelsPath) {
                    effectiveModelsDir = detectionResult.modelsPath;
                    console.error(chalk.green(`🔍 Auto-detected ComfyUI models directory: ${effectiveModelsDir}`));
                }
                else {
                    return {
                        content: [{
                                type: "text",
                                text: `❌ ComfyUI installation not found. ${detectionResult.description}\n\n` +
                                    `Please either:\n` +
                                    `1. Specify modelsDir parameter manually\n` +
                                    `2. Specify comfyuiPath parameter\n` +
                                    `3. Ensure ComfyUI is installed in a standard location`
                            }],
                        isError: true
                    };
                }
            }
            else if (!effectiveModelsDir) {
                return {
                    content: [{
                            type: "text",
                            text: `❌ No models directory specified and auto-detection is disabled.\n` +
                                `Please provide either modelsDir or comfyuiPath parameter.`
                        }],
                    isError: true
                };
            }
            // Enhanced model type mapping with singular/plural support
            const modelTypeMapping = {
                'lora': 'loras',
                'loras': 'loras',
                'checkpoint': 'checkpoints',
                'checkpoints': 'checkpoints',
                'vae': 'vae',
                'controlnet': 'controlnet',
                'upscale_model': 'upscale_models',
                'upscale_models': 'upscale_models',
                'clip': 'clip',
                'unet': 'unet',
                'embedding': 'embeddings',
                'embeddings': 'embeddings',
                'hypernetwork': 'hypernetworks',
                'hypernetworks': 'hypernetworks'
            };
            // Determine model types to scan
            let modelTypesToScan;
            if (modelType) {
                const normalizedType = modelTypeMapping[modelType.toLowerCase()];
                if (!normalizedType) {
                    return {
                        content: [{
                                type: "text",
                                text: `❌ Unknown model type: ${modelType}\n\n` +
                                    `Supported types: ${Object.keys(modelTypeMapping).join(', ')}`
                            }],
                        isError: true
                    };
                }
                modelTypesToScan = [normalizedType];
            }
            else {
                // Default to all standard model types
                modelTypesToScan = ['checkpoints', 'loras', 'vae', 'controlnet', 'upscale_models', 'clip', 'unet', 'embeddings', 'hypernetworks'];
            }
            const results = {};
            const scanResults = [];
            // Enhanced file extension support
            const supportedExtensions = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin', '.pkl'];
            for (const type of modelTypesToScan) {
                const typeDir = path.join(effectiveModelsDir, type);
                console.error(chalk.gray(`🔍 Scanning ${type} directory: ${typeDir}`));
                try {
                    if (await fs.pathExists(typeDir)) {
                        const files = await fs.readdir(typeDir);
                        const modelFiles = files.filter(f => {
                            const hasValidExtension = supportedExtensions.some(ext => f.toLowerCase().endsWith(ext));
                            const isNotPlaceholder = !f.toLowerCase().includes('put_') && !f.toLowerCase().includes('_here');
                            return hasValidExtension && isNotPlaceholder;
                        });
                        results[type] = modelFiles;
                        scanResults.push({
                            type,
                            path: typeDir,
                            found: true,
                            fileCount: modelFiles.length
                        });
                        console.error(chalk.green(`✅ Found ${modelFiles.length} ${type} models`));
                    }
                    else {
                        results[type] = [];
                        scanResults.push({
                            type,
                            path: typeDir,
                            found: false,
                            fileCount: 0,
                            error: 'Directory does not exist'
                        });
                        console.error(chalk.yellow(`⚠️ ${type} directory not found: ${typeDir}`));
                    }
                }
                catch (error) {
                    results[type] = [];
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    scanResults.push({
                        type,
                        path: typeDir,
                        found: false,
                        fileCount: 0,
                        error: errorMsg
                    });
                    console.error(chalk.red(`❌ Error scanning ${type}: ${errorMsg}`));
                }
            }
            const summary = Object.entries(results)
                .map(([type, files]) => `${type}: ${files.length} models`)
                .join('\n');
            const detailed = Object.entries(results)
                .map(([type, files]) => {
                if (files.length === 0)
                    return `\n${type.toUpperCase()}:\n  No models found`;
                return `\n${type.toUpperCase()}:\n${files.map(f => `  - ${f}`).join('\n')}`;
            })
                .join('\n');
            // Build enhanced response with debugging info
            let responseText = `Model Summary:\n${summary}\n\nDetailed List:${detailed}`;
            // Add scan results for debugging
            const scanSummary = scanResults.map(result => {
                const status = result.found ? '✅' : '❌';
                const errorInfo = result.error ? ` (${result.error})` : '';
                return `  ${status} ${result.type}: ${result.fileCount} files${errorInfo}`;
            }).join('\n');
            responseText += `\n\n🔍 Scan Results:\n${scanSummary}`;
            if (detectionResult && detectionResult.found) {
                responseText += `\n\n🔍 ComfyUI Detection:\n`;
                responseText += `  Installation: ${detectionResult.installationType}\n`;
                responseText += `  Path: ${detectionResult.comfyuiPath}\n`;
                responseText += `  Models Directory: ${effectiveModelsDir}\n`;
                responseText += `  Method: ${detectionResult.detectionMethod}`;
            }
            // Add supported extensions info
            responseText += `\n\n📋 Supported Extensions: ${supportedExtensions.join(', ')}`;
            // Add model type mapping info if specific type was requested
            if (modelType) {
                const normalizedType = modelTypeMapping[modelType.toLowerCase()];
                responseText += `\n\n🔄 Type Mapping: "${modelType}" → "${normalizedType}"`;
            }
            return {
                content: [{
                        type: "text",
                        text: responseText
                    }]
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return {
                content: [{
                        type: "text",
                        text: `Failed to list models: ${errorMsg}`
                    }],
                isError: true
            };
        }
    });
    console.error(chalk.green("✅ Model download tools registered"));
}
//# sourceMappingURL=modelDownload.js.map