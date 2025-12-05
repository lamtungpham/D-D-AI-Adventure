
import React, { useState } from 'react';
import { Character, GameSettings } from '../types';
import { Button } from '../components/Button';
import { Sword, Scroll, User, Sparkles, Map, Globe, Wand2, Shield, Ghost } from 'lucide-react';
import { playSound } from '../services/audioFxService';

interface SetupScreenProps {
  onStart: (char: Character, settings: GameSettings) => void;
  isLoading: boolean;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder, suggestions }) => (
  <div className="mb-4 group">
    <label className="block text-sm font-bold text-amber-500 mb-1 uppercase tracking-wider cinzel group-focus-within:text-amber-300 transition-colors">
      {label}
    </label>
    <input 
      type="text" 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => playSound('hover')}
      className="w-full bg-slate-900/80 border border-slate-700 rounded-md p-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none transition-all shadow-inner"
      placeholder={placeholder}
    />
    {suggestions && (
      <div className="flex flex-wrap gap-2 mt-2">
        {suggestions.map((s: string) => (
          <button
            type="button"
            key={s}
            onClick={() => {
              playSound('click');
              onChange(s);
            }}
            onMouseEnter={() => playSound('hover')}
            className="text-xs bg-slate-800 hover:bg-amber-900/50 text-slate-400 hover:text-amber-200 border border-slate-700 hover:border-amber-700 px-2 py-1 rounded-full transition-all active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>
    )}
  </div>
);

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, isLoading }) => {
  const [character, setCharacter] = useState<Character>({
    name: '',
    race: 'Human',
    class: 'Warrior',
    background: 'Là một kẻ lữ hành đơn độc tìm kiếm ý nghĩa của sự sống.',
  });

  const [settings, setSettings] = useState<GameSettings>({
    setting: 'Fantasy',
    tone: 'Epic',
    customPrompt: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      playSound('confirm');
      onStart(character, settings);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 flex flex-col items-center justify-center animate-fade-in relative z-10">
      
      <div className="text-center mb-10 relative">
        <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full z-0"></div>
        <h1 className="relative z-10 text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] cinzel select-none">
          CHRONICLES
        </h1>
        <p className="relative z-10 text-slate-400 text-lg md:text-xl font-light tracking-[0.2em] uppercase mt-2 cinzel select-none">
          Kiến tạo huyền thoại của bạn
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-6xl grid lg:grid-cols-2 gap-8">
        
        {/* Character Column */}
        <div className="glass-panel p-6 md:p-8 rounded-xl border-t-4 border-t-amber-600 relative overflow-hidden bg-slate-900/80 backdrop-blur-sm shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <User className="w-32 h-32" />
          </div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-500/30">
              <Shield className="text-amber-500 w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 cinzel">Nhân Vật</h2>
          </div>
          
          <div className="space-y-6">
            <InputField 
              label="Tên Danh Xưng"
              value={character.name}
              onChange={(v: string) => setCharacter({...character, name: v})}
              placeholder="VD: Gandalf, Arthur, ..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label="Chủng Tộc"
                value={character.race}
                onChange={(v: string) => setCharacter({...character, race: v})}
                placeholder="VD: Human, Elf..."
                suggestions={['Human', 'Elf', 'Dwarf', 'Orc', 'Fairy', 'Dragonborn', 'Cyborg']}
              />
              <InputField 
                label="Lớp / Nghề Nghiệp"
                value={character.class}
                onChange={(v: string) => setCharacter({...character, class: v})}
                placeholder="VD: Warrior, Mage..."
                suggestions={['Warrior', 'Mage', 'Rogue', 'Paladin', 'Bard', 'Hacker', 'Detective']}
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold text-amber-500 mb-1 uppercase tracking-wider cinzel">Tiểu Sử & Quá Khứ</label>
              <textarea 
                rows={3}
                value={character.background}
                onChange={e => setCharacter({...character, background: e.target.value})}
                onFocus={() => playSound('hover')}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-md p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* World Column */}
        <div className="glass-panel p-6 md:p-8 rounded-xl border-t-4 border-t-indigo-500 relative overflow-hidden bg-slate-900/80 backdrop-blur-sm shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Globe className="w-32 h-32" />
          </div>

          <div className="flex items-center gap-3 mb-8">
             <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
              <Map className="text-indigo-400 w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 cinzel">Thế Giới</h2>
          </div>

          <div className="space-y-6">
            <InputField 
              label="Bối Cảnh / Kỷ Nguyên"
              value={settings.setting}
              onChange={(v: string) => setSettings({...settings, setting: v})}
              placeholder="VD: Fantasy, Cyberpunk 2077..."
              suggestions={['Fantasy', 'Sci-Fi', 'Horror', 'Modern', 'Post-Apocalyptic', 'Kếm Hiệp', 'Steampunk']}
            />

            <InputField 
              label="Tông Màu Câu Chuyện"
              value={settings.tone}
              onChange={(v: string) => setSettings({...settings, tone: v})}
              placeholder="VD: Hùng tráng, Hài hước..."
              suggestions={['Epic', 'Dark', 'Funny', 'Mystery', 'Romance', 'Survival']}
            />

            <div className="group">
              <label className="block text-sm font-bold text-amber-500 mb-1 uppercase tracking-wider cinzel">Chi Tiết Khởi Đầu (Tùy Chọn)</label>
              <textarea 
                rows={3}
                value={settings.customPrompt}
                onChange={e => setSettings({...settings, customPrompt: e.target.value})}
                onFocus={() => playSound('hover')}
                placeholder="Bạn tỉnh dậy ở đâu? Trong ngục tối ẩm ướt hay trên tàu vũ trụ đang cháy?..."
                className="w-full bg-slate-900/80 border border-slate-700 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </div>
      
        {/* Start Button */}
        <div className="lg:col-span-2 flex justify-center mt-4">
          <Button 
            type="submit" 
            isLoading={isLoading} 
            className="w-full md:w-1/2 text-xl py-4 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] border border-amber-500/50"
          >
            <Sparkles className="w-6 h-6 mr-2 animate-pulse" />
            BẮT ĐẦU CUỘC PHIÊU LƯU
          </Button>
        </div>
      </form>
    </div>
  );
};
