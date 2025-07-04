
import React, { useState } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { StoryStatus, TrackedStory, StoryPriority } from '../types';
import { StoryItemCard } from './StoryItemCard';
import { BookOpen, PlusCircle, FileJson, FileSpreadsheet, BrainCircuit } from 'lucide-react';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';

const FILTERS: Array<{ label: string; value: StoryStatus | 'all' }> = [
    { label: "Backlog", value: StoryStatus.Backlog },
    { label: "Sprint", value: StoryStatus.SelectedForSprint },
    { label: "In Progress", value: StoryStatus.InProgress },
    { label: "Done", value: StoryStatus.Done },
    { label: "All", value: "all" },
];

const generateFileName = (extension: 'json' | 'csv') => {
  const now = new Date();
  const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `agilebloom_stories_${dateString}.${extension}`;
};

const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const convertToCsv = (data: TrackedStory[]): string => {
  if (data.length === 0) return "";
  const headers = ['id', 'status', 'priority', 'sprintPoints', 'userStory', 'benefit', 'acceptanceCriteria', 'assignedTo', 'createdBy', 'timestamp'];
  const escapeCsvCell = (cell: any) => {
    if (cell === undefined || cell === null) return '';
    let strCell = Array.isArray(cell) ? cell.join('; ') : String(cell);
    if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
      strCell = `"${strCell.replace(/"/g, '""')}"`;
    }
    return strCell;
  };
  const headerString = headers.join(',');
  const rowsString = data.map(row =>
    headers.map(header => escapeCsvCell(row[header as keyof TrackedStory])).join(',')
  ).join('\n');
  return `${headerString}\n${rowsString}`;
};

export const TrackedStoriesSidebar: React.FC = () => {
    const { 
        trackedStories, 
        isLoading, 
        addTrackedStory,
        updateTrackedStory,
        removeTrackedStory,
        topic,
    } = useAgileBloomStore();
    
    const { sendMessage } = useAgileBloomChat();

    const [activeFilter, setActiveFilter] = useState<StoryStatus | 'all'>(StoryStatus.Backlog);
    const [newUserStory, setNewUserStory] = useState('');
    const [newBenefit, setNewBenefit] = useState('');
    const [newCriteria, setNewCriteria] = useState('');

    const handleAddStory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUserStory.trim() && !isLoading) {
            addTrackedStory({
                userStory: newUserStory.trim(),
                benefit: newBenefit.trim(),
                acceptanceCriteria: newCriteria.split('\n').map(c => c.trim()).filter(Boolean),
                createdBy: 'User',
                priority: 'Medium', // Add default priority
            });
            setNewUserStory('');
            setNewBenefit('');
            setNewCriteria('');
        }
    };
    
    const filteredStories = trackedStories.filter(s => 
        activeFilter === 'all' || s.status === activeFilter
    ).sort((a, b) => a.timestamp - b.timestamp);

    const handleExportJson = () => {
        if (filteredStories.length === 0) return;
        const jsonString = JSON.stringify(filteredStories, null, 2);
        downloadFile(jsonString, generateFileName('json'), 'application/json');
    };

    const handleExportCsv = () => {
        if (filteredStories.length === 0) return;
        const csvString = convertToCsv(filteredStories);
        downloadFile(csvString, generateFileName('csv'), 'text/csv');
    };

    return (
        <div className="flex flex-col h-full w-full">
            <header className="p-4 border-b border-gray-700/50">
                 <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-purple-300">User Story Backlog</h2>
                     <button
                        onClick={() => sendMessage('/sprint-planning', null, false)}
                        disabled={isLoading || !topic || !trackedStories.some(s => s.status === StoryStatus.Backlog)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-purple-300 bg-purple-900/40 hover:bg-purple-800/60 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!topic ? "Start a discussion first" : "Ask Scrum Leader to suggest a sprint plan"}
                    >
                        <BrainCircuit size={14} />
                        Plan Sprint
                    </button>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-400">Manage your product backlog</p>
                    <div className="flex gap-2">
                         <button onClick={handleExportJson} disabled={isLoading || filteredStories.length === 0} className="p-1.5 rounded text-gray-300 hover:bg-blue-900/50 hover:text-blue-300 transition-colors disabled:opacity-50" title="Export as JSON"><FileJson size={16} /></button>
                         <button onClick={handleExportCsv} disabled={isLoading || filteredStories.length === 0} className="p-1.5 rounded text-gray-300 hover:bg-green-900/50 hover:text-green-300 transition-colors disabled:opacity-50" title="Export as CSV"><FileSpreadsheet size={16} /></button>
                    </div>
                </div>
            </header>
            
            <div className="p-2 border-b border-gray-700/50">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map(({ label, value }) => (
                        <button key={value} onClick={() => setActiveFilter(value)} className={`px-3 py-1.5 text-xs rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 ${activeFilter === value ? 'bg-purple-600 text-white font-semibold shadow-md' : 'bg-gray-700/60 hover:bg-gray-600/80 text-gray-300'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                {filteredStories.length > 0 ? (
                    <div className="space-y-2">
                        {filteredStories.map(s => (
                           <StoryItemCard 
                                key={s.id} 
                                story={s} 
                                onUpdate={updateTrackedStory}
                                onRemove={removeTrackedStory}
                                onBreakdown={() => sendMessage(`/breakdown ${s.id.substring(0,6)}`, null, false)}
                                isDisabled={isLoading}
                           />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                        <BookOpen size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-400">No Stories Here</h3>
                        <p className="text-xs">No stories match the "{activeFilter}" filter.</p>
                        <p className="text-xs mt-2">{topic ? "Address questions to generate stories, or add one below." : "Start a discussion to add stories."}</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleAddStory} className="p-3 border-t border-gray-700/50 bg-gray-900/30 space-y-2">
                <h4 className="text-sm font-semibold text-gray-300">Add New Story</h4>
                <input value={newUserStory} onChange={(e) => setNewUserStory(e.target.value)} placeholder="As a [user type], I want to [action]..." className="w-full p-2 bg-gray-800/70 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed" disabled={isLoading || !topic} />
                <input value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)} placeholder="So that [benefit/value]..." className="w-full p-2 bg-gray-800/70 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed" disabled={isLoading || !topic} />
                <textarea value={newCriteria} onChange={(e) => setNewCriteria(e.target.value)} placeholder="Acceptance Criteria (one per line)..." rows={2} className="w-full p-2 bg-gray-800/70 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y disabled:cursor-not-allowed" disabled={isLoading || !topic} />
                <button type="submit" disabled={isLoading || !newUserStory.trim() || !topic} className="w-full flex justify-center items-center gap-2 mt-1 p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" title={!topic ? "Start a discussion first" : "Add Story"}>
                    <PlusCircle size={18} /> Add Story
                </button>
            </form>
        </div>
    );
};
