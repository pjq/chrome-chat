import { useState, useEffect } from 'react';
import { MessageType } from '@/shared/types/messages';
import type { MCPServerState } from '@/shared/types/mcp';

/**
 * Hook to manage MCP server states
 */
export function useMCPServers() {
  const [serverStates, setServerStates] = useState<MCPServerState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch all server states
   */
  const fetchServerStates = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.MCP_GET_ALL_STATES,
      });

      if (response.states) {
        setServerStates(response.states);
      }
    } catch (error) {
      console.error('Error fetching MCP server states:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Connect to a server
   */
  const connectServer = async (server: any) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.MCP_CONNECT_SERVER,
        server,
      });

      if (response.state) {
        // Update states
        await fetchServerStates();
      }

      return response.state;
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      throw error;
    }
  };

  /**
   * Disconnect from a server
   */
  const disconnectServer = async (serverId: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.MCP_DISCONNECT_SERVER,
        serverId,
      });

      // Update states
      await fetchServerStates();
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
      throw error;
    }
  };

  /**
   * Get state for a specific server
   */
  const getServerState = (serverId: string): MCPServerState | undefined => {
    return serverStates.find((s) => s.serverId === serverId);
  };

  // Fetch states on mount and periodically
  useEffect(() => {
    fetchServerStates();

    // Refresh every 5 seconds
    const interval = setInterval(fetchServerStates, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    serverStates,
    isLoading,
    connectServer,
    disconnectServer,
    getServerState,
    refreshStates: fetchServerStates,
  };
}
