import { useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';
import { MessageType } from '@/shared/types/messages';
import type { ChatMessage, ImageAttachment } from '@/shared/types/llm';

export function useChat() {
  const {
    getCurrentSession,
    addMessage,
    setLoading,
    setError,
    updateLastMessage,
    setMessageError,
  } = useChatStore();
  const { settings } = useSettingsStore();
  const streamPortRef = useRef<chrome.runtime.Port | null>(null);
  const currentStreamIdRef = useRef<string | null>(null);

  /**
   * Send a message to the LLM with streaming
   */
  const sendMessage = async (userMessage: string, images?: ImageAttachment[]) => {
    if (!userMessage.trim() && (!images || images.length === 0)) {
      return;
    }

    const currentSession = getCurrentSession();
    if (!currentSession) {
      setError('No active session. Please start a new chat.');
      return;
    }

    if (!currentSession.content) {
      setError('No page content available. Please extract content first.');
      return;
    }

    if (!settings.apiKey) {
      setError('API key not configured. Please update settings.');
      return;
    }

    // Add user message
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userMessage || 'Here are some images:',
      timestamp: Date.now(),
      images,
    };
    addMessage(userChatMessage);

    // Add placeholder for assistant message
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(assistantMessage);

    setLoading(true);
    setError(null);

    try {
      await streamResponse(currentSession.messages.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setMessageError(currentSession.messages.length + 1, errorMessage);
      console.error('Error sending message:', err);
      setLoading(false);
    }
  };

  /**
   * Retry the last message
   */
  const retryLastMessage = async () => {
    const currentSession = getCurrentSession();
    if (!currentSession || currentSession.messages.length < 2) {
      return;
    }

    const messages = currentSession.messages;
    const lastAssistantIndex = messages.length - 1;
    const lastMessage = messages[lastAssistantIndex];

    if (lastMessage.role !== 'assistant') {
      return;
    }

    // Clear the last message content and error
    updateLastMessage('');
    setLoading(true);
    setError(null);

    try {
      await streamResponse(lastAssistantIndex);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry message';
      setError(errorMessage);
      setMessageError(lastAssistantIndex, errorMessage);
      console.error('Error retrying message:', err);
      setLoading(false);
    }
  };

  /**
   * Stream response from LLM
   */
  const streamResponse = async (assistantMessageIndex: number) => {
    const currentSession = getCurrentSession();
    if (!currentSession) {
      throw new Error('No active session');
    }

    // Prepare messages with system prompt and context
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `${settings.systemPrompt}\n\nWeb page content:\nTitle: ${currentSession.content?.title}\nURL: ${currentSession.content?.url}\n\n${currentSession.content?.textContent.slice(0, 8000)}`,
      timestamp: Date.now(),
    };

    // Get messages up to the point we want to retry
    const messagesToSend = currentSession.messages.slice(0, assistantMessageIndex);

    // Add system message at the beginning
    const allMessages = [systemMessage, ...messagesToSend];

    // Generate unique stream ID
    const streamId = `stream-${Date.now()}`;
    currentStreamIdRef.current = streamId;

    // Connect to streaming port
    const port = chrome.runtime.connect({ name: 'chat-stream' });
    streamPortRef.current = port;

    let accumulatedContent = '';

    port.onMessage.addListener((response) => {
      if (response.streamId !== streamId) {
        return; // Ignore messages from other streams
      }

      switch (response.type) {
        case MessageType.CHAT_STREAM_CHUNK:
          accumulatedContent += response.chunk;
          updateLastMessage(accumulatedContent);
          break;

        case MessageType.CHAT_STREAM_END:
          console.log('Stream completed');
          setLoading(false);
          port.disconnect();
          streamPortRef.current = null;
          currentStreamIdRef.current = null;
          break;

        case MessageType.CHAT_STREAM_ERROR:
          console.error('Stream error:', response.error);
          setError(response.error);
          setMessageError(assistantMessageIndex, response.error);
          setLoading(false);
          port.disconnect();
          streamPortRef.current = null;
          currentStreamIdRef.current = null;
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Port disconnected');
      setLoading(false);
      streamPortRef.current = null;
      currentStreamIdRef.current = null;
    });

    // Send streaming request
    port.postMessage({
      type: MessageType.SEND_CHAT_MESSAGE,
      messages: allMessages,
      settings,
      stream: true,
      streamId,
    });
  };

  return {
    sendMessage,
    retryLastMessage,
  };
}
