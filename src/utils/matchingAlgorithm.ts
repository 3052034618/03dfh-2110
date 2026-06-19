import type { Player, Character, MatchResult, MatchLevel, ConflictInfo, HostSheet, HostSheetItem } from '../types';

export function calculateMatch(player: Player, character: Character): MatchResult {
  const reasons: string[] = [];
  let score = 0;
  let hasHardConflict = false;

  if (player.tabooRoles.includes(character.name)) {
    reasons.push(`玩家"${player.name}"将"${character.name}"列为雷点角色`);
    hasHardConflict = true;
  }

  if (character.mustCrossdress) {
    if (!player.acceptCrossdress) {
      reasons.push(`角色"${character.name}"必须反串，但玩家"${player.name}"不接受反串`);
      hasHardConflict = true;
    } else {
      if (player.crossdressLevel === 'high') {
        score += 30;
        reasons.push(`玩家"${player.name}"反串接受度高，适合反串角色`);
      } else if (player.crossdressLevel === 'medium') {
        score += 15;
        reasons.push(`玩家"${player.name}"反串接受度中等`);
      } else if (player.crossdressLevel === 'low') {
        score += 5;
        reasons.push(`玩家"${player.name}"反串接受度较低，需确认`);
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
  if (hasHardConflict) {
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

  const unassignedPlayers = players.filter(
    (p) => !assignments.some((a) => a.playerId === p.id)
  );
  const unassignedChars = characters.filter(
    (c) => !assignments.some((a) => a.characterId === c.id)
  );

  if (unassignedPlayers.length > 0) {
    backupPlans.push(`未分配角色的玩家：${unassignedPlayers.map((p) => p.name).join('、')}`);
  }
  if (unassignedChars.length > 0) {
    backupPlans.push(`未分配玩家的角色：${unassignedChars.map((c) => c.name).join('、')}`);
  }

  const highlightPlayers = players.filter((p) => p.wantsHighlight);
  const highlightChars = characters.filter((c) => c.importance === 'highlight');
  if (highlightPlayers.length > highlightChars.length) {
    backupPlans.push(
      `有${highlightPlayers.length}位玩家想尝试高光位，但只有${highlightChars.length}个高光角色`
    );
  }

  return {
    confirmItems,
    backupPlans,
    notes: '',
  };
}
