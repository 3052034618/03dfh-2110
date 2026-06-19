import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Player, Character, MatchResult, MatchLevel, ConflictInfo } from '../types';
import { calculateMatch, checkConflicts } from '../utils/matchingAlgorithm';

interface SeatingResultPanelProps {
  players: Player[];
  characters: Character[];
  assignments: { playerId: string; characterId: string }[];
  results: MatchResult[];
  onAssignmentsChange: (
    assignments: { playerId: string; characterId: string }[],
    results: MatchResult[]
  ) => void;
  onGenerateHostSheet: () => void;
  onRegenerate: () => void;
}

const levelLabels: Record<MatchLevel, string> = {
  strong: '强推荐',
  acceptable: '可接受',
  confirm: '需确认',
};

const levelColors: Record<MatchLevel, string> = {
  strong: 'border-strong bg-strong-light text-strong-dark',
  acceptable: 'border-acceptable bg-acceptable-light text-acceptable-dark',
  confirm: 'border-confirm bg-confirm-light text-confirm-dark',
};

const levelBorderColors: Record<MatchLevel, string> = {
  strong: 'border-l-4 border-strong',
  acceptable: 'border-l-4 border-acceptable',
  confirm: 'border-l-4 border-confirm',
};

interface SeatCardProps {
  id: string;
  player: Player | null;
  character: Character | null;
  matchResult?: MatchResult;
  isDragging?: boolean;
}

