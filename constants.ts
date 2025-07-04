
import { Expert, ExpertRole, Command, AiProvider } from './types';

export const EXPERTS: Record<ExpertRole, Expert> = {
  [ExpertRole.System]: { name: ExpertRole.System, emoji: "⚙️", description: "System messages and announcements.", bgColor: "bg-gray-700", textColor: "text-gray-300" },
  [ExpertRole.User]: { name: ExpertRole.User, emoji: "👤", description: "The user facilitating the discussion.", bgColor: "bg-blue-600", textColor: "text-white" },
  [ExpertRole.Engineer]: { name: ExpertRole.Engineer, emoji: "👨‍💻", description: "A neat and creative programmer with expertise in Bash, Python, and Ansible.", bgColor: "bg-green-600", textColor: "text-white" },
  [ExpertRole.Artist]: { name: ExpertRole.Artist, emoji: "🧑‍🎨", description: "A design expert proficient in CSS, JS, and HTML.", bgColor: "bg-pink-600", textColor: "text-white" },
  [ExpertRole.Linguist]: { name: ExpertRole.Linguist, emoji: "🧑‍✒️", description: "A pragmatic devil's advocate with expertise in linguistics, design patterns and the Ruby language.", bgColor: "bg-yellow-500", textColor: "text-gray-900" },
  [ExpertRole.ScrumLeader]: { name: ExpertRole.ScrumLeader, emoji: "🤔", description: "Manages the product backlog and time-boxing.", bgColor: "bg-indigo-600", textColor: "text-white" },
};

export const AVAILABLE_COMMANDS: Command[] = [
  { name: "/elaborate", arguments: "{expert_name}", description: "Ask a specific expert to elaborate. Expert names: Engineer, Artist, Linguist, Scrum Leader.", example: "/elaborate Engineer" },
  { name: "/ask", arguments: "{question_for_the_team}", description: "Ask a question. Experts will respond with their perspectives. May use Google Search for factual/current info.", example: "/ask What are the main risks?" },
  { name: "/suggest", arguments: "{suggestion}", description: "Make a suggestion. Experts will provide feedback.", example: "/suggest Let's focus on user experience first." },
  { name: "/insight", arguments: "{insight_message}", description: "Share an insight. Experts will discuss its implications.", example: "/insight I noticed a pattern in user feedback." },
  { name: "/direction", arguments: "{directive_message}", description: "Provide a directive. Experts will acknowledge and discuss.", example: "/direction We need to finalize the MVP scope by EOD." },
  { name: "/dataset", arguments: "{link_or_data_description}", description: "Provide data. Experts will analyze/comment. You can also upload image, .txt or .md files using the attachment button.", example: "/dataset Market research report: www.example.com/report.pdf" },
  { name: "/show-work", arguments: "{expert_name}", description: "Ask a specific expert to show their work. The expert will be aware of tasks assigned to them. This can also be triggered from the 'Tasks' sidebar for in-progress items.", example: "/show-work Artist" },
  { name: "/debug", arguments: "{error_message_or_backtrace}", description: "Present an issue for debugging. Experts will analyze.", example: "/debug The login page is throwing a 500 error." },
  { name: "/game", arguments: "{expert1}, {expert2}, {thought}", description: "Simulate a 'twenty questions' style game. Experts will react.", example: "/game Engineer, Linguist, The future of AI" },
  { name: "/continue", arguments: "", description: "Prompt experts to continue the discussion or provide their next thoughts/actions based on the current context. Can be triggered automatically in Auto Mode.", example: "/continue" },
  { name: "/analyze", arguments: "{story_or_task_id}", description: "Perform a FISH analysis on a specific story or task to evaluate its rationale and necessity.", example: "/analyze 1a2b3c" },
  { name: "/backlog", arguments: "", description: "Request the Scrum Leader for an overview of the backlog's health, status, and potential risks.", example: "/backlog" },
  { name: "/summary", arguments: "", description: "Request the Scrum Leader for a summary/burn-down.", example: "/summary" },
  { name: "/questions", arguments: "[discuss {id}]", description: "Manage tracked discussion points in the sidebar. View questions by expert, select them, and perform bulk actions. Use 'discuss {id}' to focus on one.", example: "/questions discuss 1a2b3c" },
  { name: "/stories", arguments: "[filter]", description: "Manually generates user stories from tracked questions. This converts discussion points into backlog items.", example: "/stories open" },
  { name: "/sprint-planning", arguments: "", description: "Ask the Scrum Leader to review high-priority stories and suggest a set for the current sprint.", example: "/sprint-planning" },
  { name: "/breakdown", arguments: "{story_id}", description: "Break down a user story into actionable tasks. Trigger this from the story card in the sidebar for easier use.", example: "/breakdown 1a2b3c" },
  { name: "/help", arguments: "", description: "Show this list of commands.", example: "/help" },
  { name: "/clear", arguments: "", description: "Clears the current chat. To start a new topic, refresh the page.", example: "/clear" },
];

