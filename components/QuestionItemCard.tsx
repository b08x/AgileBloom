
import React, { useState, useRef, useEffect } from 'react';
import { TrackedQuestion, QuestionStatus } from '../types';
import { CheckCircle2, MessageSquare, Loader2, XSquare, MoreVertical, Trash2 } from 'lucide-react';

interface QuestionItemCardProps {
  question: TrackedQuestion;
  isSelected: boolean;
  onToggleSelection: (questionId: string) => void;
  onDiscuss: (questionId: string) => void;
  onMarkAddressed: (questionId: string) => void;
  onDismiss: (questionId: string) => void;
  isDisabled: boolean;
}

const statusConfig: Record<QuestionStatus, { icon: React.ReactNode; color: string; label: string }> = {
  [QuestionStatus.Open]: { icon: <MessageSquare size={14} />, color: 'text-blue-400', label: 'Open' },
  [QuestionStatus.Addressing]: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-yellow-400', label: 'Addressing' },
  [QuestionStatus.Addressed]: { icon: <CheckCircle2 size={14} />, color: 'text-green-400', label: 'Addressed' },
  [QuestionStatus.Dismissed]: { icon: <XSquare size={14} />, color: 'text-gray-500', label: 'Dismissed' },
};

export const QuestionItemCard: React.FC<QuestionItemCardProps> = ({ question, isSelected, onToggleSelection, onDiscuss, onMarkAddressed, onDismiss, isDisabled }) => {
  const { id, expertRole, expertEmoji, text, status } = question;
  const config = statusConfig[status] || statusConfig.Open;
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleAction = (action: (id: string) => void) => {
    action(id);
    setIsMenuOpen(false);
  };

  return (
    <div
      className={`relative w-full text-left p-3 bg-gray-900/40 rounded-lg border transition-all duration-200 flex gap-3 items-start
        ${isSelected ? 'border-purple-500 shadow-lg' : 'border-gray-700/60'}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelection(id)}
        disabled={isDisabled}
        className="mt-1 h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
        aria-label={`Select question: ${text}`}
      />
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center text-xs text-gray-400">
                <span className="mr-1.5 text-sm">{expertEmoji}</span>
                <span className="font-semibold">{expertRole}</span>
            </div>
        </div>
        <p className={`text-sm leading-snug ${status === QuestionStatus.Dismissed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{text}</p>
        <div className={`mt-2 flex items-center text-xs font-medium ${config.color}`}>
          {config.icon}
          <span className="ml-1.5">{config.label}</span>
        </div>
      </div>
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
            disabled={isDisabled}
            className="p-1 -mr-1 -mt-1 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
            title="Question actions"
        >
            <MoreVertical size={18} />
        </button>
        {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-10 animate-fadeIn">
                <ul className="py-1 text-sm text-gray-200">
                    <li className="px-3 py-1 text-xs text-gray-400">Actions</li>
                    <li>
                        <button onClick={() => handleAction(onDiscuss)} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-purple-600/50 transition-colors">
                            <MessageSquare size={16} /> Discuss
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleAction(onMarkAddressed)} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-purple-600/50 transition-colors">
                            <CheckCircle2 size={16} /> Mark Addressed
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleAction(onDismiss)} className="w-full text-left flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/50 transition-colors">
                            <Trash2 size={16} /> Dismiss
                        </button>
                    </li>
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};