function SeatCard({ player, character, matchResult, isDragging }: SeatCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: character?.id || '' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  };

  if (!player || !character) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 h-full min-h-[120px] flex items-center justify-center text-gray-400"
      >
        未分配
      </div>
    );
  }

  const level = matchResult?.level || 'confirm';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg shadow-sm border-2 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        levelBorderColors[level]
      } ${isDragging ? 'shadow-lg scale-105' : ''}`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-medium text-gray-800">{character.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              levelColors[level]
            }`}
          >
            {levelLabels[level]}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`w-2 h-2 rounded-full ${
              player.gender === 'male'
                ? 'bg-blue-500'
                : player.gender === 'female'
                ? 'bg-pink-500'
                : 'bg-purple-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">{player.name}</span>
          {player.isNewbie && (
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
              新人
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          <div className="line-clamp-2">
            {matchResult?.reasons.slice(0, 2).join('；')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SeatingResultPanel({
  players,
  characters,
  assignments,
  results,
  onAssignmentsChange,
  onGenerateHostSheet,
  onRegenerate,
}: SeatingResultPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
      distance: 5,
    },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const seatData = useMemo(() => {
    return characters.map((char) => {
      const assignment = assignments.find((a) => a.characterId === char.id);
      const player = assignment
        ? players.find((p) => p.id === assignment.playerId) || null
        : null;
      const result = results.find(
        (r) => r.playerId === assignment?.playerId && r.characterId === char.id
      );
      return {
        characterId: char.id,
        character: char,
        player,
        result,
      };
    });
  }, [characters, assignments, players, results]);

  const unassignedPlayers = useMemo(() => {
    return players.filter((p) => !assignments.some((a) => a.playerId === p.id));
  }, [players, assignments]);

  const unassignedCharacters = useMemo(() => {
    return characters.filter((c) => !assignments.some((a) => a.characterId === c.id));
  }, [characters, assignments]);

  const getBestFitForPlayer = (player: Player) => {
    let best: { char: Character; match: MatchResult } | null = null;
    const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
    for (const char of characters) {
      const match = calculateMatch(player, char);
      if (!best || levelOrder[match.level] < levelOrder[best.match.level]) {
        best = { char, match };
      }
    }
    return best;
  };

  const getBestFitForCharacter = (character: Character) => {
    let best: { player: Player; match: MatchResult } | null = null;
    const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
    for (const player of players) {
      const match = calculateMatch(player, character);
      if (!best || levelOrder[match.level] < levelOrder[best.match.level]) {
        best = { player, match };
      }
    }
    return best;
  };

  const activeSeat = useMemo(() => {
    if (!activeId) return null;
    return seatData.find((s) => s.characterId === activeId);
  }, [activeId, seatData]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
    setConflicts([]);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = characters.findIndex((c) => c.id === active.id);
    const newIndex = characters.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const char1 = characters[oldIndex];
    const char2 = characters[newIndex];

    const assign1 = assignments.find((a) => a.characterId === char1.id);
    const assign2 = assignments.find((a) => a.characterId === char2.id);

    const player1 = assign1 ? players.find((p) => p.id === assign1.playerId) : null;
    const player2 = assign2 ? players.find((p) => p.id === assign2.playerId) : null;

    let newConflicts: ConflictInfo[] = [];
    if (player1 && player2) {
      newConflicts = checkConflicts(player1, player2, char1, char2);
    }

    const newAssignments = assignments.map((a) => {
      if (a.characterId === char1.id && assign2) {
        return { ...a, playerId: assign2.playerId };
      }
      if (a.characterId === char2.id && assign1) {
        return { ...a, playerId: assign1.playerId };
      }
      return a;
    });

    const newResults = newAssignments
      .map((assignment) => {
        const player = players.find((p) => p.id === assignment.playerId);
        const character = characters.find((c) => c.id === assignment.characterId);
        if (player && character) {
          return calculateMatch(player, character);
        }
        return null;
      })
      .filter((r): r is MatchResult => r !== null);

    onAssignmentsChange(newAssignments, newResults);
    setConflicts(newConflicts);
  };

  const stats = useMemo(() => {
  const strong = results.filter((r) => r.level === 'strong').length;
  const acceptable = results.filter((r) => r.level === 'acceptable').length;
  const confirm = results.filter((r) => r.level === 'confirm').length;
  return { strong, acceptable, confirm };
}, [results]);

  const selectedSeatData = selectedSeat
    ? seatData.find((s) => s.characterId === selectedSeat)
    : null;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">排位结果</h2>
          <div className="flex gap-2">
            <button
              onClick={onRegenerate}
              disabled={players.length === 0 || characters.length === 0}
              className="text-sm px-3 py-1.5 text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 重新生成
            </button>
            <button
              onClick={onGenerateHostSheet}
              disabled={assignments.length === 0}
              className="text-sm px-3 py-1.5 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📋 生成主持单
            </button>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-strong" />
            <span className="text-gray-600">强推荐：{stats.strong}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-acceptable" />
            <span className="text-gray-600">可接受：{stats.acceptable}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-confirm" />
            <span className="text-gray-600">需确认：{stats.confirm}</span>
          </div>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm font-medium text-yellow-800 mb-1">⚠️ 冲突提示</div>
          <ul className="text-xs text-yellow-700 space-y-1">
            {conflicts.map((c, i) => (
              <li key={i}>• {c.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {assignments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🎭</div>
            <p>暂无排位结果</p>
            <p className="text-sm mt-1">
              请先添加玩家和角色，然后点击生成排位
            </p>
          </div>
        ) : (
          <div>
            <div className="text-center mb-4">
              <div className="inline-block px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                👆 主持人位
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={characters.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="grid grid-cols-4 gap-3">
                  {seatData.map((seat) => (
                    <div
                      key={seat.characterId}
                      onClick={() => setSelectedSeat(seat.characterId)}
                    >
                      <SeatCard
                        id={seat.characterId}
                        player={seat.player}
                        character={seat.character}
                        matchResult={seat.result}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId && activeSeat ? (
                  <div className="opacity-90 scale-105 shadow-xl">
                    <SeatCard
                      id={activeId}
                      player={activeSeat.player}
                      character={activeSeat.character}
                      matchResult={activeSeat.result}
                      isDragging
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            <div className="mt-4 text-center text-xs text-gray-400">
              💡 提示：拖动角色卡片可以互换玩家位置
            </div>

            {(unassignedPlayers.length > 0 || unassignedCharacters.length > 0) && (
              <div className="mt-6 space-y-4">
                {unassignedPlayers.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                      <span>👥</span>
                      <span>多出的玩家（共 {unassignedPlayers.length} 人）</span>
                    </div>
                    <div className="space-y-2">
                      {unassignedPlayers.map((p) => {
                        const bestFit = getBestFitForPlayer(p);
                        const levelLabel = bestFit
                          ? bestFit.match.level === 'strong'
                            ? '强推荐'
                            : bestFit.match.level === 'acceptable'
                            ? '可接受'
                            : '需确认'
                          : '';
                        const currentPlayer = bestFit
                          ? assignments.find((a) => a.characterId === bestFit.char.id)
                          : undefined;
                        const replacedPlayerName = currentPlayer
                          ? players.find((pp) => pp.id === currentPlayer.playerId)?.name
                          : undefined;
                        return (
                          <div
                            key={p.id}
                            className="p-3 bg-white rounded border border-blue-100 text-sm"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  p.gender === 'male'
                                    ? 'bg-blue-500'
                                    : p.gender === 'female'
                                    ? 'bg-pink-500'
                                    : 'bg-purple-500'
                                }`}
                              />
                              <span className="font-medium text-gray-800">{p.name}</span>
                              {p.isNewbie && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                  新人
                                </span>
                              )}
                            </div>
                            {bestFit ? (
                              replacedPlayerName ? (
                                <div className="text-xs text-blue-700">
                                  → 可临时替下 <strong>{replacedPlayerName}</strong> 去顶
                                  「{bestFit.char.name}」（{levelLabel}），
                                  {replacedPlayerName}可休息或做NPC
                                </div>
                              ) : (
                                <div className="text-xs text-blue-700">
                                  → 可直接补位「{bestFit.char.name}」（{levelLabel}）
                                </div>
                              )
                            ) : (
                              <div className="text-xs text-gray-500">
                                → 暂无适配的可替角色，建议OB或NPC
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-blue-600">
                      💡 也可考虑：加边缘角色、安排OB位、做场务NPC、等待轮换
                    </div>
                  </div>
                )}

                {unassignedCharacters.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm font-medium text-orange-800 mb-3 flex items-center gap-2">
                      <span>🎭</span>
                      <span>空缺的角色（共 {unassignedCharacters.length} 个）</span>
                    </div>
                    <div className="space-y-2">
                      {unassignedCharacters.map((c) => {
                        const bestFit = getBestFitForCharacter(c);
                        const levelLabel = bestFit
                          ? bestFit.match.level === 'strong'
                            ? '强推荐'
                            : bestFit.match.level === 'acceptable'
                            ? '可接受'
                            : '需确认'
                          : '';
                        const currentChar = bestFit
                          ? assignments.find((a) => a.playerId === bestFit.player.id)
                          : undefined;
                        const currentCharName = currentChar
                          ? characters.find((cc) => cc.id === currentChar.characterId)?.name
                          : undefined;
                        const isLight =
                          characters.find((cc) => cc.id === currentChar?.characterId)
                            ?.importance === 'light';
                        return (
                          <div
                            key={c.id}
                            className="p-3 bg-white rounded border border-orange-100 text-sm"
                          >
                            <div className="font-medium text-gray-800 mb-1">{c.name}</div>
                            {bestFit ? (
                              currentCharName ? (
                                <div className="text-xs text-orange-700">
                                  → 建议让 <strong>{bestFit.player.name}</strong> 双开
                                  （现任「{currentCharName}」，{levelLabel}）
                                  {isLight && (
                                    <span className="block mt-1 text-orange-600">
                                      备注：「{currentCharName}」戏份较轻，可临时NPC化让
                                      {bestFit.player.name}专心
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-orange-700">
                                  → 可由 <strong>{bestFit.player.name}</strong> 直接顶上（{levelLabel}）
                                </div>
                              )
                            ) : (
                              <div className="text-xs text-gray-500">
                                → 暂无合适人选，建议直接NPC化由主持人代跑
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-orange-600">
                      💡 也可考虑：由主持人NPC代跑、合并到其他角色、简化戏份
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedSeatData && selectedSeatData.result && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-800">
            {selectedSeatData.character?.name} ↔ {selectedSeatData.player?.name}
          </h3>
          <button
            onClick={() => setSelectedSeat(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          {selectedSeatData.result.reasons.map((reason, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
        {selectedSeatData.character?.description && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              角色描述：{selectedSeatData.character.description}
            </div>
          </div>
        )}
      </div>
    )}
    </div>
  );
}
