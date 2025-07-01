import React, { useState } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';
import { QuestionItemCard } from './QuestionItemCard';
import { QuestionStatus } from '../types';
import { ID_PREFIX_LENGTH_QUESTIONS } from '../constants';
import { Lightbulb } from 'lucide-react';

const FILTERS: Array<{ label: string; value: QuestionStatus | 'all' }> = [
  { label: "Open", value: QuestionStatus.Open },
  { label: "Addressing", value: QuestionStatus.Addressing },
  { label: "All", value: "all" },
  { label: "Addressed", value: QuestionStatus.Addressed },
  { label: "Dismissed", value: QuestionStatus.Dismissed },
];

export const TrackedQuestionsSidebar: React.FC = () => {
    const { trackedQuestions, isLoading, updateTrackedQuestionStatus } = useAgileBloomStore();
    const { sendMessage, updateQuestionStatusAndPotentiallyGenerateActions } = useAgileBloomChat();
    const [activeFilter, setActiveFilter] = useState<QuestionStatus | 'all'>(QuestionStatus.Open);

    const handleQuestionClick = (questionId: string) => {
        if (isLoading) return; // Prevent action while AI is busy
        const question = trackedQuestions.find(q => q.id === questionId);
        if (question) {
            updateTrackedQuestionStatus(questionId, QuestionStatus.Addressing);
            const shortId = questionId.substring(0, ID_PREFIX_LENGTH_QUESTIONS);
            sendMessage(`/questions discuss ${shortId}`, null, false);
        }
    };

    const handleStatusChange = (questionId: string, newStatus: QuestionStatus) => {
        if (isLoading) return;
        updateQuestionStatusAndPotentiallyGenerateActions(questionId, newStatus);
    };

    const filteredQuestions = trackedQuestions.filter(q => 
        activeFilter === 'all' || q.status === activeFilter
    ).sort((a, b) => a.timestamp - b.timestamp);

    return (
        <div className="flex flex-col h-full w-full">
            <header className="p-4 border-b border-gray-700/50">
                <h2 className="text-lg font-semibold text-purple-300">Tracked Discussion Points</h2>
            </header>
            
            <div className="p-2 border-b border-gray-700/50">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setActiveFilter(value)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 ${
                                activeFilter === value
                                    ? 'bg-purple-600 text-white font-semibold shadow-md'
                                    : 'bg-gray-700/60 hover:bg-gray-600/80 text-gray-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                {filteredQuestions.length > 0 ? (
                    <div className="space-y-2">
                        {filteredQuestions.map(q => (
                            <QuestionItemCard
                                key={q.id}
                                question={q}
                                onQuestionClick={handleQuestionClick}
                                onStatusChange={handleStatusChange}
                                isDisabled={isLoading}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                        <Lightbulb size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-400">No Questions Found</h3>
                        <p className="text-xs">No questions match the "{activeFilter}" filter.</p>
                        <p className="text-xs mt-2">New questions will appear here as the AI team discusses the topic.</p>
                    </div>
                )}
            </div>
        </div>
    );
};