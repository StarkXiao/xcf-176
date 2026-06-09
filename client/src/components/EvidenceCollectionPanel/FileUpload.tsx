import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, AlertTriangle } from 'lucide-react';
import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { NeonButton } from '@/components/ui/NeonButton';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { EvidenceCollectionItem } from '@/types';

interface FileUploadProps {
  caseId: string;
}

interface FileEntry {
  file: File;
  description: string;
}

const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'audio/mpeg',
  'video/mp4',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileUpload: React.FC<FileUploadProps> = ({ caseId }) => {
  const collectItem = useEvidenceCollectionStore((s) => s.collectItem);
  const loading = useEvidenceCollectionStore((s) => s.loading);
  const items = useEvidenceCollectionStore((s) => s.items);
  const archiveItem = useEvidenceCollectionStore((s) => s.archiveItem);
  const deleteItem = useEvidenceCollectionStore((s) => s.deleteItem);

  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const caseItems = items.filter(
    (i) => i.caseId === caseId && i.sourceType === 'file_upload' && !i.archivedAt
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: FileEntry[] = [];
    Array.from(files).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type) && file.type) {
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        return;
      }
      newEntries.push({ file, description: '' });
    });
    setFileEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDescription = (index: number, description: string) => {
    setFileEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, description } : entry))
    );
  };

  const handleUpload = async () => {
    for (const entry of fileEntries) {
      const content = entry.description || entry.file.name;
      await collectItem({
        caseId,
        sourceType: 'file_upload',
        content,
        fileName: entry.file.name,
        fileSize: entry.file.size,
        fileType: entry.file.type || 'unknown',
        importance: 'normal',
        tags: [],
      });
    }
    setFileEntries([]);
  };

  return (
    <div className="p-3 space-y-3">
      <div
        className="p-3 rounded-sm border space-y-3"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          backgroundColor: CYBERPUNK_COLORS.bgTertiary,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Upload
            size={14}
            style={{
              color: CYBERPUNK_COLORS.accentYellow,
              filter: `drop-shadow(0 0 3px ${getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.5)})`,
            }}
          />
          <span className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
            文件上传
          </span>
        </div>

        <div
          className="rounded-sm border-2 border-dashed p-4 text-center cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? CYBERPUNK_COLORS.accentYellow : CYBERPUNK_COLORS.borderColor,
            backgroundColor: dragOver ? getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.06) : 'transparent',
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload
            size={24}
            className="mx-auto mb-2"
            style={{
              color: dragOver ? CYBERPUNK_COLORS.accentYellow : CYBERPUNK_COLORS.textSecondary,
            }}
          />
          <div
            className="text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            拖拽文件到此处 或 点击选择
          </div>
          <div
            className="text-xs font-mono mt-1"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            支持图片、PDF、文本、音视频等，最大50MB
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {fileEntries.length > 0 && (
          <div className="space-y-2">
            {fileEntries.map((entry, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-sm border"
                style={{
                  borderColor: CYBERPUNK_COLORS.borderColor,
                  backgroundColor: CYBERPUNK_COLORS.bgPrimary,
                }}
              >
                <FileText
                  size={14}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: CYBERPUNK_COLORS.accentYellow }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-mono truncate"
                    style={{ color: CYBERPUNK_COLORS.textPrimary }}
                  >
                    {entry.file.name}
                  </div>
                  <div
                    className="text-xs font-mono"
                    style={{ color: CYBERPUNK_COLORS.textSecondary }}
                  >
                    {formatFileSize(entry.file.size)} · {entry.file.type || '未知类型'}
                  </div>
                  <input
                    className="w-full mt-1 text-xs font-mono px-2 py-1 rounded-sm border"
                    style={{
                      backgroundColor: CYBERPUNK_COLORS.bgSecondary,
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      color: CYBERPUNK_COLORS.textPrimary,
                    }}
                    placeholder="描述/备注（可选）"
                    value={entry.description}
                    onChange={(e) => updateDescription(index, e.target.value)}
                  />
                </div>
                <button
                  className="p-1 flex-shrink-0"
                  style={{ color: CYBERPUNK_COLORS.accentRed }}
                  onClick={() => removeFile(index)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <NeonButton
              variant="warning"
              size="sm"
              icon={<Upload size={12} />}
              onClick={handleUpload}
              disabled={loading}
            >
              {loading ? '上传中...' : `上传 ${fileEntries.length} 个文件`}
            </NeonButton>
          </div>
        )}
      </div>

      {caseItems.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            待归档文件 ({caseItems.length})
          </span>
          {caseItems.map((item: EvidenceCollectionItem) => {
            const statusColor =
              item.verificationStatus === 'verified'
                ? CYBERPUNK_COLORS.accentGreen
                : item.verificationStatus === 'duplicate'
                ? CYBERPUNK_COLORS.accentYellow
                : CYBERPUNK_COLORS.accentRed;
            const statusLabel =
              item.verificationStatus === 'verified'
                ? '已校验'
                : item.verificationStatus === 'duplicate'
                ? '重复'
                : '校验失败';

            return (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-sm border"
                style={{
                  borderColor: CYBERPUNK_COLORS.borderColor,
                  backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                }}
              >
                <div
                  className="w-1 h-8 flex-shrink-0 rounded-sm"
                  style={{
                    backgroundColor: statusColor,
                    boxShadow: `0 0 4px ${getGlowColor(statusColor, 0.4)}`,
                  }}
                />
                <FileText
                  size={14}
                  className="flex-shrink-0"
                  style={{ color: CYBERPUNK_COLORS.accentYellow }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-mono truncate"
                    style={{ color: CYBERPUNK_COLORS.textPrimary }}
                  >
                    {item.fileName || item.content.slice(0, 30)}
                  </div>
                  <div
                    className="text-xs font-mono"
                    style={{ color: CYBERPUNK_COLORS.textSecondary }}
                  >
                    {item.fileSize ? formatFileSize(item.fileSize) : ''} {item.fileType || ''}
                  </div>
                </div>
                <span
                  className="text-xs font-mono px-1 py-0.5 rounded-sm border flex-shrink-0"
                  style={{
                    borderColor: statusColor,
                    color: statusColor,
                    backgroundColor: getGlowColor(statusColor, 0.08),
                  }}
                >
                  {statusLabel}
                </span>
                {item.verificationStatus === 'verified' && (
                  <button
                    className="p-1 rounded-sm transition-colors flex-shrink-0"
                    style={{
                      color: CYBERPUNK_COLORS.accentGreen,
                      border: `1px solid ${CYBERPUNK_COLORS.accentGreen}`,
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.08),
                    }}
                    onClick={() => archiveItem(item.id)}
                    title="归档"
                  >
                    <Upload size={10} />
                  </button>
                )}
                <button
                  className="p-1 rounded-sm transition-colors flex-shrink-0"
                  style={{
                    color: CYBERPUNK_COLORS.accentRed,
                    border: `1px solid ${CYBERPUNK_COLORS.accentRed}`,
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
                  }}
                  onClick={() => deleteItem(item.id)}
                  title="删除"
                >
                  <AlertTriangle size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
