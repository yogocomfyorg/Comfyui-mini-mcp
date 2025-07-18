import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
/**
 * Comprehensive ComfyUI installation detection
 * Consolidates detection logic from multiple tools
 */
export async function detectComfyUIInstallation(customPath) {
    console.error(chalk.blue("🔍 Detecting ComfyUI installation..."));
    // Priority 1: Use custom path if provided
    if (customPath) {
        const result = await validateComfyUIPath(customPath);
        if (result.found) {
            console.error(chalk.green(`✅ Using custom ComfyUI path: ${customPath}`));
            return result;
        }
        else {
            console.error(chalk.yellow(`⚠️ Custom path invalid: ${customPath}`));
        }
    }
    // Priority 2: Auto-detection from current working directory
    const cwd = process.cwd();
    console.error(chalk.gray(`🔍 Auto-detecting from: ${cwd}`));
    // Detection patterns (ordered by likelihood)
    const detectionPatterns = [
        // Sandbox patterns (most likely for user's setup)
        'sandbox/ComfyUI_Sandbox_CUDA126/ComfyUI_CUDA126_SageAttention/ComfyUI',
        'sandbox/ComfyUI_Sandbox_CUDA126/ComfyUI',
        'sandbox/ComfyUI_Sandbox_CUDA126',
        // Alternative sandbox structures
        'ComfyUI_Sandbox_CUDA126/ComfyUI_CUDA126_SageAttention/ComfyUI',
        'ComfyUI_Sandbox_CUDA126/ComfyUI',
        'ComfyUI_Sandbox_CUDA126',
        // Standard ComfyUI installations
        'ComfyUI',
        'comfyui',
        // Nested patterns
        'sandbox/ComfyUI',
        'sandbox/comfyui',
        // Parent directory patterns
        '../sandbox/ComfyUI_Sandbox_CUDA126/ComfyUI_CUDA126_SageAttention/ComfyUI',
        '../sandbox/ComfyUI_Sandbox_CUDA126/ComfyUI',
        '../sandbox/ComfyUI_Sandbox_CUDA126',
        '../ComfyUI',
        // Deep searches
        '../../sandbox/ComfyUI_Sandbox_CUDA126/ComfyUI',
        '../../ComfyUI'
    ];
    for (const pattern of detectionPatterns) {
        const testPath = path.resolve(cwd, pattern);
        const result = await validateComfyUIPath(testPath);
        if (result.found) {
            const relativePath = path.relative(cwd, testPath) || '.';
            console.error(chalk.green(`✅ Auto-detected ComfyUI: ${relativePath}`));
            return {
                ...result,
                detectionMethod: `auto-detection: ${pattern}`
            };
        }
    }
    // Priority 3: Check server state for cached paths
    try {
        const serverStatePath = path.join(cwd, 'state', 'server-state.json');
        if (fs.existsSync(serverStatePath)) {
            const serverState = await fs.readJson(serverStatePath);
            const sandboxPath = serverState?.snapshots?.[0]?.data?.configuration?.sandboxPath;
            if (sandboxPath) {
                const result = await validateComfyUIPath(sandboxPath);
                if (result.found) {
                    console.error(chalk.green(`✅ Using cached server path: ${sandboxPath}`));
                    return {
                        ...result,
                        detectionMethod: 'server-state-cache'
                    };
                }
            }
        }
    }
    catch (error) {
        // Silently continue if server state can't be read
    }
    // No valid ComfyUI installation found
    return {
        found: false,
        installationType: 'unknown',
        confidence: 0,
        detectionMethod: 'none',
        description: 'No ComfyUI installation detected. Please specify comfyuiPath or ensure ComfyUI is installed in a standard location.'
    };
}
/**
 * Validate a potential ComfyUI installation path
 */
