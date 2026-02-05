import { useState, KeyboardEvent, ClipboardEvent, useRef, useEffect } from 'react';
import { Button } from '../common/Button';
import { useTranslation } from '@/i18n/useTranslation';
import type { ImageAttachment } from '@/shared/types/llm';

interface ChatInputProps {
  onSend: (message: string, images?: ImageAttachment[]) => void;
  disabled?: boolean;
}

const MIN_ROWS = 2;
const MAX_ROWS = 10;

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [rows, setRows] = useState(MIN_ROWS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  // Auto-grow textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to get accurate scrollHeight
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // Approximate line height in pixels

      // Calculate number of rows
      const calculatedRows = Math.ceil(scrollHeight / lineHeight);
      const newRows = Math.max(MIN_ROWS, Math.min(calculatedRows, MAX_ROWS));

      setRows(newRows);
    }
  }, [message]);

  const handleSend = () => {
    if ((message.trim() || images.length > 0) && !disabled) {
      onSend(message, images.length > 0 ? images : undefined);
      setMessage('');
      setImages([]);
      setRows(MIN_ROWS); // Reset to minimum rows after sending
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setImages((prev) => [
              ...prev,
              {
                data: dataUrl,
                mimeType: file.type,
                name: file.name || 'pasted-image',
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setImages((prev) => [
            ...prev,
            {
              data: dataUrl,
              mimeType: file.type,
              name: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={img.data}
                alt={img.name}
                className="w-20 h-20 object-cover rounded border border-gray-300"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Attach image"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={t('components.chatInput.placeholder')}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-y-auto"
          rows={rows}
          disabled={disabled}
          style={{ maxHeight: `${MAX_ROWS * 24}px` }}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && images.length === 0)}
          className="self-end"
        >
          {t('components.button.send')}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {t('components.chatInput.instructions')}
      </p>
    </div>
  );
}
