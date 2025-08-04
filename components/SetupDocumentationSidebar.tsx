
import React from 'react';
import { MessageSquareQuote, ListChecks, BookOpen, ArrowRight, CheckSquare, BrainCircuit, Wand2, Star } from 'lucide-react';

const InfoCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-[#333e48] backdrop-blur-sm p-5 rounded-lg border border-[#5c6f7e]">
    <div className="flex items-center mb-3">
      <div className="p-2 bg-[#e2a32d]/20 rounded-full mr-3 text-[#e2a32d]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
    </div>
    <div className="text-sm text-[#95aac0] space-y-2">
      {children}
    </div>
  </div>
);

const FlowStep: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex items-center text-left p-3 bg-[#333e48]/30 rounded-lg w-full">
        <div className="text-[#e2a32d] mr-4">{icon}</div>
        <div>
          <h4 className="font-semibold text-sm text-gray-200">{title}</h4>
          <p className="text-xs text-[#95aac0]">{description}</p>
        </div>
    </div>
);

export const SetupDocumentationSidebar: React.FC = () => {
  return (
    <div className="h-full bg-[#212934] p-6 lg:p-8 flex flex-col gap-10 overflow-y-auto scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934] border-r border-[#5c6f7e]">
        <header className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-[#e2a32d]">
            From Discussion to Delivery
          </h1>
          <p className="text-md text-gray-200 mt-2">
            Agile Bloom turns conversations into structured outcomes. Here's how.
          </p>
        </header>

        <section id="workflow-visual">
            <h2 className="text-xl font-semibold text-left mb-4 text-[#e2a32d]">The Core Workflow</h2>
            <div className="flex flex-col items-center gap-3">
                <FlowStep icon={<BrainCircuit size={28} />} title="1. AI Discussion" description="Experts discuss the topic, generating 'thoughts'." />
                <div className="transform rotate-90 text-[#e2a32d]/70"><ArrowRight size={20} /></div>
                <FlowStep icon={<MessageSquareQuote size={28} />} title="2. Track Questions" description="Key 'thoughts' are automatically logged as questions for review." />
                <div className="transform rotate-90 text-[#e2a32d]/70"><ArrowRight size={20} /></div>
                <FlowStep icon={<CheckSquare size={28} />} title="3. Generate Stories" description="Marking a question 'Addressed' prompts the AI to create User Stories for the backlog." />
                <div className="transform rotate-90 text-[#e2a32d]/70"><ArrowRight size={20} /></div>
                <FlowStep icon={<BookOpen size={28} />} title="4. Refine Backlog" description="Prioritize stories and estimate points directly on the story cards." />
                <div className="transform rotate-90 text-[#e2a32d]/70"><ArrowRight size={20} /></div>
                <FlowStep icon={<Wand2 size={28} />} title="5. Break Down" description="Use 'Break Down' on a story to have the AI team generate specific, actionable tasks." />
            </div>
        </section>
        
        <section id="features" className="space-y-6">
             <InfoCard icon={<BookOpen size={20} />} title="The User Story Backlog">
                <p>The <strong className="text-[#e2a32d]">'Stories'</strong> tab is your central product backlog. They are generated automatically when you address a 'Question', or you can create them manually.</p>
            </InfoCard>
            
            <InfoCard icon={<ListChecks size={20} />} title="Task Breakdown">
                <p>A story is a high-level goal. Use the <strong className="text-[#e2a32d]">'Break Down'</strong> button on any story, and the AI team will collaborate to create a list of concrete tasks.</p>
            </InfoCard>
            
            <InfoCard icon={<Star size={20} />} title="Prioritization & Estimation">
                 <p>On each story card, you can set a <strong className="text-[#e2a32d]">Priority</strong> and assign <strong className="text-[#e2a32d]">Sprint Points</strong> to estimate effort. Use the `/sprint-planning` command to get the AI's suggestion for the next batch of work.</p>
            </InfoCard>

             <InfoCard icon={<CheckSquare size={20} />} title="Integrated Progress">
                 <p>When all tasks for a story are completed, the story itself is marked as <strong className="text-green-400">'Done'</strong>, giving you a clear, up-to-date view of progress.</p>
            </InfoCard>
        </section>
    </div>
  );
};
