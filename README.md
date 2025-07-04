# AgileBloom

> An AI-powered Agile discussion facilitator that transforms ideas into actionable development plans through collaborative team conversations.

## Overview

AgileBloom simulates an AI Agile team environment where virtual experts collaborate to analyze projects, generate user stories, and break down work into manageable tasks. The application follows a structured workflow from initial discussion to ready-to-implement tasks, making it ideal for solo developers, small teams, or anyone looking to apply Agile methodologies to their projects.

## Key Features

### 🎭 AI Expert Team

- **Engineer** (👨‍💻): Technical implementation specialist (Python, Bash, Ansible)
- **Artist** (🧑‍🎨): UI/UX and frontend design expert (CSS, JS, HTML)
- **Linguist** (🧑‍✒️): Code quality and design pattern advocate (Ruby, linguistics)
- **Scrum Leader** (🤔): Project management and backlog coordination

### 🔄 Workflow Automation

1. **AI Discussion**: Experts analyze topics and generate insights
2. **Question Tracking**: System captures interesting discussion points
3. **Story Generation**: Questions become formal user stories
4. **Task Breakdown**: Stories are decomposed into actionable tasks

### 🧠 Intelligent Features

- **Auto Mode**: Continuous discussion with configurable delays
- **Google Search Integration**: Real-time fact-checking for `/ask` commands
- **FISH Analysis**: Systematic evaluation of stories and tasks
- **Memory Context**: Persistent discussion memory across sessions
- **File Upload Support**: Images and text files for AI analysis

### ⚡ Multi-AI Provider Support

