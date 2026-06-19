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

    if (!player.acceptCrossdress) {
      reasons.push(`角色"${character.name}"必须反串，但玩家"${player.name}"不接受反串`);
      hasHardConflict = true;
    } else if (!isCrossdressNeeded) {
      reasons.push(`角色"${character.name}"必须反串，但玩家性别与角色性别相同，反串条件未满足`);
      hasConfirmIssue = true;
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
  suggestedPlayerName: string;
  suggestedPlayerLevel: MatchLevel;
  reasons: string[];
}

export function generateSwapSuggestions(
  players: Player[],
  characters: Character[],
  _assignments: { playerId: string; characterId: string }[],
  results: MatchResult[]
): SwapSuggestion[] {
  const suggestions: SwapSuggestion[] = [];

  const confirmResults = results.filter((r) => r.level === 'confirm');

  for (const confirmResult of confirmResults) {
    const currentPlayer = players.find((p) => p.id === confirmResult.playerId);
    const targetChar = characters.find((c) => c.id === confirmResult.characterId);
    if (!currentPlayer || !targetChar) continue;

    const candidates: { player: Player; match: MatchResult }[] = [];

    for (const player of players) {
      if (player.id === currentPlayer.id) continue;

      const match = calculateMatch(player, targetChar);
      if (match.level === 'strong' || match.level === 'acceptable') {
        candidates.push({ player, match });
      }
    }

    candidates.sort((a, b) => {
      const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
      return levelOrder[a.match.level] - levelOrder[b.match.level];
    });

    if (candidates.length > 0) {
      const topCandidate = candidates[0];
      suggestions.push({
        targetCharacterName: targetChar.name,
        targetPlayerName: currentPlayer.name,
        suggestedPlayerName: topCandidate.player.name,
        suggestedPlayerLevel: topCandidate.match.level,
        reasons: topCandidate.match.reasons.slice(0, 3),
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
    backupPlans.push('【可互换推荐】');
    swapSuggestions.forEach((s, i) => {
      const levelLabel = s.suggestedPlayerLevel === 'strong' ? '强推荐' : '可接受';
      backupPlans.push(
        `${i + 1}. "${s.targetCharacterName}"角色（当前：${s.targetPlayerName}）可考虑换为 ${s.suggestedPlayerName}（${levelLabel}）`
      );
      if (s.reasons.length > 0) {
        backupPlans.push(`   理由：${s.reasons.join('；')}`);
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
    unassignedPlayers.forEach((p) => {
      const suitableChars: { char: Character; match: MatchResult }[] = [];
      characters.forEach((c) => {
        const match = calculateMatch(p, c);
        if (match.level === 'strong' || match.level === 'acceptable') {
          suitableChars.push({ char: c, match });
        }
      });

      if (suitableChars.length > 0) {
        const top = suitableChars.sort((a, b) => {
          const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
          return levelOrder[a.match.level] - levelOrder[b.match.level];
        })[0];
        const levelLabel = top.match.level === 'strong' ? '强推荐' : '可接受';
        backupPlans.push(`• ${p.name}：可补位"${top.char.name}"（${levelLabel}）`);
      } else {
        backupPlans.push(`• ${p.name}：暂无特别合适的角色，建议安排边缘位或OB位`);
      }
    });
  }

  if (unassignedChars.length > 0) {
    backupPlans.push(`【空缺的角色（共${unassignedChars.length}个）】`);
    unassignedChars.forEach((c) => {
      const suitablePlayers: { player: Player; match: MatchResult }[] = [];
      players.forEach((p) => {
        const match = calculateMatch(p, c);
        if (match.level === 'strong' || match.level === 'acceptable') {
          suitablePlayers.push({ player: p, match });
        }
      });

      if (suitablePlayers.length > 0) {
        const top = suitablePlayers.sort((a, b) => {
          const levelOrder: Record<MatchLevel, number> = { strong: 0, acceptable: 1, confirm: 2 };
          return levelOrder[a.match.level] - levelOrder[b.match.level];
        })[0];
        const levelLabel = top.match.level === 'strong' ? '强推荐' : '可接受';
        backupPlans.push(`• ${c.name}：可由 ${top.player.name} 补位（${levelLabel}）`);
      } else {
        backupPlans.push(`• ${c.name}：暂无合适人选，建议NPC化或合并角色`);
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
