
import React from 'react';
import { TrackedTask, TaskStatus, ExpertRole } from '../types';
import { EXPERTS } from '../constants';
import { Circle, Settings2, Check, Trash2, User, Play, Link } from 'lucide-react';
import useAgileBloomStore from '../store/useAgileBloomStore';

interface TaskItemCardProps {
  task: TrackedTask;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onRemove: (taskId: string) => void;
  onShowWork: (expert: ExpertRole) => void;
  isDisabled: boolean;
}

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; color: string; }> = {
  [TaskStatus.ToDo]: { icon: <Circle size={14} />, color: 'text-[#95aac0]' },
  [TaskStatus.InProgress]: { icon: <Settings2 size={14} className="animate-spin" style={{ animationDuration: '3s' }} />, color: 'text-yellow-400' },
  [TaskStatus.Done]: { icon: <Check size={14} />, color: 'text-green-400' },
};

export const TaskItemCard: React.FC<TaskItemCardProps> = ({ task, onUpdateStatus, onRemove, onShowWork, isDisabled }) => {
    const { id, description, status, assignedTo, storyId } = task;
    const { trackedStories } = useAgileBloomStore.getState();
    
    const config = statusConfig[status] || statusConfig[TaskStatus.ToDo];
    const expert = assignedTo ? EXPERTS[assignedTo] : null;

    const parentStory = storyId ? trackedStories.find(s => s.id === storyId) : null;

    return (
        <div className="w-full text-left p-3 bg-[#333e48] rounded-lg border border-[#5c6f7e] transition-all duration-200 space-y-2">
             {parentStory && (
                <div className="text-xs text-[#e2a32d] flex items-center gap-1.5 bg-[#e2a32d]/20 px-2 py-1 rounded-full w-fit">
                   <Link size={12}/>
                   From Story: #{parentStory.id.substring(0, 6)}
                </div>
             )}
            <div className="flex justify-between items-start">
                <p className="text-sm text-gray-200 leading-snug flex-grow pr-2 whitespace-pre-wrap">{description}</p>
                <button
                    onClick={() => window.confirm(`Are you sure you want to remove this task?\n\n"${description}"`) && onRemove(id)}
                    disabled={isDisabled}
                    className="p-1 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed flex-shrink-0"
                    title="Remove task"
                    aria-label="Remove task"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="mt-2 pt-2 border-t border-[#5c6f7e] flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                     <span className={`flex items-center font-medium ${config.color}`}>
                        {config.icon}
                        <span className="ml-1.5">{status}</span>
                    </span>
                    {expert ? (
                        <span className="flex items-center text-[#95aac0]" title={`Assigned to ${expert.name}`}>
                            {expert.emoji}
                            <span className="ml-1 font-medium text-gray-200">{expert.name}</span>
                        </span>
                    ) : (
                        <span className="flex items-center text-gray-500" title="Unassigned">
                           <User size={12} />
                           <span className="ml-1">Unassigned</span>
                        </span>
                    )}
                </div>
                 
                 <div className="flex items-center gap-2">
                    {task.status === TaskStatus.InProgress && task.assignedTo && (
                        <button
                            onClick={() => onShowWork(task.assignedTo!)}
                            disabled={isDisabled}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-green-300 bg-green-900/40 hover:bg-green-800/60 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Ask ${task.assignedTo} to show their work on this task`}
                        >
                            <Play size={12} />
                            Show Work
                        </button>
                    )}
                    <select
                        value={status}
                        onChange={(e) => onUpdateStatus(id, e.target.value as TaskStatus)}
                        disabled={isDisabled}
                        className="bg-[#5c6f7e] border border-[#95aac0] rounded text-xs py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-[#e2a32d] transition-colors disabled:cursor-not-allowed"
                        aria-label={`Change status for task: ${description}`}
                    >
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};