

import { GoogleGenAI, GenerateContentResponse, Part, GenerateContentParameters } from "@google/genai";
import { Mistral } from '@mistralai/mistralai'; // Import the Mistral client
import { DiscussionMessage, ExpertRole, GeminiResponseJson, UploadedFile, SupportedModel, AiProvider } from '../types';
import { EXPERTS, INITIAL_SYSTEM_PROMPT_TEMPLATE, FISH_SCRUM_ANALYSIS_PROMPT_SECTION, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_MODELS } from '../constants';
import useAgileBloomStore from '../store/useAgileBloomStore';

// --- Client Initialization ---
const GEMINI_API_KEY = process.env.API_KEY || "NO_GEMINI_KEY_FOUND";
const geminiAi = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// As per user guidance, import and instantiate the Mistral client.
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "NO_MISTRAL_KEY_FOUND";
const mistralClient = new Mistral({
    apiKey: MISTRAL_API_KEY
});


const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// --- Helper Functions ---

function buildSystemPrompt(
  currentTopic: string | null,
  discussionHistory: DiscussionMessage[],
  numThoughts: number,
  memoryContext: string[],
  emulateExpertAs: ExpertRole | undefined,
  initialContext: string | null | undefined,
  assignedTasksContext: string | null | undefined,
  currentUserMessageOrCommand: string
): string {
    let emulationInstructions = "";
    let responsePersonaInstruction = "Determine who should respond based on the flow of an Agile Daily Scrum, the current user input/command, and conversation history.";
    let specificTaskInstructions = "";

    if (emulateExpertAs) {
        const expertToEmulate = EXPERTS[emulateExpertAs];
        emulationInstructions = `\nYou are currently emulating: ${expertToEmulate.name} (${expertToEmulate.emoji}). Your response MUST be from this expert's perspective.`;
        responsePersonaInstruction = `You MUST respond as ${expertToEmulate.name}. The "expert" field in your JSON output MUST be "${expertToEmulate.name}".`;

        if (emulateExpertAs === ExpertRole.ScrumLeader && currentUserMessageOrCommand.toLowerCase().startsWith("/backlog")) {
            specificTaskInstructions = `\nFollow these specific instructions for the FISH-Scrum Analysis: \n${FISH_SCRUM_ANALYSIS_PROMPT_SECTION}\n\nApply this FISH-Scrum framework to the current topic: "${currentTopic || "No topic set. Please analyze the general situation or prompt user for a topic."}". The full analysis should be in the 'work' field of your JSON response.`;
        }
    }

    const formattedMemory = memoryContext.length > 0
        ? memoryContext.map(entry => `- ${entry}`).join('\n')
        : "No key points remembered yet.";

    const additionalContextSection = (initialContext && initialContext.trim() !== '')
        ? `\n--- Start of Additional Context ---\nThis initial context was provided by the user to set the stage for the entire discussion:\n\n${initialContext.trim()}\n\n--- End of Additional Context ---\n`
        : "";
    
    const assignedTasksSection = (assignedTasksContext && assignedTasksContext.trim() !== '')
        ? `\n--- Start of Your Assigned Tasks ---\nThis is a list of tasks currently assigned to you. When responding to commands like /show-work, please focus your response on these tasks.\n\n${assignedTasksContext.trim()}\n--- End of Your Assigned Tasks ---\n`
        : "";

    const historyFormatter = (discussion: DiscussionMessage[], maxTurns = 10): string => {
        return discussion.slice(-maxTurns).map(msg => `${msg.expert.name} (${msg.expert.emoji}): ${msg.text}${msg.work ? `\nWORK:\n${msg.work}` : ''}${msg.searchCitations && msg.searchCitations.length > 0 ? `\n(Sources: ${msg.searchCitations.map(c => c.title).join(', ')})` : ''}`).join('\n\n');
    }

    return INITIAL_SYSTEM_PROMPT_TEMPLATE
        .replace('{input_topic}', currentTopic || "No topic set yet. Await user to set a topic with /topic command.")
        .replace(new RegExp('{num_thoughts}', 'g'), String(numThoughts))
        .replace('{history}', historyFormatter(discussionHistory))
        .replace('{{emulation_instructions}}', emulationInstructions)
        .replace('{{response_persona_instruction}}', responsePersonaInstruction)
        .replace('{{specific_task_instructions}}', specificTaskInstructions)
        .replace('{persistent_memory_context}', formattedMemory)
        .replace('{{additional_context_section}}', additionalContextSection)
        .replace('{{assigned_tasks_section}}', assignedTasksSection);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let retries = 0;
    let lastError: Error | null = null;
    while (retries <= MAX_RETRIES) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const errorMessage = lastError.message.toLowerCase();
            console.error(`Error calling AI API (Attempt ${retries + 1}/${MAX_RETRIES + 1}):`, lastError);

            if (errorMessage.includes('quota exceeded')) {
                console.error("Quota exceeded error detected. Halting further API requests.");
                useAgileBloomStore.getState().setQuotaExceeded(true);
                throw new Error("Failed to call the AI API, quota exceeded. Please try again later.");
            }
            if (retries === MAX_RETRIES) {
                throw new Error(`AI API Error (Max retries reached): ${lastError.message}`);
            }
            const delay = INITIAL_DELAY_MS * (2 ** retries) + Math.random() * 1000;
            console.log(`Retrying AI API call in ${delay.toFixed(0)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
        }
    }
    throw new Error(lastError?.message || "AI API Error: Exhausted retries but did not return or throw explicitly from loop.");
}

// --- Provider-Specific Implementations ---

async function generateGeminiResponse(
  systemPromptText: string,
  userMessage: string,
  modelId: string,
  useGoogleSearch: boolean,
  uploadedImageFile?: UploadedFile | null,
): Promise<GeminiResponseJson> {

  const contentParts: Part[] = [];
  if (uploadedImageFile && uploadedImageFile.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(uploadedImageFile.mimeType)) {
      contentParts.push({ inlineData: { mimeType: uploadedImageFile.mimeType, data: uploadedImageFile.base64Data } });
  }
  contentParts.push({ text: userMessage || "Please analyze the provided content." });

  const apiRequest: GenerateContentParameters = {
      model: modelId,
      contents: { parts: contentParts },
      config: { systemInstruction: systemPromptText },
  };

  if (useGoogleSearch) {
      apiRequest.config!.tools = [{ googleSearch: {} }];
      console.log(`Google Search tool enabled for this request on model ${modelId}.`);
  } else {
      apiRequest.config!.responseMimeType = "application/json";
  }

  const response: GenerateContentResponse = await geminiAi.models.generateContent(apiRequest);
  const rawResponseText = response.text;
  let groundingData: Array<{ web: { uri: string; title: string; } }> | null = null;

  if (useGoogleSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      groundingData = response.candidates[0].groundingMetadata.groundingChunks
          .filter(chunk => chunk.web?.uri && chunk.web?.title)
          .map(chunk => ({ web: { uri: chunk.web!.uri!, title: chunk.web!.title! } }));
      if (groundingData.length === 0) groundingData = null;
  }
  
  if (!rawResponseText) {
      throw new Error("Received empty response from Gemini API");
  }
  
  let jsonStr = rawResponseText.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match?.[2]) {
      jsonStr = match[2].trim();
  }

  const parsedData = JSON.parse(jsonStr) as Omit<GeminiResponseJson, 'groundingData'>;
  return { ...parsedData, groundingData };
}

async function generateMistralResponse(
    systemPromptText: string,
    discussionHistory: DiscussionMessage[],
    userMessage: string,
    modelId: string,
): Promise<GeminiResponseJson> {

    const mistralMessages = discussionHistory.map(msg => {
        let role: 'user' | 'assistant' | 'system' = 'assistant';
        if (msg.expert.name === ExpertRole.User) role = 'user';
        // System messages are handled by the main system prompt, not in history for Mistral
        if (msg.expert.name === ExpertRole.System) return null;

        return { role, content: `${msg.expert.name}: ${msg.text}${msg.work ? `\nWORK:\n${msg.work}` : ''}` };
    }).filter(Boolean) as { role: 'user' | 'assistant', content: string }[];

    const messages: any[] = [ // eslint-disable-line @typescript-eslint/no-explicit-any
        { role: 'system', content: systemPromptText },
        ...mistralMessages,
        { role: 'user', content: userMessage }
    ];

    try {
        // Use the correct method for Mistral SDK v1.7.2
        const response = await mistralClient.chat.complete({
            model: modelId,
            messages: messages,
            responseFormat: { type: 'json_object' }
        });

        const responseContent = response.choices[0].message.content;
        if (typeof responseContent !== 'string') {
            throw new Error("Mistral response content is not a string.");
        }

        return JSON.parse(responseContent) as GeminiResponseJson;
    } catch (error) {
        // Enhanced error handling for Mistral API
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Mistral API Error:', errorMessage);
        
        // Check for common Mistral API errors
        if (errorMessage.includes('API key')) {
            throw new Error(`Mistral API key error: ${errorMessage}. Please check your MISTRAL_API_KEY environment variable.`);
        }
        if (errorMessage.includes('model')) {
            throw new Error(`Mistral model error: ${errorMessage}. Model '${modelId}' may not be available.`);
        }
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('capacity exceeded')) {
            // For capacity/quota issues, suggest using a smaller model
            const alternativeModels = ['mistral-small-latest', 'open-mixtral-8x7b'];
            const currentModelIndex = alternativeModels.indexOf(modelId);
            const suggestedModel = currentModelIndex === -1 ? alternativeModels[0] :
                                 currentModelIndex < alternativeModels.length - 1 ? alternativeModels[currentModelIndex + 1] : null;
            
            const suggestion = suggestedModel ?
                ` Try switching to '${suggestedModel}' which may have better availability.` :
                ' Try switching to a smaller Mistral model or use Gemini instead.';
            
            throw new Error(`Mistral API capacity/quota exceeded for model '${modelId}'.${suggestion} Original error: ${errorMessage}`);
        }
        
        throw new Error(`Mistral API Error: ${errorMessage}`);
    }
}


// --- Main Exported Function (Router) ---

export async function getAiResponse(
  currentTopic: string | null,
  currentUserMessageOrCommand: string, 
  discussionHistory: DiscussionMessage[],
  numThoughts: number,
  memoryContext: string[],
  modelId: string,
  emulateExpertAs?: ExpertRole,
  uploadedFile?: UploadedFile | null, // Note: Mistral implementation doesn't support images yet
  initialContext?: string | null,
  assignedTasksContext?: string | null
): Promise<GeminiResponseJson> {
  
    if (useAgileBloomStore.getState().isQuotaExceeded) {
        throw new Error("All AI requests are currently halted due to an API quota issue.");
    }

    const modelInfo = SUPPORTED_MODELS.find(m => m.id === modelId);
    if (!modelInfo) {
        throw new Error(`Model with ID '${modelId}' not found in supported models list.`);
    }

    const systemPrompt = buildSystemPrompt(
        currentTopic, discussionHistory, numThoughts, memoryContext,
        emulateExpertAs, initialContext, assignedTasksContext, currentUserMessageOrCommand
    );

    const aiCall = async (): Promise<GeminiResponseJson> => {
        switch(modelInfo.provider) {
            case AiProvider.Gemini:
                const useGoogleSearch = currentUserMessageOrCommand.toLowerCase().startsWith("/ask") && modelInfo.supportsSearch;
                return await generateGeminiResponse(systemPrompt, currentUserMessageOrCommand, modelId, useGoogleSearch, uploadedFile);
            
            case AiProvider.Mistral:
                // Note: Image data from uploadedFile is currently ignored for Mistral.
                return await generateMistralResponse(systemPrompt, discussionHistory, currentUserMessageOrCommand, modelId);
            
            default:
                throw new Error(`Unsupported AI provider: ${modelInfo.provider}`);
        }
    };
    
    try {
        const result = await withRetry(aiCall);
         if (!result.expert || !EXPERTS[result.expert] || !result.message) {
            throw new Error(`Received malformed JSON response from AI. Structure: ${Object.keys(result)}.`);
        }
        if (emulateExpertAs && result.expert !== emulateExpertAs) {
            console.warn(`AI was asked to emulate ${emulateExpertAs} but responded as ${result.expert}. Using AI's choice.`);
        }
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof SyntaxError && message.includes('JSON')) {
           throw new Error(`Failed to parse JSON response from AI: "${message}"`);
        }
        throw error; // Re-throw other errors after retry logic
    }
}