async function validateComfyUIPath(testPath) {
    try {
        if (!fs.existsSync(testPath)) {
            return createFailureResult(testPath, 'Directory does not exist');
        }
        const validation = await validateComfyUIStructure(testPath);
        if (!validation.isValid) {
            return createFailureResult(testPath, 'Invalid ComfyUI structure');
        }
        // Determine installation type
        let installationType = 'unknown';
        let confidence = 0;
        if (testPath.includes('sandbox') && testPath.includes('CUDA126')) {
            installationType = 'sandbox';
            confidence = 0.9;
        }
        else if (validation.hasMainPy && validation.hasComfyDir) {
            installationType = 'standard';
            confidence = 0.8;
        }
        else if (validation.hasMainPy) {
            installationType = 'portable';
            confidence = 0.7;
        }
        const modelsPath = path.join(testPath, 'models');
        return {
            found: true,
            comfyuiPath: testPath,
            modelsPath,
            installationType,
            confidence,
            detectionMethod: 'validation',
            description: `Valid ComfyUI installation (${installationType})`
        };
    }
    catch (error) {
        return createFailureResult(testPath, `Validation error: ${error}`);
    }
}
/**
 * Validate ComfyUI directory structure
 */
export async function validateComfyUIStructure(comfyuiPath) {
    const hasMainPy = fs.existsSync(path.join(comfyuiPath, 'main.py'));
    const hasComfyDir = fs.existsSync(path.join(comfyuiPath, 'comfy'));
    const modelsDir = path.join(comfyuiPath, 'models');
    const hasModelsDir = fs.existsSync(modelsDir);
    let modelsSubdirs = [];
    if (hasModelsDir) {
        try {
            const entries = await fs.readdir(modelsDir);
            modelsSubdirs = entries.filter(entry => fs.statSync(path.join(modelsDir, entry)).isDirectory());
        }
        catch (error) {
            // Continue with empty subdirs if can't read
        }
    }
    const isValid = hasMainPy || hasComfyDir;
    return {
        isValid,
        hasMainPy,
        hasComfyDir,
        hasModelsDir,
        modelsSubdirs
    };
}
/**
 * Get the models directory path for a ComfyUI installation
 */
export function getComfyUIModelsPath(comfyuiPath) {
    return path.join(comfyuiPath, 'models');
}
/**
 * Create a failure result for detection
 */
function createFailureResult(testPath, reason) {
    return {
        found: false,
        installationType: 'unknown',
        confidence: 0,
        detectionMethod: 'validation-failed',
        description: `${reason}: ${testPath}`
    };
}
/**
 * Get model directory for specific model type with enhanced mapping
 */
export function getModelTypeDirectory(modelType, modelsBasePath) {
    const typeMap = {
        // Main model types
        'checkpoint': 'checkpoints',
        'vae': 'vae',
        'lora': 'loras',
        'controlnet': 'controlnet',
        'upscale': 'upscale_models',
        'clip': 'clip',
        'unet': 'unet',
        // Alternative names and aliases
        'diffusion': 'checkpoints',
        'stable-diffusion': 'checkpoints',
        'sdxl': 'checkpoints',
        'sd15': 'checkpoints',
        'flux': 'checkpoints',
        'autoencoder': 'vae',
        'variational-autoencoder': 'vae',
        'adapter': 'loras',
        'low-rank-adaptation': 'loras',
        'lycoris': 'loras',
        'locon': 'loras',
        'loha': 'loras',
        'lokr': 'loras',
        'control-net': 'controlnet',
        'control_net': 'controlnet',
        'conditioning': 'controlnet',
        'upscaler': 'upscale_models',
        'super-resolution': 'upscale_models',
        'esrgan': 'upscale_models',
        'real-esrgan': 'upscale_models',
        'swinir': 'upscale_models',
        'text-encoder': 'clip',
        'text_encoder': 'clip',
        'vision-language': 'clip',
        'u-net': 'unet',
        'diffusion-model': 'unet',
        // Unknown/fallback
        'unknown': 'checkpoints'
    };
    const mappedType = typeMap[modelType.toLowerCase()] || typeMap[modelType] || 'checkpoints';
    const targetPath = path.join(modelsBasePath, mappedType);
    console.error(chalk.blue(`📁 Mapping model type '${modelType}' to directory: ${mappedType}`));
    return targetPath;
}
/**
 * Ensure model directory exists
 */
export async function ensureModelDirectory(modelPath) {
    await fs.ensureDir(modelPath);
}
//# sourceMappingURL=comfyuiDetection.js.map