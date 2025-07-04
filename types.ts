

export enum AiProvider {
  Gemini = "Gemini",
  Mistral = "Mistral",
}

export enum ExpertRole {
  System = "System",
  User = "User",
  Engineer = "Engineer",
  Artist = "Artist",
  Linguist = "Linguist",
  ScrumLeader = "Scrum Leader",
}

export interface Expert {
  name: ExpertRole;
  emoji: string;
  description: string;
  bgColor: string;
  textColor: string;
}

export interface SearchCitation {
  uri: string;
  title: string;
}

export interface DiscussionMessage {
  id: string;
  expert: Expert;
  text: string;
  thoughts?: string[];
  work?: string; // For code, markdown tables, etc.
  isCommandResponse?: boolean;
  timestamp: number;
  isError?: boolean;
  searchCitations?: SearchCitation[] | null;
}

export interface Command {
  name: string;
  arguments: string;
  description: string;
  example?: string;
}

// New interfaces for auto-generation
export interface GeminiGeneratedTask {
  description: string;
  assignedTo?: ExpertRole;
}
export interface GeminiGeneratedStory {
  userStory: string;
  benefit: string;
  acceptanceCriteria: string[];
}

// Matches the expected JSON output structure from Gemini
export interface GeminiResponseJson {
  expert: ExpertRole; 
  emoji: string;
  message: string;
  thoughts?: string[];
  work?: string;
  isCommandResponse?: boolean;
  memoryEntry?: string | null; 
  groundingData?: Array<{ web: { uri: string; title: string; } }> | null;
  tasks?: GeminiGeneratedTask[];
  stories?: GeminiGeneratedStory[];
}

export interface CommandHandlerResult {
  userMessageText: string; 
  aiInstructionText?: string; 
  action: 'local' | 'single_ai_response' | 'round_robin_ai_response' | 'error' | 'no_action';
  targetExpert?: ExpertRole; 
  newTopic?: string; 
  errorMessage?: string; 
  assignedTasksContext?: string;
}

export interface UploadedFile {
  name: string;
  type: string; // The actual MIME type from the file object
  mimeType: string; // The MIME type to be sent to Gemini (for images) or used for processing (text)
  size: number;
  base64Data?: string; // For images
  textContent?: string; // For text files
}

export enum QuestionStatus {
  Open = "Open",
  Addressing = "Addressing",
  Addressed = "Addressed",
  Dismissed = "Dismissed",
}

export interface TrackedQuestion {
  id: string;
  text: string;
  expertRole: ExpertRole;
  expertEmoji: string;
  status: QuestionStatus;
  timestamp: number;
  originalMessageId: string; 
}

export enum TaskStatus {
  ToDo = "To Do",
  InProgress = "In Progress",
  Done = "Done",
}

export interface TrackedTask {
  id: string;
  description: string;
  status: TaskStatus;
  assignedTo?: ExpertRole;
  createdBy: ExpertRole | 'User' | 'AI';
  timestamp: number;
  topicContext: string; // Topic at the time of creation
}

export enum StoryStatus {
  New = "New",
  Refining = "Refining",
  Ready = "Ready",
  Done = "Done",
  Rejected = "Rejected",
}

export interface TrackedStory {
  id: string;
  userStory: string;
  acceptanceCriteria: string[];
  benefit: string;
  status: StoryStatus;
  assignedTo?: ExpertRole;
  createdBy: ExpertRole | 'User' | 'AI';
  timestamp: number;
  topicContext: string;
  fromQuestionId?: string; // Optional link back to the question it came from
}

export interface SupportedModel {
  id: string;
  name: string;
  provider: AiProvider;
  description: string;
  supportsSearch: boolean;
}