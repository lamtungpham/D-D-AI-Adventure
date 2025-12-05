
export interface Character {
  name: string;
  class: string;
  race: string;
  background: string;
}

export interface GameSettings {
  setting: string; // Fantasy, Sci-Fi, Horror, etc.
  tone: string; // Serious, Funny, Dark
  customPrompt?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'WEAPON' | 'ARMOR' | 'POTION' | 'KEY_ITEM' | 'TREASURE';
  icon?: string; // Icon name hint for UI
}

export interface Quest {
  mainObjective: string;
  currentTask: string;
}

export interface TurnData {
  narrative: string;
  options: string[]; // Always 3 generated options
  hpAdjustment: number;
  scoreAdjustment: number;
  gameOverStatus: 'NONE' | 'WIN' | 'LOSS';
  illustrationPrompt?: string; // Description for image generation if needed
  
  // New RPG Mechanics
  newItems?: Item[];
  removedItemIds?: string[];
  questUpdate?: Quest; // Updates the quest log
}

export interface HistoryItem {
  role: 'user' | 'model';
  text: string;
  imagePrompt?: string;
  imageUrl?: string;
}

export interface GameState {
  hp: number;
  score: number;
  level: number; // New: Player Level
  inventory: Item[]; // New: Inventory System
  quest: Quest | null; // New: Quest Log
  history: HistoryItem[];
  currentTurn: TurnData | null;
  status: 'SETUP' | 'PLAYING' | 'FINISHED';
}

export interface InfographicData {
  title: string;
  subTitle: string;
  heroImagePrompt: string;
  heroImageUrl?: string; // Filled after image generation
  stats: {
    icon: string; // Name of Lucide icon to map
    label: string;
    value: string;
  }[];
  timeline: {
    turnIndex: number;
    title: string;
    description: string;
  }[];
  finalThought: string;
}

export const INITIAL_HP = 100;
export const WIN_SCORE = 1000; // Increased score for longer gameplay
