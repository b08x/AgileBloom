
import React, { useState, useMemo } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';
import { QuestionItemCard } from './QuestionItemCard';
import { QuestionStatus, ExpertRole } from '../types';
import { EXPERTS, EXPERT_ROUND_ROBIN_ORDER, ID_PREFIX_LENGTH_QUESTIONS } from '../constants';
import { Lightbulb, ChevronDown, CheckSquare, XSquare, Loader2 } from 'lucide-react';

// An ExpertGroup component to keep the main component cleaner
const ExpertQuestionGroup: React.FC<{
  expertRole: ExpertRole;
  questions: ReturnType<typeof useAgileBloomStore.getState>['trackedQuestions'];
  selectedQuestionIds: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: (ids: string[]) => void;
  onQuestionClick: (id: string) => void;
  onDismiss: (id: string) => void;
  isDisabled: boolean;
}> = ({ expertRole, questions, selectedQuestionIds, onToggleSelection, onSelectAll, onDeselectAll, onQuestionClick, onDismiss, isDisabled }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const expertQuestions = useMemo(() => questions.filter(q => q.expertRole === expertRole), [questions, expertRole]);
  const expertQuestionIds = useMemo(() => expertQuestions.map(q => q.id), [expertQuestions]);
  
  const areAllSelected = useMemo(() => expertQuestionIds.length > 0 && expertQuestionIds.every(id => selectedQuestionIds.includes(id)), [expertQuestionIds, selectedQuestionIds]);

  if (expertQuestions.length === 0) {
    return null; // Don't render group if expert has no questions
  }

  const handleSelectAllToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectAll(expertQuestionIds);
    } else {
      onDeselectAll(expertQuestionIds);
    }
  };

  return (
    <div className="bg-gray-800/20 rounded-lg border border-gray-700/30 overflow-hidden">
      <header 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-700/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
            <input
                type="checkbox"
                checked={areAllSelected}
                onChange={handleSelectAllToggle}
                onClick={(e) => e.stopPropagation()} // Prevent header click from toggling collapse
                disabled={isDisabled}
                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed"
                title={`Select all questions from ${expertRole}`}
            />
            <span className="text-lg">{EXPERTS[expertRole].emoji}</span>
            <span className="font-semibold text-gray-200">{expertRole}</span>
            <span className="text-xs font-mono bg-gray-700/50 text-purple-300 px-1.5 py-0.5 rounded-full">{expertQuestions.length}</span>
        </div>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
      </header>
      {!isCollapsed && (
        <div className="p-2 space-y-2 border-t border-gray-700/30">
          {expertQuestions.sort((a, b) => a.timestamp - b.timestamp).map(q => (
            <QuestionItemCard
              key={q.id}
              question={q}
              isSelected={selectedQuestionIds.includes(q.id)}
              onToggleSelection={onToggleSelection}
              onQuestionClick={onQuestionClick}
              onDismiss={onDismiss}
              isDisabled={isDisabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};


export const TrackedQuestionsSidebar: React.FC = () => {
    const { trackedQuestions, isLoading } = useAgileBloomStore();
    const { sendMessage, updateQuestionStatusAndPotentiallyGenerateActions } = useAgileBloomChat();
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const isProcessing = isLoading || isBulkUpdating;

    const handleQuestionClick = (questionId: string) => {
        if (isProcessing) return;
        const shortId = questionId.substring(0, ID_PREFIX_LENGTH_QUESTIONS);
        sendMessage(`/questions discuss ${shortId}`, null, false);
    };
    
    const handleToggleSelection = (id: string) => {
        setSelectedQuestionIds(prev =>
            prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
        );
    };

    const handleSelectAllForExpert = (idsToAdd: string[]) => {
        setSelectedQuestionIds(prev => [...new Set([...prev, ...idsToAdd])]);
    };
    
    const handleDeselectAllForExpert = (idsToRemove: string[]) => {
        setSelectedQuestionIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    };

    const handleDismiss = (questionId: string) => {
        if (isProcessing) return;
        updateQuestionStatusAndPotentiallyGenerateActions(questionId, QuestionStatus.Dismissed);
    };

    const handleBulkStatusChange = async (newStatus: QuestionStatus) => {
        if (isProcessing || selectedQuestionIds.length === 0) return;
        
        setIsBulkUpdating(true);
        try {
            for (const id of selectedQuestionIds) {
                // We run them sequentially to avoid race conditions and potential rate limits,
                // especially for 'Addressed' which triggers an AI call.
                await updateQuestionStatusAndPotentiallyGenerateActions(id, newStatus);
            }
        } catch (error) {
            console.error("Error during bulk update:", error);
            // Optionally add an error message to the store
        } finally {
            setSelectedQuestionIds([]);
            setIsBulkUpdating(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full">
            <header className="p-4 border-b border-gray-700/50">
                <h2 className="text-lg font-semibold text-purple-300">Tracked Discussion Points</h2>
                <p className="text-xs text-gray-400">Questions raised by the AI team during discussion.</p>
            </header>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 space-y-3">
                {trackedQuestions.length > 0 ? (
                    EXPERT_ROUND_ROBIN_ORDER.map(expertRole => (
                      <ExpertQuestionGroup
                        key={expertRole}
                        expertRole={expertRole}
                        questions={trackedQuestions}
                        selectedQuestionIds={selectedQuestionIds}
                        onToggleSelection={handleToggleSelection}
                        onSelectAll={handleSelectAllForExpert}
                        onDeselectAll={handleDeselectAllForExpert}
                        onQuestionClick={handleQuestionClick}
                        onDismiss={handleDismiss}
                        isDisabled={isProcessing}
                      />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                        <Lightbulb size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-400">No Questions Found</h3>
                        <p className="text-xs mt-2">New questions will appear here as the AI team discusses the topic.</p>
                    </div>
                )}
            </div>

            {selectedQuestionIds.length > 0 && (
                 <div className="flex-shrink-0 p-3 border-t border-gray-700/50 bg-gray-900/30 animate-fadeIn">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-gray-200">
                            Bulk Actions ({selectedQuestionIds.length} selected)
                        </h4>
                        <button 
                            onClick={() => setSelectedQuestionIds([])} 
                            disabled={isProcessing}
                            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                            Deselect All
                        </button>
                    </div>
                    {isBulkUpdating && (
                        <div className="flex items-center justify-center p-2 text-yellow-400">
                             <Loader2 size={16} className="animate-spin mr-2" />
                             <span>Applying changes...</span>
                        </div>
                    )}
                    {!isBulkUpdating && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                           <button 
                                onClick={() => handleBulkStatusChange(QuestionStatus.Addressed)} 
                                disabled={isProcessing}
                                className="flex items-center justify-center gap-1.5 p-2 bg-green-800/60 hover:bg-green-700/80 text-green-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckSquare size={14}/> Mark as Addressed
                            </button>
                             <button 
                                onClick={() => handleBulkStatusChange(QuestionStatus.Dismissed)}
                                disabled={isProcessing}
                                className="flex items-center justify-center gap-1.5 p-2 bg-red-800/60 hover:bg-red-700/80 text-red-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XSquare size={14}/> Dismiss
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
