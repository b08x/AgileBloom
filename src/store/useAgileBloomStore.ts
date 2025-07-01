
import {create} from 'zustand';
import { DiscussionMessage, ExpertRole, UploadedFile, TrackedQuestion, QuestionStatus, TrackedTask, TaskStatus, Expert } from '../types';
import { EXPERTS, DEFAULT_NUM_THOUGHTS, MAX_MEMORY_ENTRIES, DEFAULT_AUTO_MODE_DELAY_SECONDS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
// TTS Service import removed

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

  isAutoModeEnabled: boolean;
  autoModeDelaySeconds: number;
  // isTTSEnabled removed

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

  toggleAutoMode: () => void;
  setAutoModeDelaySeconds: (seconds: number) => void;
  importChatSession: (importedMessages: DiscussionMessage[]) => void;

  // toggleTTSEnabled removed
  // setTTSEnabled removed
}

const useAgileBloomStore = create<AgileBloomState>((set, get) => ({
  topic: null,
  discussion: [
    {
      id: uuidv4(),
      expert: EXPERTS[ExpertRole.System],
      text: "Welcome! Set a topic with '/topic Your Topic' or type '/help'. AI thoughts are tracked; use '/questions list' to see them. Manage tasks with '/tasks list'.",
      timestamp: Date.now(),
    },
  ],
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
  isAutoModeEnabled: false,
  autoModeDelaySeconds: DEFAULT_AUTO_MODE_DELAY_SECONDS,
  // isTTSEnabled default removed

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
    // ttsService.stop() removed
    set({ 
      discussion: [{
        id: uuidv4(),
        expert: EXPERTS[ExpertRole.System],
        text: "Chat cleared. Please set a new topic or type '/help'. Tracked questions and tasks also cleared.",
        timestamp: Date.now(),
      }], 
      topic: null, 
      error: null,
      userMessageTimestamps: [],
      isRateLimited: false,
      memoryContext: [],
      uploadedFile: null,
      trackedQuestions: [],
      trackedTasks: [],
      isAutoModeEnabled: false,
      autoModeDelaySeconds: DEFAULT_AUTO_MODE_DELAY_SECONDS,
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

  toggleAutoMode: () => {
    // const currentIsEnabled = get().isAutoModeEnabled;
    // if (currentIsEnabled) { 
    //     // ttsService.stop() removed;
    // }
    set((state) => ({ isAutoModeEnabled: !state.isAutoModeEnabled }));
  },
  setAutoModeDelaySeconds: (seconds: number) => set({ autoModeDelaySeconds: seconds }),

  importChatSession: (importedMessages: DiscussionMessage[]) => {
    get().clearChat(); 

    let lastTopic: string | null = "Imported Session";
    for (let i = importedMessages.length - 1; i >= 0; i--) {
      const msg = importedMessages[i];
      if (msg.expert.name === ExpertRole.User && msg.text.toLowerCase().startsWith("/topic ")) {
        lastTopic = msg.text.substring("/topic ".length).trim();
        break;
      }
    }
    
    set({ 
      discussion: [...importedMessages], 
      topic: lastTopic,
    });

    get().addMessage({
        expertName: ExpertRole.System,
        text: `Chat session imported successfully. Topic set to: "${lastTopic}". ${importedMessages.length} messages loaded.`,
    });
  },

  // toggleTTSEnabled removed
  // setTTSEnabled removed
}));

useAgileBloomStore.getState().checkAndSetApiKeyStatus();

export default useAgileBloomStore;
