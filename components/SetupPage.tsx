
import React, { useState, useEffect } from 'react';
import { BrainCircuit, MessageSquareText, Play, Cpu, CheckCircle, XCircle, Loader, ShieldAlert, KeyRound } from 'lucide-react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { AVAILABLE_MODELS } from '../constants/providerConfig';
import { AIModelConfig, AiProvider, AIConfig } from '../types';
import { validateApiKey } from '../services/validationService';
import { SliderInput } from './SliderInput';

interface SetupPageProps {
  onBegin: (topic: string, context: string, config: AIConfig) => void;
}

type ValidationStatus = 'unchecked' | 'pending' | 'valid' | 'invalid';

const ProviderBadge: React.FC<{ provider: AiProvider }> = ({ provider }) => {
  const styles = {
    [AiProvider.Google]: { icon: '💎' },
    [AiProvider.Mistral]: { icon: '⚡️' },
    [AiProvider.OpenAI]: { icon: '🤖' },
    [AiProvider.OpenRouter]: { icon: '🔄' },
  };
  const style = styles[provider];

  return (
    <span className="flex items-center text-xs text-gray-200 bg-[#5c6f7e]/50 px-2 py-0.5 rounded-full">
      {style.icon}
      <span className="ml-1.5">{provider}</span>
    </span>
  );
};

