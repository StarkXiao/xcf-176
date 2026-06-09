import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Check } from 'lucide-react';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';

const ROLE_LABELS: Record<string, string> = {
  lead: '队长',
  analyst: '分析员',
  assistant: '助手',
  reviewer: '审核员',
};

export const CollaboratorSelector: React.FC = () => {
  const collaborators = useCollaboratorStore((s) => s.collaborators);
  const currentCollaboratorId = useUiStore((s) => s.currentCollaboratorId);
  const setCurrentCollaboratorId = useUiStore((s) => s.setCurrentCollaboratorId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = collaborators.find((c) => c.id === currentCollaboratorId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded-sm border transition-all"
        style={{
          borderColor: current ? current.color : CYBERPUNK_COLORS.borderColor,
          color: current ? current.color : CYBERPUNK_COLORS.textSecondary,
          backgroundColor: current ? getGlowColor(current.color, 0.08) : 'transparent',
          boxShadow: current ? `0 0 6px ${getGlowColor(current.color, 0.3)}` : 'none',
        }}
        onClick={() => setOpen(!open)}
      >
        <Users size={14} />
        <span className="text-xs font-mono max-w-[60px] truncate">
          {current ? current.name : '切换操作人'}
        </span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 right-0 z-50 min-w-[180px] border rounded-sm shadow-lg"
          style={{
            backgroundColor: CYBERPUNK_COLORS.bgSecondary,
            borderColor: CYBERPUNK_COLORS.borderColor,
          }}
        >
          <div
            className="px-3 py-2 text-xs font-mono border-b"
            style={{ color: CYBERPUNK_COLORS.textSecondary, borderColor: CYBERPUNK_COLORS.borderColor }}
          >
            当前操作人
          </div>
          {collaborators.map((c) => (
            <button
              key={c.id}
              className="w-full flex items-center gap-2 px-3 py-2 transition-colors hover:opacity-80"
              style={{
                backgroundColor: c.id === currentCollaboratorId ? getGlowColor(c.color, 0.1) : 'transparent',
                color: c.id === currentCollaboratorId ? c.color : CYBERPUNK_COLORS.textPrimary,
              }}
              onClick={() => {
                setCurrentCollaboratorId(c.id);
                setOpen(false);
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: c.color,
                  boxShadow: `0 0 6px ${getGlowColor(c.color, 0.5)}`,
                }}
              />
              <span className="text-xs font-mono flex-1 text-left">{c.name}</span>
              <span
                className="text-xs font-mono"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
              >
                {ROLE_LABELS[c.role] || c.role}
              </span>
              {c.id === currentCollaboratorId && (
                <Check size={12} style={{ color: c.color }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollaboratorSelector;
