import React from 'react';
import { Archive, ExternalLink, FileText, PenLine, Camera, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { NeonButton } from '@/components/ui/NeonButton';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { EvidenceCollectionItem, EvidenceSourceType } from '@/types';

interface EvidenceArchiveProps {
  caseId: string;
}

const SOURCE_ICONS: Record<EvidenceSourceType, React.ReactNode> = {
  webpage_screenshot: <Camera size={12} />,
  file_upload: <FileText size={12} />,
  manual_entry: <PenLine size={12} />,
};

const SOURCE_LABELS: Record<EvidenceSourceType, string> = {
  webpage_screenshot: '网页截图',
  file_upload: '文件上传',
  manual_entry: '手工录入',
};

const SOURCE_COLORS: Record<EvidenceSourceType, string> = {
  webpage_screenshot: CYBERPUNK_COLORS.accentCyan,
  file_upload: CYBERPUNK_COLORS.accentYellow,
  manual_entry: CYBERPUNK_COLORS.accentPurple,
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export const EvidenceArchive: React.FC<EvidenceArchiveProps> = ({ caseId }) => {
  const items = useEvidenceCollectionStore((s) => s.items);
  const deleteItem = useEvidenceCollectionStore((s) => s.deleteItem);

  const archivedItems = items.filter(
    (i) => i.caseId === caseId && !!i.archivedAt
  );

  const duplicateItems = items.filter(
    (i) => i.caseId === caseId && i.verificationStatus === 'duplicate'
  );

  const allItems = [...archivedItems, ...duplicateItems];

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <Archive
          size={32}
          style={{
            color: CYBERPUNK_COLORS.textSecondary,
            opacity: 0.4,
          }}
        />
        <div
          className="text-xs font-mono mt-3"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          暂无归档或重复证据
        </div>
        <div
          className="text-xs font-mono mt-1"
          style={{ color: CYBERPUNK_COLORS.textSecondary, opacity: 0.6 }}
        >
          采集并校验通过的证据将显示在这里
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {archivedItems.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-mono rounded-sm border"
          style={{
            borderColor: CYBERPUNK_COLORS.accentGreen,
            color: CYBERPUNK_COLORS.accentGreen,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.06),
          }}
        >
          <ShieldCheck size={12} />
          已归档: {archivedItems.length} 条证据已入库
        </div>
      )}

      {duplicateItems.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-mono rounded-sm border"
          style={{
            borderColor: CYBERPUNK_COLORS.accentYellow,
            color: CYBERPUNK_COLORS.accentYellow,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.06),
          }}
        >
          <AlertTriangle size={12} />
          去重拦截: {duplicateItems.length} 条重复证据
        </div>
      )}

      {allItems.map((item: EvidenceCollectionItem) => {
        const isArchived = !!item.archivedAt;
        const isDuplicate = item.verificationStatus === 'duplicate';
        const sourceColor = SOURCE_COLORS[item.sourceType];
        const statusColor = isArchived
          ? CYBERPUNK_COLORS.accentGreen
          : CYBERPUNK_COLORS.accentYellow;

        return (
          <div
            key={item.id}
            className="rounded-sm border overflow-hidden"
            style={{
              borderColor: CYBERPUNK_COLORS.borderColor,
              backgroundColor: CYBERPUNK_COLORS.bgTertiary,
            }}
          >
            <div className="flex">
              <div
                className="w-1 flex-shrink-0"
                style={{
                  backgroundColor: statusColor,
                  boxShadow: `0 0 6px ${getGlowColor(statusColor, 0.4)}`,
                }}
              />
              <div className="flex-1 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: getGlowColor(sourceColor, 0.2),
                      color: sourceColor,
                    }}
                  >
                    {SOURCE_ICONS[item.sourceType]}
                  </div>
                  <span
                    className="text-xs font-mono"
                    style={{ color: sourceColor }}
                  >
                    {SOURCE_LABELS[item.sourceType]}
                  </span>
                  {isArchived && (
                    <span
                      className="text-xs font-mono px-1 py-0 rounded-sm border"
                      style={{
                        color: CYBERPUNK_COLORS.accentGreen,
                        borderColor: CYBERPUNK_COLORS.accentGreen,
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.08),
                      }}
                    >
                      已归档
                    </span>
                  )}
                  {isDuplicate && (
                    <span
                      className="text-xs font-mono px-1 py-0 rounded-sm border"
                      style={{
                        color: CYBERPUNK_COLORS.accentYellow,
                        borderColor: CYBERPUNK_COLORS.accentYellow,
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentYellow, 0.08),
                      }}
                    >
                      重复
                    </span>
                  )}
                </div>

                <div
                  className="text-xs font-mono mb-1"
                  style={{ color: CYBERPUNK_COLORS.textPrimary }}
                >
                  {item.content.slice(0, 50)}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {item.sourceUrl && (
                    <span
                      className="text-xs font-mono truncate flex items-center gap-0.5"
                      style={{ color: CYBERPUNK_COLORS.accentCyan, maxWidth: 180 }}
                    >
                      <ExternalLink size={10} />
                      {item.sourceUrl.replace(/^https?:\/\//, '').slice(0, 30)}
                    </span>
                  )}
                  {item.fileName && (
                    <span
                      className="text-xs font-mono truncate flex items-center gap-0.5"
                      style={{ color: CYBERPUNK_COLORS.accentYellow }}
                    >
                      <FileText size={10} />
                      {item.fileName.slice(0, 20)}
                    </span>
                  )}
                </div>

                {isDuplicate && item.duplicateOf && (
                  <div
                    className="text-xs font-mono mt-1"
                    style={{ color: CYBERPUNK_COLORS.accentYellow }}
                  >
                    与已有证据重复 (ID: {item.duplicateOf.slice(0, 12)}...)
                  </div>
                )}

                {item.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1 py-0 text-xs font-mono rounded-sm"
                        style={{
                          color: CYBERPUNK_COLORS.accentCyan,
                          backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08),
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className="text-xs font-mono mt-1"
                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                >
                  采集: {formatTimestamp(item.collectedAt)}
                  {item.archivedAt && ` | 归档: ${formatTimestamp(item.archivedAt!)}`}
                </div>

                {!isArchived && (
                  <div className="flex gap-1 mt-1.5">
                    <button
                      className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded-sm border transition-all"
                      style={{
                        borderColor: CYBERPUNK_COLORS.accentRed,
                        color: CYBERPUNK_COLORS.accentRed,
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
                      }}
                      onClick={() => deleteItem(item.id)}
                    >
                      <AlertTriangle size={10} />
                      移除
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
