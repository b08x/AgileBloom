
import React from 'react';
import { TrackedQuestion, QuestionStatus } from '../types';
import { EXPERTS } from '../constants';
import { CheckCircle2, MessageSquare, Loader2, XSquare, X } from 'lucide-react';

interface QuestionItemCardProps {
  question: TrackedQuestion;
  isSelected: boolean;
  onToggleSelection: (questionId: string) => void;
  onQuestionClick: (questionId: string) => void;
  onDismiss: (questionId: string) => void;
  isDisabled: boolean;
}

const statusConfig: Record<QuestionStatus, { icon: React.ReactNode; color: string; label: string }> = {
  [QuestionStatus.Open]: { icon: <MessageSquare size={14} />, color: 'text-blue-400', label: 'Open' },
  [QuestionStatus.Addressing]: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-yellow-400', label: 'Addressing' },
  [QuestionStatus.Addressed]: { icon: <CheckCircle2 size={14} />, color: 'text-green-400', label: 'Addressed' },
  [QuestionStatus.Dismissed]: { icon: <XSquare size={14} />, color: 'text-gray-500', label: 'Dismissed' },
};

export const QuestionItemCard: React.FC<QuestionItemCardProps> = ({ question, isSelected, onToggleSelection, onQuestionClick, onDismiss, isDisabled }) => {
  const { expertRole, expertEmoji, text, status } = question;
  const config = statusConfig[status] || statusConfig.Open;
  const expertName = EXPERTS[expertRole]?.name || expertRole;

  return (
    <div
      className={`relative w-full text-left p-3 bg-gray-900/40 rounded-lg border transition-all duration-200 disabled:opacity-60 flex gap-3 items-start
        ${isSelected ? 'border-purple-500 shadow-lg' : 'border-gray-700/60'}
        ${isDisabled || status === QuestionStatus.Dismissed ? 'cursor-not-allowed' : 'cursor-pointer hover:border-purple-600/70'}
      `}
      onClick={() => !isDisabled && status !== QuestionStatus.Dismissed && onQuestionClick(question.id)}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation(); // Prevent card click when toggling checkbox
          onToggleSelection(question.id);
        }}
        disabled={isDisabled}
        className="mt-1 h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
        aria-label={`Select question: ${text}`}
      />
      <div className="flex-grow">
        <div className="flex justify-between items-start">
            <div className="flex items-center text-xs text-gray-400 mb-1.5">
                <span className="mr-1.5 text-sm">{expertEmoji}</span>
                <span className="font-semibold">{expertName}</span>
            </div>
            {status !== QuestionStatus.Dismissed && status !== QuestionStatus.Addressed && (
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(question.id);
                    }}
                    disabled={isDisabled}
                    className="-mt-1 -mr-1 p-1 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed flex-shrink-0"
                    title="Dismiss question"
                    aria-label="Dismiss question"
                >
                    <X size={16} />
                </button>
            )}
        </div>
        <p className={`text-sm leading-snug ${status === QuestionStatus.Dismissed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{text}</p>
        <div className={`mt-2 flex items-center text-xs font-medium ${config.color}`}>
          {config.icon}
          <span className="ml-1.5">{config.label}</span>
        </div>
      </div>
    </div>
  );
};
