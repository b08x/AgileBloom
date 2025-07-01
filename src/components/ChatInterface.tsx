
import React, { useEffect, useRef } from 'react'; // useState removed as it's not used directly
import useAgileBloomStore from '../store/useAgileBloomStore';
// ttsService import removed
import { MessageBubble } from './MessageBubble';
import { CommandInput } from './CommandInput';
import { LoadingSpinner } from './LoadingSpinner';
import { HelpModal } from './HelpModal';
import { API_KEY_ERROR_MESSAGE } from '../constants';
import { Keyboard } from 'lucide-react';

export const ChatInterface: React.FC = () => {
  const { 
    discussion, 
    isLoading, 
    error, 
    apiKeyStatus, 
    isHelpModalOpen, 
    checkAndSetApiKeyStatus,
    // setTTSEnabled removed
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

  // useEffect for TTS support check removed
  // useEffect(() => {
  //   if (!ttsService.isApiSupported) {
  //     console.warn("Speech Synthesis API not supported by this browser. TTS will be disabled.");
  //     setTTSEnabled(false); 
  //   }
  // }, [setTTSEnabled]);


  const showApiKeyError = apiKeyStatus === 'error';

  return (
    <div className="flex flex-col h-full"> {/* Root container */}
      {isHelpModalOpen && <HelpModal />}
      
      {/* Main content area for two columns / stacked layout */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden p-2 sm:p-4 gap-x-3 lg:gap-x-4">
        
        {/* Messages Area (Right column on desktop, top on mobile) */}
        <div 
          className="order-1 md:order-2 flex-grow overflow-y-auto rounded-lg glassmorphism scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 p-3 sm:p-4"
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

        {/* Input Area (Left column on desktop, bottom on mobile) */}
        <div 
          className="order-2 md:order-1 md:w-2/5 lg:w-[36%] xl:w-1/3 flex flex-col rounded-lg bg-gray-800/30 backdrop-blur-sm p-3 sm:p-4 mt-2 md:mt-0"
        >
          {/* Informational panel for desktop */}
          <div className="hidden md:flex flex-col items-center justify-start p-3 text-center text-gray-400 border-b border-gray-700/30 mb-4 rounded-t-lg bg-gray-900/10">
            <Keyboard size={36} className="mb-2 text-purple-400 opacity-80" />
            <h3 className="text-lg font-semibold text-purple-300">Input & Controls</h3>
            <p className="text-xs">Enter commands and messages below. Use <code>/help</code> for assistance.</p>
          </div>
          
          {/* Wrapper to push CommandInput to the bottom of this column */}
          <div className="flex-grow flex flex-col justify-end">
            <CommandInput />
          </div>
        </div>

      </div>
    </div>
  );
};
