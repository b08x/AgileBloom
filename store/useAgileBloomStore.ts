
import {create} from 'zustand';
import { DiscussionMessage, ExpertRole, UploadedFile, TrackedQuestion, QuestionStatus, TrackedTask, TaskStatus, Expert, TrackedStory, StoryStatus, SupportedModel } from '../types';
import { EXPERTS, DEFAULT_NUM_THOUGHTS, MAX_MEMORY_ENTRIES, DEFAULT_AUTO_MODE_DELAY_SECONDS, SUPPORTED_MODELS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface AgileBloomState {
  topic: string | null;
  discussion: DiscussionMessage[];
  isLoading: boolean;
  error: string | null;
  numThoughts: number;
  apiKeyStatus: 'ok' | 'error' | 'unchecked';
  isHelpModalOpen: boolean;
  userMessageTimestamps: number[];
  isRateLimited: boolean;
  memoryContext: string[];
  uploadedFile: UploadedFile | null;
  
  trackedQuestions: TrackedQuestion[];
  trackedTasks: TrackedTask[];
  trackedStories: TrackedStory[];

  isAutoModeEnabled: boolean;
  autoModeDelaySeconds: number;
  
  selectedModelId: string;

  isQuotaExceeded: boolean;

  setTopic: (topic: string) => void;
  addMessage: (message: Omit<DiscussionMessage, 'id' | 'timestamp' | 'expert'> & { expertName: ExpertRole }) => DiscussionMessage;
  addErrorMessage: (text: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setNumThoughts: (num: number) => void;
  clearChat: () => void;
  checkAndSetApiKeyStatus: () => void;
  toggleHelpModal: () => void;
  addUserMessageTimestamp: (timestamp: number) => void;
  setRateLimitedStatus: (isLimited: boolean) => void;
  addMemoryEntry: (entry: string) => void;
  setUploadedFile: (file: UploadedFile | null) => void;
  clearUploadedFile: () => void;

  addTrackedQuestion: (question: Omit<TrackedQuestion, 'id' | 'timestamp' | 'status'>) => void;
  updateTrackedQuestionStatus: (id: string, status: QuestionStatus) => void;
  clearAllTrackedQuestions: () => void;
  clearTrackedQuestionsByStatus: (status: QuestionStatus) => void; 

  addTrackedTask: (taskData: Omit<TrackedTask, 'id' | 'timestamp' | 'status' | 'topicContext'>) => void;
  updateTrackedTaskStatus: (taskId: string, status: TaskStatus, assignedTo?: ExpertRole) => void;
  removeTrackedTask: (taskId: string) => void;
  clearAllTrackedTasks: () => void;
  clearTrackedTasksByStatus: (status: TaskStatus) => void;

  addTrackedStory: (storyData: Omit<TrackedStory, 'id' | 'timestamp' | 'status' | 'topicContext'>) => void;
  updateTrackedStoryStatus: (storyId: string, status: StoryStatus) => void;
  removeTrackedStory: (storyId: string) => void;
  clearAllTrackedStories: () => void;
  clearTrackedStoriesByStatus: (status: StoryStatus) => void;

  toggleAutoMode: () => void;
  setAutoModeDelaySeconds: (seconds: number) => void;
  importChatSession: (importedMessages: DiscussionMessage[]) => void;
  
  setSelectedModelId: (modelId: string) => void;

  setQuotaExceeded: (isExceeded: boolean) => void;
}

const useAgileBloomStore = create<AgileBloomState>((set, get) => ({
  topic: null,
  discussion: [],
  isLoading: false,
  error: null,
  numThoughts: DEFAULT_NUM_THOUGHTS,
  apiKeyStatus: 'unchecked',
  isHelpModalOpen: false,
  userMessageTimestamps: [],
  isRateLimited: false,
  memoryContext: [],
  uploadedFile: null,
  trackedQuestions: [],
  trackedTasks: [],
  trackedStories: [],
  isAutoModeEnabled: false,
  autoModeDelaySeconds: DEFAULT_AUTO_MODE_DELAY_SECONDS,
  selectedModelId: SUPPORTED_MODELS[0]?.id || 'gemini-2.5-flash-preview-04-17',
  isQuotaExceeded: false,

  setTopic: (topic) => set({ topic, error: null }),
  addMessage: (message) => {
    const expert = EXPERTS[message.expertName] || EXPERTS[ExpertRole.System];
    const newId = uuidv4();
    const newTimestamp = Date.now();
    const fullMessage: DiscussionMessage = { ...message, id: newId, timestamp: newTimestamp, expert };
    set((state) => ({
      discussion: [...state.discussion, fullMessage],
      isLoading: message.expertName !== ExpertRole.System && message.expertName !== ExpertRole.User ? state.isLoading : false, 
    }));
    return fullMessage; 
  },
  addErrorMessage: (text) => {
     set((state) => ({
      discussion: [
        ...state.discussion,
        { 
          id: uuidv4(), 
          expert: EXPERTS[ExpertRole.System], 
          text, 
          timestamp: Date.now(),
          isError: true,
        },
      ],
      isLoading: false,
      error: text, 
    }));
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setNumThoughts: (num) => set({ numThoughts: num }),
  clearChat: () => {
    set({ 
      discussion: [],
      topic: null, 
      error: null,
      userMessageTimestamps: [],
      isRateLimited: false,
      memoryContext: [],
      uploadedFile: null,
      trackedQuestions: [],
      trackedTasks: [],
      trackedStories: [],
      isAutoModeEnabled: false,
      autoModeDelaySeconds: DEFAULT_AUTO_MODE_DELAY_SECONDS,
      // Note: isQuotaExceeded is NOT reset here intentionally.
      // It's a server-side state that persists until the user refreshes.
    });
  },
  checkAndSetApiKeyStatus: () => {
    const key = process.env.API_KEY;
    if (typeof key !== 'string' || key === "" || key === "NO_KEY_FOUND") {
      if (get().apiKeyStatus !== 'error') { 
        get().addErrorMessage("Gemini API Key (process.env.API_KEY) is not configured. The application will not function correctly.");
      }
      set({ apiKeyStatus: 'error' });
    } else {
      set({ apiKeyStatus: 'ok' });
    }
  },
  toggleHelpModal: () => set((state) => ({ isHelpModalOpen: !state.isHelpModalOpen })),
  addUserMessageTimestamp: (timestamp) => set((state) => ({
    userMessageTimestamps: [...state.userMessageTimestamps, timestamp],
  })),
  setRateLimitedStatus: (isLimited) => set({ isRateLimited: isLimited }),
  addMemoryEntry: (entry: string) => set((state) => {
    const newMemory = [...state.memoryContext, entry];
    return { memoryContext: newMemory.slice(-MAX_MEMORY_ENTRIES) }; 
  }),
  setUploadedFile: (file: UploadedFile | null) => set({ uploadedFile: file }),
  clearUploadedFile: () => set({ uploadedFile: null }),

  addTrackedQuestion: (questionData) => {
    const newQuestion: TrackedQuestion = {
      ...questionData,
      id: uuidv4(),
      timestamp: Date.now(),
      status: QuestionStatus.Open,
    };
    set((state) => ({
      trackedQuestions: [...state.trackedQuestions, newQuestion],
    }));
  },
  updateTrackedQuestionStatus: (id, status) => {
    set((state) => ({
      trackedQuestions: state.trackedQuestions.map((q) =>
        q.id === id ? { ...q, status } : q
      ),
    }));
  },
  clearAllTrackedQuestions: () => set({ trackedQuestions: [] }),
  clearTrackedQuestionsByStatus: (statusToClear: QuestionStatus) => {
    set((state) => ({
        trackedQuestions: state.trackedQuestions.filter(q => q.status !== statusToClear),
    }));
  },

  addTrackedTask: (taskData) => {
    const currentTopic = get().topic || "General";
    const newTask: TrackedTask = {
      ...taskData,
      id: uuidv4(),
      timestamp: Date.now(),
      status: TaskStatus.ToDo,
      topicContext: currentTopic,
    };
    set((state) => ({
      trackedTasks: [...state.trackedTasks, newTask],
    }));
  },
  updateTrackedTaskStatus: (taskId, status, assignedTo) => {
    set((state) => ({
      trackedTasks: state.trackedTasks.map((task) =>
        task.id === taskId 
        ? { ...task, status, assignedTo: assignedTo !== undefined ? assignedTo : task.assignedTo } 
        : task
      ),
    }));
  },
  removeTrackedTask: (taskId) => {
    set((state) => ({
      trackedTasks: state.trackedTasks.filter((task) => task.id !== taskId),
    }));
  },
  clearAllTrackedTasks: () => set({ trackedTasks: [] }),
  clearTrackedTasksByStatus: (statusToClear) => {
    set((state) => ({
      trackedTasks: state.trackedTasks.filter((task) => task.status !== statusToClear),
    }));
  },

  addTrackedStory: (storyData) => {
    const currentTopic = get().topic || "General";
    const newStory: TrackedStory = {
        ...storyData,
        id: uuidv4(),
        timestamp: Date.now(),
        status: StoryStatus.New,
        topicContext: currentTopic,
    };
    set((state) => ({
        trackedStories: [...state.trackedStories, newStory],
    }));
  },
  updateTrackedStoryStatus: (storyId, status) => {
      set((state) => ({
          trackedStories: state.trackedStories.map((story) =>
              story.id === storyId ? { ...story, status } : story
          ),
      }));
  },
  removeTrackedStory: (storyId) => {
      set((state) => ({
          trackedStories: state.trackedStories.filter((story) => story.id !== storyId),
      }));
  },
  clearAllTrackedStories: () => set({ trackedStories: [] }),
  clearTrackedStoriesByStatus: (status) => {
      set((state) => ({
          trackedStories: state.trackedStories.filter((story) => story.status !== status),
      }));
  },


  toggleAutoMode: () => set((state) => ({ isAutoModeEnabled: !state.isAutoModeEnabled })),
  setAutoModeDelaySeconds: (seconds: number) => set({ autoModeDelaySeconds: seconds }),
  
  setSelectedModelId: (modelId: string) => set({ selectedModelId: modelId }),

  setQuotaExceeded: (isExceeded) => set({ isQuotaExceeded: isExceeded, isLoading: false }),

  importChatSession: (importedMessages: DiscussionMessage[]) => {
    get().clearChat(); // Reset current session

    // Find the last /topic command to restore the topic
    let lastTopic: string | null = "Imported Session"; // Default topic
    const firstSystemMessage = importedMessages.find(m => m.expert.name === ExpertRole.System && m.text.includes("Discussion started on topic:"));
    if (firstSystemMessage) {
        const match = firstSystemMessage.text.match(/Discussion started on topic: "(.*)"/);
        if (match && match[1]) {
            lastTopic = match[1];
        }
    }
    
    set({ 
      discussion: [...importedMessages], // Set imported messages
      topic: lastTopic,
      // memoryContext, trackedQuestions, trackedTasks are cleared by clearChat.
      // They are not restored from import for simplicity in this version.
    });

    get().addMessage({
        expertName: ExpertRole.System,
        text: `Chat session imported successfully. Topic restored to: "${lastTopic}". ${importedMessages.length} messages loaded.`,
    });
  },
}));

useAgileBloomStore.getState().checkAndSetApiKeyStatus();

export default useAgileBloomStore;