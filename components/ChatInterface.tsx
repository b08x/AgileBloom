

import React, { useEffect, useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { MessageBubble } from './MessageBubble';
import { CommandInput } from './CommandInput';
import { LoadingSpinner } from './LoadingSpinner';
import { HelpModal } from './HelpModal';
import { API_KEY_ERROR_MESSAGE } from '../constants';
import { Keyboard } from 'lucide-react';
import { RightSidebarContainer } from './RightSidebarContainer';

export const ChatInterface: React.FC = () => {
  const { 
    discussion, 
    isLoading, 
    error, 
    apiKeyStatus, 
    isHelpModalOpen, 
    checkAndSetApiKeyStatus,
  } = useAgileBloomStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [discussion]);
  
  useEffect(() => {
    if (apiKeyStatus === 'unchecked') {
      checkAndSetApiKeyStatus();
    }
  }, [apiKeyStatus, checkAndSetApiKeyStatus]);

  const showApiKeyError = apiKeyStatus === 'error';

  return (
    <div className="flex flex-col h-full">
      {isHelpModalOpen && <HelpModal />}
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden p-2 sm:p-4 gap-4">
        
        {/* Input Area (Left Column on Desktop) */}
        <div 
          className="order-2 lg:order-1 lg:col-span-3 flex flex-col rounded-lg bg-gray-800/30 backdrop-blur-sm p-3 sm:p-4 mt-2 lg:mt-0"
        >
          <div className="hidden lg:flex flex-col items-center justify-start p-3 text-center text-gray-400 border-b border-gray-700/30 mb-4 rounded-t-lg bg-gray-900/10">
            <Keyboard size={36} className="mb-2 text-purple-400 opacity-80" />
            <h3 className="text-lg font-semibold text-purple-300">Input & Controls</h3>
            <p className="text-xs">Enter commands and messages below. Use <code>/help</code> for assistance.</p>
          </div>
          <div className="flex-grow flex flex-col justify-end">
            <CommandInput />
          </div>
        </div>

        {/* Messages Area (Center Column on Desktop) */}
        <div 
          className="order-1 lg:order-2 lg:col-span-6 flex flex-col overflow-hidden min-h-[50vh] lg:min-h-0"
        >
           <div 
            className="flex-grow overflow-y-auto rounded-lg glassmorphism scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 p-3 sm:p-4"
          >
            {showApiKeyError && (
              <div className="my-2 p-3 bg-red-800/80 border border-red-700 text-white rounded-md text-sm" role="alert" aria-live="assertive">
                <strong>Configuration Error:</strong> {API_KEY_ERROR_MESSAGE} The application requires a valid Gemini API Key set as an environment variable (<code>process.env.API_KEY</code>) to function.
              </div>
            )}
            {error && !showApiKeyError && ( 
              <div className="my-2 p-3 bg-red-700/70 border border-red-600 text-white rounded-md text-sm" role="alert" aria-live="assertive">
                <strong>Error:</strong> {error}
              </div>
            )}
            {discussion.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right Sidebar (Questions/Tasks) */}
        <div className="order-3 lg:col-span-3 flex flex-col overflow-hidden rounded-lg bg-gray-800/30 backdrop-blur-sm mt-2 lg:mt-0">
           <RightSidebarContainer />
        </div>
      </div>
    </div>
  );
};