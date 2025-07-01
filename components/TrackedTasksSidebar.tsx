

import React, { useState } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { EXPERTS } from '../constants';
import { TaskStatus, ExpertRole, TrackedTask } from '../types';
import { TaskItemCard } from './TaskItemCard';
import { PlusCircle, ListTodo, FileJson, BrainCircuit, ClipboardList } from 'lucide-react';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';

const FILTERS: Array<{ label: string; value: TaskStatus | 'all' }> = [
    { label: "To Do", value: TaskStatus.ToDo },
    { label: "In Progress", value: TaskStatus.InProgress },
    { label: "Done", value: TaskStatus.Done },
    { label: "All", value: "all" },
];

export const TrackedTasksSidebar: React.FC = () => {
    const { 
        trackedTasks, 
        isLoading, 
        addTrackedTask, 
        updateTrackedTaskStatus,
        removeTrackedTask,
        clearAllTrackedTasks,
        clearTrackedTasksByStatus,
        topic,
    } = useAgileBloomStore();
    
    const { generateTasksFromContext, sendMessage } = useAgileBloomChat();

    const [activeFilter, setActiveFilter] = useState<TaskStatus | 'all'>(TaskStatus.ToDo);
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState<ExpertRole | ''>('');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskDescription.trim() && !isLoading) {
            addTrackedTask({
                description: newTaskDescription.trim(),
                createdBy: 'User',
                assignedTo: newTaskAssignee || undefined,
            });
            setNewTaskDescription('');
            setNewTaskAssignee('');
        }
    };

    const handleShowWork = (expert: ExpertRole) => {
        if (isLoading || !expert) return;
        sendMessage(`/show-work ${expert}`, null, false);
    };
    
    const filteredTasks = trackedTasks.filter(t => 
        activeFilter === 'all' || t.status === activeFilter
    );

    const groupedTasks = filteredTasks.reduce((acc, task) => {
        const key = task.assignedTo || 'Unassigned';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(task);
        return acc;
    }, {} as Record<string, TrackedTask[]>);

    // Sort tasks within each group by timestamp
    Object.values(groupedTasks).forEach(tasks => tasks.sort((a,b) => a.timestamp - b.timestamp));

    const renderOrder = ['Unassigned', ...Object.keys(EXPERTS).filter(e => e !== ExpertRole.System && e !== ExpertRole.User)];


    const handleExportJson = () => {
        if (trackedTasks.length === 0) return;
        
        const tasksToExport = trackedTasks.map(({ id, description, status, assignedTo, createdBy, topicContext, timestamp }) => ({
            id,
            status,
            description,
            assignedTo: assignedTo || 'Unassigned',
            createdBy,
            topicContext,
            createdAt: new Date(timestamp).toISOString(),
        }));
    
        const jsonString = JSON.stringify({
            exportDate: new Date().toISOString(),
            topic: topic || "General",
            taskCount: tasksToExport.length,
            tasks: tasksToExport,
        }, null, 2);
    
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const now = new Date();
        const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        a.download = `agilebloom_tasks_backlog_${dateString}.json`;
        
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full w-full">
            <header className="p-4 border-b border-gray-700/50">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-purple-300">Tracked Tasks</h2>
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
                 <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-400">Manage actionable items</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportJson}
                            disabled={isLoading || trackedTasks.length === 0}
                            className="p-1.5 rounded text-gray-300 hover:bg-blue-900/50 hover:text-blue-300 transition-colors disabled:opacity-50"
                            title="Export backlog as JSON"
                        >
                            <FileJson size={16} />
                        </button>
                         <button
                            onClick={() => clearTrackedTasksByStatus(TaskStatus.Done)}
                            className="mr-2 px-2 py-1 text-xs text-yellow-400 bg-yellow-900/40 hover:bg-yellow-800/60 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Clear all 'Done' tasks"
                            disabled={isLoading || !trackedTasks.some(t => t.status === TaskStatus.Done)}
                         >
                            Clear Done
                         </button>
                         <button
                            onClick={() => window.confirm('Are you sure you want to clear ALL tasks?') && clearAllTrackedTasks()}
                            className="px-2 py-1 text-xs text-red-400 bg-red-900/40 hover:bg-red-800/60 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Clear all tasks"
                            disabled={isLoading || trackedTasks.length === 0}
                         >
                            Clear All
                         </button>
                    </div>
                </div>
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
                {filteredTasks.length > 0 ? (
                    <div className="space-y-4">
                        {renderOrder.map(expertKey => {
                            const tasksForExpert = groupedTasks[expertKey];
                            if (!tasksForExpert || tasksForExpert.length === 0) return null;
                            
                            const expert = EXPERTS[expertKey as ExpertRole];

                            return (
                                <div key={expertKey}>
                                    <h3 className="text-sm font-semibold text-purple-300 mb-2 pl-1 flex items-center sticky top-0 bg-gray-800/80 backdrop-blur-sm py-1.5 z-10 border-b border-gray-700/30 rounded-t-md">
                                        {expert ? expert.emoji : <ClipboardList size={16} />}
                                        <span className="ml-2">{expert ? expert.name : 'Unassigned'}</span>
                                        <span className="ml-2 bg-gray-700 text-xs text-gray-300 rounded-full px-2 py-0.5">{tasksForExpert.length}</span>
                                    </h3>
                                    <div className="space-y-2 px-1">
                                        {tasksForExpert.map(task => (
                                           <TaskItemCard 
                                                key={task.id} 
                                                task={task} 
                                                onUpdateStatus={updateTrackedTaskStatus}
                                                onRemove={removeTrackedTask}
                                                onShowWork={handleShowWork}
                                                isDisabled={isLoading}
                                           />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                        <ListTodo size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-400">No Tasks Here</h3>
                        <p className="text-xs">No tasks match the "{activeFilter}" filter.</p>
                        <p className="text-xs mt-2">{topic ? "Use the form below to add a new task." : "Start a discussion to add tasks."}</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleAddTask} className="p-3 border-t border-gray-700/50 bg-gray-900/30">
                <h4 className="text-sm font-semibold mb-2 text-gray-300">Add New Task</h4>
                <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder={topic ? "Describe the task..." : "Start a discussion first to add tasks"}
                    rows={2}
                    className="w-full p-2 bg-gray-800/70 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y disabled:cursor-not-allowed"
                    disabled={isLoading || !topic}
                />
                <div className="flex items-center mt-2 gap-2">
                    <select
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value as ExpertRole)}
                        className="flex-grow p-2 text-sm bg-gray-800/70 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
                        disabled={isLoading || !topic}
                        aria-label="Assign task to expert"
                    >
                        <option value="">Unassigned</option>
                        {Object.values(EXPERTS).filter(e => e.name !== ExpertRole.System && e.name !== ExpertRole.User).map(expert => (
                            <option key={expert.name} value={expert.name}>{expert.emoji} {expert.name}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={isLoading || !newTaskDescription.trim() || !topic}
                        className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        title={!topic ? "Start a discussion first" : "Add Task"}
                        aria-label="Add new task"
                    >
                        <PlusCircle size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
};