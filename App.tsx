
import React, { useState } from 'react';
import { Character, GameSettings, GameState, INITIAL_HP } from './types';
import { startGame } from './services/geminiService';
import { SetupScreen } from './screens/SetupScreen';
import { GameScreen } from './screens/GameScreen';
import { EndScreen } from './screens/EndScreen';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    hp: INITIAL_HP,
    score: 0,
    level: 1,
    inventory: [],
    quest: null,
    history: [],
    currentTurn: null,
    status: 'SETUP',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleStartGame = async (character: Character, settings: GameSettings) => {
    setIsLoading(true);
    try {
      // Initialize with AI
      const turnData = await startGame(character, settings);
      
      setGameState({
        hp: INITIAL_HP,
        score: 0,
        level: 1,
        inventory: turnData.newItems || [],
        quest: turnData.questUpdate || null,
        history: [{ 
          role: 'model', 
          text: turnData.narrative,
          imagePrompt: turnData.illustrationPrompt || undefined
        }],
        currentTurn: turnData,
        status: 'PLAYING',
      });
    } catch (error) {
      console.error(error);
      alert("Không thể khởi tạo trò chơi. Vui lòng kiểm tra kết nối mạng hoặc API Key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setGameState({
      hp: INITIAL_HP,
      score: 0,
      level: 1,
      inventory: [],
      quest: null,
      history: [],
      currentTurn: null,
      status: 'SETUP',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-serif selection:bg-amber-500/30 selection:text-amber-100">
      {gameState.status === 'SETUP' && (
        <SetupScreen onStart={handleStartGame} isLoading={isLoading} />
      )}
      
      {gameState.status === 'PLAYING' && (
        <GameScreen gameState={gameState} setGameState={setGameState} />
      )}
      
      {gameState.status === 'FINISHED' && (
        <EndScreen gameState={gameState} onRestart={handleRestart} />
      )}
    </div>
  );
};

export default App;
