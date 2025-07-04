
import { useCallback, useEffect, useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { getAiResponse } from '../services/aiService';
import { ExpertRole, GeminiResponseJson, CommandHandlerResult, UploadedFile, SearchCitation, DiscussionMessage, TrackedQuestion, QuestionStatus, TaskStatus, TrackedTask, GeminiGeneratedTask, GeminiGeneratedStory, StoryStatus, StoryPriority } from '../types';
import { 
    EXPERTS, 
    EXPERT_ROUND_ROBIN_ORDER, 
    AVAILABLE_COMMANDS,
    RATE_LIMIT_MAX_MESSAGES_PER_WINDOW,
    RATE_LIMIT_WINDOW_SECONDS,
    SUPPORTED_IMAGE_MIME_TYPES,
    ID_PREFIX_LENGTH_QUESTIONS,
    ID_PREFIX_LENGTH_STORIES,
    GENERATE_TASKS_FROM_CONTEXT_PROMPT,
    GENERATE_NARRATIVE_SUMMARY_PROMPT,
    BREAKDOWN_STORY_PROMPT_TEMPLATE,
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


export const useAgileBloomChat = () => {
  const {
    topic,
    discussion,
    numThoughts,
    memoryContext,
    isAutoModeEnabled,
    autoModeDelaySeconds,
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
    updateTrackedStory,
    addTrackedTask,
    updateTrackedTaskStatus,
    toggleAutoMode, // For user interruption of auto mode
    setNarrativeSummary,
    setSummaryLoading,
  } = useAgileBloomStore();

  const rateLimitTimeoutRef = useRef<number | null>(null);
  const autoContinueTimeoutRef = useRef<number | null>(null);
  const lastAutoContinuedMessageIdRef = useRef<string | null>(null);

  const handleTaskStatusUpdate = useCallback((taskId: string, newStatus: TaskStatus) => {
    updateTrackedTaskStatus(taskId, newStatus);
    
    // Check if we need to update the parent story's status
    const { trackedTasks, trackedStories } = useAgileBloomStore.getState();
    const updatedTask = trackedTasks.find(t => t.id === taskId);
    if (!updatedTask?.storyId) return;

    const parentStory = trackedStories.find(s => s.id === updatedTask.storyId);
    if (!parentStory) return;

    const tasksForStory = trackedTasks.filter(t => t.storyId === parentStory.id);

    if (newStatus === TaskStatus.InProgress && parentStory.status === StoryStatus.SelectedForSprint) {
        updateTrackedStory(parentStory.id, { status: StoryStatus.InProgress });
    } else if (newStatus === TaskStatus.Done) {
        const allTasksDone = tasksForStory.every(t => t.status === TaskStatus.Done);
        if (allTasksDone) {
            updateTrackedStory(parentStory.id, { status: StoryStatus.Done });
        }
    }
  }, [updateTrackedTaskStatus, updateTrackedStory]);

  const processAndAddAiResponse = useCallback((aiResponse: GeminiResponseJson, emulatedExpertAs?: ExpertRole, associatedStoryId?: string) => {
    if (!aiResponse || !aiResponse.expert) {
        console.error("Received an invalid or incomplete AI response:", aiResponse);
        addErrorMessage("Received a malformed response from the AI. Check the console for details.");
        return;
    }
      
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
                    priority: 'Medium', // Default priority for generated stories
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
            if (task.description && typeof task.description === 'string') {
                addTrackedTask({
                    description: task.description,
                    createdBy: 'AI',
                    assignedTo: task.assignedTo,
                    storyId: associatedStoryId,
                });
                tasksGenerated++;
            } else {
                console.warn("AI returned a task with an invalid description:", task);
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
                    priority: story.priority || 'Medium',
                    sprintPoints: story.sprintPoints,
                });
                storiesGenerated++;
            }
        });
    }

    if (tasksGenerated > 0 || storiesGenerated > 0) {
        let summaryMessage = "Based on the recent discussion, I've generated";
        if (tasksGenerated > 0) {
            summaryMessage += ` ${tasksGenerated} task${tasksGenerated > 1 ? 's' : ''}`;
            if (associatedStoryId) {
                summaryMessage += ` for story #${associatedStoryId.substring(0,6)}`;
            }
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
    const { discussion, topic, memoryContext } = useAgileBloomStore.getState();
  
    if (discussion.length < 2) return;
  
    setSummaryLoading(true);
    try {
      const aiResponse = await getAiResponse(
        topic,
        GENERATE_NARRATIVE_SUMMARY_PROMPT,
        discussion,
        0, // No thoughts needed for a summary
        memoryContext,
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
  }, [setNarrativeSummary, setSummaryLoading]);

  const updateQuestionStatusAndPotentiallyGenerateActions = useCallback(async (questionId: string, newStatus: QuestionStatus) => {
    const { trackedQuestions, discussion, topic, numThoughts, memoryContext, addErrorMessage, setLoading } = useAgileBloomStore.getState();
    
    updateTrackedQuestionStatus(questionId, newStatus);

    if (newStatus === QuestionStatus.Addressing) {
      const questionToDiscuss = trackedQuestions.find(q => q.id === questionId);
      if (questionToDiscuss) {
        const discussionPrompt = `Let's discuss the following point originally raised by ${questionToDiscuss.expertRole} (${questionToDiscuss.expertEmoji}): "${questionToDiscuss.text}". Team, what are your thoughts or answers regarding this?`;
        sendMessage(discussionPrompt, null, false);
      }
      return;
    }
    
    if (newStatus !== QuestionStatus.Addressed) {
        return; 
    }

    const question = trackedQuestions.find(q => q.id === questionId);
    if (!question) {
        addErrorMessage(`Could not find question with ID ${questionId} to generate stories from.`);
        return;
    }

    setLoading(true);
    addMessage({
      expertName: ExpertRole.System,
      text: `Question "${question.text.substring(0, 50)}..." was marked 'Addressed'. Generating user stories...`,
      isCommandResponse: true,
    });

    try {
        const generationPrompt = `**User Story Generation Request**

The following discussion point has now been marked as 'Addressed':
- **Question:** "${question.text}"
- **Raised by:** ${question.expertRole}

Based on the provided conversation history and this resolved question, your task is to act as the Scrum Leader. Your goal is to convert the resolution of this question into one or more formal User Stories for the product backlog.

1.  **Analyze:** Review the conversation that led to this question being addressed. What needs, features, or actions were uncovered?
2.  **Generate User Stories:** Create a list of user stories.
    -   Follow the format: "As a [persona], I want [action], so that [benefit]."
    -   Estimate \`sprintPoints\` (e.g., 1, 2, 3, 5, 8) if possible.
    -   Set a default \`priority\` of "Medium".
3.  **Format Output:** Your entire response MUST be a single JSON object.
    -   Populate the \`stories\` array with your generated items.
    -   Provide a brief summary in the \`message\` field (e.g., "From that discussion, I've created 2 user stories for our backlog.").
    -   If NO user story is necessary, return an empty \`stories\` array and explain why in the \`message\` field (e.g., "Acknowledged. This point was informational and requires no further action or backlog items.").
`;

        const aiResponse = await getAiResponse(
            topic,
            generationPrompt,
            discussion,
            numThoughts,
            memoryContext,
            ExpertRole.ScrumLeader
        );

        processAndAddAiResponse(aiResponse, ExpertRole.ScrumLeader);

    } catch (error) {
        console.error("Error generating user stories:", error);
        const message = error instanceof Error ? error.message : "An error occurred while generating user stories.";
        addErrorMessage(message);
    } finally {
        setLoading(false);
    }
  }, [updateTrackedQuestionStatus, processAndAddAiResponse]);

  const generateTasksFromContext = useCallback(async () => {
    // Get latest state directly
    const { discussion, topic, numThoughts, memoryContext, addErrorMessage, setLoading } = useAgileBloomStore.getState();

    if (discussion.length < 2) { // Need more than just system messages
        addErrorMessage("Not enough discussion context to generate tasks. Please continue the conversation.");
        return;
    }
    
    setLoading(true);
    addMessage({ expertName: ExpertRole.System, text: 'Scrum Leader is reviewing the discussion to generate a task backlog...' });
    try {
        const aiResponse = await getAiResponse(
            topic,
            GENERATE_TASKS_FROM_CONTEXT_PROMPT,
            discussion,
            numThoughts,
            memoryContext,
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
  }, [processAndAddAiResponse]);


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
      
      case "/analyze": {
        const itemIdPrefix = args[0];
        if (!itemIdPrefix) return { userMessageText, action: 'error', errorMessage: "Please provide the ID prefix of the story or task to analyze. e.g., /analyze 1a2b3c" };

        const { trackedStories, trackedTasks } = useAgileBloomStore.getState();
        const storyToAnalyze = trackedStories.find(s => s.id.startsWith(itemIdPrefix));
        const taskToAnalyze = trackedTasks.find(t => t.id.startsWith(itemIdPrefix));

        if (!storyToAnalyze && !taskToAnalyze) {
            return { userMessageText, action: 'error', errorMessage: `Story or task with ID prefix '${itemIdPrefix}' not found.` };
        }
        
        let itemDescriptionForPrompt: string;
        if (storyToAnalyze) {
            itemDescriptionForPrompt = `Type: User Story\nID: ${storyToAnalyze.id}\nStory: "${storyToAnalyze.userStory}"\nBenefit: "${storyToAnalyze.benefit}"\nAcceptance Criteria:\n- ${storyToAnalyze.acceptanceCriteria.join('\n- ')}`;
        } else { // taskToAnalyze must be defined here
            itemDescriptionForPrompt = `Type: Task\nID: ${taskToAnalyze!.id}\nDescription: "${taskToAnalyze!.description}"\nStatus: ${taskToAnalyze!.status}${taskToAnalyze!.storyId ? `\nParent Story ID: ${taskToAnalyze!.storyId}` : ''}`;
        }
        
        const analysisPrompt = `Please perform a FISH analysis on the following item. The analysis framework is provided in your system instructions. Place the full analysis in the 'work' field of your JSON response, and provide a brief summary in the 'message' field.\n\nItem for Analysis:\n---\n${itemDescriptionForPrompt}\n---`;

        return { userMessageText, aiInstructionText: analysisPrompt, action: 'single_ai_response', targetExpert: ExpertRole.ScrumLeader };
      }

      case "/backlog":
      case "/summary":
        if (!useAgileBloomStore.getState().topic) {
            return { userMessageText, action: 'error', errorMessage: "No active discussion. Please refresh the page to start a new one." };
        }
        return { userMessageText, aiInstructionText, action: 'single_ai_response', targetExpert: ExpertRole.ScrumLeader };

      case "/sprint-planning": {
         const { trackedStories } = useAgileBloomStore.getState();
         const readyStories = trackedStories.filter(s => s.status === StoryStatus.Backlog || s.status === StoryStatus.SelectedForSprint);
         if (readyStories.length === 0) {
            return { userMessageText, action: 'local', aiInstructionText: "There are no stories in the backlog to plan with. Generate some stories from addressed questions first." };
         }
         const planningPrompt = "Please review the following high-priority user stories from the backlog and recommend a selection to form the current sprint. Explain your reasoning.\n\n" +
            readyStories.map(s => `- [${s.priority}] Story #${s.id.substring(0,6)}: ${s.userStory}`).join('\n');
         return { userMessageText, aiInstructionText: planningPrompt, action: 'single_ai_response', targetExpert: ExpertRole.ScrumLeader };
      }
      
      case "/breakdown": {
        const storyIdPrefix = args[0];
        if (!storyIdPrefix) return { userMessageText, action: 'error', errorMessage: "Please provide the ID prefix of the story to break down. e.g., /breakdown 1a2b3c" };
        
        const { trackedStories } = useAgileBloomStore.getState();
        const storyToBreakDown = trackedStories.find(s => s.id.startsWith(storyIdPrefix));
        if (!storyToBreakDown) return { userMessageText, action: 'error', errorMessage: `Story with ID prefix '${storyIdPrefix}' not found.` };

        updateTrackedStory(storyToBreakDown.id, { status: StoryStatus.SelectedForSprint });
        // The breakdown prompt is handled inside the sendMessage logic now.
        // We just need to tell it which story to break down.
        // The command itself will be the AI instruction.
        return { userMessageText, aiInstructionText: trimmedInput, action: 'round_robin_ai_response' };
      }
      
      case "/questions": {
        const subCommand = args[0]?.toLowerCase();
        
        if (subCommand === 'discuss') {
            const discussIdPrefix = args[1];
            if (!discussIdPrefix) return { userMessageText, action: 'error', errorMessage: "Please provide the ID prefix of the question to discuss." };
            
            const trackedQuestions = useAgileBloomStore.getState().trackedQuestions;
            const questionToDiscuss = trackedQuestions.find(q => q.id.startsWith(discussIdPrefix));
            if (!questionToDiscuss) return { userMessageText, action: 'error', errorMessage: `Question with ID prefix '${discussIdPrefix}' not found.` };
            
            // This is still valid as it can be triggered by a card click
            updateTrackedQuestionStatus(questionToDiscuss.id, QuestionStatus.Addressing);
            const discussionPrompt = `Let's discuss the following point originally raised by ${questionToDiscuss.expertRole} (${questionToDiscuss.expertEmoji}): "${questionToDiscuss.text}". Team, what are your thoughts or answers regarding this?`;
            return { userMessageText, aiInstructionText: discussionPrompt, action: 'round_robin_ai_response'};
        }
        
        // Command is now mostly UI driven.
        systemMessageContent = "Question management is now primarily handled in the 'Questions' sidebar. You can view questions grouped by expert, select them, and perform bulk actions like marking as 'Addressed' or 'Dismissed'. Clicking on a question card will start a discussion about it.";
        return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
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
    const { topic, numThoughts, memoryContext } = useAgileBloomStore.getState();
    let currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion];
    
    let userSubmittedText = rawInputText.trim();

    if (!isAutoTriggered) {
      if (!userSubmittedText && !attachedFile) return;
      if (checkAndApplyRateLimit()) return; 
      addUserMessageTimestamp(Date.now()); 
    }
      
    let aiInstructionTextForProcessing = userSubmittedText;
    if (attachedFile?.textContent) {
        aiInstructionTextForProcessing = `Content of uploaded file "${attachedFile.name}":\n\n${attachedFile.textContent}\n\n---\nUser prompt:\n${userSubmittedText}`;
    } else if (!userSubmittedText && attachedFile?.base64Data && !isAutoTriggered) { 
        aiInstructionTextForProcessing = "Analyze the attached image."; 
    } else if (isAutoTriggered) {
        aiInstructionTextForProcessing = "/continue";
        userSubmittedText = "/continue";
    }
    
    const commandResult = handleCommandInput(aiInstructionTextForProcessing);

    if (commandResult.action === 'no_action' && !attachedFile && !isAutoTriggered) return;

    if (!isAutoTriggered && commandResult.action !== 'local' && commandResult.action !== 'error' && useAgileBloomStore.getState().isAutoModeEnabled) {
      toggleAutoMode();
      if (autoContinueTimeoutRef.current) clearTimeout(autoContinueTimeoutRef.current);
      addMessage({expertName: ExpertRole.System, text: "Auto Mode disabled due to user input."});
    }

    if (userSubmittedText && !isAutoTriggered && commandResult.action !== 'error') {
       addMessage({ expertName: ExpertRole.User, text: userSubmittedText });
    }
    
    if (attachedFile && !isAutoTriggered) {
        addMessage({
            expertName: ExpertRole.System,
            text: `User uploaded "${attachedFile.name}" (${(attachedFile.size / 1024).toFixed(1)}KB).`,
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
      if (commandResult.userMessageText.startsWith("/help")) toggleHelpModal();
      else if (commandResult.userMessageText.startsWith("/clear")) {
        storeClearChat();
        addMessage({expertName: ExpertRole.System, text: "Chat cleared. Please refresh the page to start a new discussion."});
      } else if (commandResult.aiInstructionText) {
        addMessage({ expertName: ExpertRole.System, text: commandResult.aiInstructionText, isCommandResponse: true });
      }
      if (!isAutoTriggered) clearUploadedFile(); 
      setLoading(false); 
      return;
    }
        
    const imageFileForAi = (attachedFile && attachedFile.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(attachedFile.mimeType)) ? attachedFile : null;

    try {
      let instructionForAi = commandResult.aiInstructionText || aiInstructionTextForProcessing || "Please respond.";
      let storyToBreakDownId: string | undefined;

      if (instructionForAi.startsWith("/breakdown")) {
        const storyIdPrefix = instructionForAi.split(' ')[1];
        const { trackedStories } = useAgileBloomStore.getState();
        const story = trackedStories.find(s => s.id.startsWith(storyIdPrefix));
        if (story) {
          storyToBreakDownId = story.id;
          // The actual prompt will be constructed inside the loop for each expert
        } else {
           throw new Error(`Story with ID prefix '${storyIdPrefix}' not found for breakdown.`);
        }
      }
      
      currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion];

      if (commandResult.action === 'single_ai_response' && commandResult.targetExpert) {
        const aiResponse = await getAiResponse(topic, instructionForAi, currentDiscussionForProcessing, numThoughts, memoryContext, commandResult.targetExpert, isAutoTriggered ? null : imageFileForAi, null, commandResult.assignedTasksContext);
        processAndAddAiResponse(aiResponse, commandResult.targetExpert);
      } else if (commandResult.action === 'round_robin_ai_response') {
        let allGeneratedTasks: GeminiGeneratedTask[] = [];
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (const [index, expertToEmulate] of EXPERT_ROUND_ROBIN_ORDER.entries()) {
          if (index > 0) {
            await delay(1200); // Add delay to avoid rate limiting.
          }
          currentDiscussionForProcessing = [...useAgileBloomStore.getState().discussion]; 
          
          let finalInstructionForExpert = instructionForAi;
          // If it's a breakdown command, create a specific prompt for each expert
          if (storyToBreakDownId) {
             const story = useAgileBloomStore.getState().trackedStories.find(s => s.id === storyToBreakDownId)!;
             finalInstructionForExpert = BREAKDOWN_STORY_PROMPT_TEMPLATE
                .replace(/{emulated_expert_name}/g, expertToEmulate)
                .replace(/{emulated_expert_description}/g, EXPERTS[expertToEmulate].description)
                .replace(/{user_story_text}/g, story.userStory)
                .replace(/{user_story_benefit}/g, story.benefit)
                .replace(/{user_story_ac}/g, story.acceptanceCriteria.map(ac => `- ${ac}`).join('\n'))
                .replace(/{expert_emoji_placeholder}/g, EXPERTS[expertToEmulate].emoji);
          }

          const aiResponse = await getAiResponse(topic, finalInstructionForExpert, currentDiscussionForProcessing, numThoughts, memoryContext, expertToEmulate, isAutoTriggered ? null : imageFileForAi);
          processAndAddAiResponse(aiResponse, expertToEmulate, storyToBreakDownId);

          if(storyToBreakDownId && aiResponse.tasks) {
             allGeneratedTasks.push(...aiResponse.tasks);
          }
        }
        if (storyToBreakDownId && allGeneratedTasks.length > 0) {
           addMessage({
              expertName: ExpertRole.System,
              text: `Breakdown complete. ${allGeneratedTasks.length} tasks were created for story #${storyToBreakDownId.substring(0,6)}.`,
              isCommandResponse: true,
           });
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
      updateTrackedQuestionStatus, clearAllTrackedQuestions, clearTrackedQuestionsByStatus, updateNarrativeSummary
    ]);

  const initiateDiscussion = useCallback(async (topic: string, context: string) => {
    storeClearChat();
    useAgileBloomStore.getState().setTopic(topic);
    addMessage({
      expertName: ExpertRole.System,
      text: `Discussion started on topic: "${topic}". The AI team will now provide their initial thoughts.`,
      isCommandResponse: true
    });
    setLoading(true);

    const instructionForAi = `The new discussion topic is: "${topic}". Please provide your initial thoughts on this.`;
    const initialContextForAi = context || null;
    
    try {
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      for (const [index, expertToEmulate] of EXPERT_ROUND_ROBIN_ORDER.entries()) {
        if (index > 0) {
          await delay(1200); // Add delay to avoid rate limiting.
        }
        const { discussion, memoryContext, numThoughts } = useAgileBloomStore.getState();

        const aiResponse = await getAiResponse(
          topic, 
          instructionForAi, 
          discussion,
          numThoughts, 
          memoryContext, 
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
  }, [storeClearChat, addMessage, setLoading, addErrorMessage, processAndAddAiResponse, updateNarrativeSummary]);


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

    const { isAutoModeEnabled, isLoading, topic, discussion } = useAgileBloomStore.getState();

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
  }, [discussion, sendMessage, autoModeDelaySeconds]);


  return { sendMessage, initiateDiscussion, updateQuestionStatusAndPotentiallyGenerateActions, generateTasksFromContext, handleTaskStatusUpdate };
};
