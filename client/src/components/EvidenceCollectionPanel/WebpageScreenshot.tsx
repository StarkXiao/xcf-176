import React, { useState, useCallback } from 'react';
import { Camera, Link, AlertTriangle, Loader2 } from 'lucide-react';
import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { EvidenceCollectionItem } from '@/types';

interface WebpageScreenshotProps {
  caseId: string;
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const WebpageScreenshot: React.FC<WebpageScreenshotProps> = ({ caseId }) => {
  const collectItem = useEvidenceCollectionStore((s) => s.collectItem);
  const loading = useEvidenceCollectionStore((s) => s.loading);
  const items = useEvidenceCollectionStore((s) => s.items);
  const archiveItem = useEvidenceCollectionStore((s) => s.archiveItem);
  const deleteItem = useEvidenceCollectionStore((s) => s.deleteItem);

  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const caseItems = items.filter(
    (i) => i.caseId === caseId && i.sourceType === 'webpage_screenshot' && !i.archivedAt
  );

  const handleCapture = useCallback(() => {
    setUrlError(null);
    if (!sourceUrl.trim()) {
      setUrlError('请输入网页URL');
      return;
    }
    if (!validateUrl(sourceUrl)) {
      setUrlError('URL格式无效');
      return;
    }
    if (!description.trim()) {
      setUrlError('请输入截图描述');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '14px monospace';
      ctx.fillText(`[Screenshot] ${sourceUrl}`, 20, 30);
      ctx.fillText(new Date().toLocaleString('zh-CN'), 20, 50);
      ctx.fillStyle = '#888899';
      ctx.fillText(description, 20, 80);
    }
    const dataUrl = canvas.toDataURL('image/png');
    setScreenshotPreview(dataUrl);
  }, [sourceUrl, description]);

  const handleSubmit = async () => {
    if (!screenshotPreview) return;
    await collectItem({
      caseId,
      sourceType: 'webpage_screenshot',
      content: description,
      sourceUrl,
      screenshotDataUrl: screenshotPreview,
      importance: 'normal',
      tags: [],
    });
    setSourceUrl('');
    setDescription('');
    setScreenshotPreview(null);
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
          <Camera
            size={14}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 3px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.5)})`,
            }}
          />
          <span className="text-xs font-mono font-bold" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
            网页截图采集
          </span>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Link
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            />
            <NeonInput
              placeholder="输入网页URL..."
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value);
                setUrlError(null);
              }}
              className="pl-7"
              error={urlError || undefined}
            />
          </div>

          <NeonInput
            placeholder="截图描述/说明..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-2">
            <NeonButton
              variant="primary"
              size="sm"
              icon={<Camera size={12} />}
              onClick={handleCapture}
            >
              截取
            </NeonButton>
            {screenshotPreview && (
              <NeonButton
                variant="success"
                size="sm"
                icon={<Camera size={12} />}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '提交中...' : '提交采集'}
              </NeonButton>
            )}
          </div>
        </div>

        {screenshotPreview && (
          <div
            className="rounded-sm border overflow-hidden"
            style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
          >
            <img
              src={screenshotPreview}
              alt="截图预览"
              className="w-full"
              style={{ maxHeight: 200, objectFit: 'contain' }}
            />
          </div>
        )}
      </div>

      {caseItems.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            待归档截图 ({caseItems.length})
          </span>
          {caseItems.map((item: EvidenceCollectionItem) => (
            <CollectionItemRow
              key={item.id}
              item={item}
              onArchive={() => archiveItem(item.id)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CollectionItemRowProps {
  item: EvidenceCollectionItem;
  onArchive: () => void;
  onDelete: () => void;
}

const CollectionItemRow: React.FC<CollectionItemRowProps> = ({ item, onArchive, onDelete }) => {
  const statusColor =
    item.verificationStatus === 'verified'
      ? CYBERPUNK_COLORS.accentGreen
      : item.verificationStatus === 'duplicate'
      ? CYBERPUNK_COLORS.accentYellow
      : item.verificationStatus === 'failed'
      ? CYBERPUNK_COLORS.accentRed
      : CYBERPUNK_COLORS.textSecondary;

  const statusLabel =
    item.verificationStatus === 'verified'
      ? '已校验'
      : item.verificationStatus === 'duplicate'
      ? '重复'
      : item.verificationStatus === 'failed'
      ? '校验失败'
      : '待校验';

  return (
    <div
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
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-mono truncate"
          style={{ color: CYBERPUNK_COLORS.textPrimary }}
        >
          {item.content.slice(0, 40)}
        </div>
        {item.sourceUrl && (
          <div
            className="text-xs font-mono truncate"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            {item.sourceUrl}
          </div>
        )}
        {item.fileName && (
          <div
            className="text-xs font-mono truncate"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            {item.fileName}
          </div>
        )}
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
          onClick={onArchive}
          title="归档"
        >
          <Camera size={10} />
        </button>
      )}
      <button
        className="p-1 rounded-sm transition-colors flex-shrink-0"
        style={{
          color: CYBERPUNK_COLORS.accentRed,
          border: `1px solid ${CYBERPUNK_COLORS.accentRed}`,
          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
        }}
        onClick={onDelete}
        title="删除"
      >
        <AlertTriangle size={10} />
      </button>
    </div>
  );
};
