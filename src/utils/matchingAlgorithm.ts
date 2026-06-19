import type {
  Player,
  Character,
  MatchResult,
  MatchLevel,
  ConflictInfo,
  HostSheet,
  HostSheetItem,
  EmotionLine,
} from '../types';

const TABOO_KEYWORDS: Record<string, EmotionLine[]> = {
  '情感线': ['love', 'family', 'friendship'],
  '亲密线': ['love'],
  '爱情线': ['love'],
  '感情戏': ['love', 'family', 'friendship'],
  '情感': ['love', 'family', 'friendship'],
  '情侣': ['love'],
  'CP': ['love'],
  'cp': ['love'],
};

function checkTabooEmotion(player: Player, character: Character): string | null {
  for (const taboo of player.tabooRoles) {
    const tabooLower = taboo.toLowerCase().trim();
    
    for (const [keyword, emotionLines] of Object.entries(TABOO_KEYWORDS)) {
      if (tabooLower.includes(keyword.toLowerCase())) {
        if (emotionLines.includes(character.emotionLine)) {
          const emotionName: Record<EmotionLine, string> = {
            love: '爱情线',
            family: '亲情线',
            friendship: '友情线',
            revenge: '复仇线',
            career: '事业线',
            none: '无情感线',
          };
          return `玩家雷点包含"${taboo}"，角色有${emotionName[character.emotionLine]}，可能不适配`;
        }
      }
    }
  }
  return null;
}

export function calculateMatch(player: Player, character: Character): MatchResult {
  const reasons: string[] = [];
  let score = 0;
  let hasHardConflict = false;
  let hasConfirmIssue = false;

  if (player.tabooRoles.includes(character.name)) {
    reasons.push(`玩家"${player.name}"将"${character.name}"列为雷点角色`);
    hasHardConflict = true;
  }

  const tabooEmotion = checkTabooEmotion(player, character);
  if (tabooEmotion) {
    reasons.push(tabooEmotion);
    hasHardConflict = true;
  }

  if (character.mustCrossdress) {
    const isCrossdressNeeded = player.gender !== character.gender;

    if (!isCrossdressNeeded) {
      reasons.push(`角色"${character.name}"必须反串，但玩家性别与角色性别相同，反串条件未满足`);
      hasConfirmIssue = true;

      if (!player.acceptCrossdress) {
        reasons.push(`角色"${character.name}"必须反串，且玩家"${player.name}"明确不接受反串`);
        hasHardConflict = true;
      }
    } else {
      if (!player.acceptCrossdress) {
        reasons.push(`角色"${character.name}"必须反串，但玩家"${player.name}"不接受反串`);
        hasHardConflict = true;
      } else {
        if (player.crossdressLevel === 'high') {
          score += 40;
          reasons.push(`必须反串角色，性别不同且玩家反串接受度高，非常合适`);
        } else if (player.crossdressLevel === 'medium') {
          score += 25;
          reasons.push(`必须反串角色，性别不同且玩家反串接受度中等`);
        } else if (player.crossdressLevel === 'low') {
          score += 10;
          reasons.push(`必须反串角色，性别不同但玩家反串接受度较低，需确认`);
          hasConfirmIssue = true;
        }
      }
    }
  } else {
    if (player.gender === character.gender) {
      score += 25;
      reasons.push(`性别匹配：${player.gender === 'male' ? '男' : player.gender === 'female' ? '女' : '其他'}`);
    } else {
      if (player.acceptCrossdress) {
        if (player.crossdressLevel === 'high') {
          score += 15;
          reasons.push(`性别不同但玩家接受度高，可以反串`);
        } else if (player.crossdressLevel === 'medium') {
          score += 8;
          reasons.push(`性别不同，反串可接受`);
        } else {
          score += 2;
          reasons.push(`性别不同，反串接受度低，需确认`);
          hasConfirmIssue = true;
        }
      } else {
        reasons.push(`性别不匹配且玩家不接受反串`);
        hasHardConflict = true;
      }
    }
  }

  if (player.wantsHighlight) {
    if (character.importance === 'highlight') {
      score += 20;
      reasons.push(`玩家想尝试高光位，角色为高光角色`);
    } else if (character.importance === 'heavy') {
      score += 10;
      reasons.push(`玩家想尝试高光位，角色戏份较重`);
    }
  } else {
    if (character.importance === 'light' || character.importance === 'medium') {
      score += 10;
      reasons.push(`角色戏份适中，适合偏好低调的玩家`);
    }
  }

  if (player.isNewbie) {
    if (character.newbieFriendly) {
      score += 20;
      reasons.push(`新人友好角色，适合新手玩家`);
    } else {
      reasons.push(`角色对新人不友好，建议更换`);
      hasHardConflict = true;
    }
  }

  const importanceScoreMap: Record<string, number> = {
    light: 5,
    medium: 10,
    heavy: 15,
    highlight: 20,
  };
  score += importanceScoreMap[character.importance] || 0;

  let level: MatchLevel;
  if (hasHardConflict || hasConfirmIssue) {
    level = 'confirm';
  } else if (score >= 40) {
    level = 'strong';
  } else if (score >= 20) {
    level = 'acceptable';
  } else {
    level = 'confirm';
  }

  return {
    playerId: player.id,
    characterId: character.id,
    level,
    reasons,
  };
}

