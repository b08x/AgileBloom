# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment Setup

- Set `GEMINI_API_KEY` in `.env.local` for Google Gemini API access
- The Vite config automatically loads this as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`

## Architecture

### Core Application Flow

The application follows a three-stage flow: Landing → Setup → Chat Interface

**Key Files:**

- `App.tsx:10-29` - Main app state management and routing between stages
- `index.tsx` - React root entry point

### State Management

Uses Zustand for centralized state with complex discussion tracking:

- `store/useAgileBloomStore.ts` - Main state store with expert discussion state, file uploads, tracked questions/tasks/stories, and AI model configuration
- State includes discussion messages, expert role management, rate limiting, memory context, and auto-mode functionality

### Expert System Architecture

The app simulates an Agile team discussion with AI experts:

- `types.ts:1-8` - Expert roles: System, User, Engineer, Artist, Linguist, Scrum Leader
- `constants.ts:4-11` - Expert definitions with emojis, descriptions, and colors
- `hooks/useAgileBloomChat.ts` - Complex chat orchestration with round-robin expert responses and command parsing

### Component Structure

- `components/` - React components for UI (chat interface, sidebars, setup pages)
- `components/ChatInterface.tsx` - Main chat UI
- Sidebar components track questions, tasks, and stories with status management

### AI Integration

- Uses Google Gemini API via `@google/genai`
- Service layer in `services/` for AI API calls
- Support for multiple Gemini model variants (Flash, Pro, Lite)
- Image upload support for AI analysis
- Search integration capability

### Command System

Rich command system with slash commands:

- `/ask`, `/suggest`, `/insight`, `/direction` - Team discussion commands
- `/elaborate`, `/show-work` - Expert-specific commands  
- `/questions`, `/stories`, `/backlog` - Project management commands
- See `constants.ts:21-38` for full command list

### Key Features

- **Auto Mode**: Automatic discussion continuation with configurable delays
- **File Uploads**: Support for images (.png, .jpg, .gif, .webp) and text files (.txt, .md)
- **Memory Context**: Persistent context across discussion with memory entries
- **FISH-Scrum Analysis**: Specialized agile analysis framework in constants
- **Rate Limiting**: Built-in message rate limiting for API protection
- **Tracked Items**: Questions, tasks, and user stories with status tracking

### TypeScript Configuration

- `tsconfig.json` - Strict TypeScript with experimental decorators
- Path alias `@/*` maps to root directory
- React JSX transform enabled

### Development Notes

- Uses Vite for build tooling with environment variable injection
- Zustand store auto-checks API key status on load
- No linting or testing commands currently configured
- Built with React 19 and TypeScript 5.7
