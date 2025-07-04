



import { useCallback, useEffect, useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { getAiResponse } from '../services/aiService';
import { ExpertRole, GeminiResponseJson, CommandHandlerResult, UploadedFile, SearchCitation, DiscussionMessage, TrackedQuestion, QuestionStatus, TaskStatus, TrackedTask, GeminiGeneratedTask, GeminiGeneratedStory } from '../types';
import { 
    EXPERTS, 
    EXPERT_ROUND_ROBIN_ORDER, 
    AVAILABLE_COMMANDS,
    RATE_LIMIT_MAX_MESSAGES_PER_WINDOW,
    RATE_LIMIT_WINDOW_SECONDS,
    SUPPORTED_IMAGE_MIME_TYPES,
    ID_PREFIX_LENGTH_QUESTIONS,
    GENERATE_TASKS_FROM_CONTEXT_PROMPT,
    GENERATE_NARRATIVE_SUMMARY_PROMPT,
} from '../constants';


// Utility function to parse a markdown table into an array of objects.
// Moved here to be accessible by the hook.
const parseMarkdownTable = (markdown: string): Array<Record<string, string>> => {
  if (!markdown) return [];
  const lines = markdown.trim().split('\n');
  
  const headerLineIndex = lines.findIndex(line => line.includes('|') && !line.includes('---'));
  if (headerLineIndex === -1) return [];

  const separatorLineIndex = lines.findIndex((line, index) => 
    index > headerLineIndex && line.includes('|') && line.includes('---')
  );
  if (separatorLineIndex === -1) return [];

  const headers = lines[headerLineIndex]
    .split('|')
    .map(h => h.trim())
    .filter(h => h !== '');

  const dataRows = lines.slice(separatorLineIndex + 1)
    .map(line => {
      const cells = line.split('|').map(cell => cell.trim());
      if (cells.length > 0 && cells[0] === '') cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
      return cells;
    })
    .filter(rowCells => rowCells.length === headers.length && rowCells.some(cell => cell !== ''));

  return dataRows.map(row => {
    const entry: Record<string, string> = {};
    headers.forEach((header, i) => {
      entry[header] = row[i] || '';
    });
    return entry;
  });
};


function formatTrackedQuestions(questions: TrackedQuestion[], filter: QuestionStatus | 'all'): string {
  const filteredQuestions = filter === 'all' 
    ? questions 
    : questions.filter(q => q.status.toLowerCase() === filter.toLowerCase());

  if (filteredQuestions.length === 0) {
    return `No questions found for filter: ${filter}.`;
  }

  let output = `Tracked Discussion Points (${filter}):\n`;
  output += "-------------------------------------\n";
  filteredQuestions.forEach(q => {
    const shortId = q.id.substring(0, ID_PREFIX_LENGTH_QUESTIONS);
    const expertEmoji = EXPERTS[q.expertRole]?.emoji || '❔';
    output += `[${shortId}] (${q.status}) ${expertEmoji} ${q.expertRole}: ${q.text}\n`;
  });
  output += "-------------------------------------\n";
  output += "Use '/questions discuss {id_prefix}' or '/questions clear ...'. Update status directly in the sidebar.";
  return output;
}


export const useAgileBloomChat = () => {
  const {
    topic,
    discussion,
    numThoughts,
    memoryContext,
    isAutoModeEnabled,
    autoModeDelaySeconds,
    selectedModelId,
    setTopic,
    addMessage,
    addErrorMessage,
    setLoading,
    toggleHelpModal,
    clearChat: storeClearChat,
    isLoading, 
    addUserMessageTimestamp,
    isRateLimited, 
    setRateLimitedStatus,
    addMemoryEntry,
    clearUploadedFile,
    addTrackedQuestion,
    updateTrackedQuestionStatus, 
    clearAllTrackedQuestions,    
    clearTrackedQuestionsByStatus,
    addTrackedStory,
    addTrackedTask,
    toggleAutoMode, // For user interruption of auto mode
    setNarrativeSummary,
    setSummaryLoading,
  } = useAgileBloomStore();

  const rateLimitTimeoutRef = useRef<number | null>(null);
  const autoContinueTimeoutRef = useRef<number | null>(null);
  const lastAutoContinuedMessageIdRef = useRef<string | null>(null);

  const processAndAddAiResponse = useCallback((aiResponse: GeminiResponseJson, emulatedExpertAs?: ExpertRole) => {
    let expertNameKey = Object.keys(EXPERTS).find(
      key => key.toLowerCase() === aiResponse.expert.toString().toLowerCase()
    ) as ExpertRole | undefined;

    if (!expertNameKey || !EXPERTS[expertNameKey]) {
      console.error("Invalid expert role from AI:", aiResponse.expert, "- using System as fallback.");
      addErrorMessage(`AI returned an invalid expert role: ${aiResponse.expert}. Displaying as System.`);
      expertNameKey = ExpertRole.System;
    }
    
    if (emulatedExpertAs && expertNameKey !== ExpertRole.System && aiResponse.expert !== emulatedExpertAs) {
        console.warn(`AI was asked to emulate ${emulatedExpertAs} but responded as ${aiResponse.expert}. Using AI's choice for attribution: ${aiResponse.expert}`);
    }

    let searchCitations: SearchCitation[] | null = null;
    if (aiResponse.groundingData && aiResponse.groundingData.length > 0) {
      searchCitations = aiResponse.groundingData.map(chunk => ({
        uri: chunk.web.uri,
        title: chunk.web.title,
      }));
    }
    
    const isCmdResponse = aiResponse.isCommandResponse ?? 
                          (!!emulatedExpertAs || !!aiResponse.work || 
                           (useAgileBloomStore.getState().discussion.slice(-1)[0]?.expert.name === ExpertRole.User && 
                            useAgileBloomStore.getState().discussion.slice(-1)[0]?.text.startsWith('/')));


    const addedMessage: DiscussionMessage = addMessage({
      expertName: expertNameKey,
      text: aiResponse.message,
      thoughts: aiResponse.thoughts,
      work: aiResponse.work,
      isCommandResponse: isCmdResponse,
      searchCitations: searchCitations,
    });

    if (aiResponse.memoryEntry && typeof aiResponse.memoryEntry === 'string' && aiResponse.memoryEntry.trim() !== '') {
      addMemoryEntry(aiResponse.memoryEntry.trim());
    }

    if (aiResponse.thoughts && aiResponse.thoughts.length > 0 && addedMessage.expert.name !== ExpertRole.System) {
      aiResponse.thoughts.forEach(thoughtText => {
        if (thoughtText.includes('?') || thoughtText.length > 20) { 
          addTrackedQuestion({
            text: thoughtText,
            expertRole: addedMessage.expert.name,
            expertEmoji: addedMessage.expert.emoji,
            originalMessageId: addedMessage.id, 
          });
        }
      });
    }

    // Process user stories from the 'work' field (for manual /stories command)
    if (aiResponse.work && expertNameKey === ExpertRole.ScrumLeader && isCmdResponse) {
        const parsedStoriesData = parseMarkdownTable(aiResponse.work);
        const stories: Array<any> = parsedStoriesData.filter(item => {
            const keys = Object.keys(item).map(k => k.toLowerCase());
            return keys.includes('user story') && keys.includes('benefit/value');
        });

        if (stories.length > 0) {
            stories.forEach(storyData => {
                const userStoryText = storyData['User Story'] || storyData['user story'] || '';
                const benefit = storyData['Benefit/Value'] || storyData['benefit/value'] || '';
                const acceptanceCriteriaRaw = storyData['Initial Acceptance Criteria'] || storyData['initial acceptance criteria'] || '';
                const fromQuestionId = storyData['ID'] || storyData['id'] || '';

                addTrackedStory({
                    userStory: userStoryText,
                    benefit: benefit,
                    acceptanceCriteria: acceptanceCriteriaRaw.split('\n').map((ac:string) => ac.trim()).filter(Boolean),
                    createdBy: 'AI',
                    fromQuestionId: fromQuestionId
                });
            });

            addMessage({
                expertName: ExpertRole.System,
                text: `Generated ${stories.length} user stor${stories.length > 1 ? 'ies' : 'y'}. View and manage them in the 'Stories' tab.`,
                isCommandResponse: true,
            });
        }
    }

    // Process auto-generated tasks and stories from JSON fields
    let tasksGenerated = 0;
    let storiesGenerated = 0;

    if (aiResponse.tasks && Array.isArray(aiResponse.tasks)) {
        aiResponse.tasks.forEach((task: GeminiGeneratedTask) => {
            if (task.description) {
                addTrackedTask({
                    description: task.description,
                    createdBy: 'AI',
                    assignedTo: task.assignedTo
                });
                tasksGenerated++;
            }
        });
    }

    if (aiResponse.stories && Array.isArray(aiResponse.stories)) {
        aiResponse.stories.forEach((story: GeminiGeneratedStory) => {
            if (story.userStory && story.benefit && story.acceptanceCriteria) {
                addTrackedStory({
                    userStory: story.userStory,
                    benefit: story.benefit,
                    acceptanceCriteria: story.acceptanceCriteria,
                    createdBy: 'AI',
                });
                storiesGenerated++;
            }
        });
    }

    if (tasksGenerated > 0 || storiesGenerated > 0) {
        let summaryMessage = "Based on the recent discussion, I've generated";
        if (tasksGenerated > 0) {
            summaryMessage += ` ${tasksGenerated} task${tasksGenerated > 1 ? 's' : ''}`;
        }
        if (storiesGenerated > 0) {
            summaryMessage += `${tasksGenerated > 0 ? ' and' : ''} ${storiesGenerated} user stor${storiesGenerated > 1 ? 'ies' : 'y'}`;
        }
        summaryMessage += ". You can review them in the sidebar.";
        
        addMessage({
            expertName: ExpertRole.System,
            text: summaryMessage,
            isCommandResponse: true,
        });
    }

  }, [addMessage, addErrorMessage, addMemoryEntry, addTrackedQuestion, addTrackedStory, addTrackedTask]);

  const updateNarrativeSummary = useCallback(async () => {
    const { discussion, topic, memoryContext, selectedModelId } = useAgileBloomStore.getState();
  
    if (discussion.length < 2) return;
  
    setSummaryLoading(true);
    try {
      const aiResponse = await getAiResponse(
        topic,
        GENERATE_NARRATIVE_SUMMARY_PROMPT,
        discussion,
        0, // No thoughts needed for a summary
        memoryContext,
        selectedModelId,
        ExpertRole.ScrumLeader
      );
      if (aiResponse.message) {
        setNarrativeSummary(aiResponse.message);
      }
    } catch (error) {
      console.error("Error generating narrative summary:", error);
      setNarrativeSummary("Error updating summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedModelId, setNarrativeSummary, setSummaryLoading]);

  const updateQuestionStatusAndPotentiallyGenerateActions = useCallback(async (questionId: string, newStatus: QuestionStatus) => {
    // Get latest state directly
    const { trackedQuestions, discussion, topic, numThoughts, memoryContext, addErrorMessage, setLoading, selectedModelId } = useAgileBloomStore.getState();
    
    // Optimistically update the UI
    updateTrackedQuestionStatus(questionId, newStatus);

    if (newStatus !== QuestionStatus.Addressed) {
        return; // Only trigger AI on 'Addressed'
    }

    const question = trackedQuestions.find(q => q.id === questionId);
    if (!question) {
        addErrorMessage(`Could not find question with ID ${questionId} to generate actions from.`);
        return;
    }

    setLoading(true);
    try {
        const generationPrompt = `**Action Generation Request**

The following discussion point has now been marked as 'Addressed':
- **Question:** "${question.text}"
- **Raised by:** ${question.expertRole}

Based on the provided conversation history and this resolved question, your task is to act as the Scrum Leader and generate concrete, actionable outcomes.

1.  **Analyze:** Review the conversation history with the goal of extracting potential tasks or user stories related to the resolved question.
2.  **Generate:** Create a list of tasks and/or user stories.
    -   **Tasks** should be specific actions someone can take (e.g., "Research library X for feature Y").
    -   **User Stories** should follow the format "As a [persona], I want [action], so that [benefit]."
3.  **Format Output:** Your entire response MUST be a single JSON object.
    -   Populate the \`tasks\` and/or \`stories\` arrays with your generated items.
    -   Provide a brief summary in the \`message\` field (e.g., "I've created 2 tasks and 1 user story from that discussion.").
    -   If, after careful review, NO actions are necessary, you MUST return empty arrays for \`tasks\` and \`stories\` and explain why in the \`message\` field (e.g., "Acknowledged. This point was informational and requires no further action.").
`;

        const aiResponse = await getAiResponse(
            topic,
            generationPrompt,
            discussion,
            numThoughts,
            memoryContext,
            selectedModelId,
            ExpertRole.ScrumLeader // Scrum Leader is best for this
        );

        processAndAddAiResponse(aiResponse, ExpertRole.ScrumLeader);

    } catch (error) {
        console.error("Error generating follow-up actions:", error);
        const message = error instanceof Error ? error.message : "An error occurred while generating follow-up actions.";
        addErrorMessage(message);
    } finally {
        setLoading(false);
    }
  }, [updateTrackedQuestionStatus, processAndAddAiResponse, selectedModelId]);

  const generateTasksFromContext = useCallback(async () => {
    // Get latest state directly
    const { discussion, topic, numThoughts, memoryContext, addErrorMessage, setLoading, selectedModelId } = useAgileBloomStore.getState();

    if (discussion.length < 2) { // Need more than just system messages
        addErrorMessage("Not enough discussion context to generate tasks. Please continue the conversation.");
        return;
    }
    
    setLoading(true);
    try {
        const aiResponse = await getAiResponse(
            topic,
            GENERATE_TASKS_FROM_CONTEXT_PROMPT,
            discussion,
            numThoughts,
            memoryContext,
            selectedModelId,
            ExpertRole.ScrumLeader // Scrum Leader is best for this
        );

        processAndAddAiResponse(aiResponse, ExpertRole.ScrumLeader);

    } catch (error) {
        console.error("Error generating tasks from context:", error);
        const message = error instanceof Error ? error.message : "An error occurred while generating the task backlog.";
        addErrorMessage(message);
    } finally {
        setLoading(false);
    }
  }, [processAndAddAiResponse, selectedModelId]);


  const checkAndApplyRateLimit = (): boolean => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_SECONDS * 1000;
    const currentTimestamps = useAgileBloomStore.getState().userMessageTimestamps; 
    const recentMessages = currentTimestamps.filter(ts => ts > windowStart);

    if (recentMessages.length >= RATE_LIMIT_MAX_MESSAGES_PER_WINDOW) {
      const currentRateLimitedState = useAgileBloomStore.getState().isRateLimited;
      if (!currentRateLimitedState) { 
        setRateLimitedStatus(true);
        addErrorMessage(`Rate limit exceeded. Please wait ${RATE_LIMIT_WINDOW_SECONDS} seconds.`);
      }
      return true; 
    }
    return false; 
  };
  
  const handleCommandInput = (inputText: string): CommandHandlerResult => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput.startsWith('/')) {
      const currentTopic = useAgileBloomStore.getState().topic;
      if (!currentTopic) {
         return { 
          userMessageText: trimmedInput, 
          action: 'error', 
          errorMessage: "No active discussion. Please refresh the page to start a new one." 
        };
      }
      return { 
        userMessageText: trimmedInput, 
        aiInstructionText: trimmedInput, 
        action: 'round_robin_ai_response' 
      };
    }

    const parts = trimmedInput.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1); // args as an array

    const commandDefinition = AVAILABLE_COMMANDS.find(c => c.name === commandName);
    
    if (!commandDefinition) {
      return { 
        userMessageText: trimmedInput, 
        action: 'error', 
        errorMessage: `Unknown command: ${commandName}. Type /help for a list of commands.` 
      };
    }
    
    const userMessageText = trimmedInput;
    let aiInstructionText = trimmedInput; // Default, can be overridden
    let systemMessageContent = ""; // For local command responses

    switch (commandName) {
      case "/ask":
      case "/suggest":
      case "/insight":
      case "/direction":
      case "/dataset": 
      case "/debug":
      case "/game":
      case "/continue":
        if (commandName === "/continue" && args.length > 0) {
             return { userMessageText, action: 'error', errorMessage: "/continue command does not take arguments." };
        }
        if (!useAgileBloomStore.getState().topic) { 
            return { userMessageText, action: 'error', errorMessage: "No active discussion. Please refresh the page to start a new one." };
        }
        aiInstructionText = args.join(' ') || userMessageText;
        return { userMessageText, aiInstructionText, action: 'round_robin_ai_response' };

      case "/elaborate":
      case "/show-work": {
        if (args.length === 0) return { userMessageText, action: 'error', errorMessage: `Please specify an expert for ${commandName}.` };
        if (!useAgileBloomStore.getState().topic) {
            return { userMessageText, action: 'error', errorMessage: "No active discussion. Please refresh the page to start a new one." };
        }
        const targetExpertName = args[0];
        const targetExpertRoleKey = Object.keys(EXPERTS).find(key => key.toLowerCase() === targetExpertName.toLowerCase());
        if (!targetExpertRoleKey) return { userMessageText, action: 'error', errorMessage: `Unknown expert: ${targetExpertName}. Valid experts: Engineer, Artist, Linguist, Scrum Leader.` };

        const { trackedTasks } = useAgileBloomStore.getState();
        const expertRole = targetExpertRoleKey as ExpertRole;
        const assignedTasks = trackedTasks.filter(task => task.assignedTo === expertRole);
        let assignedTasksContext: string | undefined = undefined;

        if (assignedTasks.length > 0) {
            assignedTasksContext = assignedTasks.map(t => `- [${t.status}] ${t.description}`).join('\n');
        }

        return { userMessageText, aiInstructionText, action: 'single_ai_response', targetExpert: EXPERTS[expertRole].name, assignedTasksContext };
      }
      
      case "/backlog":
      case "/summary":
        if (!useAgileBloomStore.getState().topic) {
            return { userMessageText, action: 'error', errorMessage: "No active discussion. Please refresh the page to start a new one." };
        }
        return { userMessageText, aiInstructionText, action: 'single_ai_response', targetExpert: ExpertRole.ScrumLeader };
      
      case "/questions":
        const arg0ForQSubCommand = args[0];
        const qSubCommand = typeof arg0ForQSubCommand === 'string' ? arg0ForQSubCommand.toLowerCase() : undefined;
        const trackedQuestions = useAgileBloomStore.getState().trackedQuestions;
        
        switch (qSubCommand) {
          case "list":
            const arg1ForListFilter = args[1];
            const filterArg = (typeof arg1ForListFilter === 'string' ? arg1ForListFilter.toLowerCase() : undefined) || 'open';
            let statusFilter: QuestionStatus | 'all' = 'all';
            if (Object.values(QuestionStatus).map(s => s.toLowerCase()).includes(filterArg)) {
                statusFilter = filterArg as QuestionStatus;
            } else if (filterArg === 'all') {
                statusFilter = 'all';
            } else if (filterArg !== 'open') { 
                 return { userMessageText, action: 'error', errorMessage: `Invalid filter for /questions list. Use 'open', 'addressing', 'addressed', 'dismissed', or 'all'.`};
            }
             if (filterArg === 'open' && args.length === 1) statusFilter = QuestionStatus.Open;

            systemMessageContent = formatTrackedQuestions(trackedQuestions, statusFilter);
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
          
          case "discuss":
            const discussIdPrefix = args[1];
            if (!discussIdPrefix) return { userMessageText, action: 'error', errorMessage: "Please provide the ID prefix of the question to discuss." };
            const questionToDiscuss = trackedQuestions.find(q => q.id.startsWith(discussIdPrefix));
            if (!questionToDiscuss) return { userMessageText, action: 'error', errorMessage: `Question with ID prefix '${discussIdPrefix}' not found.` };
            
            updateTrackedQuestionStatus(questionToDiscuss.id, QuestionStatus.Addressing);
            const discussionPrompt = `Let's discuss the following point originally raised by ${questionToDiscuss.expertRole} (${questionToDiscuss.expertEmoji}): "${questionToDiscuss.text}". Team, what are your thoughts or answers regarding this?`;
            return { userMessageText, aiInstructionText: discussionPrompt, action: 'round_robin_ai_response'};
          
          case "clear":
            const arg1ForClearFilter = args[1];
            const clearFilterArg = (typeof arg1ForClearFilter === 'string' ? arg1ForClearFilter.toLowerCase() : undefined) || 'all';
            if (clearFilterArg === 'all') {
              clearAllTrackedQuestions();
              systemMessageContent = "All tracked discussion points have been cleared.";
            } else if (Object.values(QuestionStatus).map(s => s.toLowerCase()).includes(clearFilterArg)) {
              const statusToClear = Object.values(QuestionStatus).find(s => s.toLowerCase() === clearFilterArg) as QuestionStatus;
              clearTrackedQuestionsByStatus(statusToClear);
              systemMessageContent = `All '${statusToClear}' discussion points have been cleared.`;
            } else {
              return { userMessageText, action: 'error', errorMessage: "Invalid filter for /questions clear. Use 'all', 'open', 'addressing', 'addressed', 'dismissed'."};
            }
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };

          default:
            return { userMessageText, action: 'error', errorMessage: "Unknown subcommand for /questions. Use: list, discuss, clear. Update status from the sidebar." };
        }
      
      case "/stories":
        const arg0ForStoriesFilter = args[0];
        const storiesFilterArg = (typeof arg0ForStoriesFilter === 'string' ? arg0ForStoriesFilter.toLowerCase() : undefined) || QuestionStatus.Open.toLowerCase();
        const validStoryFilters = [QuestionStatus.Open.toLowerCase(), QuestionStatus.Addressing.toLowerCase(), 'all'];
        if (!validStoryFilters.includes(storiesFilterArg)) {
          return { userMessageText, action: 'error', errorMessage: `Invalid filter for /stories. Use 'open', 'addressing', or 'all'. Default is 'open'.`};
        }

        const allTrackedQuestions = useAgileBloomStore.getState().trackedQuestions;
        let questionsForStories: TrackedQuestion[];

        if (storiesFilterArg === 'all') {
          questionsForStories = allTrackedQuestions;
        } else {
          const statusToFilter = Object.values(QuestionStatus).find(s => s.toLowerCase() === storiesFilterArg) as QuestionStatus;
          questionsForStories = allTrackedQuestions.filter(q => q.status === statusToFilter);
        }

        if (questionsForStories.length === 0) {
          systemMessageContent = `No questions found with status '${storiesFilterArg}' to generate user stories from.`;
          return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
        }

        let storiesPrompt = `Based on the following tracked discussion points/questions (filtered by status: ${storiesFilterArg}):\n\n`;
        questionsForStories.forEach(q => {
          storiesPrompt += `- ID [${q.id.substring(0, ID_PREFIX_LENGTH_QUESTIONS)}] (${q.expertRole} ${q.expertEmoji}): ${q.text}\n`;
        });
        storiesPrompt += `\nPlease generate user stories in a markdown table format. The table should include columns: "ID" (use the short ID provided), "User Story" (e.g., "As a [user type], I want [action] so that [benefit]"), "Benefit/Value", and "Initial Acceptance Criteria". Place this table in the 'work' field of your JSON response.`;
        
        return { 
          userMessageText, 
          aiInstructionText: storiesPrompt, 
          action: 'single_ai_response', 
          targetExpert: ExpertRole.ScrumLeader 
        };

      case "/help":
        return { userMessageText, action: 'local' };
      case "/clear":
        return { userMessageText, action: 'local' };
      
      default: 
        return { userMessageText, action: 'error', errorMessage: `Command ${commandName} not fully handled.` };
    }
  };

  const sendMessage = useCallback(async (rawInputText: string, attachedFile: UploadedFile | null, isAutoTriggered: boolean = false) => {
    // Get latest state directly inside sendMessage
    const { topic, numThoughts, memoryContext, selectedModelId } = useAgileBloomStore.getState();
    let currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion];
    
    let userSubmittedText = rawInputText.trim();

    if (!isAutoTriggered) { // Only apply these checks/actions for non-auto-triggered messages
      if (!userSubmittedText && !attachedFile) { 
        return;
      }
      if (checkAndApplyRateLimit()) { 
        return; 
      }
      addUserMessageTimestamp(Date.now()); 
    }
      
    let aiInstructionTextForProcessing = userSubmittedText;
    if (attachedFile && attachedFile.textContent) {
        // Content already prepended by CommandInput for user-submitted messages
        // For auto-triggered, attachedFile should be null
    } else if (!userSubmittedText && attachedFile?.base64Data && !isAutoTriggered) { 
        aiInstructionTextForProcessing = "Analyze the attached image."; 
    } else if (isAutoTriggered) {
        aiInstructionTextForProcessing = "/continue"; // Explicitly set for auto-triggered
        userSubmittedText = "/continue"; // Ensure command handler processes it correctly
    }
    
    const commandResult = handleCommandInput(aiInstructionTextForProcessing);

    if (commandResult.action === 'no_action' && !attachedFile && !isAutoTriggered) return;

    if (!isAutoTriggered && 
        commandResult.action !== 'local' && 
        commandResult.action !== 'error' && // Don't disable if user types invalid command
        useAgileBloomStore.getState().isAutoModeEnabled) {
      toggleAutoMode(); // This will set isAutoModeEnabled to false
      if (autoContinueTimeoutRef.current) {
        clearTimeout(autoContinueTimeoutRef.current);
        autoContinueTimeoutRef.current = null;
      }
      addMessage({expertName: ExpertRole.System, text: "Auto Mode disabled due to user input."});
    }

    if (userSubmittedText && !isAutoTriggered && commandResult.action !== 'error') {
       addMessage({ expertName: ExpertRole.User, text: userSubmittedText });
    }
    
    if (attachedFile && !isAutoTriggered) {
        addMessage({
            expertName: ExpertRole.System,
            text: `User uploaded "${attachedFile.name}" (${(attachedFile.size / 1024).toFixed(1)}KB). ${attachedFile.textContent ? "Its content is part of the prompt." : ""}`,
        });
    }

    if (commandResult.action === 'error' && commandResult.errorMessage) {
      if(userSubmittedText && !isAutoTriggered && !useAgileBloomStore.getState().discussion.find(d => d.text === userSubmittedText && d.expert.name === ExpertRole.User)) {
         addMessage({ expertName: ExpertRole.User, text: userSubmittedText });
      }
      addErrorMessage(commandResult.errorMessage);
      setLoading(false); 
      if (!isAutoTriggered) clearUploadedFile(); 
      return;
    }
    
    if (commandResult.action !== 'local') {
        setLoading(true);
    }


    if (commandResult.action === 'local') {
      if (commandResult.userMessageText.startsWith("/help")) {
        toggleHelpModal();
      } else if (commandResult.userMessageText.startsWith("/clear")) {
        storeClearChat();
        addMessage({expertName: ExpertRole.System, text: "Chat cleared. Please refresh the page to start a new discussion."});
      } else if (commandResult.userMessageText.startsWith("/questions") && commandResult.aiInstructionText) {
        addMessage({ expertName: ExpertRole.System, text: commandResult.aiInstructionText, isCommandResponse: true });
      } else if (commandResult.userMessageText.startsWith("/stories") && commandResult.aiInstructionText) {
         addMessage({ expertName: ExpertRole.System, text: commandResult.aiInstructionText, isCommandResponse: true });
      }
      if (!isAutoTriggered) clearUploadedFile(); 
      setLoading(false); 
      return;
    }
        
    const imageFileForAi = (attachedFile && attachedFile.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(attachedFile.mimeType)) 
      ? attachedFile 
      : null;

    try {
      const instructionForAi = commandResult.aiInstructionText || aiInstructionTextForProcessing || "Please respond.";
      
      currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion]; // Get fresh discussion state

      if (commandResult.action === 'single_ai_response' && commandResult.targetExpert) {
        const aiResponse = await getAiResponse(
          topic, 
          instructionForAi,
          currentDiscussionForProcessing,
          numThoughts, 
          memoryContext,
          selectedModelId,
          commandResult.targetExpert,
          isAutoTriggered ? null : imageFileForAi, // Don't pass image for auto-triggered /continue
          null, // initialContext
          commandResult.assignedTasksContext
        );
        processAndAddAiResponse(aiResponse, commandResult.targetExpert);
      } else if (commandResult.action === 'round_robin_ai_response') {
        for (const expertToEmulate of EXPERT_ROUND_ROBIN_ORDER) {
          currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion]; 
          const aiResponse = await getAiResponse(
            topic, 
            instructionForAi, 
            currentDiscussionForProcessing,
            numThoughts, 
            memoryContext, 
            selectedModelId,
            expertToEmulate,
            isAutoTriggered ? null : imageFileForAi // Don't pass image for auto-triggered /continue
          );
          processAndAddAiResponse(aiResponse, expertToEmulate);
        }
        await updateNarrativeSummary();
      }
    } catch (error) {
      console.error("Error in sendMessage AI processing:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred while getting AI response.";
      addErrorMessage(message);
    } finally {
      setLoading(false);
      if (!isAutoTriggered) clearUploadedFile(); 
    }
  }, [ 
      addUserMessageTimestamp, setRateLimitedStatus, toggleAutoMode, addMessage, addErrorMessage, 
      setLoading, toggleHelpModal, storeClearChat, clearUploadedFile, processAndAddAiResponse,
      updateTrackedQuestionStatus, clearAllTrackedQuestions, clearTrackedQuestionsByStatus, selectedModelId, updateNarrativeSummary
    ]);

  const initiateDiscussion = useCallback(async (topic: string, context: string) => {
    storeClearChat();
    setTopic(topic);
    addMessage({
      expertName: ExpertRole.System,
      text: `Discussion started on topic: "${topic}". The AI team will now provide their initial thoughts.`,
      isCommandResponse: true
    });
    setLoading(true);

    const instructionForAi = `The new discussion topic is: "${topic}". Please provide your initial thoughts on this.`;
    const initialContextForAi = context || null;
    
    try {
      for (const expertToEmulate of EXPERT_ROUND_ROBIN_ORDER) {
        const { discussion, memoryContext, numThoughts, selectedModelId } = useAgileBloomStore.getState();

        const aiResponse = await getAiResponse(
          topic, 
          instructionForAi, 
          discussion,
          numThoughts, 
          memoryContext, 
          selectedModelId,
          expertToEmulate,
          null, // No uploaded image file for initiation
          initialContextForAi
        );
        processAndAddAiResponse(aiResponse, expertToEmulate);
      }
      await updateNarrativeSummary();
    } catch (error) {
       console.error("Error during initial discussion setup:", error);
       const message = error instanceof Error ? error.message : "An unknown error occurred while initializing the discussion.";
       addErrorMessage(message);
    } finally {
        setLoading(false);
    }
  }, [storeClearChat, setTopic, addMessage, setLoading, addErrorMessage, processAndAddAiResponse, updateNarrativeSummary]);


  // Effect for Rate Limiting
  useEffect(() => {
    if (isRateLimited) {
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
      rateLimitTimeoutRef.current = window.setTimeout(() => {
        setRateLimitedStatus(false);
      }, RATE_LIMIT_WINDOW_SECONDS * 1000);
    } else {
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
        rateLimitTimeoutRef.current = null;
      }
    }
    return () => { 
        if (rateLimitTimeoutRef.current) {
            clearTimeout(rateLimitTimeoutRef.current);
        }
    };
  }, [isRateLimited, setRateLimitedStatus]);

  // Effect for Auto Mode
  useEffect(() => {
    if (autoContinueTimeoutRef.current) {
      clearTimeout(autoContinueTimeoutRef.current);
      autoContinueTimeoutRef.current = null;
    }

    if (!isAutoModeEnabled || isLoading || !topic || discussion.length === 0) {
      return;
    }

    const lastMessage = discussion[discussion.length - 1];
    const wasLastMessageAI = lastMessage && 
                             lastMessage.expert.name !== ExpertRole.User && 
                             lastMessage.expert.name !== ExpertRole.System;

    if (wasLastMessageAI && lastMessage.id !== lastAutoContinuedMessageIdRef.current) {
      autoContinueTimeoutRef.current = window.setTimeout(() => {
        if (useAgileBloomStore.getState().isAutoModeEnabled && !useAgileBloomStore.getState().isLoading) { // Re-check state before sending
          console.log(`Auto Mode: Triggering /continue after ${autoModeDelaySeconds}s delay.`);
          lastAutoContinuedMessageIdRef.current = lastMessage.id;
          sendMessage("/continue", null, true);
        }
      }, autoModeDelaySeconds * 1000);
    }
    
    return () => {
      if (autoContinueTimeoutRef.current) {
        clearTimeout(autoContinueTimeoutRef.current);
        autoContinueTimeoutRef.current = null;
      }
    };
  }, [isAutoModeEnabled, isLoading, discussion, topic, autoModeDelaySeconds, sendMessage]);


  return { sendMessage, initiateDiscussion, updateQuestionStatusAndPotentiallyGenerateActions, generateTasksFromContext };
};