- Google Gemini (Flash, Pro, Lite variants)
- OpenAI GPT models
- Mistral AI
- OpenRouter (various models)

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- AI provider API key (Google Gemini recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/agilebloom.git
cd agilebloom

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your API key
echo "GEMINI_API_KEY=your_api_key_here" >> .env.local

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with your API keys:

```env
GEMINI_API_KEY=your_google_gemini_api_key
OPENAI_API_KEY=your_openai_api_key_optional
MISTRAL_API_KEY=your_mistral_api_key_optional
```

## Usage Guide

### Getting Started

1. **Launch**: Run `npm run dev` and open <http://localhost:5173>
2. **Setup**: Configure your AI provider and model preferences
3. **Start Discussion**: Enter your project topic and context
4. **Engage**: Use commands to guide the expert discussion

### Essential Commands

```bash
/ask {question}           # Ask the team a question (uses Google Search)
/suggest {idea}           # Propose an idea for team feedback  
/insight {observation}    # Share insights for expert analysis
/direction {instruction}  # Provide clear direction to the team
/continue                 # Prompt experts to continue discussion

/elaborate {expert}       # Ask specific expert for more details
/show-work {expert}       # Request expert to show their current work
/breakdown {story_id}     # Break user story into actionable tasks

/questions               # Manage tracked discussion points
/stories                 # Generate user stories from questions
/backlog                 # Review product backlog health
/analyze {item_id}       # Perform FISH analysis on story/task
```

### Advanced Features

#### Auto Mode

Enable automatic discussion continuation:

- Toggle Auto Mode in the interface
- Adjust delay between responses (3-30 seconds)
- Experts automatically respond with `/continue`

#### File Uploads

- **Images**: JPG, PNG, GIF, WebP (5MB max)
- **Text**: .txt, .md files for context
- Upload via attachment button or drag-and-drop

#### FISH Analysis

Systematic evaluation framework for stories and tasks:

- **F**unctional: Process analysis
- **I**nteractional: Dynamics and dependencies  
- **S**emantic: Certainty and commitment levels
- **H**ierarchical: Communication and transparency

## Use Cases & Examples

### 1. Solo Developer - New Project Planning

**Scenario**: Planning a personal finance tracking app

```bash
# Initial setup
Topic: "Personal finance tracking web application"
Context: "Want to build a React app to track expenses, income, and budget goals"

# Example discussion flow
/ask What are the core features needed for an MVP?
/suggest Starting with expense tracking before adding advanced features
/direction Focus on user experience and data privacy
/questions                # Review captured discussion points
/stories                  # Convert insights to user stories
/breakdown {story_id}     # Break down priority stories into tasks
```

**Expected Outcome**:

- 8-12 user stories covering core functionality
- 25-40 specific development tasks
- Clear implementation priorities
- Technical architecture recommendations

### 2. Team Lead - Feature Planning Session

**Scenario**: Planning authentication system for existing app

```bash
# Team discussion
Topic: "Multi-factor authentication implementation"
Context: "Adding 2FA to existing user system, need secure and user-friendly approach"

# Guided exploration
/ask What security considerations should we prioritize?
/elaborate Engineer     # Get technical implementation details
/elaborate Artist       # Understand UX implications
/insight Current users prefer email-based verification
/direction Must maintain backward compatibility
/analyze {auth_story}   # Deep analysis of critical stories
```

**Expected Outcome**:

- Security-first user stories
- UX-focused authentication flows
- Technical implementation tasks
- Risk assessment and mitigation strategies

### 3. Startup - Product Discovery

**Scenario**: Exploring market fit for new productivity tool

```bash
# Discovery session  
Topic: "AI-powered task prioritization tool"
Context: "Helping knowledge workers focus on high-impact activities"

# Market and user exploration
/ask What problems do current productivity tools fail to solve?
/dataset "User research shows 73% struggle with task prioritization"
/insight Users want automation but fear losing control
/suggest Gradual AI assistance with user override capabilities
/backlog               # Review generated product backlog
/sprint-planning       # Plan initial development sprint
```

**Expected Outcome**:

- Market-validated user stories
- Feature prioritization framework
- Initial product roadmap
- Sprint-ready development tasks

### 4. Open Source Contributor - Issue Analysis

**Scenario**: Contributing to complex open source project

```bash
# Issue exploration
Topic: "Performance optimization for large dataset processing"
Context: "GitHub issue #1247 - API response times degrade with 10k+ records"

# Technical deep dive
/ask What are the primary bottlenecks in large dataset handling?
/debug "API response times: 50ms (100 records) -> 8s (10k records)"
/elaborate Engineer     # Technical solutions
/elaborate Linguist     # Code quality considerations
/show-work Engineer     # Implementation approach
```

**Expected Outcome**:

- Root cause analysis
- Technical solution options
- Implementation task breakdown
- Testing and validation strategy

### 5. Learning Project - Technology Exploration

**Scenario**: Learning microservices architecture

```bash
# Learning-focused discussion
Topic: "Microservices architecture for e-commerce platform"
Context: "Converting monolithic app to microservices, learning best practices"

# Educational exploration
/ask What are the key principles of microservice design?
/suggest Starting with user service and product catalog separation
/elaborate Scrum Leader  # Project management implications
/insight Database separation will be the biggest challenge
/game Engineer, Linguist, What would Martin Fowler say about our approach?
```

**Expected Outcome**:

- Educational user stories
- Hands-on learning tasks
- Best practice implementation steps
- Progressive complexity roadmap

## Technical Architecture

### State Management

- **Zustand**: Centralized state with discussion tracking
- **Persistent Memory**: Context retention across sessions
- **Rate Limiting**: Built-in API protection

### AI Integration

- **Multi-Provider**: Google Gemini, OpenAI, Mistral, OpenRouter
- **Image Support**: Visual content analysis
- **JSON Responses**: Structured expert outputs
- **Error Recovery**: Retry logic with exponential backoff

### Component Structure

```shell
├── components/          # React UI components
│   ├── ChatInterface    # Main conversation interface
│   ├── SetupPage        # AI provider configuration
│   └── Sidebars/        # Question, task, and story management
├── hooks/               # Custom React hooks
├── services/            # AI provider integrations
├── store/               # Zustand state management
└── types/               # TypeScript definitions
```

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run preview  # Preview production build
```

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Troubleshooting

### Common Issues

**AI Not Responding**

- Verify API key configuration
- Check network connectivity
- Review browser console for errors

**Rate Limiting**

- Built-in protection limits 5 messages per 10 seconds
- Wait for cooldown period
- Consider upgrading API plan

**Memory Issues**

- Clear chat with `/clear` command
- Restart application if needed
- Memory context limited to 20 entries

**File Upload Problems**

- Ensure files under 5MB
- Supported formats: PNG, JPG, GIF, WebP, TXT, MD
- Check browser console for detailed errors

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: Report bugs and feature requests
- Discussions: Community Q&A and ideas
- Documentation: Comprehensive guides in `/docs`

---

**AgileBloom** - Transforming ideas into actionable plans through AI-powered Agile collaboration.
EOF < /dev/null
