
import React, { useState } from 'react';
import { BrainCircuit, MessageSquareText, Play, Cpu, SearchCheck, ShieldAlert, Zap } from 'lucide-react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { SUPPORTED_MODELS, MISTRAL_API_KEY_ERROR_MESSAGE, API_KEY_ERROR_MESSAGE } from '../constants';
import { SupportedModel, AiProvider } from '../types';

interface SetupPageProps {
  onBegin: (topic: string, context: string, modelId: string) => void;
}

const ProviderBadge: React.FC<{ provider: AiProvider }> = ({ provider }) => {
  const isGemini = provider === AiProvider.Gemini;
  const style = isGemini 
    ? { bgColor: 'bg-blue-900/50', textColor: 'text-blue-300', icon: '💎' }
    : { bgColor: 'bg-orange-900/50', textColor: 'text-orange-300', icon: '⚡️' };

  return (
    <span className={`flex items-center text-xs ${style.textColor} ${style.bgColor} px-2 py-0.5 rounded-full`}>
      {style.icon}
      <span className="ml-1.5">{provider}</span>
    </span>
  );
};

export const SetupPage: React.FC<SetupPageProps> = ({ onBegin }) => {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  
  const {
    selectedModelId,
    setSelectedModelId,
    isQuotaExceeded,
    apiKeyStatus,
    mistralApiKeyStatus,
  } = useAgileBloomStore();

  
  let apiKeyErrorMessage: string | null = null;
  const selectedModel = SUPPORTED_MODELS.find(m => m.id === selectedModelId);
  if (selectedModel?.provider === AiProvider.Gemini && apiKeyStatus === 'error') {
    apiKeyErrorMessage = API_KEY_ERROR_MESSAGE + " (process.env.API_KEY)";
  } else if (selectedModel?.provider === AiProvider.Mistral && mistralApiKeyStatus === 'error') {
    apiKeyErrorMessage = MISTRAL_API_KEY_ERROR_MESSAGE + " (process.env.MISTRAL_API_KEY)";
  }

  const isButtonDisabled = topic.trim() === '' || isQuotaExceeded || !!apiKeyErrorMessage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isButtonDisabled) {
      onBegin(topic, context, selectedModelId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-gray-100 font-sans flex items-center justify-center p-4">
      <div className="max-w-3xl w-full mx-auto animate-fadeIn glassmorphism rounded-xl p-8 sm:p-12 shadow-2xl border border-purple-500/30">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-purple-300">
            Discussion Setup
          </h1>
          <p className="text-md text-gray-300 mt-2">
            Set the stage for your AI team. A clear topic is essential for a focused discussion.
          </p>
        </header>

        {isQuotaExceeded && (
            <div className="flex items-center p-4 mb-6 text-base font-semibold text-red-200 bg-red-800/60 border-2 border-red-700 rounded-lg shadow-lg">
                <ShieldAlert size={28} className="mr-4 flex-shrink-0" />
                <div>
                  <h3 className="text-lg">API Quota Exceeded</h3>
                  <p className="text-sm font-normal text-red-300">All requests are currently halted. Please wait for your quota to reset or check your API key settings.</p>
                </div>
            </div>
        )}
        
         {apiKeyErrorMessage && (
            <div className="flex items-center p-4 mb-6 text-base font-semibold text-red-200 bg-red-800/60 border-2 border-red-700 rounded-lg shadow-lg">
                <Zap size={28} className="mr-4 flex-shrink-0" />
                <div>
                  <h3 className="text-lg">API Key Error</h3>
                  <p className="text-sm font-normal text-red-300">{apiKeyErrorMessage}</p>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="topic" className="flex items-center text-lg font-semibold text-gray-100 mb-2">
              <BrainCircuit className="mr-3 text-purple-400" size={24} />
              Main Topic <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Brainstorm features for a new productivity app"
              required
              className="w-full p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:opacity-50"
              disabled={isQuotaExceeded}
            />
          </div>

          <div>
            <label htmlFor="context" className="flex items-center text-lg font-semibold text-gray-100 mb-2">
              <MessageSquareText className="mr-3 text-purple-400" size={24} />
              Additional Context (Optional)
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide background information, constraints, goals, user personas, or any other relevant details..."
              rows={6}
              className="w-full p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-y disabled:opacity-50"
              disabled={isQuotaExceeded}
            />
          </div>
          
          <div>
            <label className="flex items-center text-lg font-semibold text-gray-100 mb-3">
              <Cpu className="mr-3 text-purple-400" size={24} />
              Select AI Model
            </label>
            <div role="radiogroup" aria-labelledby="model-selection-label" className="space-y-3">
              {SUPPORTED_MODELS.map((model: SupportedModel) => (
                <label
                  key={model.id}
                  htmlFor={model.id}
                  className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                    isQuotaExceeded ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  } ${
                    selectedModelId === model.id
                      ? 'bg-purple-600/30 border-purple-500 ring-2 ring-purple-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-purple-600/50'
                  }`}
                >
                  <input
                    type="radio"
                    id={model.id}
                    name="model"
                    value={model.id}
                    checked={selectedModelId === model.id}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="h-5 w-5 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 disabled:cursor-not-allowed"
                    disabled={isQuotaExceeded}
                  />
                  <div className="ml-4 flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-100">{model.name}</span>
                       <ProviderBadge provider={model.provider} />
                    </div>
                     <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400 mt-1 flex-grow pr-2">{model.description}</p>
                        {model.supportsSearch && (
                            <span className="flex-shrink-0 flex items-center text-xs text-green-300 bg-green-900/50 px-2 py-0.5 rounded-full">
                            <SearchCheck size={12} className="mr-1" />
                            Google Search
                            </span>
                        )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700/50 pt-6 text-center">
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-lg shadow-lg hover:bg-purple-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
            >
              Begin Discussion
              <Play className="ml-3 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};