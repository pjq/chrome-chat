import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useMCPServers } from '../../hooks/useMCPServers';
import type { MCPServer } from '@/shared/types/mcp';
import { Button } from '../common/Button';

export function MCPSettings() {
  const { settings, updateSettings } = useSettingsStore();
  const { getServerState } = useMCPServers();
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);

  const mcpServers = settings.mcp?.servers || [];

  const handleAddServer = () => {
    setEditingServer({
      id: `mcp-${Date.now()}`,
      name: '',
      url: '',
      enabled: true,
      description: '',
      headers: {},
    });
    setIsAddingServer(true);
  };

  const handleSaveServer = (server: MCPServer) => {
    const existingIndex = mcpServers.findIndex((s) => s.id === server.id);
    const updatedServers = [...mcpServers];

    if (existingIndex >= 0) {
      updatedServers[existingIndex] = server;
    } else {
      updatedServers.push(server);
    }

    updateSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: updatedServers,
        enabledByDefault: settings.mcp?.enabledByDefault ?? true,
      },
    });

    setIsAddingServer(false);
    setEditingServer(null);
  };

  const handleDeleteServer = (serverId: string) => {
    const updatedServers = mcpServers.filter((s) => s.id !== serverId);
    updateSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: updatedServers,
        enabledByDefault: settings.mcp?.enabledByDefault ?? true,
      },
    });
  };

  const handleToggleServer = (serverId: string) => {
    const updatedServers = mcpServers.map((s) =>
      s.id === serverId ? { ...s, enabled: !s.enabled } : s
    );
    updateSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: updatedServers,
        enabledByDefault: settings.mcp?.enabledByDefault ?? true,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">MCP Servers</h3>
        <button
          onClick={handleAddServer}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          title="Add Server"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Connect to MCP servers to extend the AI with external tools and data sources.
      </p>

      {/* Server List */}
      <div className="space-y-2">
        {mcpServers.length === 0 && !isAddingServer && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">No MCP servers configured</p>
            <p className="mt-1 text-xs text-gray-500">Add a server to get started</p>
          </div>
        )}

        {mcpServers.map((server) => {
          const state = getServerState(server.id);
          const isConnected = state?.status === 'connected';
          const isConnecting = state?.status === 'connecting';
          const hasError = state?.status === 'error';

          // Debug logging
          if (server.enabled) {
            console.log(`[MCPSettings] Server "${server.name}":`, {
              id: server.id,
              status: state?.status,
              isConnected,
              toolCount: state?.tools?.length || 0,
              tools: state?.tools,
              state: state,
            });
          }

          return (
            <div
              key={server.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-gray-900 truncate">{server.name}</h4>

                  {/* Enabled/Disabled Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      server.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {server.enabled ? 'Enabled' : 'Disabled'}
                  </span>

                  {/* Connection Status Badge */}
                  {server.enabled && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        isConnected
                          ? 'bg-blue-100 text-blue-800'
                          : isConnecting
                          ? 'bg-yellow-100 text-yellow-800'
                          : hasError
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isConnected && '● Connected'}
                      {isConnecting && '⟳ Connecting...'}
                      {hasError && '✕ Error'}
                      {!state && '○ Disconnected'}
                    </span>
                  )}

                  {/* Tool Count */}
                  {isConnected && state && state.tools.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {state.tools.length} {state.tools.length === 1 ? 'tool' : 'tools'}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 truncate mt-1">{server.url}</p>

                {server.description && (
                  <p className="text-xs text-gray-500 mt-1">{server.description}</p>
                )}

                {/* Error Message */}
                {hasError && state?.error && (
                  <p className="text-xs text-red-600 mt-1">Error: {state.error}</p>
                )}

                {/* Debug: Show state info when connected */}
                {isConnected && state && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs font-mono">
                    <div>Status: {state.status}</div>
                    <div>Tools array exists: {state.tools ? 'Yes' : 'No'}</div>
                    <div>Tools length: {state.tools?.length || 0}</div>
                    <div>Tools: {JSON.stringify(state.tools?.map(t => t.name) || [])}</div>
                  </div>
                )}

                {/* Connected Tools List */}
                {isConnected && state && state.tools && state.tools.length > 0 && (
                  <details className="mt-3 pt-3 border-t border-gray-200">
                    <summary className="cursor-pointer hover:text-gray-900 select-none">
                      <div className="inline-flex items-center gap-2">
                        <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Available Tools ({state.tools.length})
                        </h5>
                        <svg className="w-3 h-3 text-gray-500 transition-transform details-marker" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="space-y-2 mt-2">
                      {state.tools.map((tool) => (
                        <div key={tool.name} className="bg-gray-50 rounded p-2 border border-gray-200">
                          <div className="flex items-start gap-2">
                            <code className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {tool.name}
                            </code>
                          </div>
                          {tool.description && (
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {tool.description}
                            </p>
                          )}
                          {tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 font-medium select-none">
                                <span className="inline-flex items-center gap-1">
                                  <svg className="w-3 h-3 transition-transform details-marker inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  Parameters ({Object.keys(tool.inputSchema.properties).length})
                                </span>
                              </summary>
                              <div className="mt-1 ml-2 space-y-1">
                                {Object.entries(tool.inputSchema.properties).map(([paramName, paramSchema]: [string, any]) => (
                                  <div key={paramName} className="text-xs">
                                    <span className="font-mono text-gray-700">{paramName}</span>
                                    {tool.inputSchema.required?.includes(paramName) && (
                                      <span className="text-red-600 ml-1">*</span>
                                    )}
                                    <span className="text-gray-500 ml-1">
                                      ({paramSchema.type || 'any'})
                                    </span>
                                    {paramSchema.description && (
                                      <p className="text-gray-600 ml-2 mt-0.5">{paramSchema.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleToggleServer(server.id)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {server.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => {
                  setEditingServer(server);
                  setIsAddingServer(true);
                }}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteServer(server.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Add/Edit Server Form */}
      {isAddingServer && editingServer && (
        <ServerForm
          server={editingServer}
          onSave={handleSaveServer}
          onCancel={() => {
            setIsAddingServer(false);
            setEditingServer(null);
          }}
        />
      )}
    </div>
  );
}

interface ServerFormProps {
  server: MCPServer;
  onSave: (server: MCPServer) => void;
  onCancel: () => void;
}

function ServerForm({ server, onSave, onCancel }: ServerFormProps) {
  const [formData, setFormData] = useState(server);
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.url) {
      onSave(formData);
    }
  };

  const handleAddHeader = () => {
    if (headerKey && headerValue) {
      setFormData((prev) => ({
        ...prev,
        headers: {
          ...prev.headers,
          [headerKey]: headerValue,
        },
      }));
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const handleRemoveHeader = (key: string) => {
    const { [key]: _, ...rest } = formData.headers || {};
    setFormData((prev) => ({
      ...prev,
      headers: rest,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {server.name ? 'Edit MCP Server' : 'Add MCP Server'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="My MCP Server"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="http://localhost:3000/sse"
              required
            />
            <p className="mt-1 text-xs text-gray-500">HTTP/SSE endpoint URL</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transport Type
            </label>
            <select
              value={formData.transportType || 'auto'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  transportType: e.target.value as 'auto' | 'streamableHttp' | 'sse',
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="auto">Auto-detect (Recommended)</option>
              <option value="streamableHttp">HTTP Streamable</option>
              <option value="sse">SSE (Server-Sent Events)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Auto-detect will try the best transport based on URL pattern
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeout
            </label>
            <select
              value={formData.timeout || 30000}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timeout: parseInt(e.target.value) }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="10000">10 seconds</option>
              <option value="30000">30 seconds (Default)</option>
              <option value="60000">1 minute</option>
              <option value="120000">2 minutes</option>
              <option value="180000">3 minutes</option>
              <option value="300000">5 minutes</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Maximum time to wait for tool responses
            </p>
          </div>

          {/* Headers Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Headers
            </label>

            {/* Existing Headers */}
            {formData.headers && Object.keys(formData.headers).length > 0 && (
              <div className="space-y-2 mb-2">
                {Object.entries(formData.headers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <span className="text-sm font-mono flex-1 truncate">
                      {key}: {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(key)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Header Form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                placeholder="Header name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                placeholder="Header value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleAddHeader}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" variant="primary" className="flex-1">
              Save Server
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
