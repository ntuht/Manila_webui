/**
 * ONNX Neural Network AI Strategy
 *
 * Loads the trained manila_brain.onnx model and uses it for inference.
 * Uses the encoder and action-map from @manila/rl to translate between
 * engine state/actions and the model's tensor format.
 */

import * as ort from 'onnxruntime-web';
import { encodeState, OBS_DIM } from '@manila/rl';
import { buildActionMask, idToAction, ACTION_DIM } from '@manila/rl';
import type { GameState, Action } from '@manila/engine';
import { getValidActions } from '@manila/engine';

// Configure ONNX Runtime WASM for Vite dev server:
// - wasmPaths: serve .wasm files from public/models/
// - numThreads=1: disable multi-threading to avoid .mjs worker dynamic imports
//   that Vite intercepts and breaks
// - proxy=false: disable JSEP proxy backend
ort.env.wasm.wasmPaths = '/models/';
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

export class OnnxAIStrategy {
    private session: ort.InferenceSession | null = null;
    private loading: Promise<void> | null = null;

    /**
     * Initialize the ONNX inference session.
     * Lazy: call this before first inference if not already loaded.
     */
    async init(): Promise<void> {
        if (this.session) return;
        if (this.loading) {
            await this.loading;
            return;
        }

        this.loading = (async () => {
            try {
                console.log('[ONNX AI] Loading model...');
                this.session = await ort.InferenceSession.create('/models/manila_brain.onnx', {
                    executionProviders: ['wasm'],
                });
                console.log('[ONNX AI] Model loaded successfully');
                console.log('[ONNX AI] Input names:', this.session.inputNames);
                console.log('[ONNX AI] Output names:', this.session.outputNames);
            } catch (err) {
                console.error('[ONNX AI] Failed to load model:', err);
                throw err;
            }
        })();

        await this.loading;
    }

    /**
     * Select the best action for the given player using ONNX inference.
     */
    async selectAction(state: GameState, playerId: string): Promise<Action> {
        await this.init();

        const validActions = getValidActions(state);
        if (validActions.length === 0) {
            throw new Error(`No valid actions for player ${playerId}`);
        }

        // If only one valid action (but NOT PLACE_SHIPS which needs combo expansion)
        if (validActions.length === 1 && validActions[0].type !== 'PLACE_SHIPS') {
            return validActions[0];
        }

        // Encode state observation
        const obs = encodeState(state, playerId);

        // Build action mask
        const mask = buildActionMask(validActions, state);

        // Create tensors
        const obsTensor = new ort.Tensor('float32', obs, [1, OBS_DIM]);
        const maskFloat = new Float32Array(ACTION_DIM);
        for (let i = 0; i < ACTION_DIM; i++) {
            maskFloat[i] = mask[i];
        }
        const maskTensor = new ort.Tensor('float32', maskFloat, [1, ACTION_DIM]);

        // Run inference
        const feeds: Record<string, ort.Tensor> = {
            obs: obsTensor,
            action_mask: maskTensor,
        };

        const results = await this.session!.run(feeds);

        // Get action logits
        const logitsOutput = results['action_logits'] ?? results[this.session!.outputNames[0]];
        const logits = logitsOutput.data as Float32Array;

        // Apply mask and find best action (masked softmax / argmax)
        let bestId = -1;
        let bestScore = -Infinity;
        for (let i = 0; i < ACTION_DIM; i++) {
            if (mask[i] && logits[i] > bestScore) {
                bestScore = logits[i];
                bestId = i;
            }
        }

        if (bestId === -1) {
            // Fallback: random valid action
            console.warn('[ONNX AI] No masked action found, using random fallback');
            return validActions[Math.floor(Math.random() * validActions.length)];
        }

        // Convert action ID back to engine Action
        return idToAction(bestId, state, validActions);
    }

    /**
     * Check if the model is loaded
     */
    isReady(): boolean {
        return this.session !== null;
    }
}

// Singleton instance
export const onnxAI = new OnnxAIStrategy();
