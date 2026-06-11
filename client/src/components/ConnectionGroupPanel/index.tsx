import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Palette,
  Eye,
  EyeOff,
  Paintbrush,
  FolderPlus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { NeonInput } from '@/components/ui/NeonInput';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useCaseTemplateStore } from '@/store/useCaseTemplateStore';
import { connectionApi } from '@/api/connectionApi';
import { CYBERPUNK_COLORS, getGlowColor, generateRandomColor } from '@/utils/colorUtils';
import type { ConnectionGroup, ConnectionTypeStats, TemplateRelationType } from '@/types';

export const ConnectionGroupPanel: React.FC = () => {
  const currentCase = useCaseStore((state) => state.currentCase);
  const connectionGroups = useCanvasStore((state) => state.connectionGroups);
  const connections = useCanvasStore((state) => state.connections);
  const setConnectionGroups = useCanvasStore((state) => state.setConnectionGroups);
  const addConnectionGroup = useCanvasStore((state) => state.addConnectionGroup);
  const updateConnectionGroup = useCanvasStore((state) => state.updateConnectionGroup);
  const removeConnectionGroup = useCanvasStore((state) => state.removeConnectionGroup);
  const patchConnection = useCanvasStore((state) => state.patchConnection);
  const hideConnectionGroup = useCanvasStore((state) => state.hideConnectionGroup);
  const showConnectionGroup = useCanvasStore((state) => state.showConnectionGroup);
  const resetConnectionVisibility = useCanvasStore((state) => state.resetConnectionVisibility);

  const appliedTemplateData = useCaseTemplateStore((state) => state.appliedTemplateData);
  const presetRelations: TemplateRelationType[] = appliedTemplateData?.relationTypes ?? [];

  const [typeStats, setTypeStats] = useState<ConnectionTypeStats[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(CYBERPUNK_COLORS.accentCyan);
  const [isLoading, setIsLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!currentCase) return;

    try {
      const res = await connectionApi.getGroupsByCaseId(currentCase.id);
      if (res.success && res.data) {
        setConnectionGroups(res.data);
      }
    } catch (error) {
      console.error('Failed to load connection groups:', error);
    }
  }, [currentCase, setConnectionGroups]);

  const loadTypeStats = useCallback(async () => {
    if (!currentCase) return;

    try {
      const res = await connectionApi.getConnectionTypeStats(currentCase.id);
      if (res.success && res.data) {
        setTypeStats(res.data);
      }
    } catch (error) {
      console.error('Failed to load type stats:', error);
    }
  }, [currentCase]);

  useEffect(() => {
    loadGroups();
    loadTypeStats();
  }, [loadGroups, loadTypeStats]);

  const handleCreateGroup = async () => {
    if (!currentCase || !newGroupName.trim()) return;

    setIsLoading(true);
    try {
      const res = await connectionApi.createGroup({
        caseId: currentCase.id,
        name: newGroupName.trim(),
        color: newGroupColor,
        lineStyle: 'solid',
      });
      if (res.success && res.data) {
        addConnectionGroup(res.data);
        setNewGroupName('');
        setNewGroupColor(generateRandomColor());
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('创建分组失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('确定要删除这个分组吗？分组中的连线不会被删除。')) return;

    try {
      const res = await connectionApi.deleteGroup(groupId);
      if (res.success) {
        removeConnectionGroup(groupId);
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('删除分组失败');
    }
  };

  const handleToggleGroupVisibility = async (groupId: string) => {
    try {
      const res = await connectionApi.toggleGroupVisibility(groupId);
      if (res.success && res.data) {
        updateConnectionGroup(res.data);
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  const handleChangeGroupColor = async (groupId: string, color: string) => {
    try {
      const res = await connectionApi.updateGroup(groupId, { color });
      if (res.success && res.data) {
        updateConnectionGroup(res.data);
        res.data.connectionIds.forEach((connId) => {
          patchConnection(connId, { color });
        });
      }
    } catch (error) {
      console.error('Failed to update group color:', error);
    }
  };

  const handleBulkUpdateByType = async (stat: ConnectionTypeStats, color?: string) => {
    if (!currentCase) return;

    try {
      const updateData: any = { caseId: currentCase.id };

      if (stat.relationTypeId) {
        updateData.relationTypeId = stat.relationTypeId;
      } else {
        updateData.label = stat.label;
      }

      if (color) {
        updateData.color = color;
      }

      const res = stat.relationTypeId
        ? await connectionApi.bulkUpdateByType(updateData)
        : await connectionApi.bulkUpdateByLabel(updateData);

      if (res.success && res.data) {
        res.data.connections.forEach((conn) => {
          patchConnection(conn.id, { color: conn.color, lineStyle: conn.lineStyle });
        });
        loadTypeStats();
        alert(`已更新 ${res.data.updated} 条连线`);
      }
    } catch (error) {
      console.error('Failed to bulk update:', error);
      alert('批量更新失败');
    }
  };

  const handleAutoCreateGroups = async () => {
    if (!currentCase || presetRelations.length === 0) return;

    try {
      const res = await connectionApi.autoCreateGroupsFromTypes(currentCase.id, presetRelations);
      if (res.success && res.data) {
        res.data.forEach((group) => addConnectionGroup(group));
        loadGroups();
        alert(`已创建 ${res.data.length} 个分组`);
      }
    } catch (error) {
      console.error('Failed to auto create groups:', error);
      alert('自动创建分组失败');
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleResetVisibility = () => {
    resetConnectionVisibility();
    loadGroups();
  };

  const colorOptions = [
    CYBERPUNK_COLORS.accentCyan,
    CYBERPUNK_COLORS.accentRed,
    CYBERPUNK_COLORS.accentYellow,
    CYBERPUNK_COLORS.accentGreen,
    CYBERPUNK_COLORS.accentPurple,
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#f9ca24',
    '#6c5ce7',
  ];

  if (!currentCase) {
    return (
      <div className="p-4 text-center font-mono text-sm" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
        请先选择一个案件
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: CYBERPUNK_COLORS.bgSecondary }}>
      <div
        className="h-12 px-4 flex items-center justify-between border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <Layers
            size={16}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
          <span
            className="font-mono text-sm uppercase tracking-wider"
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}`,
            }}
          >
            关系分组管理
          </span>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.2),
              color: CYBERPUNK_COLORS.accentCyan,
            }}
          >
            {connectionGroups.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NeonButton
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={14} />}
            onClick={() => {
              loadGroups();
              loadTypeStats();
            }}
            glow={false}
            title="刷新"
          />
          <NeonButton
            size="sm"
            variant="primary"
            icon={<Eye size={14} />}
            onClick={handleResetVisibility}
            glow={false}
            title="重置所有可见性"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div
          className="p-3 rounded-sm border space-y-3"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgPrimary, 0.5),
          }}
        >
          <div className="text-xs font-mono uppercase tracking-wider" style={{ color: CYBERPUNK_COLORS.accentCyan }}>
            创建新分组
          </div>
          <div className="flex gap-2">
            <NeonInput
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="分组名称"
              className="flex-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded-sm border transition-all hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: newGroupColor === color ? color : CYBERPUNK_COLORS.borderColor,
                  boxShadow: newGroupColor === color ? `0 0 10px ${getGlowColor(color, 0.6)}` : 'none',
                }}
                onClick={() => setNewGroupColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <NeonButton
              size="sm"
              variant="primary"
              icon={<Plus size={14} />}
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || isLoading}
              className="flex-1"
            >
              创建分组
            </NeonButton>
          </div>
          {presetRelations.length > 0 && (
            <NeonButton
              size="sm"
              variant="success"
              icon={<FolderPlus size={14} />}
              onClick={handleAutoCreateGroups}
              className="w-full"
            >
              从模板关系类型自动创建
            </NeonButton>
          )}
        </div>

        {typeStats.length > 0 && (
          <div
            className="p-3 rounded-sm border space-y-2"
            style={{
              borderColor: CYBERPUNK_COLORS.borderColor,
              backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgPrimary, 0.5),
            }}
          >
            <div className="text-xs font-mono uppercase tracking-wider" style={{ color: CYBERPUNK_COLORS.accentYellow }}>
              按类型统计 ({typeStats.length} 种)
            </div>
            <div className="space-y-2">
              {typeStats.map((stat, index) => (
                <div
                  key={`${stat.relationTypeId || 'null'}-${stat.label}-${index}`}
                  className="flex items-center justify-between p-2 rounded-sm"
                  style={{
                    backgroundColor: getGlowColor(stat.color, 0.08),
                    borderLeft: `3px solid ${stat.color}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: stat.color,
                        boxShadow: `0 0 6px ${getGlowColor(stat.color, 0.6)}`,
                      }}
                    />
                    <span className="text-sm font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                      {stat.label || '未命名'}
                    </span>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: getGlowColor(stat.color, 0.2),
                        color: stat.color,
                      }}
                    >
                      {stat.count}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex gap-1 mr-2">
                      {colorOptions.slice(0, 4).map((color) => (
                        <button
                          key={color}
                          className="w-5 h-5 rounded-sm border transition-all hover:scale-110"
                          style={{
                            backgroundColor: color,
                            borderColor: CYBERPUNK_COLORS.borderColor,
                          }}
                          onClick={() => handleBulkUpdateByType(stat, color)}
                          title={`统一设为${color}色`}
                        />
                      ))}
                    </div>
                    <NeonButton
                      size="xs"
                      variant="primary"
                      icon={<Paintbrush size={12} />}
                      onClick={() => handleBulkUpdateByType(stat, stat.color)}
                      glow={false}
                      title="应用当前颜色到所有该类型连线"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {connectionGroups.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              现有分组
            </div>
            {connectionGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-sm border overflow-hidden"
                style={{
                  borderColor: group.visible ? group.color : CYBERPUNK_COLORS.borderColor,
                  opacity: group.visible ? 1 : 0.6,
                }}
              >
                <div
                  className="flex items-center justify-between p-2"
                  style={{
                    backgroundColor: getGlowColor(group.color, 0.1),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleGroupExpanded(group.id)}
                      style={{ color: CYBERPUNK_COLORS.textSecondary }}
                    >
                      {expandedGroups.has(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: group.color,
                        boxShadow: `0 0 6px ${getGlowColor(group.color, 0.6)}`,
                      }}
                    />
                    <span className="text-sm font-mono" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
                      {group.name}
                    </span>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: getGlowColor(group.color, 0.2),
                        color: group.color,
                      }}
                    >
                      {group.connectionIds.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1 mr-1">
                      {colorOptions.slice(0, 4).map((color) => (
                        <button
                          key={color}
                          className="w-5 h-5 rounded-sm border transition-all hover:scale-110"
                          style={{
                            backgroundColor: color,
                            borderColor: group.color === color ? color : CYBERPUNK_COLORS.borderColor,
                          }}
                          onClick={() => handleChangeGroupColor(group.id, color)}
                        />
                      ))}
                    </div>
                    <NeonButton
                      size="xs"
                      variant="secondary"
                      icon={group.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      onClick={() => handleToggleGroupVisibility(group.id)}
                      glow={false}
                      title={group.visible ? '隐藏分组' : '显示分组'}
                    />
                    <NeonButton
                      size="xs"
                      variant="danger"
                      icon={<Trash2 size={12} />}
                      onClick={() => handleDeleteGroup(group.id)}
                      glow={false}
                      title="删除分组"
                    />
                  </div>
                </div>
                {expandedGroups.has(group.id) && group.connectionIds.length > 0 && (
                  <div
                    className="p-2 border-t max-h-40 overflow-y-auto"
                    style={{
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      backgroundColor: CYBERPUNK_COLORS.bgPrimary,
                    }}
                  >
                    {group.connectionIds.map((connId) => {
                      const conn = connections.find((c) => c.id === connId);
                      if (!conn) return null;
                      return (
                        <div
                          key={connId}
                          className="text-xs font-mono py-1 px-2 flex items-center justify-between"
                          style={{ color: CYBERPUNK_COLORS.textSecondary }}
                        >
                          <span>{conn.label || conn.id.slice(0, 12)}</span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: conn.color }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 font-mono text-sm"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            暂无分组，创建第一个分组来管理关系连线
          </div>
        )}
      </div>

      <div
        className="p-3 border-t text-xs font-mono"
        style={{
          borderColor: CYBERPUNK_COLORS.borderColor,
          backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgPrimary, 0.5),
          color: CYBERPUNK_COLORS.textSecondary,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Palette size={12} style={{ color: CYBERPUNK_COLORS.accentCyan }} />
          <span>共 {connections.length} 条连线，{connectionGroups.length} 个分组</span>
        </div>
        <div>提示：点击颜色方块可快速将该类型连线统一着色</div>
      </div>
    </div>
  );
};

export default ConnectionGroupPanel;