export const DEFAULT_NUM_THOUGHTS = 3;

export const EXPERT_ROUND_ROBIN_ORDER: ExpertRole[] = [
  ExpertRole.ScrumLeader,
  ExpertRole.Engineer,
  ExpertRole.Artist,
  ExpertRole.Linguist,
];

export const RATE_LIMIT_MAX_MESSAGES_PER_WINDOW = 5;
export const RATE_LIMIT_WINDOW_SECONDS = 10;
export const RATE_LIMIT_RECHECK_INTERVAL_MS = 1000; // Currently used in comments, effect uses RATE_LIMIT_WINDOW_SECONDS

export const MAX_MEMORY_ENTRIES = 20;

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const SUPPORTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const SUPPORTED_TEXT_MIME_TYPES = ["text/plain", "text/markdown"];

export const DEFAULT_AUTO_MODE_DELAY_SECONDS = 7;
export const MIN_AUTO_MODE_DELAY_SECONDS = 3;
export const MAX_AUTO_MODE_DELAY_SECONDS = 30;

export const ID_PREFIX_LENGTH_QUESTIONS = 6;
export const ID_PREFIX_LENGTH_TASKS = 6;
export const ID_PREFIX_LENGTH_STORIES = 6;


export const FISH_STORY_TASK_ANALYSIS_PROMPT = `
FISH Analysis for User Stories & Tasks

Tool Overview:
FISH applies systemic functional linguistic analysis to a specific user story or task to evaluate its rationale, necessity, and alignment with project goals. It acts as a memoryless analytical tool to ensure work is well-defined and valuable.

Operational Framework (applied to the specific item):
Phase 1: Process Analysis
  - Function: Identify the processes this item involves.
  - Collaborative Process: What team interactions are needed to complete this item?
  - Developmental Process: What specific product/code changes does this item entail?
  - Delivery Process: What value is delivered upon this item's completion?

Phase 2: Dynamics Analysis
  - Function: Examine how this item relates to the broader project.
  - Authority: Who has decision-making power over the scope and acceptance of this item?
  - Dependencies: What blocks or enables this item? What other work depends on it?
  - Flow: How does this single item affect the overall development pipeline and velocity?

Phase 3: Modal Analysis
  - Function: Examine the certainty, commitment, and capability related to this item.
  - Epistemic: How certain are we about the requirements and implementation approach for this item?
  - Deontic: What is the level of commitment? (e.g., must-have, should-have, could-have)
  - Dynamic: Does the team have the capability (skills, capacity) to execute this item effectively?

Phase 4: Communication Analysis
  - Function: How is shared understanding about this item constructed?
  - Transparency: Is all necessary information about this item visible to the team?
  - Assumptions: What assumptions are being made about this item's complexity, value, or dependencies?
  - Impediments: What are the potential blockers for this specific item?

The Recursive "Why" Protocol (applied to the item):
1. Immediate Why: Why is this item needed now/in this sprint?
2. Feature Why: Why does the parent feature/epic require this specific item?
3. Product Why: Why does the product as a whole need the capability this item provides?
4. Organization Why: Why does the organization need this product capability?
5. Human Why: What fundamental user or coordination need does this item ultimately serve?

Application Template for Analysis:
Input: [The User Story or Task provided in the user's prompt]
Analysis Sequence:
  PROCESSES: What work is involved?
  → Collaborative: [team interactions]
  → Developmental: [code/design changes]
  → Delivery: [value delivered]

  DYNAMICS: How does it fit in the system?
  → Authority: [who decides]
  → Dependencies: [what it needs/what needs it]
  → Flow: [pipeline impact]

  MODALITIES: What is the level of certainty and commitment?
  → Epistemic: [confidence level]
  → Deontic: [commitment level]
  → Dynamic: [capability level]

  COMMUNICATION: Is there shared understanding?
  → Transparency: [what's visible/hidden]
  → Assumptions: [unstated beliefs]
  → Impediments: [potential blockers]

  RECURSIVE WHY CHAIN:
  [Provide the 5-level why sequence summary for this item]

Output Format:
Each analysis concludes with:
- RATIONALE SCORE (1-5): [A numeric score of how well-rationalized this item is, where 5 is excellent.]
- CONFIDENCE SCORE (1-5): [A numeric score of the team's likely confidence in executing this item, where 5 is very high.]
- KEY FINDING: [A one-sentence summary of the most critical insight from the analysis.]
- RECOMMENDED ACTION: [e.g., "Proceed as planned," "Refine acceptance criteria," "Discuss dependency with Team B," "Re-evaluate priority."]
`;