export function generateAssignments(
  players: Player[],
  characters: Character[]
): { assignments: { playerId: string; characterId: string }[]; results: MatchResult[] } {
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const shuffledCharacters = [...characters].sort(() => Math.random() - 0.5);

  const matchMatrix: MatchResult[][] = shuffledPlayers.map((player) =>
    shuffledCharacters.map((char) => calculateMatch(player, char))
  );

  const assignments: { playerId: string; characterId: string }[] = [];
  const usedPlayers = new Set<string>();
  const usedCharacters = new Set<string>();
  const results: MatchResult[] = [];

  const sortedMatches: { match: MatchResult; playerIdx: number; charIdx: number }[] = [];
  matchMatrix.forEach((playerMatches, pIdx) => {
    playerMatches.forEach((match, cIdx) => {
      sortedMatches.push({ match, playerIdx: pIdx, charIdx: cIdx });
    });
  });

  const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
  sortedMatches.sort((a, b) => {
    if (a.match.level !== b.match.level) {
      return levelOrder[a.match.level] - levelOrder[b.match.level];
    }
    return b.match.reasons.length - a.match.reasons.length;
  });

  for (const { match, playerIdx, charIdx } of sortedMatches) {
    const player = shuffledPlayers[playerIdx];
    const char = shuffledCharacters[charIdx];

    if (!usedPlayers.has(player.id) && !usedCharacters.has(char.id)) {
      assignments.push({ playerId: player.id, characterId: char.id });
      results.push(match);
      usedPlayers.add(player.id);
      usedCharacters.add(char.id);
    }

    if (usedPlayers.size === Math.min(players.length, characters.length)) {
      break;
    }
  }

  return { assignments, results };
}

export function checkConflicts(
  player1: Player,
  player2: Player,
  char1: Character | null,
  char2: Character | null
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  if (player1.group && player2.group && player1.group === player2.group) {
    if (char1 && char2 && char1.emotionLine === 'love' && char2.emotionLine === 'love') {
      conflicts.push({
        type: 'group',
        message: `同组/同寝的${player1.name}和${player2.name}被分配了情感线对手位，可能会尴尬`,
        severity: 'warning',
      });
    }
  }

  return conflicts;
}

interface SwapSuggestion {
  targetCharacterName: string;
  targetPlayerName: string;
  swapPlayerName: string;
  swapPlayerCurrentChar: string;
  targetAfterSwapLevel: MatchLevel;
  swapAfterSwapLevel: MatchLevel;
  targetReasons: string[];
  swapReasons: string[];
}

