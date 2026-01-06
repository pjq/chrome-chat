import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import type { MCPServer } from '@/shared/types/mcp';
import { Button } from '../common/Button';

export function MCPSettings() {
  const { settings, updateSettings } = useSettingsStore();
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
        <Button variant="primary" size="sm" onClick={handleAddServer}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Server
        </Button>
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

        {mcpServers.map((server) => (
          <div
            key={server.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 truncate">{server.name}</h4>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    server.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {server.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate mt-1">{server.url}</p>
              {server.description && (
                <p className="text-xs text-gray-500 mt-1">{server.description}</p>
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
        ))}
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