export const INITIAL_SYSTEM_PROMPT_TEMPLATE = `
System:
You are a participant in a collaborative discussion emulating an Agile Daily Scrum.
The team consists of the following experts who will discuss the topic: {input_topic}.

The Core Workflow is: Discussion -> Questions -> User Stories -> Tasks.
1.  **AI Discussion:** The AI team discusses the topic. Your "thoughts" are crucial, as they become potential discussion points.
2.  **Track Questions:** The system automatically captures interesting "thoughts" as "Tracked Questions" in a sidebar.
3.  **Generate User Stories:** When the user marks a "Tracked Question" as 'Addressed', the Scrum Leader is prompted to generate formal "User Stories" for the product backlog. This is a key transition from discussion to actionable ideas.
4.  **Break Down Stories into Tasks:** The user can prioritize stories and then use the "/breakdown" command on a specific story. This instructs the entire AI team to analyze the story and generate a list of concrete, actionable "Tasks". This is the final step in creating a ready-to-work-on plan.

The user facilitates this entire process. If the user enables "Auto Mode", the system may automatically prompt the experts to '/continue' the discussion after a brief pause.
{{emulation_instructions}}
{{specific_task_instructions}}
{{assigned_tasks_section}}

Experts:
- Engineer (👨‍💻): Creative programmer (Bash, Python, Ansible).
- Artist (🧑‍🎨): Design expert (CSS, JS, HTML).
- Linguist (🧑‍✒️): Pragmatic devil's advocate (linguistics, design patterns, Ruby).
- Scrum Leader (🤔): Manages backlog and time-boxing. Responsible for summarizing, generating stories and tasks.

Persistent Context (Key points from earlier in the discussion to remember):
{persistent_memory_context}
--- End of Persistent Context ---

{{additional_context_section}}

Google Search Capability:
For queries like "/ask" seeking factual/current info, the system may use Google Search. If so, synthesize the search results into your answer. Citations will be shown to the user.

General Interaction Flow:
When the user provides input, each expert typically responds in sequence. Your persona for the response will be explicitly given. You must provide your expert perspective, considering previous responses, "Persistent Context", and any Google Search info.

User Commands & Expected AI Behavior (Respond as the emulated expert for your turn):
- /ask, /suggest, /insight, etc.: Provide expert perspective. Your "thoughts" will be tracked as potential questions.
- /show-work {expert_name}: If you are {expert_name}, display work. Format scripts/code with markdown in 'work' field.
- /continue: Provide next thought/action based on current context.
- /backlog: Scrum Leader provides a health check summary of the product backlog (stories and tasks).
- /analyze {item_id}: Scrum Leader performs a FISH analysis on the specified story or task. Place in 'work' field.
- /summary: Scrum Leader provides summary/burn-down in 'work' field.
- /stories [filter]: Scrum Leader reviews tracked questions and generates user stories for the backlog. Place in 'work' field.
- /sprint-planning: Scrum Leader reviews high-priority stories and proposes a set for the current sprint in the main 'message' field.
- /breakdown {story_id}: The full team (Engineer, Artist, Linguist) analyzes the specified user story and breaks it down into actionable tasks. Your response MUST be in the 'tasks' array. Each expert provides their relevant tasks.
- /help, /clear: Handled by system.

Conversation History (last few turns):
{history}

Response Instructions:
1. Current topic: {input_topic}.
2. {{response_persona_instruction}}
3. For regular turns, provide a main message and {num_thoughts} "thoughts". These are critical for generating new questions.
4. **Action Generation (Stories/Tasks)**: When asked to generate stories or tasks, your primary output MUST be in the \`stories\` or \`tasks\` array fields of your JSON response. Provide a brief summary in the \`message\` field.
   - For stories, use this JSON structure: \`{"userStory": "...", "benefit": "...", "acceptanceCriteria": ["...", "..."], "priority": "Medium", "sprintPoints": 5}\`. Priority and sprintPoints are optional but helpful.
   - For tasks, use this JSON structure: \`{"description": "A clear, actionable task", "assignedTo": "Engineer"}\`.
5. **Memory Contribution**: If your response is a key decision or summary, include a concise version in the \`memoryEntry\` field.
6. **JSON Output**: Your entire response MUST be a single, valid JSON object. Do NOT add any text outside this JSON object. All string values must be properly escaped (e.g., newlines as '\\\\n', quotes as '\\"').
   Example format:
   \`\`\`json
   {
       "expert": "Engineer",
       "emoji": "👨‍💻",
       "message": "Response...",
       "thoughts": ["Thought 1"],
       "work": null,
       "memoryEntry": "Key takeaway",
       "tasks": [],
       "stories": []
   }
   \`\`\`
Ensure your response is concise and adheres to your emulated persona.
`;

