import React, { useEffect, useState } from 'react';
import { Camera, Upload, PenLine, Archive, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useCaseStore } from '@/store/useCaseStore';
import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import { WebpageScreenshot } from './WebpageScreenshot';
import { FileUpload } from './FileUpload';
import { ManualEntry } from './ManualEntry';
import { EvidenceArchive } from './EvidenceArchive';
import type { EvidenceCollectionItem } from '@/types';

type TabKey = 'screenshot' | 'upload' | 'manual' | 'archive';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'screenshot', label: '网页截图', icon: <Camera size={14} /> },
  { key: 'upload', label: '文件上传', icon: <Upload size={14} /> },
  { key: 'manual', label: '手工录入', icon: <PenLine size={14} /> },
  { key: 'archive', label: '已归档', icon: <Archive size={14} /> },
];

export const EvidenceCollectionPanel: React.FC = () => {
  const currentCase = useCaseStore((s) => s.currentCase);
  const togglePanel = useUiStore((s) => s.toggleEvidenceCollectionPanel);
  const loadItems = useEvidenceCollectionStore((s) => s.loadItems);
  const items = useEvidenceCollectionStore((s) => s.items);
  const error = useEvidenceCollectionStore((s) => s.error);
  const archiveAllVerified = useEvidenceCollectionStore((s) => s.archiveAllVerified);

  const [activeTab, setActiveTab] = useState<TabKey>('screenshot');

  useEffect(() => {
    if (currentCase) {
      loadItems(currentCase.id);
    }
  }, [currentCase, loadItems]);

  const caseItems = currentCase ? items.filter((i) => i.caseId === currentCase.id) : [];
  const pendingCount = caseItems.filter((i) => !i.archivedAt && i.verificationStatus !== 'duplicate').length;
  const verifiedCount = caseItems.filter((i) => i.verificationStatus === 'verified' && !i.archivedAt).length;
  const duplicateCount = caseItems.filter((i) => i.verificationStatus === 'duplicate').length;
  const archivedCount = caseItems.filter((i) => !!i.archivedAt).length;

  const handleArchiveAll = async () => {
    if (currentCase && verifiedCount > 0) {
      await archiveAllVerified(currentCase.id);
      setActiveTab('archive');
    }
  };

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 420,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck
            size={18}
            style={{
              color: CYBERPUNK_COLORS.accentGreen,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.6)})`,
            }}
          />
          <span
            className="text-sm font-mono font-bold"
            style={{
              color: CYBERPUNK_COLORS.accentGreen,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.6)}`,
            }}
          >
            证据采集
          </span>
        </div>
        <div className="flex items-center gap-2">
          {verifiedCount > 0 && (
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
              style={{
                borderColor: CYBERPUNK_COLORS.accentGreen,
                color: CYBERPUNK_COLORS.accentGreen,
                backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.08),
              }}
              onClick={handleArchiveAll}
            >
              <Archive size={10} />
              全部归档({verifiedCount})
            </button>
          )}
          <button
            onClick={togglePanel}
            className="p-1 transition-colors"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mx-3 mt-2 flex items-center gap-1.5 px-2 py-1.5 text-xs font-mono rounded-sm border"
          style={{
            borderColor: CYBERPUNK_COLORS.accentRed,
            color: CYBERPUNK_COLORS.accentRed,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentRed, 0.08),
          }}
        >
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      <div
        className="flex border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const tabColor =
            tab.key === 'archive'
              ? CYBERPUNK_COLORS.accentPurple
              : CYBERPUNK_COLORS.accentCyan;
          return (
            <button
              key={tab.key}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-mono border-b-2 transition-all"
              style={{
                borderColor: isActive ? tabColor : 'transparent',
                color: isActive ? tabColor : CYBERPUNK_COLORS.textSecondary,
                backgroundColor: isActive ? getGlowColor(tabColor, 0.06) : 'transparent',
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'archive' && archivedCount > 0 && (
                <span
                  className="px-1 rounded-sm text-xs"
                  style={{
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.2),
                    color: CYBERPUNK_COLORS.accentPurple,
                  }}
                >
                  {archivedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!currentCase ? (
          <div
            className="flex items-center justify-center h-full text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            请先选择案件
          </div>
        ) : (
          <>
            {activeTab === 'screenshot' && <WebpageScreenshot caseId={currentCase.id} />}
            {activeTab === 'upload' && <FileUpload caseId={currentCase.id} />}
            {activeTab === 'manual' && <ManualEntry caseId={currentCase.id} />}
            {activeTab === 'archive' && <EvidenceArchive caseId={currentCase.id} />}
          </>
        )}
      </div>

      <div
        className="px-3 py-2 border-t flex items-center justify-between text-xs font-mono"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          color: CYBERPUNK_COLORS.textSecondary,
        }}
      >
        <span>待处理: {pendingCount}</span>
        <span>已校验: {verifiedCount}</span>
        <span style={{ color: CYBERPUNK_COLORS.accentYellow }}>重复: {duplicateCount}</span>
        <span style={{ color: CYBERPUNK_COLORS.accentGreen }}>已归档: {archivedCount}</span>
      </div>
    </div>
  );
};

export default EvidenceCollectionPanel;
