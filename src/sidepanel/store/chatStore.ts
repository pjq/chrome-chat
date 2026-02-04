import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/shared/types/llm';
import type { ExtractedContent } from '@/shared/types/content';

// Maximum number of sessions to keep (prevent unlimited growth)
const MAX_SESSIONS = 50;

// Custom storage with quota error handling
const createChatStorage = () => {
  const storage = {
    getItem: (name: string) => {
      const value = localStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    },
    setItem: (name: string, value: any) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.error('[Storage] Quota exceeded! Attempting cleanup...');

          // Try to recover by clearing old data
          const parsed = value?.state;
          if (parsed?.sessions && parsed.sessions.length > 10) {
            // Emergency cleanup: keep only 10 most recent sessions
            const sorted = parsed.sessions.slice().sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
            parsed.sessions = sorted.slice(0, 10);

            console.warn('[Storage] Emergency cleanup: Reduced to 10 most recent sessions');
            localStorage.setItem(name, JSON.stringify({ state: parsed, version: value.version }));
          } else {
            // Can't recover, clear everything
            console.error('[Storage] Cannot recover, clearing chat history');
            localStorage.removeItem(name);
            throw new Error('Storage quota exceeded. Chat history has been cleared.');
          }
        } else {
          throw error;
        }
      }
    },
    removeItem: (name: string) => {
      localStorage.removeItem(name);
    },
  };
  return storage;
};

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  content: ExtractedContent | null;
  createdAt: number;
  updatedAt: number;
  tabId?: number; // Track which browser tab this session belongs to
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Session management
  createSession: (content: ExtractedContent | null, tabId?: number) => string;
  getSessionByTabId: (tabId: number) => ChatSession | null;
  switchSession: (sessionId: string) => void;
  clearCurrentSession: () => void;
  deleteSession: (sessionId: string) => void;
  deleteOldestSessions: (count: number) => void;
  getCurrentSession: () => ChatSession | null;

  // Message management
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setMessageError: (messageIndex: number, error: string) => void;
  clearMessages: () => void;

  // Content management
  setContent: (content: ExtractedContent | null) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      error: null,

      /**
       * Create a new chat session
       */
      createSession: (content: ExtractedContent | null, tabId?: number) => {
        const sessionId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: sessionId,
          title: content?.title || 'New Chat',
          messages: [],
          content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tabId,
        };

        set((state) => {
          let sessions = [...state.sessions, newSession];

          // If we exceed MAX_SESSIONS, remove oldest sessions
          if (sessions.length > MAX_SESSIONS) {
            // Sort by updatedAt (oldest first) and remove excess
            const sorted = sessions.slice().sort((a, b) => a.updatedAt - b.updatedAt);
            const toRemove = sorted.slice(0, sessions.length - MAX_SESSIONS);
            const removeIds = new Set(toRemove.map(s => s.id));
            sessions = sessions.filter(s => !removeIds.has(s.id));

            console.log(`[Storage] Cleaned up ${toRemove.length} old sessions to stay under limit`);
          }

          return {
            sessions,
            currentSessionId: sessionId,
            error: null,
          };
        });

        return sessionId;
      },

      /**
       * Get session by tab ID
       */
      getSessionByTabId: (tabId: number) => {
        const state = get();
        return state.sessions.find((s) => s.tabId === tabId) || null;
      },

      /**
       * Switch to a different session
       */
      switchSession: (sessionId: string) => {
        set({ currentSessionId: sessionId, error: null });
      },

      /**
       * Clear current session (show empty state)
       */
      clearCurrentSession: () => {
        set({ currentSessionId: null, error: null });
      },

      /**
       * Delete a session
       */
      deleteSession: (sessionId: string) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          const newCurrentId =
            state.currentSessionId === sessionId
              ? newSessions[0]?.id || null
              : state.currentSessionId;

          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          };
        });
      },

      /**
       * Delete oldest sessions to free up storage
       */
      deleteOldestSessions: (count: number) => {
        set((state) => {
          if (count <= 0 || state.sessions.length === 0) return state;

          // Sort by updatedAt (oldest first)
          const sorted = state.sessions.slice().sort((a, b) => a.updatedAt - b.updatedAt);
          const toRemove = sorted.slice(0, Math.min(count, state.sessions.length));
          const removeIds = new Set(toRemove.map(s => s.id));

          const newSessions = state.sessions.filter(s => !removeIds.has(s.id));
          const newCurrentId = removeIds.has(state.currentSessionId || '')
            ? newSessions[0]?.id || null
            : state.currentSessionId;

          console.log(`[Storage] Deleted ${toRemove.length} oldest sessions`);

          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          };
        });
      },

      /**
       * Get the current session
       */
      getCurrentSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.currentSessionId) || null;
      },

      /**
       * Add a new message to the current session
       */
      addMessage: (message) =>
        set((state) => {
          const currentSession = state.sessions.find(
            (s) => s.id === state.currentSessionId
          );

          if (!currentSession) {
            return state;
          }

          const updatedSession = {
            ...currentSession,
            messages: [...currentSession.messages, message],
            updatedAt: Date.now(),
          };

          return {
            sessions: state.sessions.map((s) =>
              s.id === state.currentSessionId ? updatedSession : s
            ),
            error: null,
          };
        }),

      /**
       * Update the last message content (for streaming)
       */
      updateLastMessage: (content) =>
        set((state) => {
          const currentSession = state.sessions.find(
            (s) => s.id === state.currentSessionId
          );

          if (!currentSession || currentSession.messages.length === 0) {
            return state;
          }

          const messages = [...currentSession.messages];
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content,
          };

          const updatedSession = {
            ...currentSession,
            messages,
            updatedAt: Date.now(),
          };

          return {
            sessions: state.sessions.map((s) =>
              s.id === state.currentSessionId ? updatedSession : s
            ),
          };
        }),

      /**
       * Set error for a specific message
       */
      setMessageError: (messageIndex: number, error: string) =>
        set((state) => {
          const currentSession = state.sessions.find(
            (s) => s.id === state.currentSessionId
          );

          if (!currentSession) {
            return state;
          }

          const messages = [...currentSession.messages];
          if (messageIndex < messages.length) {
            messages[messageIndex] = {
              ...messages[messageIndex],
              error,
            };
          }

          const updatedSession = {
            ...currentSession,
            messages,
            updatedAt: Date.now(),
          };

          return {
            sessions: state.sessions.map((s) =>
              s.id === state.currentSessionId ? updatedSession : s
            ),
          };
        }),

      /**
       * Clear all messages in current session
       */
      clearMessages: () =>
        set((state) => {
          const currentSession = state.sessions.find(
            (s) => s.id === state.currentSessionId
          );

          if (!currentSession) {
            return state;
          }

          const updatedSession = {
            ...currentSession,
            messages: [],
            updatedAt: Date.now(),
          };

          return {
            sessions: state.sessions.map((s) =>
              s.id === state.currentSessionId ? updatedSession : s
            ),
            error: null,
          };
        }),

      /**
       * Set the current page content for current session
       */
      setContent: (content) =>
        set((state) => {
          const currentSession = state.sessions.find(
            (s) => s.id === state.currentSessionId
          );

          if (!currentSession) {
            return state;
          }

          const updatedSession = {
            ...currentSession,
            content,
            title: content?.title || currentSession.title,
            updatedAt: Date.now(),
          };

          return {
            sessions: state.sessions.map((s) =>
              s.id === state.currentSessionId ? updatedSession : s
            ),
            error: null,
          };
        }),

      /**
       * Set loading state
       */
      setLoading: (loading) => set({ isLoading: loading }),

      /**
       * Set error message
       */
      setError: (error) => set({ error }),
    }),
    {
      name: 'chat-history-storage',
      storage: createChatStorage(),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        // Check storage size after rehydration
        if (state) {
          const sessionCount = state.sessions.length;
          console.log(`[Storage] Rehydrated ${sessionCount} sessions`);

          // Clean up if we somehow exceeded the limit
          if (sessionCount > MAX_SESSIONS) {
            console.warn(`[Storage] Session count (${sessionCount}) exceeds limit, cleaning up...`);
            const sorted = state.sessions.slice().sort((a, b) => a.updatedAt - b.updatedAt);
            state.sessions = sorted.slice(sessionCount - MAX_SESSIONS);
          }
        }
      },
    }
  )
);
