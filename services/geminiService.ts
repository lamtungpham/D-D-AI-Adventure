
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Character, GameSettings, TurnData, InfographicData, HistoryItem, Item, Quest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = "gemini-2.5-flash";
const IMAGE_MODEL_ID = "gemini-2.5-flash-image";
const TTS_MODEL_ID = "gemini-2.5-flash-preview-tts";

// Helper to remove markdown code blocks and extract JSON object safely
const cleanJson = (text: string): string => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Attempt to extract JSON if it's wrapped in other text
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  
  return clean;
};

// Expanded schema to include Inventory and Quest updates
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The next segment of the story. Use vivid dialogue (`Character Name: 'Dialogue'`) and descriptive action. Write in Vietnamese.",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 3 distinct choices. One risk/combat, one investigation/social, one creative/stealth. Write in Vietnamese.",
    },
    hpAdjustment: {
      type: Type.INTEGER,
      description: "Change in HP (-damage, +heal).",
    },
    scoreAdjustment: {
      type: Type.INTEGER,
      description: "XP/Score gained from action.",
    },
    gameOverStatus: {
      type: Type.STRING,
      enum: ["NONE", "WIN", "LOSS"],
      description: "Game status.",
    },
    illustrationPrompt: {
      type: Type.STRING,
      description: "Detailed English prompt for image generation if a NEW scene/character appears. Null otherwise.",
      nullable: true
    },
    newItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['WEAPON', 'ARMOR', 'POTION', 'KEY_ITEM', 'TREASURE'] },
          icon: { type: Type.STRING, description: "Suggest an icon: Sword, Shield, Scroll, Key, Potion, Coin, Gem" }
        },
        required: ["id", "name", "description", "type"]
      },
      description: "List of items the player OBTAINED in this turn.",
      nullable: true
    },
    removedItemIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of item IDs the player LOST or USED.",
      nullable: true
    },
    questUpdate: {
      type: Type.OBJECT,
      properties: {
        mainObjective: { type: Type.STRING },
        currentTask: { type: Type.STRING }
      },
      description: "Update the quest log if the goal changes.",
      nullable: true
    }
  },
  required: ["narrative", "options", "hpAdjustment", "scoreAdjustment", "gameOverStatus"],
};

export const startGame = async (character: Character, settings: GameSettings): Promise<TurnData> => {
  const prompt = `
    Bạn là Dungeon Master tài ba (Octalysis Gamification Expert). Hãy dẫn dắt một cuộc phiêu lưu nhập vai (RPG) sâu sắc.
    
    Thông tin người chơi:
    - Tên: ${character.name}
    - Chủng tộc: ${character.race}
    - Lớp: ${character.class}
    - Tiền sử: ${character.background}
    
    Thế giới: ${settings.setting} (${settings.tone}).
    Chi tiết: ${settings.customPrompt || "Tự do sáng tạo"}
    
    YÊU CẦU KHỞI TẠO (QUAN TRỌNG):
    1. **Epic Meaning & Calling:** Thiết lập ngay một Sứ Mệnh (Main Quest) rõ ràng và cao cả (VD: Cứu thế giới, Tìm kho báu thất lạc, Giải mã bí ẩn cổ đại). Đừng để người chơi đi lang thang vô định.
    2. **Characters:** Giới thiệu ít nhất một NPC đồng hành hoặc người giao nhiệm vụ có tên và tính cách cụ thể. Sử dụng hội thoại: **Tên NPC:** "Lời thoại".
    3. **Start:** Mô tả cảnh mở đầu hấp dẫn.
    4. **Quest Log:** Trả về 'questUpdate' với mục tiêu chính và nhiệm vụ hiện tại.
    5. **Inventory:** Nếu nhân vật có vật phẩm khởi đầu (gia bảo, vũ khí cơ bản), hãy trả về trong 'newItems'.
    
    Hình ảnh: Cung cấp 'illustrationPrompt' tiếng Anh cho cảnh đầu tiên.
    Khởi đầu: HP 100, Điểm 0.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8, // Increased creativity
      },
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(cleanJson(response.text)) as TurnData;
  } catch (error) {
    console.error("Error starting game:", error);
    throw error;
  }
};

export const nextTurn = async (
  history: HistoryItem[],
  lastAction: string,
  currentHp: number,
  currentScore: number,
  inventory: Item[],
  currentQuest: Quest | null
): Promise<TurnData> => {
  const historyText = history.map(h => `${h.role === 'user' ? 'Người chơi' : 'DM'}: ${h.text}`).join('\n');
  const inventoryList = inventory.map(i => `${i.name} (${i.type})`).join(', ');

  const prompt = `
    Tiếp tục câu chuyện với vai trò Dungeon Master theo mô hình Octalysis.
    
    TRẠNG THÁI HIỆN TẠI:
    - HP: ${currentHp} | Điểm: ${currentScore}
    - Hành trang: ${inventoryList || "Rỗng"}
    - Nhiệm vụ hiện tại: ${currentQuest ? `${currentQuest.mainObjective} > ${currentQuest.currentTask}` : "Chưa rõ"}
    
    LỊCH SỬ GẦN NHẤT:
    ${historyText.slice(-4000)}
    
    HÀNH ĐỘNG CỦA NGƯỜI CHƠI: "${lastAction}"
    
    YÊU CẦU XỬ LÝ:
    1. **Phản hồi:** Xác định hành động thành công hay thất bại (có thể dựa trên logic hoặc tung xúc xắc ngầm).
    2. **Narrative (Cốt truyện):**
       - Thúc đẩy cốt truyện chính. Đừng để dậm chân tại chỗ.
       - Tạo ra các nút thắt (Plot Twists) hoặc thử thách (Combat, Puzzle, Negotiation).
       - NPC phản ứng sống động. Dùng định dạng: **Tên NPC:** "Lời thoại".
    3. **Ownership (Sở hữu):**
       - Nếu người chơi chiến thắng hoặc khám phá, hãy thưởng vật phẩm (ITEM) qua trường 'newItems'.
       - Vật phẩm phải có tên ngầu và công dụng (VD: Kiếm Rồng, Bình Máu, Chìa Khóa Cổ).
    4. **Scarcity & Loss:**
       - Nếu dùng vật phẩm, hãy đưa ID vào 'removedItemIds'.
       - Trừ máu nếu bị thương.
    5. **Quest:** Cập nhật 'questUpdate' nếu hoàn thành nhiệm vụ con hoặc chuyển sang giai đoạn mới.
    
    Đưa ra 3 lựa chọn tiếp theo (A, B, C) thật khác biệt (1 an toàn, 1 rủi ro cao/phần thưởng lớn, 1 sáng tạo).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.75,
      },
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(cleanJson(response.text)) as TurnData;
  } catch (error) {
    console.error("Error generating turn:", error);
    throw error;
  }
};