export const SetupPage: React.FC<SetupPageProps> = ({ onBegin }) => {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const { isQuotaExceeded, setQuotaExceeded } = useAgileBloomStore();

  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(AiProvider.Google);
  const [availableModelsForProvider, setAvailableModelsForProvider] = useState<AIModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  
  const [modelConfigParams, setModelConfigParams] = useState<Record<string, number>>({});
  const [userApiKeys, setUserApiKeys] = useState<Partial<Record<AiProvider, string>>>({});
  const [apiKeyValidation, setApiKeyValidation] = useState<Partial<Record<AiProvider, { status: ValidationStatus; error?: string }>>>({});

  const [enableGeminiPreprocessing, setEnableGeminiPreprocessing] = useState(false);

  // Effect to update models when provider changes
  useEffect(() => {
    const models = AVAILABLE_MODELS.filter(m => m.provider === selectedProvider);
    setAvailableModelsForProvider(models);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
    } else {
      setSelectedModelId('');
    }
  }, [selectedProvider]);

  // Effect to update params when model changes
  useEffect(() => {
    const model = AVAILABLE_MODELS.find(m => m.id === selectedModelId);
    if (model) {
      const defaultParams = model.parameters.reduce((acc, param) => {
        acc[param.id] = param.defaultValue;
        return acc;
      }, {} as Record<string, number>);
      setModelConfigParams(defaultParams);
    }
  }, [selectedModelId]);

  const handleValidateKey = async (provider: AiProvider) => {
    const key = userApiKeys[provider];
    if (!key) return;

    setApiKeyValidation(prev => ({ ...prev, [provider]: { status: 'pending' } }));
    const result = await validateApiKey(provider, key);
    setApiKeyValidation(prev => ({ 
      ...prev, 
      [provider]: { 
        status: result.isValid ? 'valid' : 'invalid',
        error: result.error,
      }
    }));
    if (!result.isValid && result.error?.toLowerCase().includes('quota')) {
      setQuotaExceeded(true);
    }
  };

  const getIsReadyToStart = (): { ready: boolean; reason: string } => {
    if (topic.trim() === '') return { ready: false, reason: 'Please enter a discussion topic.' };
    if (isQuotaExceeded) return { ready: false, reason: 'An API key has exceeded its quota.' };

    const mainKeyStatus = apiKeyValidation[selectedProvider]?.status;
    if (mainKeyStatus !== 'valid') {
      return { ready: false, reason: `Please enter and validate the API key for ${selectedProvider}.` };
    }
    
    if (selectedProvider === AiProvider.OpenRouter && enableGeminiPreprocessing) {
      const geminiKeyStatus = apiKeyValidation[AiProvider.Google]?.status;
      if (geminiKeyStatus !== 'valid') {
        return { ready: false, reason: 'Gemini Preprocessing requires a valid Google API key.' };
      }
    }
    return { ready: true, reason: 'Ready to start!' };
  };

  const { ready: isReady, reason: disabledReason } = getIsReadyToStart();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;

    const finalConfig: AIConfig = {
      provider: selectedProvider,
      modelId: selectedModelId,
      params: modelConfigParams,
      apiKeys: userApiKeys,
      useGeminiPreprocessing: selectedProvider === AiProvider.OpenRouter ? enableGeminiPreprocessing : undefined,
    };
    onBegin(topic, context, finalConfig);
  };
  
  const renderApiKeyInput = (provider: AiProvider) => {
    const validation = apiKeyValidation[provider];
    return (
      <div key={provider} className="bg-[#212934] p-4 rounded-lg border border-[#5c6f7e]">
        <label htmlFor={`${provider}-key`} className="flex items-center text-md font-semibold text-gray-200 mb-2">
            <KeyRound className="mr-3 text-[#e2a32d]" size={20} />
            {provider} API Key
        </label>
        <div className="flex items-center gap-2">
            <input
                id={`${provider}-key`}
                type="password"
                value={userApiKeys[provider] || ''}
                onChange={(e) => {
                    setUserApiKeys(prev => ({...prev, [provider]: e.target.value}));
                    setApiKeyValidation(prev => ({...prev, [provider]: { status: 'unchecked' }}));
                    if(isQuotaExceeded) setQuotaExceeded(false);
                }}
                placeholder={`Enter your ${provider} API key`}
                className="w-full p-3 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#e2a32d] transition-colors disabled:opacity-50"
            />
            <button type="button" onClick={() => handleValidateKey(provider)} disabled={!userApiKeys[provider] || validation?.status === 'pending'} className="px-4 py-2.5 h-[50px] bg-[#5c6f7e] rounded-lg hover:bg-[#95aac0] disabled:bg-[#5c6f7e]/50 disabled:cursor-not-allowed">
              {validation?.status === 'pending' ? <Loader size={20} className="animate-spin" /> : "Validate"}
            </button>
            <div className="w-8 h-8 flex items-center justify-center">
              {validation?.status === 'valid' && <span title="API Key is valid"><CheckCircle size={24} className="text-green-400" /></span>}
              {validation?.status === 'invalid' && <span title={`Invalid: ${validation.error}`}><XCircle size={24} className="text-red-500" /></span>}
            </div>
        </div>
        {validation?.status === 'invalid' && <p className="text-xs text-red-300 mt-2 ml-1">{validation.error}</p>}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-[#212934] text-gray-200 font-sans flex items-center justify-center p-4">
      <div className="max-w-3xl w-full mx-auto animate-fadeIn bg-[#333e48]/50 rounded-xl p-8 sm:p-12 shadow-2xl border border-[#e2a32d]/30">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#e2a32d]">
            Discussion Setup
          </h1>
          <p className="text-md text-gray-200 mt-2">
            Set the stage for your AI team. A clear topic is essential for a focused discussion.
          </p>
        </header>

        {isQuotaExceeded && (
            <div className="flex items-center p-4 mb-6 text-base font-semibold text-red-300 bg-red-600/60 border-2 border-red-600 rounded-lg shadow-lg">
                <ShieldAlert size={28} className="mr-4 flex-shrink-0" />
                <div>
                  <h3 className="text-lg">API Quota Exceeded</h3>
                  <p className="text-sm font-normal text-red-300">A previous request failed due to quota limits. Please check your API key or plan.</p>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Topic and Context Inputs */}
          <div>
            <label htmlFor="topic" className="flex items-center text-lg font-semibold text-gray-200 mb-2">
              <BrainCircuit className="mr-3 text-[#e2a32d]" size={24} />
              Main Topic <span className="text-red-500 ml-1">*</span>
            </label>
            <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Brainstorm features for a new productivity app" required className="w-full p-4 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e2a32d] focus:border-[#e2a32d] transition-colors" />
          </div>
          <div>
            <label htmlFor="context" className="flex items-center text-lg font-semibold text-gray-200 mb-2">
              <MessageSquareText className="mr-3 text-[#e2a32d]" size={24} />
              Additional Context (Optional)
            </label>
            <textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Provide background information, constraints, goals, user personas, or any other relevant details..." rows={4} className="w-full p-4 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e2a32d] focus:border-[#e2a32d] transition-colors resize-y" />
          </div>
          
          {/* Provider and Model Selection */}
          <div className="space-y-4">
             <label className="flex items-center text-lg font-semibold text-gray-200">
                <Cpu className="mr-3 text-[#e2a32d]" size={24} />
                Select AI Provider & Model
             </label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value as AiProvider)} className="w-full p-3 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e2a32d]">
                    {Object.values(AiProvider).map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
                 <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)} className="w-full p-3 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e2a32d]">
                    {availableModelsForProvider.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
             </div>
             {AVAILABLE_MODELS.find(m => m.id === selectedModelId) && 
                <div className="p-3 bg-[#212934]/50 rounded-lg text-sm text-[#95aac0] flex justify-between items-center">
                    <p>{AVAILABLE_MODELS.find(m => m.id === selectedModelId)!.description}</p>
                    <ProviderBadge provider={selectedProvider} />
                </div>
              }
          </div>

          {/* Model Parameters */}
          {AVAILABLE_MODELS.find(m => m.id === selectedModelId)?.parameters.length > 0 && (
             <div className="space-y-4 p-4 bg-[#212934]/50 rounded-lg">
                <h3 className="font-semibold text-gray-200">Model Parameters</h3>
                {AVAILABLE_MODELS.find(m => m.id === selectedModelId)!.parameters.map(param => (
                  <SliderInput
                    key={param.id}
                    id={param.id}
                    label={param.name}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={modelConfigParams[param.id] ?? param.defaultValue}
                    onChange={(val) => setModelConfigParams(prev => ({...prev, [param.id]: val}))}
                  />
                ))}
             </div>
          )}

          {/* API Key Section */}
          <div className="space-y-4">
            {renderApiKeyInput(selectedProvider)}
            {selectedProvider === AiProvider.OpenRouter && (
              <div className="p-4 bg-[#212934] rounded-lg border border-[#5c6f7e]">
                 <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={enableGeminiPreprocessing} onChange={(e) => setEnableGeminiPreprocessing(e.target.checked)} className="h-5 w-5 rounded text-[#c36e26] bg-[#5c6f7e] border-[#95aac0] focus:ring-[#e2a32d]" />
                    <span className="text-gray-200">Enable Gemini Preprocessing</span>
                 </label>
                 {enableGeminiPreprocessing && <div className="mt-4">{renderApiKeyInput(AiProvider.Google)}</div>}
              </div>
            )}
          </div>

          {/* Submission Button */}
          <div className="border-t border-[#5c6f7e] pt-6 text-center">
            <button type="submit" disabled={!isReady} title={disabledReason} className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-[#c36e26] rounded-lg shadow-lg hover:bg-[#c36e26]/90 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#e2a32d]/50 transform hover:scale-105 disabled:bg-[#5c6f7e] disabled:cursor-not-allowed disabled:scale-100">
              Begin Discussion
              <Play className="ml-3 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};