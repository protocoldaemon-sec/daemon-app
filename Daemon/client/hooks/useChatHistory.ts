import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';

interface ChatSession {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    text: string;
    sender: 'user' | 'copilot';
    timestamp: Date;
    analysisData?: any;
  }>;
  createdAt: Date;
  updatedAt: Date;
  walletAddress: string;
}

interface ChatHistoryState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
}

export function useChatHistory() {
  const { wallet } = useWallet();
  const [state, setState] = useState<ChatHistoryState>({
    sessions: [],
    currentSessionId: null,
    isLoading: false
  });

  const walletAddress = wallet?.address;

  // Load chat history from localStorage
  useEffect(() => {
    if (walletAddress) {
      loadChatHistory();
    }
  }, [walletAddress]);

  // Auto-cleanup old sessions (older than 30 days)
  useEffect(() => {
    if (walletAddress && state.sessions.length > 0) {
      cleanupOldSessions();
    }
  }, [walletAddress, state.sessions]);

  const loadChatHistory = () => {
    if (!walletAddress) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const savedHistory = localStorage.getItem(`chat_history_${walletAddress}`);
      const historyData = savedHistory ? JSON.parse(savedHistory) : { sessions: [], currentSessionId: null };

      // Convert string dates back to Date objects
      const sessions = historyData.sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));

      setState({
        sessions,
        currentSessionId: historyData.currentSessionId,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setState({ sessions: [], currentSessionId: null, isLoading: false });
    }
  };

  const cleanupOldSessions = () => {
    if (!walletAddress) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldSessions = state.sessions.filter(session =>
      session.updatedAt.getTime() < thirtyDaysAgo.getTime()
    );

    if (oldSessions.length > 0) {
      console.log(`Cleaning up ${oldSessions.length} old sessions (older than 30 days)`);

      const updatedSessions = state.sessions.filter(session =>
        session.updatedAt.getTime() >= thirtyDaysAgo.getTime()
      );

      let newCurrentSessionId = state.currentSessionId;
      if (state.currentSessionId && oldSessions.find(s => s.id === state.currentSessionId)) {
        newCurrentSessionId = updatedSessions.length > 0 ? updatedSessions[0].id : null;
      }

      setState(prev => ({
        ...prev,
        sessions: updatedSessions,
        currentSessionId: newCurrentSessionId
      }));

      saveChatHistory(updatedSessions, newCurrentSessionId);

      // Dispatch cleanup event
      window.dispatchEvent(new CustomEvent('chatHistoryCleanedUp', {
        detail: {
          walletAddress,
          deletedSessions: oldSessions.map(s => ({ id: s.id, title: s.title })),
          remainingSessions: updatedSessions.length
        }
      }));
    }
  };

  const saveChatHistory = (sessions: ChatSession[], currentSessionId: string | null = null) => {
    if (!walletAddress) return false;

    try {
      const historyData = {
        sessions,
        currentSessionId
      };

      localStorage.setItem(`chat_history_${walletAddress}`, JSON.stringify(historyData));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
        detail: { walletAddress, sessions, currentSessionId }
      }));

      return true;
    } catch (error) {
      console.error('Failed to save chat history:', error);
      return false;
    }
  };

  const createNewSession = (title?: string): string => {
    if (!walletAddress) return '';

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id: sessionId,
      title: title || `Chat ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      walletAddress
    };

    const updatedSessions = [newSession, ...state.sessions];
    setState(prev => ({
      ...prev,
      sessions: updatedSessions,
      currentSessionId: sessionId
    }));

    saveChatHistory(updatedSessions, sessionId);
    return sessionId;
  };

  const addMessageToSession = (sessionId: string, message: {
    text: string;
    sender: 'user' | 'copilot';
    analysisData?: any;
  }) => {
    if (!walletAddress) return false;

    const messageWithId = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    const updatedSessions = state.sessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages: [...session.messages, messageWithId],
          updatedAt: new Date()
        };
      }
      return session;
    });

    setState(prev => ({
      ...prev,
      sessions: updatedSessions
    }));

    return saveChatHistory(updatedSessions, state.currentSessionId);
  };

  const deleteSession = (sessionId: string): boolean => {
    if (!walletAddress) return false;

    const updatedSessions = state.sessions.filter(session => session.id !== sessionId);
    const newCurrentSessionId = state.currentSessionId === sessionId
      ? (updatedSessions.length > 0 ? updatedSessions[0].id : null)
      : state.currentSessionId;

    setState(prev => ({
      ...prev,
      sessions: updatedSessions,
      currentSessionId: newCurrentSessionId
    }));

    const success = saveChatHistory(updatedSessions, newCurrentSessionId);

    if (success) {
      // Dispatch delete event
      window.dispatchEvent(new CustomEvent('chatSessionDeleted', {
        detail: { walletAddress, sessionId }
      }));
    }

    return success;
  };

  const deleteAllHistory = (): boolean => {
    if (!walletAddress) return false;

    setState({
      sessions: [],
      currentSessionId: null,
      isLoading: false
    });

    localStorage.removeItem(`chat_history_${walletAddress}`);

    // Dispatch clear event
    window.dispatchEvent(new CustomEvent('chatHistoryCleared', {
      detail: { walletAddress }
    }));

    return true;
  };

  const updateSessionTitle = (sessionId: string, title: string): boolean => {
    if (!walletAddress) return false;

    const updatedSessions = state.sessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          title,
          updatedAt: new Date()
        };
      }
      return session;
    });

    setState(prev => ({
      ...prev,
      sessions: updatedSessions
    }));

    return saveChatHistory(updatedSessions, state.currentSessionId);
  };

  const getCurrentSession = (): ChatSession | null => {
    if (!state.currentSessionId) return null;
    return state.sessions.find(session => session.id === state.currentSessionId) || null;
  };

  const getSessionById = (sessionId: string): ChatSession | null => {
    return state.sessions.find(session => session.id === sessionId) || null;
  };

  const getOldSessions = (daysOld: number = 30): ChatSession[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return state.sessions.filter(session =>
      session.updatedAt.getTime() < cutoffDate.getTime()
    );
  };

  const deleteSessionsOlderThan = (daysOld: number = 30): boolean => {
    if (!walletAddress) return false;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const sessionsToDelete = state.sessions.filter(session =>
      session.updatedAt.getTime() < cutoffDate.getTime()
    );

    if (sessionsToDelete.length === 0) return true;

    const updatedSessions = state.sessions.filter(session =>
      session.updatedAt.getTime() >= cutoffDate.getTime()
    );

    let newCurrentSessionId = state.currentSessionId;
    if (state.currentSessionId && sessionsToDelete.find(s => s.id === state.currentSessionId)) {
      newCurrentSessionId = updatedSessions.length > 0 ? updatedSessions[0].id : null;
    }

    setState(prev => ({
      ...prev,
      sessions: updatedSessions,
      currentSessionId: newCurrentSessionId
    }));

    const success = saveChatHistory(updatedSessions, newCurrentSessionId);

    if (success) {
      window.dispatchEvent(new CustomEvent('chatSessionsDeletedByAge', {
        detail: {
          walletAddress,
          deletedSessions: sessionsToDelete.map(s => ({ id: s.id, title: s.title })),
          daysOld,
          remainingSessions: updatedSessions.length
        }
      }));
    }

    return success;
  };

  // Listen for chat history updates from other components
  useEffect(() => {
    const handleChatHistoryUpdate = (event: CustomEvent) => {
      const { walletAddress: updatedWallet } = event.detail;

      if (updatedWallet === walletAddress) {
        const { sessions, currentSessionId } = event.detail;
        setState(prev => ({
          ...prev,
          sessions,
          currentSessionId
        }));
      }
    };

    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate as EventListener);
    window.addEventListener('chatSessionDeleted', handleChatHistoryUpdate as EventListener);
    window.addEventListener('chatHistoryCleared', handleChatHistoryUpdate as EventListener);

    return () => {
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate as EventListener);
      window.removeEventListener('chatSessionDeleted', handleChatHistoryUpdate as EventListener);
      window.removeEventListener('chatHistoryCleared', handleChatHistoryUpdate as EventListener);
    };
  }, [walletAddress]);

  return {
    ...state,
    createNewSession,
    addMessageToSession,
    deleteSession,
    deleteAllHistory,
    updateSessionTitle,
    getCurrentSession,
    getSessionById,
    loadChatHistory,
    getOldSessions,
    deleteSessionsOlderThan,
    cleanupOldSessions,
    totalSessions: state.sessions.length,
    totalMessages: state.sessions.reduce((total, session) => total + session.messages.length, 0)
  };
}