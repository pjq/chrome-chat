import { useChatStore } from '../../store/chatStore';
import type { ChatSession } from '../../store/chatStore';

interface ChatHistoryProps {
  onClose: () => void;
}

export function ChatHistory({ onClose }: ChatHistoryProps) {
  const { sessions, currentSessionId, switchSession, deleteSession } = useChatStore();

  const handleSessionClick = (sessionId: string) => {
    switchSession(sessionId);
    onClose();
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteSession(sessionId);
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="bg-white w-80 h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Previous Chats</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2">
          {sortedSessions.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>No previous chats</p>
              <p className="text-sm mt-2">Your chat history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onClick={() => handleSessionClick(session.id)}
                  onDelete={(e) => handleDeleteSession(e, session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function SessionItem({ session, isActive, onClick, onDelete }: SessionItemProps) {
  const messageCount = session.messages.length;
  const lastUpdate = new Date(session.updatedAt).toLocaleString();

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
        isActive
          ? 'bg-indigo-50 border-2 border-indigo-500'
          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-400 mt-1">{lastUpdate}</p>
        </div>
        <button
          onClick={onDelete}
          className="ml-2 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Delete session"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
