import React from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { Loader2, BookText } from 'lucide-react';

export const NarrativeSummarySidebar: React.FC = () => {
    const { narrativeSummary, isSummaryLoading } = useAgileBloomStore();

    return (
        <div className="flex flex-col h-full w-full bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/50">
            <header className="p-4 border-b border-gray-700/50 flex items-center gap-3">
                <BookText className="text-purple-300" size={20} />
                <h2 className="text-lg font-semibold text-purple-300">Narrative Summary</h2>
            </header>

            <div className="flex-grow overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                {isSummaryLoading && !narrativeSummary && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <Loader2 size={32} className="animate-spin mb-3 text-purple-400" />
                        <p>Generating initial summary...</p>
                    </div>
                )}

                {!isSummaryLoading && !narrativeSummary && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                        <BookText size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-400">Summary will appear here</h3>
                        <p className="text-xs mt-1">A running summary of the discussion is generated after each round.</p>
                    </div>
                )}
                
                {narrativeSummary && (
                    <div className="relative">
                        {isSummaryLoading && (
                            <div className="absolute top-0 right-0 p-1">
                                <span title="Updating summary...">
                                    <Loader2 size={16} className="animate-spin text-purple-400" />
                                </span>
                            </div>
                        )}
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{narrativeSummary}</p>
                    </div>
                )}
            </div>
        </div>
    );
};