
import React, { useState, useEffect, useRef } from 'react';
import { GameState, TurnData, INITIAL_HP, WIN_SCORE, Item } from '../types';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { Trophy, Send, Sparkles, Volume2, Mic, Pause, Settings2, Skull, Feather, ImageIcon, Backpack, Key, Shield, Sword, Scroll, Zap, Star } from 'lucide-react';
import { nextTurn, generateSpeech, generateImage } from '../services/geminiService';
import { playSound } from '../services/audioFxService';

interface GameScreenProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

type PlaybackSpeed = 0.8 | 1.0 | 1.2 | 1.5;

// Helper to calculate level from score
const calculateLevel = (score: number) => Math.floor(score / 100) + 1;

// Helper to map Item Types to Icons
const ItemIconMap: Record<string, React.FC<any>> = {
  WEAPON: Sword,
  ARMOR: Shield,
  POTION: Zap,
  KEY_ITEM: Key,
  TREASURE: Star,
  DEFAULT: Backpack
};

export const GameScreen: React.FC<GameScreenProps> = ({ gameState, setGameState }) => {
  const [customInput, setCustomInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  
  // Audio State
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
  
  // Image Generation State tracking
  const generatingImagesRef = useRef<Set<number>>(new Set());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCache = useRef<Map<string, AudioBuffer>>(new Map());

  // Auto scroll to bottom with smooth effect
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [gameState.history, isProcessing]);

  // Image Generation Effect
  useEffect(() => {
    const generateImagesIfNeeded = async () => {
      gameState.history.forEach(async (item, index) => {
        if (
          item.role === 'model' && 
          item.imagePrompt && 
          !item.imageUrl && 
          !generatingImagesRef.current.has(index)
        ) {
          generatingImagesRef.current.add(index);
          // Trigger generation without blocking UI
          try {
            const imageUrl = await generateImage(item.imagePrompt);
            if (imageUrl) {
              setGameState(prev => {
                const newHistory = [...prev.history];
                if (newHistory[index]) {
                   newHistory[index] = { ...newHistory[index], imageUrl };
                }
                return { ...prev, history: newHistory };
              });
              playSound('confirm'); // Magical chime when image appears
            }
          } catch (e) {
            console.error("Failed to generate in-game image", e);
          } finally {
            generatingImagesRef.current.delete(index);
          }
        }
      });
    };
    generateImagesIfNeeded();
  }, [gameState.history, setGameState]);

  // Play sound when new message arrives
  useEffect(() => {
    if (gameState.history.length > 0) {
      const lastMsg = gameState.history[gameState.history.length - 1];
      if (lastMsg.role === 'model') {
        playSound('paper');
      }
    }
  }, [gameState.history.length]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) { /* ignore */ }
      audioSourceRef.current = null;
    }
    setPlayingIndex(null);
    setIsPaused(false);
    setLoadingAudioIndex(null);
  };

  const handleAudioControl = async (index: number, text: string) => {
    playSound('click');
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (playingIndex === index) {
      if (isPaused) {
        await audioContextRef.current.resume();
        setIsPaused(false);
      } else {
        await audioContextRef.current.suspend();
        setIsPaused(true);
      }
      return;
    }

    stopAudio();
    setPlayingIndex(index);
    setLoadingAudioIndex(index);

    try {
      let audioBuffer = audioCache.current.get(text);

      if (!audioBuffer) {
        audioBuffer = await generateSpeech(text);
        if (audioBuffer) {
           audioCache.current.set(text, audioBuffer);
        }
      }

      if (audioBuffer && audioContextRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackSpeed;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
           if (audioSourceRef.current === source) {
             setPlayingIndex(null);
             setIsPaused(false);
           }
        };
        
        audioSourceRef.current = source;
        source.start();
        setLoadingAudioIndex(null);
      } else {
        setPlayingIndex(null);
        setLoadingAudioIndex(null);
      }
    } catch (error) {
      console.error("Playback error", error);
      stopAudio();
    }
  };

  useEffect(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.playbackRate.value = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleChoice = async (choiceText: string, isCustom: boolean = false) => {
    if (isProcessing) return;
    playSound('click');
    stopAudio();
    setIsProcessing(true);

    const userMove = isCustom ? choiceText : choiceText;
    const newHistory = [
      ...gameState.history,
      { role: 'user' as const, text: userMove }
    ];

    try {
      const turnData = await nextTurn(
        newHistory, 
        userMove, 
        gameState.hp, 
        gameState.score,
        gameState.inventory,
        gameState.quest
      );

      const newHp = Math.max(0, Math.min(100, gameState.hp + turnData.hpAdjustment));
      const newScore = Math.max(0, gameState.score + turnData.scoreAdjustment);
      const newLevel = calculateLevel(newScore);

      // Inventory Management
      let updatedInventory = [...gameState.inventory];
      if (turnData.newItems) {
        updatedInventory = [...updatedInventory, ...turnData.newItems];
      }
      if (turnData.removedItemIds) {
        updatedInventory = updatedInventory.filter(item => !turnData.removedItemIds?.includes(item.id));
      }

      // Notify if new items
      if (turnData.newItems && turnData.newItems.length > 0) {
        playSound('confirm');
      }

      setGameState(prev => ({
        ...prev,
        hp: newHp,
        score: newScore,
        level: newLevel,
        inventory: updatedInventory,
        quest: turnData.questUpdate || prev.quest,
        history: [
          ...newHistory,
          { 
            role: 'model' as const, 
            text: turnData.narrative,
            imagePrompt: turnData.illustrationPrompt || undefined 
          }
        ],
        currentTurn: turnData,
        status: turnData.gameOverStatus === 'NONE' 
          ? (newHp <= 0 ? 'FINISHED' : (newScore >= WIN_SCORE ? 'FINISHED' : 'PLAYING'))
          : 'FINISHED'
      }));

      if (newHp <= 0) {
         setGameState(prev => ({ ...prev, currentTurn: { ...turnData, gameOverStatus: 'LOSS' } }));
      } else if (newScore >= WIN_SCORE) {
         setGameState(prev => ({ ...prev, currentTurn: { ...turnData, gameOverStatus: 'WIN' } }));
      }

    } catch (error) {
      console.error("Failed to process turn", error);
    } finally {
      setIsProcessing(false);
      setCustomInput('');
    }
  };

  const currentOptions = gameState.currentTurn?.options || [];

  return (
    <div className="h-screen flex flex-col items-center justify-center p-0 md:p-2 overflow-hidden relative">
      
      {/* Main Container */}
      <div className="w-full max-w-7xl h-full flex flex-col bg-stone-900 border-x-4 border-stone-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
        
        {/* HUD Header */}
        <header className="bg-stone-900 border-b-4 border-stone-800 p-2 md:p-3 flex items-center justify-between z-20 shadow-xl relative shrink-0">
          
          {/* Left: HP & Inventory Toggle */}
          <div className="flex items-center gap-3 w-1/3 pl-1 md:pl-2">
            <div className="relative group cursor-pointer" onClick={() => setShowInventory(!showInventory)}>
              <div className="bg-stone-800 p-2 rounded-full border-2 border-stone-700 shadow-lg hover:border-amber-500 transition-colors">
                <Backpack className="w-5 h-5 text-amber-600" />
              </div>
              {/* Notification Dot */}
              {gameState.currentTurn?.newItems && gameState.currentTurn.newItems.length > 0 && !showInventory && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1">
               <Skull className={`w-5 h-5 md:w-6 md:h-6 ${gameState.hp < 30 ? 'text-red-600 animate-pulse' : 'text-stone-400'}`} />
               <div className="flex-1 max-w-[150px]">
                  <ProgressBar 
                    current={gameState.hp} 
                    max={INITIAL_HP} 
                    label="Sinh Lực" 
                    colorClass={gameState.hp < 30 ? "bg-red-900" : "bg-red-800"}
                  />
               </div>
            </div>
          </div>

          {/* Center: Title & Level */}
          <div className="flex flex-col items-center justify-center flex-1">
            <h1 className="text-xl md:text-3xl font-black cinzel text-amber-500 tracking-widest text-glow drop-shadow-[0_2px_2px_rgba(0,0,0,1)] text-center hidden md:block">
              CHRONICLES
            </h1>
            <div className="flex items-center gap-1 text-xs font-bold text-stone-500 uppercase tracking-widest bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
               <span>Cấp độ {gameState.level}</span>
            </div>
          </div>

          {/* Right: Score & Quest Info */}
          <div className="flex items-center gap-2 md:gap-4 justify-end w-1/3 pr-1 md:pr-2">
             <div className="flex flex-col items-end bg-stone-800/50 p-1 md:p-2 rounded border border-stone-700 w-full max-w-[180px]">
                <span className="text-[8px] md:text-[10px] uppercase font-bold text-amber-600 cinzel truncate w-full text-right">
                  {gameState.quest?.currentTask || "Đang chờ nhiệm vụ..."}
                </span>
                <span className="text-lg md:text-xl font-bold text-amber-400 cinzel flex items-center gap-1">
                   {gameState.score} <Trophy className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                </span>
             </div>
          </div>
        </header>

        {/* INVENTORY MODAL / DRAWER */}
        {showInventory && (
          <div className="absolute top-16 left-2 z-50 w-72 bg-stone-900 border-2 border-stone-600 shadow-2xl rounded-lg animate-fade-in origin-top-left">
            <div className="p-3 border-b border-stone-700 bg-stone-800 flex justify-between items-center">
              <h3 className="cinzel font-bold text-amber-500 flex items-center gap-2">
                <Backpack className="w-4 h-4" /> Hành Trang
              </h3>
              <span className="text-xs text-stone-400 font-mono">{gameState.inventory.length} món</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-2 parchment-scroll">
              {gameState.inventory.length === 0 ? (
                <div className="text-stone-500 italic text-center text-sm py-4">Túi đồ trống rỗng...</div>
              ) : (
                gameState.inventory.map((item) => {
                  const Icon = ItemIconMap[item.type] || ItemIconMap.DEFAULT;
                  return (
                    <div key={item.id} className="bg-stone-800/50 p-2 rounded border border-stone-700 flex gap-2 items-start hover:bg-stone-800 transition-colors">
                      <div className="bg-stone-900 p-1.5 rounded border border-stone-600 text-amber-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-200">{item.name}</div>
                        <div className="text-xs text-stone-500 leading-tight">{item.description}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Story Area */}
        <main 
          className="flex-1 overflow-y-auto parchment-texture parchment-scroll relative" 
          ref={scrollRef}
        >
          <div className="max-w-6xl mx-auto min-h-full p-4 md:p-8 pb-20">
            <div className="sticky top-0 left-0 w-full h-4 bg-gradient-to-b from-[#e8dcc6] to-transparent pointer-events-none z-10 opacity-80"></div>
            
            <div className="space-y-6 md:space-y-8">
              {/* Display Main Quest Update if available in the first turn or changed */}
              {gameState.history.length === 1 && gameState.quest && (
                <div className="flex justify-center animate-fade-in-up">
                  <div className="bg-stone-900/90 text-amber-500 border-y-2 border-amber-600 px-8 py-4 max-w-2xl text-center shadow-2xl relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-900 border border-amber-600 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-200">
                      Nhiệm vụ Chính
                    </div>
                    <h3 className="cinzel text-xl md:text-2xl font-black mb-1">{gameState.quest.mainObjective}</h3>
                    <p className="font-serif italic text-stone-400 text-sm">{gameState.quest.currentTask}</p>
                  </div>
                </div>
              )}

              {gameState.history.map((entry, idx) => (
                <div key={idx} className={`animate-fade-in-up flex w-full ${entry.role === 'user' ? 'justify-end' : 'justify-center'}`}>
                  
                  {entry.role === 'model' ? (
                    <div className="w-full relative group">
                       
                       {/* Control Bar */}
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 opacity-60">
                            <Feather className="w-4 h-4 text-amber-900" />
                            <span className="text-xs font-bold text-amber-900/60 cinzel uppercase tracking-wider">Dungeon Master</span>
                          </div>
                          
                          {/* Audio Controls */}
                          <div className="flex items-center gap-2">
                            {/* Speed Selector (Only visible on hover/active) */}
                            <select 
                              value={playbackSpeed}
                              onChange={(e) => setPlaybackSpeed(Number(e.target.value) as PlaybackSpeed)}
                              className="bg-[#e8dcc6] text-stone-700 text-[10px] font-bold border-none focus:ring-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <option value={1.0}>1.0x</option>
                              <option value={1.2}>1.2x</option>
                              <option value={1.5}>1.5x</option>
                            </select>

                            <button 
                              onClick={() => handleAudioControl(idx, entry.text)}
                              disabled={loadingAudioIndex === idx}
                              className="p-1.5 rounded-full text-stone-500 hover:text-amber-800 hover:bg-amber-900/10 transition-colors"
                            >
                             {loadingAudioIndex === idx ? (
                                <Settings2 className="w-5 h-5 animate-spin" />
                              ) : (
                                playingIndex === idx && !isPaused ? (
                                  <Pause className="w-5 h-5 fill-current" />
                                ) : (
                                  <Volume2 className="w-5 h-5" />
                                )
                              )}
                            </button>
                          </div>
                       </div>

                       {/* IMAGE DISPLAY */}
                       {entry.imagePrompt && (
                         <div className="mb-6 flex justify-center">
                            {entry.imageUrl ? (
                              <div className="relative group/image">
                                <img 
                                  src={entry.imageUrl} 
                                  alt="Scene Illustration" 
                                  className="rounded-sm border-4 border-double border-amber-800/60 shadow-[0_5px_15px_rgba(0,0,0,0.3)] max-w-full md:max-w-2xl max-h-[400px] object-cover sepia-[0.2] animate-fade-in transition-all duration-500 hover:sepia-0"
                                />
                                <div className="absolute inset-0 border-2 border-black/10 pointer-events-none"></div>
                              </div>
                            ) : (
                              <div className="w-full max-w-xl h-64 bg-stone-800/10 border-2 border-dashed border-stone-400/30 rounded flex flex-col items-center justify-center text-stone-500 animate-pulse">
                                 <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                 <span className="text-xs font-serif italic">Đang họa hình...</span>
                              </div>
                            )}
                         </div>
                       )}

                       {/* Text Content */}
                       <div className="bg-[#f0e6d2]/60 p-1 rounded-sm text-stone-950">
                          <div className="prose prose-stone prose-xl md:prose-2xl max-w-none font-merriweather leading-loose tracking-wide text-stone-900 drop-shadow-sm text-justify">
                             {/* Render HTML with specific styling for dialogue */}
                             <div 
                               dangerouslySetInnerHTML={{ 
                                 __html: entry.text
                                   .replace(/\n/g, '<br/>')
                                   .replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-900">$1</strong>') // Highlight bold text/names
                               }} 
                             />
                          </div>
                       </div>
                       
                       <div className="w-full h-px bg-stone-400/30 mt-6 mx-auto max-w-[50%]"></div>
                    </div>
                  ) : (
                    <div className="max-w-[90%] md:max-w-[70%] relative mt-2 mb-4">
                      <div className="bg-stone-800 text-stone-100 p-3 md:p-5 rounded-lg shadow-[2px_2px_5px_rgba(0,0,0,0.3)] border border-stone-600 transform hover:scale-[1.01] transition-transform">
                        <div className="text-sm md:text-base font-bold cinzel text-amber-400 italic mb-1 flex items-center gap-2 justify-end border-b border-stone-600 pb-1">
                          <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                          Hành động của bạn
                        </div>
                        <div className="font-serif text-base md:text-xl leading-relaxed text-right text-stone-200">
                          {entry.text}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-center py-8">
                   <div className="bg-[#f0e6d2]/60 px-6 py-3 rounded-full border border-stone-400/50 flex items-center gap-3 text-stone-700 font-serif italic shadow-sm">
                      <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce"></div>
                      <span className="font-semibold text-lg">Định mệnh đang xoay chuyển...</span>
                   </div>
                </div>
              )}
              <div className="h-12"></div>
            </div>
            
             <div className="sticky bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#e8dcc6] to-transparent pointer-events-none z-10"></div>
          </div>
        </main>

        {/* Footer Actions */}
        <footer className="bg-stone-900 p-2 md:p-4 border-t-4 border-stone-800 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] shrink-0">
           <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                 {/* Preset Choices */}
                 <div className="space-y-2 md:space-y-3">
                    {['A', 'B', 'C'].map((label, idx) => (
                      <button
                        key={label}
                        onClick={() => handleChoice(currentOptions[idx])}
                        onMouseEnter={() => playSound('hover')}
                        disabled={isProcessing}
                        className="w-full relative group text-left px-3 py-2 md:px-4 md:py-3 bg-stone-800 hover:bg-stone-750 border-2 border-stone-700 hover:border-amber-600 rounded-lg shadow-lg hover:shadow-amber-900/20 transition-all duration-200 active:translate-y-1"
                      >
                         <div className="flex gap-3 items-center md:items-start">
                            <span className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-stone-900 border border-stone-600 rounded font-bold cinzel text-amber-500 group-hover:text-amber-400 group-hover:border-amber-500 transition-colors text-sm md:text-base">
                              {label}
                            </span>
                            <span className="text-sm md:text-lg text-stone-300 group-hover:text-stone-100 font-serif leading-tight">
                              {currentOptions[idx] || "..."}
                            </span>
                         </div>
                      </button>
                    ))}
                 </div>

                 {/* Custom Input */}
                 <div className="flex flex-col h-full bg-stone-800 rounded-lg border-2 border-stone-700 p-1 focus-within:border-amber-600 focus-within:ring-1 focus-within:ring-amber-600 transition-all shadow-inner min-h-[120px]">
                    <div className="bg-stone-900/50 px-3 py-2 text-[10px] uppercase font-bold text-stone-500 border-b border-stone-700 flex justify-between rounded-t">
                       <span>[D] Tự do sáng tạo</span>
                       <span className="text-amber-700 flex items-center gap-1"><Mic className="w-3 h-3"/> Nhập vai</span>
                    </div>
                    <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && customInput.trim()) {
                            e.preventDefault();
                            handleChoice(customInput, true);
                          }
                        }}
                        placeholder="Bạn làm gì tiếp theo? (Ví dụ: Tôi rút kiếm và hét lớn...)"
                        disabled={isProcessing}
                        className="flex-1 w-full bg-transparent border-none resize-none p-3 text-stone-100 placeholder-stone-600 focus:ring-0 font-serif text-lg leading-relaxed"
                    />
                    <div className="flex justify-end p-2 border-t border-stone-700/50">
                      <Button 
                        onClick={() => handleChoice(customInput, true)}
                        disabled={!customInput.trim() || isProcessing}
                        className="py-1.5 px-5 text-sm bg-amber-800 hover:bg-amber-700 border-amber-950"
                      >
                        Hành động <Send className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                 </div>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
};
