
import { useCallback, useEffect, useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { generateExpertResponse } from '../services/geminiService';
// TTS Service import removed
import { ExpertRole, GeminiResponseJson, CommandHandlerResult, UploadedFile, SearchCitation, DiscussionMessage, TrackedQuestion, QuestionStatus, TaskStatus, TrackedTask } from '../types';
import { 
    EXPERTS, 
    EXPERT_ROUND_ROBIN_ORDER, 
    AVAILABLE_COMMANDS,
    RATE_LIMIT_MAX_MESSAGES_PER_WINDOW,
    RATE_LIMIT_WINDOW_SECONDS,
    SUPPORTED_IMAGE_MIME_TYPES,
    ID_PREFIX_LENGTH_QUESTIONS,
    ID_PREFIX_LENGTH_TASKS,
} from '../constants';


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
  output += "Use '/questions discuss {id_prefix}', '/questions update {id_prefix} {status}', or '/questions clear ...'.";
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
    // isTTSEnabled removed
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
    addTrackedTask,
    updateTrackedTaskStatus: storeUpdateTrackedTaskStatus,
    removeTrackedTask,
    clearAllTrackedTasks,
    clearTrackedTasksByStatus: storeClearTrackedTasksByStatus,
    toggleAutoMode, 
  } = useAgileBloomStore();

  const rateLimitTimeoutRef = useRef<number | null>(null);
  const autoContinueTimeoutRef = useRef<number | null>(null);
  const lastAutoContinuedMessageIdRef = useRef<string | null>(null);

  const processAndAddAiResponse = (aiResponse: GeminiResponseJson, emulatedExpertAs?: ExpertRole) => {
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

    // Speak AI message if TTS is enabled - REMOVED
    // if (isTTSEnabled && expertNameKey !== ExpertRole.User && expertNameKey !== ExpertRole.System) {
    //   if (ttsService.isApiSupported) {
    //     ttsService.speak(aiResponse.message, expertNameKey);
    //   }
    // }

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
  };

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
      if (!currentTopic && !trimmedInput && !useAgileBloomStore.getState().uploadedFile) {
         return { 
          userMessageText: trimmedInput, 
          action: 'error', 
          errorMessage: "Please set a topic first using the /topic command or type a message." 
        };
      }
       if (!currentTopic && trimmedInput) {
         return { 
          userMessageText: trimmedInput, 
          action: 'error', 
          errorMessage: "Please set a topic first using the /topic command (e.g., /topic My New Project)." 
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
    const args: string[] = parts.slice(1); 

    const commandDefinition = AVAILABLE_COMMANDS.find(c => c.name === commandName);
    
    if (!commandDefinition) {
      return { 
        userMessageText: trimmedInput, 
        action: 'error', 
        errorMessage: `Unknown command: ${commandName}. Type /help for a list of commands.` 
      };
    }
    
    const userMessageText = trimmedInput;
    let aiInstructionText = trimmedInput; 
    let systemMessageContent = ""; 

    switch (commandName) {
      case "/topic":
        if (args.length === 0) return { userMessageText, action: 'error', errorMessage: "Please provide a topic after the /topic command." };
        aiInstructionText = args.join(' ');
        return { userMessageText, aiInstructionText, action: 'round_robin_ai_response', newTopic: args.join(' ') };
      
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
            return { userMessageText, action: 'error', errorMessage: "Please set a topic first using /topic." };
        }
        aiInstructionText = args.join(' ') || userMessageText;
        return { userMessageText, aiInstructionText, action: 'round_robin_ai_response' };

      case "/elaborate":
      case "/show-work":
        if (args.length === 0) return { userMessageText, action: 'error', errorMessage: `Please specify an expert for ${commandName}.` };
        if (!useAgileBloomStore.getState().topic) {
            return { userMessageText, action: 'error', errorMessage: "Please set a topic first using /topic." };
        }
        const targetExpertName = args[0];
        const targetExpertRoleKey = Object.keys(EXPERTS).find(key => key.toLowerCase() === targetExpertName.toLowerCase());
        if (!targetExpertRoleKey) return { userMessageText, action: 'error', errorMessage: `Unknown expert: ${targetExpertName}. Valid experts: Engineer, Artist, Linguist, Scrum Leader.` };
        return { userMessageText, aiInstructionText, action: 'single_ai_response', targetExpert: EXPERTS[targetExpertRoleKey as ExpertRole].name };
      
      case "/backlog":
      case "/summary":
        if (!useAgileBloomStore.getState().topic) {
            return { userMessageText, action: 'error', errorMessage: "Please set a topic first using /topic for these commands." };
        }
        return { userMessageText, aiInstructionText, action: 'single_ai_response', targetExpert: ExpertRole.ScrumLeader };
      
      case "/questions":
        const arg0ForQSubCommand = args[0];
        let qSubCommand: string | undefined;
        if (typeof arg0ForQSubCommand === 'string') {
            qSubCommand = arg0ForQSubCommand.toLowerCase();
        }
        const trackedQuestions = useAgileBloomStore.getState().trackedQuestions;
        
        switch (qSubCommand) {
          case "list":
            const arg1ForListFilter = args[1];
            let filterArg: string;
            if (typeof arg1ForListFilter === 'string') {
                filterArg = arg1ForListFilter.toLowerCase();
            } else {
                filterArg = 'open';
            }
            
            let statusFilter: QuestionStatus | 'all' = 'all';
            if (Object.values(QuestionStatus).map(s => (s as string).toLowerCase()).includes(filterArg)) {
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
            
            const discussionPrompt = `Let's discuss the following point originally raised by ${questionToDiscuss.expertRole} (${questionToDiscuss.expertEmoji}): "${questionToDiscuss.text}". Team, what are your thoughts or answers regarding this?`;
            return { userMessageText, aiInstructionText: discussionPrompt, action: 'round_robin_ai_response'};

          case "update":
            const updateIdPrefix = args[1];
            const arg2ForNewStatus = args[2]; 
            let newStatusArg: string | undefined;
            if (typeof arg2ForNewStatus === 'string') {
                newStatusArg = arg2ForNewStatus.toLowerCase();
            }

            if (!updateIdPrefix || newStatusArg === undefined) { 
                 return { userMessageText, action: 'error', errorMessage: "Usage: /questions update {id_prefix} {status (open|addressing|addressed|dismissed)}." };
            }
            
            const validStatuses = Object.values(QuestionStatus).map(s => (s as string).toLowerCase());
            if (!validStatuses.includes(newStatusArg)) { 
                 return { userMessageText, action: 'error', errorMessage: `Invalid status: ${arg2ForNewStatus}. Valid statuses: ${validStatuses.join(', ')}.` };
            }
            
            const newStatus = Object.values(QuestionStatus).find(s => (s as string).toLowerCase() === newStatusArg) as QuestionStatus;

            const questionToUpdate = trackedQuestions.find(q => q.id.startsWith(updateIdPrefix));
            if (!questionToUpdate) return { userMessageText, action: 'error', errorMessage: `Question with ID prefix '${updateIdPrefix}' not found.` };
            
            updateTrackedQuestionStatus(questionToUpdate.id, newStatus);
            systemMessageContent = `Updated question [${questionToUpdate.id.substring(0, ID_PREFIX_LENGTH_QUESTIONS)}] to status: ${newStatus}.`;
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
          
          case "clear":
            const arg1ForClearFilter = args[1];
            let tempClearFilterArgValue: string | undefined;
            if (typeof arg1ForClearFilter === 'string') {
                tempClearFilterArgValue = arg1ForClearFilter.toLowerCase();
            }
            const clearFilterArg = tempClearFilterArgValue || 'all';

            if (clearFilterArg === 'all') {
              clearAllTrackedQuestions();
              systemMessageContent = "All tracked discussion points have been cleared.";
            } else if (Object.values(QuestionStatus).map(s => (s as string).toLowerCase()).includes(clearFilterArg)) {
              const statusToClear = Object.values(QuestionStatus).find(s => (s as string).toLowerCase() === clearFilterArg) as QuestionStatus;
              clearTrackedQuestionsByStatus(statusToClear);
              systemMessageContent = `All '${statusToClear}' discussion points have been cleared.`;
            } else {
              return { userMessageText, action: 'error', errorMessage: "Invalid filter for /questions clear. Use 'all', 'open', 'addressing', 'addressed', or 'dismissed'."};
            }
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };

          default:
            return { userMessageText, action: 'error', errorMessage: "Unknown subcommand for /questions. Use: list, discuss, update, clear. Example: '/questions list open'" };
        }
      
      case "/stories":
        const arg0ForStoriesFilter = args[0];
        let tempStoriesFilterArgValue: string | undefined;
        if (typeof arg0ForStoriesFilter === 'string') {
            tempStoriesFilterArgValue = arg0ForStoriesFilter.toLowerCase();
        }
        const storiesFilterArg = tempStoriesFilterArgValue || QuestionStatus.Open.toLowerCase();
        
        const validStoryFilters = [QuestionStatus.Open.toLowerCase(), QuestionStatus.Addressing.toLowerCase(), 'all'];
        if (!validStoryFilters.includes(storiesFilterArg)) {
          return { userMessageText, action: 'error', errorMessage: `Invalid filter for /stories. Use 'open', 'addressing', or 'all'. Default is 'open'.`};
        }

        const allTrackedQuestions = useAgileBloomStore.getState().trackedQuestions;
        let questionsForStories: TrackedQuestion[];

        if (storiesFilterArg === 'all') {
          questionsForStories = allTrackedQuestions;
        } else {
          const statusToFilter = Object.values(QuestionStatus).find(s => (s as string).toLowerCase() === storiesFilterArg) as QuestionStatus;
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

      case "/tasks":
        const arg0ForTSubCommand = args[0];
        let tSubCommand: string | undefined;
        if (typeof arg0ForTSubCommand === 'string') {
            tSubCommand = arg0ForTSubCommand.toLowerCase();
        }
        const trackedTasks = useAgileBloomStore.getState().trackedTasks;
        
        switch(tSubCommand) {
          case "list":
            return { userMessageText, aiInstructionText: "/tasks list", action: 'single_ai_response', targetExpert: ExpertRole.ScrumLeader };

          case "add":
            if (args.length < 2) return { userMessageText, action: 'error', errorMessage: "Usage: /tasks add {description} [assignee:ExpertRole]" };
            let description = "";
            let assignee: ExpertRole | undefined = undefined;
            const assigneeArgIndex = args.findIndex(arg => typeof arg === 'string' && arg.toLowerCase().startsWith("assignee:"));
            
            if (assigneeArgIndex !== -1) {
              description = args.slice(1, assigneeArgIndex).join(" ");
              const assigneeNameArg = args[assigneeArgIndex].split(":")[1];
              if (typeof assigneeNameArg === 'string') {
                const expertKey = Object.keys(EXPERTS).find(key => key.toLowerCase() === assigneeNameArg.toLowerCase()) as ExpertRole | undefined;
                if (!expertKey) {
                  return { userMessageText, action: 'error', errorMessage: `Invalid assignee: ${assigneeNameArg}. Valid roles: Engineer, Artist, Linguist, ScrumLeader.`};
                }
                assignee = expertKey;
              }
            } else {
              description = args.slice(1).join(" ");
            }

            if (!description) return { userMessageText, action: 'error', errorMessage: "Task description cannot be empty."};
            
            addTrackedTask({ description, createdBy: 'User', assignedTo: assignee });
            systemMessageContent = `Task added: "${description}" (Status: To Do${assignee ? `, Assigned: ${assignee}` : ''}). Scrum Leader will see this on next '/tasks list'.`;
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
          
          case "update":
            const taskIdPrefix = args[1];
            const arg2ForNewTaskStatus = args[2]; 
            let newStatusTaskArg: string | undefined;
            if (typeof arg2ForNewTaskStatus === 'string') {
                newStatusTaskArg = arg2ForNewTaskStatus.toLowerCase().replace(" ", ""); 
            }

            if (!taskIdPrefix || newStatusTaskArg === undefined) { 
                 return { userMessageText, action: 'error', errorMessage: "Usage: /tasks update {id_prefix} {status (todo|inprogress|done)} [assignee:ExpertRole]" };
            }
            
            const validTaskStatuses = Object.values(TaskStatus).map(s => (s as string).toLowerCase().replace(" ", ""));
            if (!validTaskStatuses.includes(newStatusTaskArg)) { 
              return { userMessageText, action: 'error', errorMessage: `Invalid status: ${arg2ForNewTaskStatus}. Valid: todo, inprogress, done.`};
            }
            
            const newTaskStatus = Object.values(TaskStatus).find(s => (s as string).toLowerCase().replace(" ", "") === newStatusTaskArg) as TaskStatus;

            const taskToUpdate = trackedTasks.find(t => t.id.startsWith(taskIdPrefix));
            if (!taskToUpdate) return { userMessageText, action: 'error', errorMessage: `Task with ID prefix '${taskIdPrefix}' not found.`};
            
            let newAssignee: ExpertRole | undefined = undefined;
            const newAssigneeArgTaskIndex = args.findIndex(arg => typeof arg === 'string' && arg.toLowerCase().startsWith("assignee:"));
            if (newAssigneeArgTaskIndex !== -1 && newAssigneeArgTaskIndex > 2) { 
                 const assigneeNameTaskArg = args[newAssigneeArgTaskIndex].split(":")[1];
                 if (typeof assigneeNameTaskArg === 'string') {
                     const expertKey = Object.keys(EXPERTS).find(key => key.toLowerCase() === assigneeNameTaskArg.toLowerCase()) as ExpertRole | undefined;
                     if (!expertKey) {
                        return { userMessageText, action: 'error', errorMessage: `Invalid assignee: ${assigneeNameTaskArg}.`};
                     }
                     newAssignee = expertKey;
                 }
            }

            storeUpdateTrackedTaskStatus(taskToUpdate.id, newTaskStatus, newAssignee);
            systemMessageContent = `Updated task [${taskToUpdate.id.substring(0, ID_PREFIX_LENGTH_TASKS)}] to status: ${newTaskStatus}${newAssignee ? `, Assigned: ${newAssignee}` : ''}.`;
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };

          case "clear":
            const arg1ForTaskClearFilter = args[1];
            let tempTaskClearFilterArgValue: string | undefined;
            if (typeof arg1ForTaskClearFilter === 'string') {
                tempTaskClearFilterArgValue = arg1ForTaskClearFilter.toLowerCase();
            }
            const taskClearFilterArg = tempTaskClearFilterArgValue || 'all';

            if (taskClearFilterArg === 'all') {
              clearAllTrackedTasks();
              systemMessageContent = "All tracked tasks have been cleared.";
            } else if (taskClearFilterArg === TaskStatus.Done.toLowerCase().replace(" ", "")) {
              storeClearTrackedTasksByStatus(TaskStatus.Done);
              systemMessageContent = "All 'Done' tasks have been cleared.";
            } else {
              
              const taskToClear = trackedTasks.find(t => t.id.startsWith(taskClearFilterArg));
              if (taskToClear) {
                removeTrackedTask(taskToClear.id);
                systemMessageContent = `Task [${taskToClear.id.substring(0, ID_PREFIX_LENGTH_TASKS)}] removed.`;
              } else {
                return { userMessageText, action: 'error', errorMessage: "Invalid filter for /tasks clear. Use 'all', 'done', or an ID prefix."};
              }
            }
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
          
          default:
            return { userMessageText, action: 'error', errorMessage: "Unknown subcommand for /tasks. Use: list, add, update, clear." };
        }

      case "/help":
        return { userMessageText, action: 'local' };
      case "/clear":
        return { userMessageText, action: 'local' };
      
      default: 
        return { userMessageText, action: 'error', errorMessage: `Command ${commandName} not fully handled.` };
    }
  };

  const sendMessage = useCallback(async (rawInputText: string, attachedFile: UploadedFile | null, isAutoTriggered: boolean = false) => {
    const currentStoreState = useAgileBloomStore.getState();
    const currentTopicState = currentStoreState.topic;
    const currentNumThoughts = currentStoreState.numThoughts;
    const currentMemoryContext = [...currentStoreState.memoryContext];
    let currentDiscussionForProcessing = [...currentStoreState.discussion];
    // const currentIsTTSEnabled = currentStoreState.isTTSEnabled; // Removed
    
    let userSubmittedText = rawInputText.trim();

    if (!isAutoTriggered) { 
      if (!userSubmittedText && !attachedFile) { 
        return;
      }
      if (checkAndApplyRateLimit()) { 
        return; 
      }
      addUserMessageTimestamp(Date.now()); 
      // if (currentIsTTSEnabled && ttsService.isApiSupported) { // Removed
      //     ttsService.stop();
      // }
    }
      
    let aiInstructionTextForProcessing = userSubmittedText;
    if (attachedFile && attachedFile.textContent) {
        // Content already prepended
    } else if (!userSubmittedText && attachedFile?.base64Data && !isAutoTriggered) { 
        aiInstructionTextForProcessing = "Analyze the attached image."; 
    } else if (isAutoTriggered) {
        aiInstructionTextForProcessing = "/continue"; 
        userSubmittedText = "/continue"; 
    }
    
    const commandResult = handleCommandInput(aiInstructionTextForProcessing);

    if (commandResult.action === 'no_action' && !attachedFile && !isAutoTriggered) return;

    if (!isAutoTriggered && 
        commandResult.action !== 'local' && 
        commandResult.action !== 'error' && 
        currentStoreState.isAutoModeEnabled) {
      toggleAutoMode(); 
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
      if(userSubmittedText && !isAutoTriggered && !currentStoreState.discussion.find(d => d.text === userSubmittedText && d.expert.name === ExpertRole.User)) {
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
      } else if ((commandResult.userMessageText.startsWith("/questions") || commandResult.userMessageText.startsWith("/tasks") || commandResult.userMessageText.startsWith("/stories")) && commandResult.aiInstructionText) {
        addMessage({ expertName: ExpertRole.System, text: commandResult.aiInstructionText, isCommandResponse: true });
      }
      if (!isAutoTriggered) clearUploadedFile(); 
      setLoading(false); 
      return;
    }

    if (commandResult.newTopic) {
      setTopic(commandResult.newTopic);
    }
        
    const imageFileForGemini = (attachedFile && attachedFile.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(attachedFile.mimeType)) 
      ? attachedFile 
      : null;

    try {
      const instructionForAi = commandResult.aiInstructionText || aiInstructionTextForProcessing || "Please respond.";
      
      currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion]; 

      if (commandResult.action === 'single_ai_response' && commandResult.targetExpert) {
        const aiResponse = await generateExpertResponse(
          currentTopicState, 
          instructionForAi,
          currentDiscussionForProcessing,
          currentNumThoughts, 
          currentMemoryContext, 
          commandResult.targetExpert,
          isAutoTriggered ? null : imageFileForGemini 
        );
        processAndAddAiResponse(aiResponse, commandResult.targetExpert);
      } else if (commandResult.action === 'round_robin_ai_response') {
        for (const expertToEmulate of EXPERT_ROUND_ROBIN_ORDER) {
          currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion]; 
          const aiResponse = await generateExpertResponse(
            currentTopicState, 
            instructionForAi, 
            currentDiscussionForProcessing,
            currentNumThoughts, 
            currentMemoryContext, 
            expertToEmulate,
            isAutoTriggered ? null : imageFileForGemini 
          );
          processAndAddAiResponse(aiResponse, expertToEmulate);
        }
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
      addMessage, addErrorMessage, setLoading, setTopic, storeClearChat, 
      toggleHelpModal, addUserMessageTimestamp, setRateLimitedStatus, addMemoryEntry, 
      clearUploadedFile, addTrackedQuestion, updateTrackedQuestionStatus,
      clearAllTrackedQuestions, clearTrackedQuestionsByStatus,
      addTrackedTask, storeUpdateTrackedTaskStatus, removeTrackedTask,
      clearAllTrackedTasks, storeClearTrackedTasksByStatus,
      toggleAutoMode // isTTSEnabled removed from dependency array
    ]);

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
        const currentAppState = useAgileBloomStore.getState();
        if (currentAppState.isAutoModeEnabled && !currentAppState.isLoading) { 
          // if (currentAppState.isTTSEnabled && ttsService.isApiSupported) { // Removed
          //   ttsService.stop(); 
          // }
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


  return { sendMessage };
};
