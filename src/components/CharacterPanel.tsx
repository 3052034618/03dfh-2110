import { useState } from 'react';
import type { Character, Gender, RoleImportance, EmotionLine } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { mockCharacters } from '../data/mockData';

interface CharacterPanelProps {
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
}

const genderLabels: Record<Gender, string> = {
  male: '男',
  female: '女',
  other: '其他',
};

const importanceLabels: Record<RoleImportance, string> = {
  light: '轻',
  medium: '中',
  heavy: '重',
  highlight: '高光',
};

const emotionLineLabels: Record<EmotionLine, string> = {
  love: '爱情线',
  family: '亲情线',
  friendship: '友情线',
  revenge: '复仇线',
  career: '事业线',
  none: '无',
};

export default function CharacterPanel({
  characters,
  onCharactersChange,
}: CharacterPanelProps) {
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCharacter = () => {
    const newChar: Character = {
      id: uuidv4(),
      name: '',
      gender: 'male',
      importance: 'medium',
      emotionLine: 'none',
      mustCrossdress: false,
      newbieFriendly: false,
      description: '',
    };
    setEditingChar(newChar);
    setIsAdding(true);
  };

  const handleEditCharacter = (char: Character) => {
    setEditingChar({ ...char });
    setIsAdding(false);
  };

  const handleSaveCharacter = () => {
    if (!editingChar || !editingChar.name.trim()) return;

    if (isAdding) {
      onCharactersChange([...characters, editingChar]);
    } else {
      onCharactersChange(
        characters.map((c) => (c.id === editingChar.id ? editingChar : c))
      );
    }
    setEditingChar(null);
    setIsAdding(false);
  };

  const handleDeleteCharacter = (id: string) => {
    onCharactersChange(characters.filter((c) => c.id !== id));
  };

  const handleCancelEdit = () => {
    setEditingChar(null);
    setIsAdding(false);
  };

  const handleImportDemo = () => {
    onCharactersChange([...mockCharacters]);
  };

  const getImportanceColor = (importance: RoleImportance) => {
    switch (importance) {
      case 'highlight':
        return 'bg-yellow-100 text-yellow-700';
      case 'heavy':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-blue-100 text-blue-700';
      case 'light':
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">角色要求</h2>
          <div className="flex gap-2">
            <button
              onClick={handleImportDemo}
              className="text-sm px-3 py-1.5 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              导入示例
            </button>
            <button
              onClick={handleAddCharacter}
              className="text-sm px-3 py-1.5 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
            >
              + 添加角色
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          共 {characters.length} 个角色
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {characters.length === 0 && !editingChar && (
          <div className="text-center py-12 text-gray-400">
            <p>暂无角色</p>
            <p className="text-sm mt-1">点击上方按钮添加或导入示例数据</p>
          </div>
        )}

        {characters.map((char) => (
          <div
            key={char.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition cursor-pointer group"
            onClick={() => handleEditCharacter(char)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    char.gender === 'male'
                      ? 'bg-blue-500'
                      : char.gender === 'female'
                      ? 'bg-pink-500'
                      : 'bg-purple-500'
                  }`}
                />
                <span className="font-medium text-gray-800">{char.name}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${getImportanceColor(
                    char.importance
                  )}`}
                >
                  {importanceLabels[char.importance]}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCharacter(char.id);
                }}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500 flex gap-3 flex-wrap">
              <span>性别设定：{genderLabels[char.gender]}</span>
              <span>情感线：{emotionLineLabels[char.emotionLine]}</span>
              {char.mustCrossdress && (
                <span className="text-purple-600">必须反串</span>
              )}
              {char.newbieFriendly && (
                <span className="text-green-600">新人友好</span>
              )}
            </div>
            {char.description && (
              <p className="mt-1 text-xs text-gray-400 line-clamp-1">
                {char.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {(editingChar || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {isAdding ? '添加角色' : '编辑角色'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色名 *
                </label>
                <input
                  type="text"
                  value={editingChar?.name || ''}
                  onChange={(e) =>
                    setEditingChar(
                      editingChar ? { ...editingChar, name: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入角色名"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性别设定
                  </label>
                  <select
                    value={editingChar?.gender || 'male'}
                    onChange={(e) =>
                      setEditingChar(
                        editingChar
                          ? { ...editingChar, gender: e.target.value as Gender }
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
                    戏份轻重
                  </label>
                  <select
                    value={editingChar?.importance || 'medium'}
                    onChange={(e) =>
                      setEditingChar(
                        editingChar
                          ? {
                              ...editingChar,
                              importance: e.target.value as RoleImportance,
                            }
                          : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="light">轻</option>
                    <option value="medium">中</option>
                    <option value="heavy">重</option>
                    <option value="highlight">高光位</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  情感线类型
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(emotionLineLabels) as EmotionLine[]).map((line) => (
                    <button
                      key={line}
                      onClick={() =>
                        setEditingChar(
                          editingChar ? { ...editingChar, emotionLine: line } : null
                        )
                      }
                      className={`py-2 px-3 text-sm rounded-md border transition ${
                        editingChar?.emotionLine === line
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                      }`}
                    >
                      {emotionLineLabels[line]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingChar?.mustCrossdress || false}
                    onChange={(e) =>
                      setEditingChar(
                        editingChar
                          ? { ...editingChar, mustCrossdress: e.target.checked }
                          : null
                      )
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    必须反串
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingChar?.newbieFriendly || false}
                    onChange={(e) =>
                      setEditingChar(
                        editingChar
                          ? { ...editingChar, newbieFriendly: e.target.checked }
                          : null
                      )
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">新人友好</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色描述
                </label>
                <textarea
                  value={editingChar?.description || ''}
                  onChange={(e) =>
                    setEditingChar(
                      editingChar ? { ...editingChar, description: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  placeholder="角色简介、特点、注意事项等"
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
                onClick={handleSaveCharacter}
                disabled={!editingChar?.name.trim()}
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
