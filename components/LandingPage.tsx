import React from 'react';
import { BrainCircuit, Users, Terminal, ListChecks, Zap, FileText, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50 transition-all duration-300 hover:border-purple-500/80 hover:scale-105">
    <div className="flex items-center mb-3">
      <div className="p-2 bg-purple-600/30 rounded-full mr-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
    </div>
    <p className="text-sm text-gray-400">{description}</p>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-gray-100 font-sans flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl w-full mx-auto animate-fadeIn">
        
        <header className="text-center mb-12">
          <div className="flex justify-center items-center gap-4 mb-4">
             <img src="https://picsum.photos/seed/agilebloom/60/60" alt="AgileBloom Logo" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-purple-500" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Agile<span className="text-purple-400">Bloom</span> AI
            </h1>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl text-purple-200/90 mt-2">
            Your AI-Powered Discussion Facilitator for Complex Problem-Solving.
          </p>
        </header>

        <main>
          <section id="features" className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8 text-purple-300">Core Functionality</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<Users size={24} className="text-purple-300" />}
                title="Multi-Persona AI Team"
                description="Engage with a diverse team of AI experts: an Engineer, Artist, Linguist, and Scrum Leader, each offering unique perspectives."
              />
              <FeatureCard 
                icon={<BrainCircuit size={24} className="text-purple-300" />}
                title="Structured Discussion"
                description="Utilize a 'Tree of Thoughts' methodology within an Agile Scrum framework to explore topics deeply and systematically."
              />
              <FeatureCard 
                icon={<Terminal size={24} className="text-purple-300" />}
                title="Command-Driven Facilitation"
                description="You are in control. Guide the conversation with intuitive commands like /topic, /ask, and /elaborate."
              />
              <FeatureCard 
                icon={<ListChecks size={24} className="text-purple-300" />}
                title="Intelligent Tracking"
                description="Automatically track key questions and generate actionable tasks. Use /questions and /tasks to manage project flow."
              />
               <FeatureCard 
                icon={<Zap size={24} className="text-purple-300" />}
                title="Auto-Pilot Mode"
                description="Enable Auto Mode to let the AI team continue the discussion autonomously, generating new insights without constant input."
              />
               <FeatureCard 
                icon={<FileText size={24} className="text-purple-300" />}
                title="Context-Aware"
                description="Enrich discussions by uploading images or text files. The AI team will analyze and incorporate the data."
              />
            </div>
          </section>

          <section id="how-it-works" className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8 text-purple-300">How It Works</h2>
            <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <div className="text-purple-400 font-bold text-2xl mb-2">1</div>
                <h3 className="font-semibold mb-1">Set a Topic</h3>
                <p className="text-xs text-gray-400">Use <code>/topic</code> to give the team a problem to solve.</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <div className="text-purple-400 font-bold text-2xl mb-2">2</div>
                <h3 className="font-semibold mb-1">Facilitate</h3>
                <p className="text-xs text-gray-400">Guide the AI with commands like <code>/ask</code> or <code>/suggest</code>.</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <div className="text-purple-400 font-bold text-2xl mb-2">3</div>
                <h3 className="font-semibold mb-1">Observe</h3>
                <p className="text-xs text-gray-400">Watch as personas debate, ideate, and build on thoughts.</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <div className="text-purple-400 font-bold text-2xl mb-2">4</div>
                <h3 className="font-semibold mb-1">Synthesize</h3>
                <p className="text-xs text-gray-400">Use <code>/summary</code> or <code>/stories</code> to get concrete outcomes.</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="text-center mt-8">
          <button 
            onClick={onEnter} 
            className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-lg shadow-lg hover:bg-purple-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transform hover:scale-105"
          >
            Start Facilitating
            <ArrowRight className="ml-3 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </footer>

      </div>
    </div>
  );
};