// --- AUDIO UTILS ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  try {
      const bufferCopy = data.buffer.slice(0);
      return await ctx.decodeAudioData(bufferCopy);
  } catch (e) {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }
      return buffer;
  }
}

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  try {
    const voiceName = 'Puck'; 
    const cleanText = text.replace(/[*_`]/g, '');

    const response = await ai.models.generateContent({
      model: TTS_MODEL_ID,
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioContext,
      24000,
      1,
    );

    return audioBuffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};

// --- INFOGRAPHIC GENERATION ---

export const generateInfographicData = async (
  history: HistoryItem[], 
  finalScore: number,
  isWin: boolean
): Promise<InfographicData> => {
  const historyText = history.map(h => `${h.role === 'user' ? 'Người chơi' : 'DM'}: ${h.text}`).join('\n');
  
  const prompt = `
    Phân tích toàn bộ lịch sử trò chơi D&D dưới đây và tạo dữ liệu tóm tắt cho một Infographic.

    Lịch sử trò chơi:
    ${historyText.slice(-8000)}

    Kết quả: ${isWin ? 'Chiến Thắng' : 'Thất Bại'}, Điểm: ${finalScore}.

    Yêu cầu Output JSON (Tiếng Việt):
    {
      "title": "Một cái tên thật ngầu và sử thi cho cuộc phiêu lưu này",
      "subTitle": "Một dòng mô tả ngắn (VD: Huyền thoại về chiến binh dũng cảm...)",
      "heroImagePrompt": "A highly detailed oil painting style cover art for a fantasy book. Depicting: [Mô tả chi tiết cảnh quan trọng nhất hoặc nhân vật chính trong game]. No text.",
      "stats": [
        { "icon": "Sword", "label": "Kẻ thù đã đối mặt", "value": "VD: 3" },
        { "icon": "Heart", "label": "Lần suýt chết", "value": "VD: 1" }
      ],
      "timeline": [
        { "turnIndex": 1, "title": "Khởi đầu", "description": "Tóm tắt sự kiện..." }
      ],
      "finalThought": "Lời bình luận của DM"
    }
    
    IMPORTANT: For 'stats.icon', ONLY use one of these EXACT values: "Sword", "Heart", "Zap", "Star", "Shield", "Ghost", "Scroll", "Map", "Sparkles", "Crown", "Skull".
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subTitle: { type: Type.STRING },
            heroImagePrompt: { type: Type.STRING },
            stats: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  icon: { type: Type.STRING },
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ["icon", "label", "value"]
              }
            },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  turnIndex: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["turnIndex", "title", "description"]
              }
            },
            finalThought: { type: Type.STRING }
          },
          required: ["title", "subTitle", "heroImagePrompt", "stats", "timeline", "finalThought"]
        }
      }
    });

    if (!response.text) throw new Error("No infographic data generated");
    // Clean and Parse JSON
    return JSON.parse(cleanJson(response.text)) as InfographicData;
  } catch (error) {
    console.error("Error generating infographic data:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_ID,
      contents: {
        parts: [{ text: "Fantasy RPG Art, Epic, Cinematic Lighting, High Resolution, Highly Detailed, Oil Painting Style: " + prompt }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    // Don't crash the game if image fails, just return null
    return null;
  }
};