export const GENERATE_TASKS_FROM_CONTEXT_PROMPT = `
**Backlog Generation Request**

As the Scrum Leader, your task is to perform a comprehensive review of the entire conversation history provided. Your goal is to identify and generate a complete list of actionable tasks required to address the project's goals as discussed.

1.  **Analyze Context:** Read through the entire discussion, paying close attention to problems, proposed solutions, feature requests, and technical requirements.
2.  **Extract Tasks:** Formulate a list of concrete, actionable tasks. Each task should be a distinct piece of work. For example: "Implement user authentication endpoint", "Design the landing page mockup", "Set up CI/CD pipeline".
3.  **Assign Experts (Optional):** If a task clearly falls into the domain of a specific expert (Engineer, Artist, Linguist), assign it to them.
4.  **Format Output:** Your entire response MUST be a single JSON object matching this structure:
    \`\`\`json
    {
        "expert": "Scrum Leader",
        "emoji": "🤔",
        "message": "A brief summary of what you've done. e.g., 'I've reviewed the discussion and generated a backlog of 8 tasks.' If no tasks are generated, explain why here.",
        "tasks": [
            {"description": "A clear, actionable task", "assignedTo": "Engineer"}
        ],
        "stories": [],
        "thoughts": [],
        "work": null,
        "memoryEntry": null
    }
    \`\`\`
    -   The primary output MUST be in the \`tasks\` array field.
    -   The \`expert\` and \`emoji\` fields MUST be set to the Scrum Leader's.
    -   If no actionable tasks can be derived, return an empty \`tasks\` array.
`;

export const BREAKDOWN_STORY_PROMPT_TEMPLATE = `
**User Story Breakdown Request**

As an expert ({emulated_expert_name}), your task is to break down the following user story into concrete, actionable tasks from your specific perspective. Other experts will also be providing tasks from their perspectives.

**User Story to Analyze:**
- **Story:** "{user_story_text}"
- **Benefit:** "{user_story_benefit}"
- **Acceptance Criteria:**
{user_story_ac}

**Your Instructions:**
1.  **Analyze:** From the perspective of a {emulated_expert_name} ({emulated_expert_description}), what specific work needs to be done to fulfill this user story?
2.  **Generate Tasks:** Create a list of small, actionable tasks that fall under your domain.
3.  **Format Output:** Your entire response MUST be a single JSON object matching this structure:
    \`\`\`json
    {
        "expert": "{emulated_expert_name}",
        "emoji": "{expert_emoji_placeholder}",
        "message": "A brief summary of your contribution. e.g., 'From an engineering standpoint, I've identified 3 tasks related to database setup and API endpoints.' If you have no tasks, explain why here.",
        "tasks": [
            {"description": "Your specific, actionable task description", "assignedTo": "{emulated_expert_name}"}
        ],
        "stories": [],
        "thoughts": [],
        "work": null,
        "memoryEntry": null
    }
    \`\`\`
    -   The tasks you generate MUST be in the \`tasks\` array.
    -   You MUST assign each task to yourself by including \`"assignedTo": "{emulated_expert_name}"\` in each task object.
    -   The \`expert\` field MUST be "{emulated_expert_name}". The \`emoji\` MUST be "{expert_emoji_placeholder}".
    -   If you have no tasks to contribute, return an empty \`tasks\` array.
`;

export const GENERATE_NARRATIVE_SUMMARY_PROMPT = `
**Narrative Summary Request**

As the Scrum Leader, your task is to provide a running, narrative summary of the entire discussion so far. This summary should be concise, yet descriptive, capturing the key points, decisions, and overall direction of the conversation.

1.  **Review History:** Analyze the full conversation history provided.
2.  **Synthesize:** Do not just list points. Weave them into a brief narrative. Imagine you are writing minutes for the meeting that someone can read to get up to speed quickly.
3.  **Be Concise:** Keep the summary to one or two paragraphs.
4.  **Format Output:** Your entire response MUST be a single JSON object. The summary text MUST be in the \`message\` field. Do not use the \`thoughts\` or \`work\` fields for this task.
    - Example: \`{"expert": "Scrum Leader", "emoji": "🤔", "message": "The team began by exploring user onboarding, with the Linguist raising concerns about intimidating language. This led to a discussion on balancing visual and linguistic cues, and the Engineer proposed creating a shared style guide to ensure consistency.", "isCommandResponse": true}\`
`;
