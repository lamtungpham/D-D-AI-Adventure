import React, { useState } from 'react';
import { GameState, InfographicData } from '../types';
import { Button } from '../components/Button';
import { Skull, Crown, RotateCcw, FileText, Loader2, Sword, Heart, Zap, Star, Map, Shield, Scroll, Ghost, Sparkles, Feather } from 'lucide-react';
import { generateInfographicData, generateImage } from '../services/geminiService';
import { playSound } from '../services/audioFxService';

interface EndScreenProps {
  gameState: GameState;
  onRestart: () => void;
}

type ViewState = 'RESULT' | 'GENERATING' | 'INFOGRAPHIC';

// Map string icon names from AI to Lucide components
const IconMap: Record<string, React.FC<any>> = {
  Sword, Heart, Zap, Star, Map, Shield, Scroll, Ghost, Sparkles, Crown, Skull
};

export const EndScreen: React.FC<EndScreenProps> = ({ gameState, onRestart }) => {
  const [viewState, setViewState] = useState<ViewState>('RESULT');
  const [infographic, setInfographic] = useState<InfographicData | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const isWin = gameState.status === 'FINISHED' && gameState.hp > 0 && gameState.currentTurn?.gameOverStatus === 'WIN';
  const isVictory = gameState.currentTurn?.gameOverStatus === 'WIN';
  
  // Get the final narrative message to display as the epilogue
  const lastNarrative = [...gameState.history].reverse().find(h => h.role === 'model')?.text || "Câu chuyện kết thúc trong sự im lặng...";

  const handleCreateInfographic = async () => {
    playSound('confirm');
    setViewState('GENERATING');
    
    try {
      // Step 1
      setLoadingStep('Đang triệu hồi ký ức (Phân tích dữ liệu)...');
      const data = await generateInfographicData(gameState.history, gameState.score, isVictory);
      
      // Step 2
      setLoadingStep('Đang họa lại khoảnh khắc huyền thoại (Vẽ tranh)...');
      let imageUrl = undefined;
      try {
        imageUrl = await generateImage(data.heroImagePrompt);
      } catch (imgError) {
        console.warn("Image gen failed, continuing with text only", imgError);
      }
      
      setInfographic({
        ...data,
        heroImageUrl: imageUrl || undefined
      });
      
      setViewState('INFOGRAPHIC');
      playSound('confirm');

    } catch (error) {
      console.error("Infographic generation failed", error);
      alert("Hệ thống ma thuật đang quá tải. Không thể tạo Infographic lúc này. Vui lòng thử lại sau.");
      setViewState('RESULT');
    }
  };

  if (viewState === 'GENERATING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 animate-fade-in text-center relative overflow-hidden">
         {/* Background Effect */}
         <div className="absolute inset-0 z-0">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-600/20 blur-[100px] rounded-full animate-pulse"></div>
         </div>

         <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-spin [animation-duration:3s]"></div>
                <Loader2 className="w-16 h-16 text-amber-500 animate-spin relative z-10" />
            </div>
            <h2 className="text-2xl font-bold cinzel text-amber-100 mb-2">{loadingStep}</h2>
            <p className="text-stone-500 font-serif italic max-w-md">Quá trình này có thể mất khoảng 10-15 giây để AI sáng tạo...</p>
         </div>
      </div>
    );
  }

  if (viewState === 'INFOGRAPHIC' && infographic) {
    return (
      <div className="min-h-screen p-0 md:p-8 bg-stone-950 animate-fade-in overflow-y-auto">
        <div className="max-w-3xl mx-auto parchment-texture shadow-[0_0_50px_rgba(0,0,0,0.8)] relative rounded-sm overflow-hidden min-h-[800px]">
           
           {/* Decorative Border */}
           <div className="absolute inset-0 border-[12px] border-double border-stone-800 pointer-events-none z-20"></div>

           {/* Hero Section */}
           <div className="relative h-[300px] md:h-[400px] w-full bg-stone-900">
              {infographic.heroImageUrl ? (
                <>
                  <img src={infographic.heroImageUrl} alt="Hero" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#e8dcc6] via-transparent to-black/60"></div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-stone-500 bg-stone-900">
                  <span className="cinzel text-2xl opacity-30">NO IMAGE FOUND</span>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-8 text-center pb-12 z-10">
                 <h1 className="text-3xl md:text-5xl font-black cinzel text-stone-900 drop-shadow-sm mb-2 leading-tight uppercase">
                   {infographic.title}
                 </h1>
                 <p className="text-stone-800 font-serif italic text-lg md:text-xl font-bold bg-[#e8dcc6]/80 inline-block px-4 py-1 rounded-sm shadow-sm">
                   {infographic.subTitle}
                 </p>
              </div>
           </div>

           {/* Content Body */}
           <div className="p-8 md:p-12 space-y-12">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                 {infographic.stats.map((stat, idx) => {
                   const Icon = IconMap[stat.icon] || Star;
                   return (
                     <div key={idx} className="bg-stone-800/10 border-2 border-stone-800/20 p-4 rounded text-center">
                        <div className="flex justify-center mb-2">
                           <div className="bg-stone-800 text-amber-500 p-2 rounded-full shadow-md">
                              <Icon className="w-6 h-6" />
                           </div>
                        </div>
                        <div className="text-xs uppercase font-bold text-stone-600 cinzel tracking-wider">{stat.label}</div>
                        <div className="text-xl md:text-2xl font-black text-stone-900 cinzel mt-1">{stat.value}</div>
                     </div>
                   );
                 })}
              </div>

              {/* Timeline */}
              <div className="relative pl-4 md:pl-8">
                 <h3 className="text-2xl font-bold cinzel text-stone-900 mb-8 border-b-2 border-stone-800/30 inline-block pb-2">
                   Dòng Thời Gian
                 </h3>
                 
                 {/* Vertical Line */}
                 <div className="absolute left-4 md:left-8 top-16 bottom-0 w-1 bg-stone-400"></div>

                 <div className="space-y-10">
                    {infographic.timeline.map((event, idx) => (
                      <div key={idx} className="relative pl-10 md:pl-12">
                         {/* Dot */}
                         <div className="absolute left-[calc(1rem-7px)] md:left-[calc(2rem-7px)] top-1 w-4 h-4 rounded-full bg-stone-800 border-2 border-[#e8dcc6] z-10 shadow-sm"></div>
                         
                         <div className="bg-white/40 p-4 rounded-lg border border-stone-800/10 shadow-sm hover:bg-white/60 transition-colors">
                            <span className="text-xs font-bold text-amber-800 cinzel">CHƯƠNG {event.turnIndex}</span>
                            <h4 className="text-lg font-bold text-stone-900 font-serif mt-1">{event.title}</h4>
                            <p className="text-stone-800 mt-2 leading-relaxed text-sm md:text-base">{event.description}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Final Thought */}
              <div className="bg-stone-800 text-stone-200 p-6 md:p-8 rounded-lg relative overflow-hidden text-center mt-8 border border-stone-600 shadow-xl">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600"></div>
                 <Ghost className="w-10 h-10 text-stone-500 mx-auto mb-4" />
                 <p className="font-serif italic text-lg leading-loose text-stone-300">
                   "{infographic.finalThought}"
                 </p>
                 <div className="mt-4 font-bold cinzel text-amber-500 text-sm tracking-widest uppercase">- Dungeon Master -</div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-center pt-8 border-t-2 border-stone-800/10">
                <Button onClick={onRestart} className="shadow-xl py-4 px-8 text-lg">
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Bắt Đầu Hành Trình Mới
                </Button>
              </div>

           </div>
        </div>
      </div>
    );
  }

  // RESULT VIEW
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 animate-fade-in relative">
      {/* Background Texture */}
      <div className="absolute inset-0 dungeon-bg opacity-50 z-0"></div>

      <div className="max-w-2xl w-full bg-slate-900 border-2 border-stone-700 rounded-xl p-1 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative z-10 overflow-hidden">
        
        {/* Inner Border */}
        <div className="border border-stone-800 rounded-lg p-6 md:p-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
            
            {/* Top Glow */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isVictory ? 'from-transparent via-amber-500 to-transparent' : 'from-transparent via-red-600 to-transparent'}`}></div>

            {/* Icon Header */}
            <div className="mb-6 flex justify-center">
            {isVictory ? (
                <div className="bg-amber-500/10 p-5 rounded-full border-2 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-pulse">
                <Crown className="w-20 h-20 text-amber-400 drop-shadow-md" />
                </div>
            ) : (
                <div className="bg-red-500/10 p-5 rounded-full border-2 border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                <Skull className="w-20 h-20 text-red-500 drop-shadow-md" />
                </div>
            )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-black cinzel mb-2 text-center text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-400">
            {isVictory ? 'CHIẾN THẮNG VINH QUANG' : 'CÁI CHẾT'}
            </h1>
            
            <p className={`text-center text-sm uppercase tracking-[0.3em] font-bold mb-8 ${isVictory ? 'text-amber-500' : 'text-red-800'}`}>
            {isVictory ? 'Huyền thoại được ghi danh' : 'Cuộc hành trình kết thúc'}
            </p>

            {/* EPILOGUE SCROLL AREA */}
            <div className="mb-8 relative group">
                <div className="absolute -inset-1 bg-gradient-to-b from-stone-800 to-stone-900 rounded-lg blur opacity-75"></div>
                <div className="relative bg-[#e8dcc6] text-stone-900 p-6 rounded-sm shadow-inner min-h-[150px] max-h-[250px] overflow-y-auto parchment-scroll border border-[#d6c4a0]">
                    <div className="sticky top-0 left-0 w-full flex justify-center mb-2 opacity-50">
                        <Feather className="w-4 h-4 text-stone-500" />
                    </div>
                    <div className="prose prose-stone max-w-none text-center font-merriweather italic leading-relaxed text-lg">
                        <span dangerouslySetInnerHTML={{ __html: lastNarrative }} />
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-stone-950/50 rounded p-3 border border-stone-800 text-center">
                    <span className="block text-[10px] uppercase text-stone-500 font-bold mb-1">Danh Vọng</span>
                    <span className="text-2xl font-bold text-amber-500 cinzel">{gameState.score}</span>
                </div>
                <div className="flex-1 bg-stone-950/50 rounded p-3 border border-stone-800 text-center">
                    <span className="block text-[10px] uppercase text-stone-500 font-bold mb-1">Số lượt đi</span>
                    <span className="text-2xl font-bold text-indigo-400 cinzel">{Math.ceil(gameState.history.length / 2)}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
            <Button 
                onClick={handleCreateInfographic} 
                className="w-full text-lg py-4 bg-gradient-to-r from-amber-900 to-amber-800 hover:from-amber-800 hover:to-amber-700 border-amber-950/50 shadow-lg group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30 mix-blend-overlay"></div>
                <div className="relative flex items-center justify-center">
                    <FileText className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    Tổng Kết Hành Trình (Infographic)
                </div>
            </Button>

            <Button 
                onClick={onRestart} 
                variant="ghost"
                className="w-full text-stone-500 hover:text-stone-300 hover:bg-stone-800/50"
            >
                <RotateCcw className="w-4 h-4 mr-2" />
                Chơi lại từ đầu
            </Button>
            </div>
        </div>
      </div>
    </div>
  );
};