import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { TextArea } from '../common/Input';
import { ApiKeyInput } from './ApiKeyInput';
import { ModelSelector } from './ModelSelector';
import { LLMProviderSettings } from './LLMProviderSettings';
import { useSettings } from '../../hooks/useSettings';
import type { LLMProvider } from '@/shared/types/llm';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

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
