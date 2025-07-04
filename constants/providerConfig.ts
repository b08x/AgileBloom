import { AIModelConfig, AiProvider } from '../types';

export const AVAILABLE_MODELS: AIModelConfig[] = [
    // --- Google Gemini Models ---
    { 
        id: 'gemini-2.5-flash', 
        name: 'Gemini 2.5 Flash', 
        provider: AiProvider.Google, 
        description: 'A fast and versatile model with Google Search, suitable for a wide range of applications.', 
        supportsSearch: true,
        supportsVision: true,
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.7 },
            { id: 'topP', name: 'Top-P', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.95 },
            { id: 'topK', name: 'Top-K', type: 'slider', min: 1, max: 100, step: 1, defaultValue: 40 },
        ]
    },
    { 
        id: 'gemini-2.0-flash', 
        name: 'Gemini 2.0 Flash', 
        provider: AiProvider.Google, 
        description: 'Google\'s most capable model, for highly complex tasks that require top-tier reasoning.', 
        supportsSearch: true,
        supportsVision: true,
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.8 },
            { id: 'topP', name: 'Top-P', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.95 },
            { id: 'topK', name: 'Top-K', type: 'slider', min: 1, max: 100, step: 1, defaultValue: 40 },
        ]
    },
    // --- Mistral Models ---
    { 
        id: 'mistral-large-2411', 
        name: 'Mistral Large 2411', 
        provider: AiProvider.Mistral, 
        description: 'Top-tier reasoning capacities, for complex, specialized tasks.', 
        supportsSearch: false,
        supportsVision: false,
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.7 },
        ]
    },
    { 
        id: 'mistral-medium-2506',
        name: 'Mistral Medium 2506',
        provider: AiProvider.Mistral,
        description: 'Fast and cost-effective, ideal for high-throughput, low-latency workloads.', 
        supportsSearch: false,
        supportsVision: false,
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.7 },
        ]
    },
    // --- OpenAI Models ---
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: AiProvider.OpenAI,
        description: 'The latest and most advanced model from OpenAI, with excellent vision capabilities.',
        supportsSearch: false,
        supportsVision: true,
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
            { id: 'topP', name: 'Top-P', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 1 },
        ]
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: AiProvider.OpenAI,
        description: 'A fast and capable model, optimized for dialogue and general tasks.',
        supportsSearch: false,
        supportsVision: false,
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
            { id: 'topP', name: 'Top-P', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 1 },
        ]
    },
    // --- OpenRouter Models ---
    {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini (via OpenRouter)',
        provider: AiProvider.OpenRouter,
        description: 'GPT-4o proxied through OpenRouter.',
        supportsSearch: false,
        supportsVision: true,
        parameters: [
             { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
        ]
    },
    {
        id: 'google/gemma-3-27b-it',
        name: 'Gemini Gemma 3-27b-it (via OpenRouter)',
        provider: AiProvider.OpenRouter,
        description: 'Gemini 1.5 Flash proxied through OpenRouter.',
        supportsSearch: false,
        supportsVision: true,
        parameters: [
             { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
        ]
    },
];