export function generateSwapSuggestions(
  players: Player[],
  characters: Character[],
  assignments: { playerId: string; characterId: string }[],
  results: MatchResult[]
): SwapSuggestion[] {
  const suggestions: SwapSuggestion[] = [];
  const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };

  const confirmResults = results.filter((r) => r.level === 'confirm');
  const processedPairs = new Set<string>();

  for (const confirmResult of confirmResults) {
    const targetPlayer = players.find((p) => p.id === confirmResult.playerId);
    const targetChar = characters.find((c) => c.id === confirmResult.characterId);
    if (!targetPlayer || !targetChar) continue;

    const candidates: {
      swapPlayer: Player;
      swapChar: Character;
      targetMatch: MatchResult;
      swapMatch: MatchResult;
      score: number;
    }[] = [];

    for (const assignment of assignments) {
      if (assignment.playerId === targetPlayer.id) continue;

      const pairKey = [targetPlayer.id, assignment.playerId].sort().join('-');
      if (processedPairs.has(pairKey)) continue;

      const swapPlayer = players.find((p) => p.id === assignment.playerId);
      const swapChar = characters.find((c) => c.id === assignment.characterId);
      if (!swapPlayer || !swapChar) continue;

      const targetAfterMatch = calculateMatch(swapPlayer, targetChar);
      const swapAfterMatch = calculateMatch(targetPlayer, swapChar);

      const isBetter =
        levelOrder[targetAfterMatch.level] < levelOrder[confirmResult.level];
      const swapNotWorse =
        levelOrder[swapAfterMatch.level] <=
        levelOrder[
          results.find(
            (r) =>
              r.playerId === assignment.playerId && r.characterId === assignment.characterId
          )?.level || 'confirm'
        ];

      if (
        (isBetter && swapNotWorse) ||
        (targetAfterMatch.level !== 'confirm' && swapAfterMatch.level !== 'confirm')
      ) {
        const score =
          levelOrder[targetAfterMatch.level] * 10 + levelOrder[swapAfterMatch.level];
        candidates.push({
          swapPlayer,
          swapChar,
          targetMatch: targetAfterMatch,
          swapMatch: swapAfterMatch,
          score,
        });
      }
    }

    candidates.sort((a, b) => a.score - b.score);

    if (candidates.length > 0) {
      const top = candidates[0];
      processedPairs.add([targetPlayer.id, top.swapPlayer.id].sort().join('-'));
      suggestions.push({
        targetCharacterName: targetChar.name,
        targetPlayerName: targetPlayer.name,
        swapPlayerName: top.swapPlayer.name,
        swapPlayerCurrentChar: top.swapChar.name,
        targetAfterSwapLevel: top.targetMatch.level,
        swapAfterSwapLevel: top.swapMatch.level,
        targetReasons: top.targetMatch.reasons.slice(0, 2),
        swapReasons: top.swapMatch.reasons.slice(0, 2),
      });
    }
  }

  return suggestions;
}

