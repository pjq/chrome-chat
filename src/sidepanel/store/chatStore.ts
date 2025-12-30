import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/shared/types/llm';
import type { ExtractedContent } from '@/shared/types/content';

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

        set((state) => ({
          sessions: [...state.sessions, newSession],
          currentSessionId: sessionId,
          error: null,
        }));

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
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
