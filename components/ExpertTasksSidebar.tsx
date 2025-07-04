import React, { useState } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';
import { EXPERTS, EXPERT_ROUND_ROBIN_ORDER } from '../constants';
import { TaskStatus, ExpertRole } from '../types';
import { TaskItemCard } from './TaskItemCard';
import { ListChecks, BrainCircuit, ListTodo, ClipboardList } from 'lucide-react';

const TABS: Array<{ label: string; value: ExpertRole | 'Unassigned', emoji: React.ReactNode }> = [
    ...EXPERT_ROUND_ROBIN_ORDER.map(role => ({
        label: role,
        value: role,
        emoji: EXPERTS[role].emoji
    })),
    { label: 'Unassigned', value: 'Unassigned', emoji: <ClipboardList size={16} /> }
];

export const ExpertTasksSidebar: React.FC = () => {
    const { 
        trackedTasks, 
        isLoading, 
        topic,
        removeTrackedTask,
    } = useAgileBloomStore();
    
    const { generateTasksFromContext, sendMessage, handleTaskStatusUpdate } = useAgileBloomChat();

    const [activeTab, setActiveTab] = useState<ExpertRole | 'Unassigned'>(EXPERT_ROUND_ROBIN_ORDER[0]);

    const handleShowWork = (expert: ExpertRole) => {
        if (isLoading || !expert) return;
        sendMessage(`/show-work ${expert}`, null, false);
    };
    
    const filteredTasks = trackedTasks.filter(t => {
        const isCurrent = t.status === TaskStatus.ToDo || t.status === TaskStatus.InProgress;
        if (!isCurrent) return false;

        if (activeTab === 'Unassigned') {
            return !t.assignedTo;
        }
        return t.assignedTo === activeTab;
    }).sort((a, b) => a.timestamp - b.timestamp);


    return (
        <div className="flex flex-col h-full w-full bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/50">
            <header className="p-4 border-b border-gray-700/50">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ListChecks className="text-purple-300" size={20} />
                        <h2 className="text-lg font-semibold text-purple-300">Current Tasks</h2>
                    </div>
                    <button
                        onClick={generateTasksFromContext}
                        disabled={isLoading || !topic}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-purple-300 bg-purple-900/40 hover:bg-purple-800/60 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!topic ? "Start a discussion first" : "Generate a task backlog based on the current discussion context."}
                    >
                        <BrainCircuit size={14} />
                        Generate Backlog
                    </button>
                </div>
            </header>
            
            <div className="p-2 border-b border-gray-700/50">
                <div className="grid grid-cols-5 gap-1">
                    {TABS.map(({ label, value, emoji }) => {
                        const tasksForTab = trackedTasks.filter(t => {
                             const isCurrent = t.status === TaskStatus.ToDo || t.status === TaskStatus.InProgress;
                             if (!isCurrent) return false;
                             if (value === 'Unassigned') return !t.assignedTo;
                             return t.assignedTo === value;
                        });
                        const count = tasksForTab.length;

                        return (
                        <button
                            key={value}
                            onClick={() => setActiveTab(value)}
                            title={label}
                            className={`relative flex flex-col items-center justify-center gap-1 p-2 text-xs rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 ${
                                activeTab === value
                                    ? 'bg-purple-600 text-white font-semibold shadow-md'
                                    : 'bg-gray-700/60 hover:bg-gray-600/80 text-gray-300'
                            }`}
                        >
                            <span className="text-lg">{emoji}</span>
                            <span className="hidden lg:inline">{label}</span>
                            {count > 0 && (
                                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                    {count}
                                </span>
                            )}
                        </button>
                    )})}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                {filteredTasks.length > 0 ? (
                    <div className="space-y-2">
                        {filteredTasks.map(task => (
                           <TaskItemCard 
                                key={task.id} 
                                task={task} 
                                onUpdateStatus={handleTaskStatusUpdate}
                                onRemove={removeTrackedTask}
                                onShowWork={handleShowWork}
                                isDisabled={isLoading}
                           />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                        <ListTodo size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-400">No Current Tasks</h3>
                        <p className="text-xs">No 'To Do' or 'In Progress' tasks for {activeTab}.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
