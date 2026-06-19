import { useState } from 'react';
import type { HostSheet, Player, Character, MatchResult } from '../types';

interface HostSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostSheet: HostSheet | null;
  players: Player[];
  characters: Character[];
  assignments: { playerId: string; characterId: string }[];
  results: MatchResult[];
}

export default function HostSheetModal({
  isOpen,
  onClose,
  hostSheet,
  players,
  characters,
  assignments,
  results,
}: HostSheetModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !hostSheet) return null;

  const getSeatNumber = (characterId: string) => {
    const index = characters.findIndex((c) => c.id === characterId);
    return index >= 0 ? index + 1 : '-';
  };

  const handleCopy = () => {
    let text = '=== 剧本杀主持单 ===\n\n';
    text += `日期：${new Date().toLocaleDateString('zh-CN')}\n\n`;

    text += '【座位与角色分配】\n';
    assignments
      .sort((a, b) => {
        const idxA = characters.findIndex((c) => c.id === a.characterId);
        const idxB = characters.findIndex((c) => c.id === b.characterId);
        return idxA - idxB;
      })
      .forEach((assignment, index) => {
        const player = players.find((p) => p.id === assignment.playerId);
        const character = characters.find((c) => c.id === assignment.characterId);
        const result = results.find(
          (r) =>
            r.playerId === assignment.playerId &&
            r.characterId === assignment.characterId
        );
        if (player && character) {
          const levelLabel =
            result?.level === 'strong'
              ? '强推荐'
              : result?.level === 'acceptable'
              ? '可接受'
              : '需确认';
          text += `${index + 1}号座 - ${player.name} - ${character.name}（${levelLabel}）\n`;
        }
      });

    text += '\n【开场前需私聊确认】\n';
    if (hostSheet.confirmItems.length > 0) {
      hostSheet.confirmItems.forEach((item, i) => {
        text += `${i + 1}. ${item.playerName}（${item.characterName}）：${item.reason}\n`;
      });
    } else {
      text += '暂无需要特别确认的事项\n';
    }

    text += '\n【备选方案 & 注意事项】\n';
    if (hostSheet.backupPlans.length > 0) {
      hostSheet.backupPlans.forEach((plan, i) => {
        text += `${i + 1}. ${plan}\n`;
      });
    } else {
      text += '暂无\n';
    }

    if (hostSheet.notes) {
      text += `\n【备注】\n${hostSheet.notes}\n`;
    }

    text += '\n=== 祝开本顺利 ===';

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[700px] max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">📋 主持单</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="text-sm px-3 py-1.5 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              {copied ? '✓ 已复制' : '📋 复制文本'}
            </button>
            <button
              onClick={handlePrint}
              className="text-sm px-3 py-1.5 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              🖨️ 打印
            </button>
            <button
              onClick={onClose}
              className="text-sm px-3 py-1.5 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 print:p-0">
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
            <h1 className="text-2xl font-bold text-gray-900">剧本杀主持单</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>

          <section className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-indigo-600 rounded-full" />
              座位与角色分配
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center text-sm text-gray-500 mb-3">
                👆 主持人位
              </div>
              <div className="grid grid-cols-4 gap-3">
                {assignments
                  .sort((a, b) => {
                    const idxA = characters.findIndex((c) => c.id === a.characterId);
                    const idxB = characters.findIndex((c) => c.id === b.characterId);
                    return idxA - idxB;
                  })
                  .map((assignment) => {
                    const player = players.find((p) => p.id === assignment.playerId);
                    const character = characters.find(
                      (c) => c.id === assignment.characterId
                    );
                    const result = results.find(
                      (r) =>
                        r.playerId === assignment.playerId &&
                        r.characterId === assignment.characterId
                    );
                    if (!player || !character) return null;

                    const levelClass =
                      result?.level === 'strong'
                        ? 'border-strong bg-strong-light'
                        : result?.level === 'acceptable'
                        ? 'border-acceptable bg-acceptable-light'
                        : 'border-confirm bg-confirm-light';

                    return (
                      <div
                        key={assignment.characterId}
                        className={`p-3 rounded-lg border-2 ${levelClass}`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {getSeatNumber(character.id)}号座
                        </div>
                        <div className="font-medium text-gray-800 text-sm">
                          {character.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {player.name}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full" />
              开场前需私聊确认
            </h3>
            {hostSheet.confirmItems.length > 0 ? (
              <div className="space-y-2">
                {hostSheet.confirmItems.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="font-medium text-red-800 text-sm">
                      {item.playerName} → {item.characterName}
                    </div>
                    <div className="text-xs text-red-600 mt-1">{item.reason}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-lg">
                暂无需要特别确认的事项 🎉
              </div>
            )}
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-yellow-500 rounded-full" />
              备选方案 & 注意事项
            </h3>
            {hostSheet.backupPlans.length > 0 ? (
              <div className="space-y-2">
                {hostSheet.backupPlans.map((plan, i) => (
                  <div
                    key={i}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"
                  >
                    {plan}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-lg">
                暂无
              </div>
            )}
          </section>

          <div className="text-center text-gray-400 text-sm pt-4 border-t border-gray-200">
            祝开本顺利 🎭
          </div>
        </div>
      </div>
    </div>
  );
}
