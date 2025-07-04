
import React from 'react';
import { DiscussionMessage, ExpertRole, SearchCitation } from '../types';
import { CodeBlock } from './CodeBlock'; 
import { ExternalLink } from 'lucide-react';

const CitationLink: React.FC<{ citation: SearchCitation }> = ({ citation }) => (
  <a
    href={citation.uri}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center text-xs text-purple-300 hover:text-purple-200 hover:underline transition-colors duration-150"
    title={citation.title}
  >
    <ExternalLink size={12} className="mr-1.5 flex-shrink-0" />
    <span className="truncate">{citation.title || "Untitled Source"}</span>
  </a>
);


export const MessageBubble: React.FC<{ message: DiscussionMessage }> = React.memo(({ message }) => {
  const { expert, text, thoughts, work, timestamp, isError, isCommandResponse, searchCitations } = message;
  const isUser = expert.name === ExpertRole.User;

  const bubbleClasses = isUser
    ? "bg-purple-600/80 ml-auto"
    : `${expert.bgColor}/${isError ? '70' : '80'} ${expert.textColor}`;
  
  const containerClasses = `flex mb-3 animate-fadeIn ${isUser ? "justify-end" : "justify-start"}`;

  const formattedTimestamp = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isFishAnalysis = 
    isCommandResponse &&
    expert.name === ExpertRole.ScrumLeader && 
    work && 
    (work.toLowerCase().includes("fish analysis") || work.toLowerCase().includes("rationale score"));

  const isScrumLeaderStoryResponse = expert.name === ExpertRole.ScrumLeader && 
                                   isCommandResponse && 
                                   work &&
                                   work.toLowerCase().includes("user story") &&
                                   work.includes("|") &&
                                   work.includes("---");

  return (
    <div className={containerClasses}>
      <div className={`max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-3 rounded-xl shadow-md ${bubbleClasses} backdrop-blur-sm`}>
        <div className="flex items-center mb-1.5">
          {!isUser && <span className="mr-2 text-xl">{expert.emoji}</span>}
          <span className={`font-semibold text-sm ${isUser ? 'text-purple-200' : expert.textColor === 'text-gray-900' ? 'text-gray-700' : 'text-gray-200'}`}>
            {expert.name}
          </span>
          {isUser && <span className="ml-2 text-xl">{expert.emoji}</span>}
        </div>
        {isError ? (
           <p className="text-sm text-red-200 whitespace-pre-wrap">{text}</p>
        ) : (
           <p className="text-sm whitespace-pre-wrap">{text}</p>
        )}
       
        {thoughts && thoughts.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <h4 className="text-xs font-semibold mb-1 opacity-80">Thoughts:</h4>
            <ul className="list-disc list-inside pl-1 space-y-0.5">
              {thoughts.map((thought, index) => (
                <li key={index} className="text-xs opacity-90">{thought}</li>
              ))}
            </ul>
          </div>
        )}
        {work && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <h4 className="text-xs font-semibold mb-1 opacity-80">
              {isFishAnalysis ? "FISH Analysis:" : isScrumLeaderStoryResponse ? "Generated User Stories:" : "Work:"}
            </h4>
            <CodeBlock code={work} language={isFishAnalysis || isScrumLeaderStoryResponse ? "markdown" : "auto"} />
          </div>
        )}
        {searchCitations && searchCitations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <h4 className="text-xs font-semibold mb-1 opacity-80">Sources:</h4>
            <ul className="space-y-1">
              {searchCitations.map((citation, index) => (
                <li key={index}>
                  <CitationLink citation={citation} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={`text-xs mt-2 opacity-60 ${isUser ? "text-right" : "text-left"}`}>
          {formattedTimestamp}
        </div>
      </div>
    </div>
  );
});
