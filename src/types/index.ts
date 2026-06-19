export type Gender = 'male' | 'female' | 'other';

export type CrossdressLevel = 'none' | 'low' | 'medium' | 'high';

export type RoleImportance = 'light' | 'medium' | 'heavy' | 'highlight';

export type EmotionLine = 'love' | 'family' | 'friendship' | 'revenge' | 'career' | 'none';

export type MatchLevel = 'strong' | 'acceptable' | 'confirm';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  acceptCrossdress: boolean;
  crossdressLevel: CrossdressLevel;
  tabooRoles: string[];
  wantsHighlight: boolean;
  isNewbie: boolean;
  group?: string;
  notes?: string;
}

export interface Character {
  id: string;
  name: string;
  gender: Gender;
  importance: RoleImportance;
  emotionLine: EmotionLine;
  mustCrossdress: boolean;
  newbieFriendly: boolean;
  tabooEmotionLines?: EmotionLine[];
  description?: string;
}

export interface SeatAssignment {
  seatNumber: number;
  playerId: string | null;
  characterId: string | null;
}

export interface MatchResult {
  playerId: string;
  characterId: string;
  level: MatchLevel;
  reasons: string[];
}

export interface ConflictInfo {
  type: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface HostSheetItem {
  playerName: string;
  characterName: string;
  type: 'confirm' | 'backup';
  reason: string;
}

export interface HostSheet {
  confirmItems: HostSheetItem[];
  backupPlans: string[];
  notes: string;
}
