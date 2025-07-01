import React from 'react';
import { TrackedQuestion, QuestionStatus } from '../types';
import { EXPERTS } from '../constants';
import { CheckCircle2, MessageSquare, XCircle, Loader2 } from 'lucide-react';

interface QuestionItemCardProps {
  question: TrackedQuestion;
  onQuestionClick: (questionId: string) => void;
  onStatusChange: (questionId: string, newStatus: QuestionStatus) => void;
  isDisabled: boolean;
}

const statusConfig: Record<QuestionStatus, { icon: React.ReactNode; color: string; label: string }> = {
  [QuestionStatus.Open]: { icon: <MessageSquare size={14} />, color: 'text-blue-400', label: 'Open' },
  [QuestionStatus.Addressing]: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-yellow-400', label: 'Addressing' },
  [QuestionStatus.Addressed]: { icon: <CheckCircle2 size={14} />, color: 'text-green-400', label: 'Addressed' },
  [QuestionStatus.Dismissed]: { icon: <XCircle size={14} />, color: 'text-gray-500', label: 'Dismissed' },
};

export const QuestionItemCard: React.FC<QuestionItemCardProps> = ({ question, onQuestionClick, onStatusChange, isDisabled }) => {
  const { expertRole, expertEmoji, text, status } = question;
  const config = statusConfig[status] || statusConfig.Open;
  const expertName = EXPERTS[expertRole]?.name || expertRole;

  return (
    <div
      className="w-full text-left p-3 bg-gray-900/40 rounded-lg border border-gray-700/60 transition-all duration-200 disabled:opacity-60 flex flex-col justify-between"
    >
      <button
        onClick={() => onQuestionClick(question.id)}
        disabled={isDisabled}
        className="flex-grow text-left focus:outline-none group/discuss disabled:cursor-not-allowed"
        aria-label={`Discuss question: ${text}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-grow pr-2">
            <div className="flex items-center text-xs text-gray-400 mb-1.5">
              <span className="mr-1.5 text-sm">{expertEmoji}</span>
              <span className="font-semibold">{expertName}</span>
            </div>
            <p className="text-sm text-gray-200 leading-snug group-hover/discuss:text-purple-300 transition-colors">{text}</p>
          </div>
        </div>
      </button>
      
      <div className="mt-2 pt-2 border-t border-gray-700/40 flex items-center justify-between">
        <div className={`flex items-center text-xs font-medium ${config.color}`}>
          {config.icon}
          <span className="ml-1.5">{config.label}</span>
        </div>
        
        <select
            value={status}
            onChange={(e) => onStatusChange(question.id, e.target.value as QuestionStatus)}
            disabled={isDisabled}
            className="bg-gray-700/80 border border-gray-600 rounded text-xs py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors disabled:cursor-not-allowed"
            aria-label={`Change status for question: ${text}`}
        >
            {Object.values(QuestionStatus).map(s => (
                <option key={s} value={s}>{s}</option>
            ))}
        </select>
      </div>
    </div>
  );
};
