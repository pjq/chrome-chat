import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { TextArea } from '../common/Input';
import { ApiKeyInput } from './ApiKeyInput';
import { ModelSelector } from './ModelSelector';
import { LLMProviderSettings } from './LLMProviderSettings';
import { MCPSettings } from './MCPSettings';
import { useSettings } from '../../hooks/useSettings';
import { useChatStore } from '../../store/chatStore';
import type { LLMProvider } from '@/shared/types/llm';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, isLoading } = useSettings();
  const { clearAllSessions, sessions } = useChatStore();
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    console.log('SettingsPanel: Loaded settings:', settings);
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    console.log('SettingsPanel: formData updated to:', formData);
  }, [formData]);

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(settings);
    setHasChanges(changed);
  }, [formData, settings]);

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleCancel = () => {
    setFormData(settings);
    onClose();
  };

  const handleClearCache = () => {
    if (showClearConfirm) {
      clearAllSessions();
      setShowClearConfirm(false);
      // Optionally close settings after clearing
      // onClose();
    } else {
      setShowClearConfirm(true);
    }
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  const handleResetApp = () => {
    if (showResetConfirm) {
      // Clear all localStorage data (settings + chat history)
      localStorage.clear();

      // Reload the page to reset everything
      window.location.reload();
    } else {
      setShowResetConfirm(true);
    }
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={handleCancel}
            className="text-white hover:text-indigo-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <LLMProviderSettings
            provider={formData.provider}
            apiEndpoint={formData.apiEndpoint}
            onProviderChange={(provider: LLMProvider) => {
              console.log('SettingsPanel: Provider changing to:', provider);
              setFormData((prev) => ({ ...prev, provider }));
            }}
            onEndpointChange={(apiEndpoint: string) => {
              console.log('SettingsPanel: Endpoint changing to:', apiEndpoint);
              setFormData((prev) => ({ ...prev, apiEndpoint }));
            }}
          />

          <ApiKeyInput
            value={formData.apiKey}
            onChange={(apiKey) => setFormData((prev) => ({ ...prev, apiKey }))}
          />

          <ModelSelector
            provider={formData.provider}
            value={formData.model}
            onChange={(model) => setFormData((prev) => ({ ...prev, model }))}
            apiEndpoint={formData.apiEndpoint}
            apiKey={formData.apiKey}
          />

          <TextArea
            label="Instructions for AI"
            value={formData.systemPrompt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))
            }
            rows={4}
            placeholder="Tell the AI how you'd like it to respond..."
          />

          {/* MCP Settings Section */}
          <div className="border-t border-gray-200 pt-6">
            <MCPSettings />
          </div>

          {/* Cache Management Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Management</h3>
            <p className="text-sm text-gray-600 mb-4">
              Manage cached data and application settings.
            </p>

            <div className="space-y-3">
              {/* Clear Cache */}
              {!showClearConfirm ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Chat History</p>
                    <p className="text-xs text-gray-500">
                      {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} stored
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleClearCache}
                    className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
                  >
                    Clear Cache
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-orange-900 mb-1">
                        Clear chat history?
                      </h4>
                      <p className="text-sm text-orange-700 mb-3">
                        This will permanently delete all {sessions.length} chat {sessions.length === 1 ? 'session' : 'sessions'}. This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={handleClearCache}
                          className="bg-orange-600 hover:bg-orange-700"
                          size="sm"
                        >
                          Yes, Clear History
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={handleCancelClear}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset App */}
              {!showResetConfirm ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reset Application</p>
                    <p className="text-xs text-gray-500">
                      Clear all data including settings and chat history
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleResetApp}
                    className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                  >
                    Reset App
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 mb-1">
                        Reset entire application?
                      </h4>
                      <p className="text-sm text-red-700 mb-3">
                        This will permanently delete ALL data including:
                      </p>
                      <ul className="text-sm text-red-700 mb-3 ml-4 list-disc space-y-1">
                        <li>All chat sessions ({sessions.length} {sessions.length === 1 ? 'session' : 'sessions'})</li>
                        <li>API keys and settings</li>
                        <li>MCP server configurations</li>
                        <li>All preferences</li>
                      </ul>
                      <p className="text-sm font-semibold text-red-800 mb-3">
                        The app will reload and reset to default state. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={handleResetApp}
                          className="bg-red-600 hover:bg-red-700"
                          size="sm"
                        >
                          Yes, Reset Everything
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={handleCancelReset}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
