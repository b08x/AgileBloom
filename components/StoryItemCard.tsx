import React from 'react';
import { TrackedStory, StoryStatus } from '../types';
import { EXPERTS } from '../constants';
import { Book, CheckSquare, Settings2, Trash2, XSquare, FilePlus, Circle } from 'lucide-react';

interface StoryItemCardProps {
  story: TrackedStory;
  onUpdateStatus: (storyId: string, status: StoryStatus) => void;
  onRemove: (storyId: string) => void;
  isDisabled: boolean;
}

const statusConfig: Record<StoryStatus, { icon: React.ReactNode; color: string; }> = {
  [StoryStatus.New]: { icon: <FilePlus size={14} />, color: 'text-blue-400' },
  [StoryStatus.Refining]: { icon: <Settings2 size={14} className="animate-spin" style={{ animationDuration: '3s' }} />, color: 'text-yellow-400' },
  [StoryStatus.Ready]: { icon: <Circle size={14} />, color: 'text-indigo-400' },
  [StoryStatus.Done]: { icon: <CheckSquare size={14} />, color: 'text-green-400' },
  [StoryStatus.Rejected]: { icon: <XSquare size={14} />, color: 'text-red-500' },
};

export const StoryItemCard: React.FC<StoryItemCardProps> = ({ story, onUpdateStatus, onRemove, isDisabled }) => {
    const { id, userStory, benefit, acceptanceCriteria, status, createdBy, fromQuestionId } = story;
    const config = statusConfig[status] || statusConfig[StoryStatus.New];
    
    return (
        <div className="w-full text-left p-3 bg-gray-900/40 rounded-lg border border-gray-700/60 transition-all duration-200 space-y-2">
            
            {/* Header and Remove Button */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-purple-300">
                    <Book size={16} />
                    <h4 className="font-semibold text-sm">User Story</h4>
                </div>
                <button
                    onClick={() => window.confirm(`Are you sure you want to remove this story?\n\n"${userStory}"`) && onRemove(id)}
                    disabled={isDisabled}
                    className="p-1 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed flex-shrink-0"
                    title="Remove story"
                    aria-label="Remove story"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Story Text */}
            <p className="text-sm text-gray-200 leading-snug whitespace-pre-wrap">{userStory}</p>
            
            {/* Benefit */}
            {benefit && (
                <div className="pl-2 border-l-2 border-purple-500/50">
                    <p className="text-xs text-gray-400 italic"><strong>Benefit:</strong> {benefit}</p>
                </div>
            )}
            
            {/* Acceptance Criteria */}
            {acceptanceCriteria && acceptanceCriteria.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-gray-400 mt-2 mb-1">Acceptance Criteria:</h5>
                    <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-gray-300">
                        {acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}
                    </ul>
                </div>
            )}

            {/* Footer with Status and Controls */}
            <div className="mt-2 pt-2 border-t border-gray-700/40 flex justify-between items-center text-xs">
                <span className={`flex items-center font-medium ${config.color}`}>
                    {config.icon}
                    <span className="ml-1.5">{status}</span>
                </span>
                 
                <select
                    value={status}
                    onChange={(e) => onUpdateStatus(id, e.target.value as StoryStatus)}
                    disabled={isDisabled}
                    className="bg-gray-700/80 border border-gray-600 rounded text-xs py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors disabled:cursor-not-allowed"
                    aria-label={`Change status for story: ${userStory}`}
                >
                    {Object.values(StoryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>
    );
};