import { useState } from 'react';
import type { Player, Gender, CrossdressLevel } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { mockPlayers } from '../data/mockData';

interface PlayerListPanelProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
}

const genderLabels: Record<Gender, string> = {
  male: '男',
  female: '女',
  other: '其他',
};

const crossdressLevelLabels: Record<CrossdressLevel, string> = {
  none: '不接受',
  low: '低',
  medium: '中',
  high: '高',
};

export default function PlayerListPanel({ players, onPlayersChange }: PlayerListPanelProps) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaboo, setNewTaboo] = useState('');

  const handleAddPlayer = () => {
    const newPlayer: Player = {
      id: uuidv4(),
      name: '',
      gender: 'male',
      acceptCrossdress: false,
      crossdressLevel: 'none',
      tabooRoles: [],
      wantsHighlight: false,
      isNewbie: false,
      group: '',
      notes: '',
    };
    setEditingPlayer(newPlayer);
    setIsAdding(true);
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer({ ...player });
    setIsAdding(false);
  };

  const handleSavePlayer = () => {
    if (!editingPlayer || !editingPlayer.name.trim()) return;

    if (isAdding) {
      onPlayersChange([...players, editingPlayer]);
    } else {
      onPlayersChange(
        players.map((p) => (p.id === editingPlayer.id ? editingPlayer : p))
      );
    }
    setEditingPlayer(null);
    setIsAdding(false);
  };

  const handleDeletePlayer = (id: string) => {
    onPlayersChange(players.filter((p) => p.id !== id));
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setIsAdding(false);
  };

  const handleAddTaboo = () => {
    if (!editingPlayer || !newTaboo.trim()) return;
    setEditingPlayer({
      ...editingPlayer,
      tabooRoles: [...editingPlayer.tabooRoles, newTaboo.trim()],
    });
    setNewTaboo('');
  };

  const handleRemoveTaboo = (taboo: string) => {
    if (!editingPlayer) return;
    setEditingPlayer({
      ...editingPlayer,
      tabooRoles: editingPlayer.tabooRoles.filter((t) => t !== taboo),
    });
  };

  const handleImportDemo = () => {
    onPlayersChange([...mockPlayers]);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">玩家名单</h2>
          <div className="flex gap-2">
            <button
              onClick={handleImportDemo}
              className="text-sm px-3 py-1.5 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              导入示例
            </button>
            <button
              onClick={handleAddPlayer}
              className="text-sm px-3 py-1.5 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
            >
              + 添加玩家
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          共 {players.length} 位玩家
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {players.length === 0 && !editingPlayer && (
          <div className="text-center py-12 text-gray-400">
            <p>暂无玩家</p>
            <p className="text-sm mt-1">点击上方按钮添加或导入示例数据</p>
          </div>
        )}

        {players.map((player) => (
          <div
            key={player.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition cursor-pointer group"
            onClick={() => handleEditPlayer(player)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    player.gender === 'male'
                      ? 'bg-blue-500'
                      : player.gender === 'female'
                      ? 'bg-pink-500'
                      : 'bg-purple-500'
                  }`}
                />
                <span className="font-medium text-gray-800">{player.name}</span>
                {player.isNewbie && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                    新人
                  </span>
                )}
                {player.wantsHighlight && (
                  <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                    高光位
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlayer(player.id);
                }}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500 flex gap-3 flex-wrap">
              <span>性别：{genderLabels[player.gender]}</span>
              <span>
                反串：{player.acceptCrossdress
                  ? crossdressLevelLabels[player.crossdressLevel]
                  : '不接受'}
              </span>
              {player.group && <span>分组：{player.group}</span>}
              {player.tabooRoles.length > 0 && (
                <span>雷点：{player.tabooRoles.length}个</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {(editingPlayer || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {isAdding ? '添加玩家' : '编辑玩家'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={editingPlayer?.name || ''}
                  onChange={(e) =>
                    setEditingPlayer(
                      editingPlayer ? { ...editingPlayer, name: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入玩家姓名"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性别
                  </label>
                  <select
                    value={editingPlayer?.gender || 'male'}
                    onChange={(e) =>
                      setEditingPlayer(
                        editingPlayer
                          ? { ...editingPlayer, gender: e.target.value as Gender }
                          : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分组/寝室
                  </label>
                  <input
                    type="text"
                    value={editingPlayer?.group || ''}
                    onChange={(e) =>
                      setEditingPlayer(
                        editingPlayer ? { ...editingPlayer, group: e.target.value } : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="如：A寝"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingPlayer?.acceptCrossdress || false}
                    onChange={(e) =>
                      setEditingPlayer(
                        editingPlayer
                          ? {
                              ...editingPlayer,
                              acceptCrossdress: e.target.checked,
                              crossdressLevel: e.target.checked ? 'medium' : 'none',
                            }
                          : null
                      )
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    是否接受反串
                  </span>
                </label>
              </div>

              {editingPlayer?.acceptCrossdress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    反串接受程度
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as CrossdressLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          setEditingPlayer(
                            editingPlayer
                              ? { ...editingPlayer, crossdressLevel: level }
                              : null
                          )
                        }
                        className={`flex-1 py-2 px-3 text-sm rounded-md border transition ${
                          editingPlayer?.crossdressLevel === level
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                        }`}
                      >
                        {crossdressLevelLabels[level]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingPlayer?.isNewbie || false}
                    onChange={(e) =>
                      setEditingPlayer(
                        editingPlayer
                          ? { ...editingPlayer, isNewbie: e.target.checked }
                          : null
                      )
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">新人</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingPlayer?.wantsHighlight || false}
                    onChange={(e) =>
                      setEditingPlayer(
                        editingPlayer
                          ? { ...editingPlayer, wantsHighlight: e.target.checked }
                          : null
                      )
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">想尝试高光位</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  雷点角色
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTaboo}
                    onChange={(e) => setNewTaboo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTaboo()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="输入雷点角色名后按回车"
                  />
                  <button
                    onClick={handleAddTaboo}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {editingPlayer?.tabooRoles.map((taboo) => (
                    <span
                      key={taboo}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs rounded"
                    >
                      {taboo}
                      <button
                        onClick={() => handleRemoveTaboo(taboo)}
                        className="hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {editingPlayer?.tabooRoles.length === 0 && (
                    <span className="text-xs text-gray-400">暂无雷点</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <textarea
                  value={editingPlayer?.notes || ''}
                  onChange={(e) =>
                    setEditingPlayer(
                      editingPlayer ? { ...editingPlayer, notes: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={2}
                  placeholder="可选备注信息"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleSavePlayer}
                disabled={!editingPlayer?.name.trim()}
                className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
