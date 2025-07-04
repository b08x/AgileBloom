import React from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { AVAILABLE_COMMANDS } from '../constants';
import { X } from 'lucide-react';

export const HelpModal: React.FC = () => {
  const { toggleHelpModal } = useAgileBloomStore();

  const commandsToDisplay = AVAILABLE_COMMANDS;

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
        onClick={toggleHelpModal}
    >
      <div 
        className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-700 border border-purple-700/50 relative"
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <button 
            onClick={toggleHelpModal} 
            className="absolute top-3 right-3 text-gray-400 hover:text-purple-400 transition-colors"
            title="Close"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-semibold mb-6 text-purple-400">Available Commands</h2>
        <div className="space-y-4">
          {commandsToDisplay.map((cmd) => (
            <div key={cmd.name} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600/50">
              <p className="font-semibold text-purple-300">
                <code className="text-sm bg-gray-600/70 px-1.5 py-0.5 rounded">{cmd.name}</code> 
                {cmd.arguments && <code className="text-xs text-gray-400 ml-1">{cmd.arguments}</code>}
              </p>
              <p className="text-xs text-gray-300 mt-1">{cmd.description}</p>
              {cmd.example && <p className="text-xs text-gray-400 mt-1"><em>Example: <code className="text-xs bg-gray-600/50 px-1 py-0.5 rounded">{cmd.example}</code></em></p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};