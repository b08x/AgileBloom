


import { GoogleGenAI, GenerateContentResponse, Part, GenerateContentParameters } from "@google/genai";
import { DiscussionMessage, ExpertRole, GeminiResponseJson, UploadedFile, SupportedModel } from '../types';
import { EXPERTS, INITIAL_SYSTEM_PROMPT_TEMPLATE, FISH_SCRUM_ANALYSIS_PROMPT_SECTION, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_MODELS } from '../constants';
import useAgileBloomStore from '../store/useAgileBloomStore';

const API_KEY = process.env.API_KEY;

if (!API_KEY || API_KEY === "NO_KEY_FOUND") { // Check at module load
  console.error("Gemini API Key not found at module load. Please set process.env.API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "NO_KEY_FOUND_RUNTIME" });


const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

function formatHistoryForPrompt(discussion: DiscussionMessage[], maxTurns = 10): string {
  return discussion
    .slice(-maxTurns)
    .map(msg => `${msg.expert.name} (${msg.expert.emoji}): ${msg.text}${msg.work ? `\nWORK:\n${msg.work}` : ''}${msg.searchCitations && msg.searchCitations.length > 0 ? `\n(Sources: ${msg.searchCitations.map(c => c.title).join(', ')})` : ''}`)
    .join('\n\n');
}

export async function generateExpertResponse(
  currentTopic: string | null,
  currentUserMessageOrCommand: string, 
  discussionHistory: DiscussionMessage[],
  numThoughts: number,
  memoryContext: string[],
  modelId: string,
  emulateExpertAs?: ExpertRole,
  uploadedImageFile?: UploadedFile | null,
  initialContext?: string | null,
  assignedTasksContext?: string | null
): Promise<GeminiResponseJson> {
  
  if (useAgileBloomStore.getState().isQuotaExceeded) {
    console.warn("API call blocked because quota has been exceeded.");
    throw new Error("All AI requests are currently halted due to an API quota issue. Please wait and try again later, or refresh the page.");
  }

  const currentApiKey = process.env.API_KEY; 
  if (!currentApiKey || currentApiKey === "NO_KEY_FOUND" || currentApiKey === "NO_KEY_FOUND_RUNTIME") {
    throw new Error("Gemini API Key is not configured or is invalid. Please check environment variables.");
  }

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

  const systemPromptText = INITIAL_SYSTEM_PROMPT_TEMPLATE
    .replace('{input_topic}', currentTopic || "No topic set yet. Await user to set a topic with /topic command.")
    .replace(new RegExp('{num_thoughts}', 'g'), String(numThoughts))
    .replace('{history}', formatHistoryForPrompt(discussionHistory))
    .replace('{{emulation_instructions}}', emulationInstructions)
    .replace('{{response_persona_instruction}}', responsePersonaInstruction)
    .replace('{{specific_task_instructions}}', specificTaskInstructions)
    .replace('{persistent_memory_context}', formattedMemory)
    .replace('{{additional_context_section}}', additionalContextSection)
    .replace('{{assigned_tasks_section}}', assignedTasksSection);
  
  const contentParts: Part[] = [];

  if (uploadedImageFile && uploadedImageFile.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(uploadedImageFile.mimeType)) {
    contentParts.push({
      inlineData: {
        mimeType: uploadedImageFile.mimeType,
        data: uploadedImageFile.base64Data,
      },
    });
  }
  
  contentParts.push({ text: currentUserMessageOrCommand || "Please analyze the provided content." });
  
  const modelInfo = SUPPORTED_MODELS.find(m => m.id === modelId);
  const useGoogleSearch = currentUserMessageOrCommand.toLowerCase().startsWith("/ask") && (modelInfo?.supportsSearch ?? false);

  const apiRequest: GenerateContentParameters = {
    model: modelId,
    contents: { parts: contentParts }, 
    config: { 
      systemInstruction: systemPromptText, 
    },
  };

  if (useGoogleSearch) {
    if (!apiRequest.config) apiRequest.config = {}; 
    apiRequest.config.tools = [{googleSearch: {}}];
    console.log(`Google Search tool enabled for this request on model ${modelId}.`);
  } else {
    if (!apiRequest.config) apiRequest.config = {};
    apiRequest.config.responseMimeType = "application/json";
  }
  
  let retries = 0;
  let lastError: Error | null = null;
  let rawResponseText: string | undefined;
  let groundingData: Array<{ web: { uri: string; title: string; } }> | null = null;

  while (retries <= MAX_RETRIES) {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent(apiRequest);
      rawResponseText = response.text; 

      if (useGoogleSearch && response.candidates && response.candidates[0]?.groundingMetadata?.groundingChunks) {
        groundingData = response.candidates[0].groundingMetadata.groundingChunks
          .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title) 
          .map(chunk => ({ web: { uri: chunk.web.uri, title: chunk.web.title }}));
        if (groundingData.length === 0) groundingData = null;
      }

      let jsonStr = rawResponseText.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      const parsedData = JSON.parse(jsonStr) as Omit<GeminiResponseJson, 'groundingData'>;
      const completeResponse: GeminiResponseJson = {
        ...parsedData,
        groundingData: groundingData,
      };

      if (!completeResponse.expert || !EXPERTS[completeResponse.expert] || !completeResponse.message) {
          console.error("Invalid JSON structure from Gemini:", completeResponse, "Original text (full):", rawResponseText);
          lastError = new Error(`Received malformed JSON response from AI. Structure: ${Object.keys(completeResponse)}. Raw: ${rawResponseText?.substring(0,500)}...`);
          throw lastError; 
      }
      
      if (emulateExpertAs && completeResponse.expert !== emulateExpertAs) {
          console.warn(`AI was asked to emulate ${emulateExpertAs} but responded as ${completeResponse.expert}. Using AI's choice: ${completeResponse.expert}`);
      }
      
      return completeResponse;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toLowerCase();
      console.error(`Error calling Gemini API or parsing response (Attempt ${retries + 1}/${MAX_RETRIES + 1}):`, lastError, "Request Preview:", JSON.stringify(apiRequest).substring(0, 300) + "...");
      rawResponseText = rawResponseText ?? (lastError instanceof Error ? lastError.message : "Unknown API error content");

      // Check for quota error and fail fast
      if (errorMessage.includes('quota exceeded')) {
          console.error("Quota exceeded error detected. Halting further API requests.");
          useAgileBloomStore.getState().setQuotaExceeded(true);
          throw new Error("Failed to call the Gemini API, quota exceeded. Please try again later. All requests are now halted.");
      }

      if (retries === MAX_RETRIES) {
        let finalErrorMessage = "An error occurred while communicating with the AI after multiple retries.";
        if (lastError) {
            finalErrorMessage = lastError.message;
        }
        if (lastError instanceof SyntaxError && (lastError as any).message.includes('JSON')) {
           finalErrorMessage = `Failed to parse JSON response from AI: "${(lastError as any).message}". Last Raw AI Output (full if available, else first 500 chars): ${rawResponseText?.substring(0, rawResponseText.length > 500 ? 500 : rawResponseText.length) || "N/A"}`;
           console.error("Full raw AI output on final JSON parse error:", rawResponseText); // Log full raw text on final failure
        }
        throw new Error(`Gemini API Error (Max retries reached): ${finalErrorMessage}`);
      }

      const delay = INITIAL_DELAY_MS * (2 ** retries) + Math.random() * 1000;
      console.log(`Retrying Gemini API call in ${delay.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
  throw new Error(lastError?.message || "Gemini API Error: Exhausted retries but did not return or throw explicitly from loop.");
}