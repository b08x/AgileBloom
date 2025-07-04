
import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { SetupPage } from './components/SetupPage';
import { useAgileBloomChat } from './hooks/useAgileBloomChat';
import useAgileBloomStore from './store/useAgileBloomStore';
import { AIConfig } from './types';
import { ExplanationPage } from './components/ExplanationPage';

const App: React.FC = () => {
  const [appState, setAppState] = useState<'explanation' | 'landing' | 'setup' | 'chat'>('explanation');
  const { initiateDiscussion } = useAgileBloomChat();
  const { setAiConfig } = useAgileBloomStore();

  const handleSetupComplete = (topic: string, context: string, config: AIConfig) => {
    setAiConfig(config);
    initiateDiscussion(topic, context);
    setAppState('chat');
  };

  if (appState === 'explanation') {
    return <ExplanationPage onContinue={() => setAppState('landing')} />;
  }

  if (appState === 'landing') {
    return <LandingPage onEnter={() => setAppState('setup')} />;
  }
  
  if (appState === 'setup') {
    return <SetupPage onBegin={handleSetupComplete} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <Header />
      <main className="flex-grow overflow-hidden flex flex-row">
        <div className="flex-grow overflow-hidden">
          <ChatInterface />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;