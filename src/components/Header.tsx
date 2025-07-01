
import React, { useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
// ttsService import removed
import { Settings, HelpCircle, Trash2, Zap, ZapOff, Download, UploadCloud } from 'lucide-react'; 
// Volume2, VolumeX icons removed
import { MIN_AUTO_MODE_DELAY_SECONDS, MAX_AUTO_MODE_DELAY_SECONDS, EXPERTS } from '../constants';
import { DiscussionMessage, ExpertRole } from '../types';

export const Header: React.FC = () => {
  const { 
    topic, 
    toggleHelpModal, 
    clearChat, 
    numThoughts, 
    setNumThoughts,
    isAutoModeEnabled,
    toggleAutoMode,
    autoModeDelaySeconds,
    setAutoModeDelaySeconds,
    // isTTSEnabled removed
    // toggleTTSEnabled removed
    discussion,
    importChatSession,
    addErrorMessage,
  } = useAgileBloomStore();
  const [showSettings, setShowSettings] = React.useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleNumThoughtsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0 && val <= 10) {
      setNumThoughts(val);
    }
  };

  const handleAutoModeDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val >= MIN_AUTO_MODE_DELAY_SECONDS && val <= MAX_AUTO_MODE_DELAY_SECONDS) {
      setAutoModeDelaySeconds(val);
    }
  };

  const handleExportChat = () => {
    if (discussion.length === 0) {
      addErrorMessage("Chat is empty. Nothing to export.");
      return;
    }

    const jsonString = JSON.stringify(discussion, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeString = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    a.download = `agilebloom_chat_${dateString}_${timeString}.json`;
    
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTriggerImport = () => {
    importFileRef.current?.click();
  };

  const isValidExpertRole = (roleName: any): roleName is ExpertRole => {
    return Object.values(ExpertRole).includes(roleName as ExpertRole);
  };
  
  const isValidDiscussionMessage = (msg: any, index: number): msg is DiscussionMessage => {
    if (typeof msg !== 'object' || msg === null) {
      console.error(`Import validation error: Message at index ${index} is not an object or is null. Message:`, msg);
      return false;
    }
    if (typeof msg.id !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'id' (type: ${typeof msg.id}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.text !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'text' (type: ${typeof msg.text}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.timestamp !== 'number') {
      console.error(`Import validation error: Message at index ${index} has invalid 'timestamp' (type: ${typeof msg.timestamp}). Expected number. Message:`, msg);
      return false;
    }
    if (typeof msg.expert !== 'object' || msg.expert === null) {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert' object (type: ${typeof msg.expert}). Expected object. Message:`, msg);
      return false;
    }
    if (!isValidExpertRole(msg.expert.name)) {
      console.error(`Import validation error: Message at index ${index}, expert.name ('${msg.expert.name}') is not a valid ExpertRole. Message:`, msg);
      return false;
    }
    if (typeof msg.expert.emoji !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert.emoji' (type: ${typeof msg.expert.emoji}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.expert.bgColor !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert.bgColor' (type: ${typeof msg.expert.bgColor}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.expert.textColor !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert.textColor' (type: ${typeof msg.expert.textColor}). Expected string. Message:`, msg);
      return false;
    }
    if (msg.thoughts !== undefined && !Array.isArray(msg.thoughts)) {
      console.error(`Import validation error: Message at index ${index} has 'thoughts' but it's not an array (type: ${typeof msg.thoughts}). Message:`, msg);
      return false;
    }
    if (msg.work !== undefined && typeof msg.work !== 'string' && msg.work !== null) { 
      console.error(`Import validation error: Message at index ${index} has 'work' but it's not a string or null (type: ${typeof msg.work}). Message:`, msg);
      return false;
    }
    if (msg.isCommandResponse !== undefined && typeof msg.isCommandResponse !== 'boolean') {
      console.error(`Import validation error: Message at index ${index} has 'isCommandResponse' but it's not a boolean (type: ${typeof msg.isCommandResponse}). Message:`, msg);
      return false;
    }
    if (msg.isError !== undefined && typeof msg.isError !== 'boolean') {
      console.error(`Import validation error: Message at index ${index} has 'isError' but it's not a boolean (type: ${typeof msg.isError}). Message:`, msg);
      return false;
    }
    if (msg.searchCitations !== undefined && msg.searchCitations !== null && !Array.isArray(msg.searchCitations)) {
      console.error(`Import validation error: Message at index ${index} has 'searchCitations' but it's not an array or null (type: ${typeof msg.searchCitations}). Message:`, msg);
      return false;
    }
    return true;
  };


  const handleImportChat = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      addErrorMessage("Invalid file type. Please select a JSON file (.json).");
      if(importFileRef.current) importFileRef.current.value = ""; 
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error("Failed to read file content as string.");
        }
        const parsedData = JSON.parse(content);

        if (!Array.isArray(parsedData)) {
          throw new Error("Invalid JSON format. Imported file must be an array of chat messages.");
        }
        
        const validatedMessages: DiscussionMessage[] = [];
        for (let i = 0; i < parsedData.length; i++) {
          const msg = parsedData[i];
          if (!isValidDiscussionMessage(msg, i)) {
            throw new Error(`Imported file contains an invalid message structure at index ${i}. Check the browser console for specific details on the problematic message object and field.`);
          }
          
          const expertData = EXPERTS[msg.expert.name as ExpertRole];
          if (!expertData) {
             console.error(`Import error: Expert role '${msg.expert.name}' from message at index ${i} (which passed initial validation) was not found in EXPERTS constant. Message:`, msg);
             throw new Error(`Internal error: Validated expert role '${msg.expert.name}' (message index ${i}) not found in EXPERTS. This might indicate an inconsistency between ExpertRole enum and EXPERTS constant.`);
          }
          validatedMessages.push({ ...msg, expert: expertData });
        }
        
        importChatSession(validatedMessages);

      } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during import.";
        addErrorMessage(`Error importing chat: ${message}`);
        console.error("Import process error:", error);
      } finally {
        if(importFileRef.current) importFileRef.current.value = ""; 
      }
    };
    reader.onerror = () => {
      addErrorMessage("Failed to read the selected file.");
      if(importFileRef.current) importFileRef.current.value = ""; 
    };
    reader.readAsText(file);
  };
  
  return (
    <header className="relative z-20 bg-gray-800/50 backdrop-blur-md shadow-lg p-3 sm:p-4 text-white flex justify-between items-center border-b border-gray-700/50">
      <div className="flex items-center space-x-2">
        <img src="https://picsum.photos/seed/agilebloom/40/40" alt="AgileBloom Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-purple-500" />
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight">
          Agile<span className="text-purple-400">Bloom</span> AI
        </h1>
      </div>
      {topic && (
        <div className="hidden md:block text-center text-sm sm:text-base text-purple-300 truncate max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl" title={topic}>
          Topic: <span className="font-medium text-gray-100">{topic}</span>
        </div>
      )}
      <div className="flex items-center space-x-1 sm:space-x-2"> 
        <input 
          type="file" 
          ref={importFileRef} 
          onChange={handleImportChat} 
          accept=".json" 
          className="hidden" 
          aria-hidden="true"
        />
        <button
          onClick={handleTriggerImport}
          className="p-2 rounded-full hover:bg-green-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          title="Import Chat from JSON"
        >
          <UploadCloud size={20} />
        </button>
        <button
          onClick={handleExportChat}
          className="p-2 rounded-full hover:bg-blue-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Export Chat as JSON"
        >
          <Download size={20} />
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-purple-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          title="Settings"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={toggleHelpModal}
          className="p-2 rounded-full hover:bg-purple-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          title="Help / Commands"
        >
          <HelpCircle size={20} />
        </button>
        <button
          onClick={() => {
            if(window.confirm("Are you sure you want to clear the chat and current topic? This will also clear tracked questions and disable auto-mode.")) {
              clearChat();
            }
          }}
          className="p-2 rounded-full hover:bg-red-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          title="Clear Chat"
        >
          <Trash2 size={20} />
        </button>
      </div>
      {showSettings && (
        <div className="absolute top-16 right-4 mt-2 w-72 p-4 bg-gray-700/80 backdrop-blur-md rounded-lg shadow-xl z-50 border border-gray-600/50">
          <h3 className="text-md font-semibold mb-3 text-purple-300">Settings</h3>
          
          <div className="mb-4">
            <label htmlFor="numThoughts" className="block text-sm font-medium text-gray-300 mb-1">
              Thoughts per Expert: <span className="text-purple-400">{numThoughts}</span>
            </label>
            <input
              type="range"
              id="numThoughts"
              min="1"
              max="10"
              value={numThoughts}
              onChange={handleNumThoughtsChange}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="autoModeToggle" className="text-sm font-medium text-gray-300">
                Auto Mode
              </label>
              <button
                id="autoModeToggle"
                onClick={toggleAutoMode}
                className={`p-1 rounded-full transition-colors ${
                  isAutoModeEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                }`}
                title={isAutoModeEnabled ? 'Disable Auto Mode' : 'Enable Auto Mode'}
              >
                {isAutoModeEnabled ? <Zap size={18} className="text-white" /> : <ZapOff size={18} className="text-gray-300" />}
              </button>
            </div>
          </div>

          {isAutoModeEnabled && (
            <div className="mb-4 pl-1">
              <label htmlFor="autoModeDelay" className="block text-xs font-medium text-gray-400 mb-1">
                Auto Mode Delay: <span className="text-purple-400">{autoModeDelaySeconds}s</span>
              </label>
              <input
                type="range"
                id="autoModeDelay"
                min={MIN_AUTO_MODE_DELAY_SECONDS}
                max={MAX_AUTO_MODE_DELAY_SECONDS}
                value={autoModeDelaySeconds}
                onChange={handleAutoModeDelayChange}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          )}

          {/* TTS Section Removed */}

          <button 
            onClick={() => setShowSettings(false)}
            className="w-full mt-2 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Close
          </button>
        </div>
      )}
    </header>
  );
};