export function generateHostSheet(
  players: Player[],
  characters: Character[],
  assignments: { playerId: string; characterId: string }[],
  results: MatchResult[]
): HostSheet {
  const confirmItems: HostSheetItem[] = [];
  const backupPlans: string[] = [];

  results.forEach((result) => {
    if (result.level === 'confirm') {
      const player = players.find((p) => p.id === result.playerId);
      const char = characters.find((c) => c.id === result.characterId);
      if (player && char) {
        confirmItems.push({
          playerName: player.name,
          characterName: char.name,
          type: 'confirm',
          reason: result.reasons.join('；'),
        });
      }
    }
  });

  const swapSuggestions = generateSwapSuggestions(players, characters, assignments, results);
  if (swapSuggestions.length > 0) {
    backupPlans.push('【可互换推荐】（放心换，换完两边都能看）');
    const label = (l: MatchLevel) =>
      l === 'strong' ? '强推荐' : l === 'acceptable' ? '可接受' : '需确认';
    swapSuggestions.forEach((s, i) => {
      backupPlans.push(
        `${i + 1}. ${s.targetPlayerName}（${s.targetCharacterName}）↔ ${s.swapPlayerName}（${s.swapPlayerCurrentChar}）`
      );
      backupPlans.push(
        `   换后：${s.targetCharacterName}→${s.swapPlayerName}（${label(s.targetAfterSwapLevel)}）；${s.swapPlayerCurrentChar}→${s.targetPlayerName}（${label(s.swapAfterSwapLevel)}）`
      );
      if (s.targetReasons.length > 0) {
        backupPlans.push(`   ${s.swapPlayerName}拿${s.targetCharacterName}的理由：${s.targetReasons.join('；')}`);
      }
      if (s.swapReasons.length > 0) {
        backupPlans.push(`   ${s.targetPlayerName}拿${s.swapPlayerCurrentChar}的理由：${s.swapReasons.join('；')}`);
      }
    });
  }

  const unassignedPlayers = players.filter(
    (p) => !assignments.some((a) => a.playerId === p.id)
  );
  const unassignedChars = characters.filter(
    (c) => !assignments.some((a) => a.characterId === c.id)
  );

  if (unassignedPlayers.length > 0) {
    backupPlans.push(`【多出的玩家（共${unassignedPlayers.length}人）】`);
    const label = (l: MatchLevel) =>
      l === 'strong' ? '强推荐' : l === 'acceptable' ? '可接受' : '需确认';
    unassignedPlayers.forEach((p) => {
      const suitableChars: { char: Character; match: MatchResult; currentPlayer?: Player }[] = [];
      characters.forEach((c) => {
        const match = calculateMatch(p, c);
        if (match.level === 'strong' || match.level === 'acceptable') {
          const currentAssign = assignments.find((a) => a.characterId === c.id);
          const currentPlayer = currentAssign
            ? players.find((pp) => pp.id === currentAssign.playerId)
            : undefined;
          suitableChars.push({ char: c, match, currentPlayer });
        }
      });

      if (suitableChars.length > 0) {
        const top = suitableChars.sort((a, b) => {
          const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
          return levelOrder[a.match.level] - levelOrder[b.match.level];
        })[0];
        if (top.currentPlayer) {
          backupPlans.push(
            `• ${p.name}：建议临时替换 ${top.currentPlayer.name} 去顶"${top.char.name}"（${label(top.match.level)}），${top.currentPlayer.name}可先休息或做NPC`
          );
          backupPlans.push(`  理由：${top.match.reasons.slice(0, 2).join('；')}`);
        } else {
          backupPlans.push(`• ${p.name}：可直接补位"${top.char.name}"（${label(top.match.level)}）`);
          backupPlans.push(`  理由：${top.match.reasons.slice(0, 2).join('；')}`);
        }
      } else {
        backupPlans.push(
          `• ${p.name}：暂无适配的可替角色，建议安排OB位、做场务NPC或等待轮换`
        );
      }
    });
  }

  if (unassignedChars.length > 0) {
    backupPlans.push(`【空缺的角色（共${unassignedChars.length}个）】`);
    const label = (l: MatchLevel) =>
      l === 'strong' ? '强推荐' : l === 'acceptable' ? '可接受' : '需确认';
    unassignedChars.forEach((c) => {
      const suitableOnBoard: { player: Player; match: MatchResult; currentChar?: Character }[] = [];
      const suitableAll: { player: Player; match: MatchResult }[] = [];

      players.forEach((p) => {
        const match = calculateMatch(p, c);
        if (match.level === 'strong' || match.level === 'acceptable') {
          suitableAll.push({ player: p, match });
          const currentAssign = assignments.find((a) => a.playerId === p.id);
          if (currentAssign) {
            const currentChar = characters.find((cc) => cc.id === currentAssign.characterId);
            suitableOnBoard.push({ player: p, match, currentChar });
          }
        }
      });

      if (suitableOnBoard.length > 0) {
        const top = suitableOnBoard.sort((a, b) => {
          const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
          return levelOrder[a.match.level] - levelOrder[b.match.level];
        })[0];
        backupPlans.push(
          `• ${c.name}：建议让 ${top.player.name} 双开（现任"${top.currentChar?.name}"），评估${label(top.match.level)}`
        );
        backupPlans.push(`  理由：${top.match.reasons.slice(0, 2).join('；')}`);
        if (top.currentChar?.importance === 'light') {
          backupPlans.push(
            `  备注："${top.currentChar?.name}"戏份较轻，可考虑临时NPC化让${top.player.name}专心演${c.name}`
          );
        }
      } else if (suitableAll.length > 0) {
        const top = suitableAll.sort((a, b) => {
          const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
          return levelOrder[a.match.level] - levelOrder[b.match.level];
        })[0];
        backupPlans.push(
          `• ${c.name}：可由 ${top.player.name} 直接顶上（${label(top.match.level)}）`
        );
        backupPlans.push(`  理由：${top.match.reasons.slice(0, 2).join('；')}`);
      } else {
        backupPlans.push(`• ${c.name}：暂无合适人选，建议直接NPC化由主持人代跑，或合并到其他角色中`);
      }
    });
  }

  const highlightPlayers = players.filter((p) => p.wantsHighlight);
  const highlightChars = characters.filter((c) => c.importance === 'highlight');
  if (highlightPlayers.length > highlightChars.length) {
    backupPlans.push(
      `【高光位需求冲突】有${highlightPlayers.length}位玩家想尝试高光位，但只有${highlightChars.length}个高光角色`
    );
    const assignedHighlight = results.filter(
      (r) => r.level !== 'confirm' && characters.find((c) => c.id === r.characterId)?.importance === 'highlight'
    );
    const unassignedHighlightPlayers = highlightPlayers.filter(
      (p) => !assignedHighlight.some((r) => r.playerId === p.id)
    );
    if (unassignedHighlightPlayers.length > 0) {
      backupPlans.push(
        `没拿到高光位的玩家：${unassignedHighlightPlayers.map((p) => p.name).join('、')}，可分配戏份较重的角色作为补偿`
      );
    }
  }

  if (confirmItems.length > 0) {
    backupPlans.push(`【温馨提示】共${confirmItems.length}项需确认事项，请开场前逐一私聊玩家`);
  }

  return {
    confirmItems,
    backupPlans,
    notes: '',
  };
}
