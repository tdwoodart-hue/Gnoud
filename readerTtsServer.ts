export type ReaderOnlineTtsProvider = 'azure' | 'google';

export interface ReaderOnlineVoice {
  id: string;
  provider: ReaderOnlineTtsProvider;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  locale: 'vi-VN';
  quality: 'standard' | 'neural' | 'hd';
  available: boolean;
  note?: string;
}

const AZURE_VOICE_DEFS: Array<Omit<ReaderOnlineVoice, 'available'>> = [
  { id: 'vi-VN-HoaiMyNeural', provider: 'azure', name: 'Hoài My · nữ', gender: 'female', locale: 'vi-VN', quality: 'neural', note: 'Microsoft Azure Neural' },
  { id: 'vi-VN-NamMinhNeural', provider: 'azure', name: 'Nam Minh · nam', gender: 'male', locale: 'vi-VN', quality: 'neural', note: 'Microsoft Azure Neural' },
];

const GOOGLE_VOICE_DEFS: Array<Omit<ReaderOnlineVoice, 'available'>> = [
  { id: 'vi-VN-Neural2-A', provider: 'google', name: 'Neural 2A · nữ', gender: 'female', locale: 'vi-VN', quality: 'neural', note: 'Google Neural2' },
  { id: 'vi-VN-Neural2-D', provider: 'google', name: 'Neural 2D · nam', gender: 'male', locale: 'vi-VN', quality: 'neural', note: 'Google Neural2' },
  { id: 'vi-VN-Wavenet-A', provider: 'google', name: 'WaveNet A · nữ', gender: 'female', locale: 'vi-VN', quality: 'neural', note: 'Google WaveNet' },
  { id: 'vi-VN-Wavenet-B', provider: 'google', name: 'WaveNet B · nam', gender: 'male', locale: 'vi-VN', quality: 'neural', note: 'Google WaveNet' },
  { id: 'vi-VN-Wavenet-C', provider: 'google', name: 'WaveNet C · nữ', gender: 'female', locale: 'vi-VN', quality: 'neural', note: 'Google WaveNet' },
  { id: 'vi-VN-Wavenet-D', provider: 'google', name: 'WaveNet D · nam', gender: 'male', locale: 'vi-VN', quality: 'neural', note: 'Google WaveNet' },
  { id: 'vi-VN-Standard-A', provider: 'google', name: 'Standard A · nữ', gender: 'female', locale: 'vi-VN', quality: 'standard', note: 'Google Standard' },
  { id: 'vi-VN-Standard-B', provider: 'google', name: 'Standard B · nam', gender: 'male', locale: 'vi-VN', quality: 'standard', note: 'Google Standard' },
  { id: 'vi-VN-Standard-C', provider: 'google', name: 'Standard C · nữ', gender: 'female', locale: 'vi-VN', quality: 'standard', note: 'Google Standard' },
  { id: 'vi-VN-Standard-D', provider: 'google', name: 'Standard D · nam', gender: 'male', locale: 'vi-VN', quality: 'standard', note: 'Google Standard' },
  { id: 'vi-VN-Chirp3-HD-Achernar', provider: 'google', name: 'Achernar · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Achird', provider: 'google', name: 'Achird · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Algenib', provider: 'google', name: 'Algenib · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Aoede', provider: 'google', name: 'Aoede · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Callirrhoe', provider: 'google', name: 'Callirrhoe · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Charon', provider: 'google', name: 'Charon · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Despina', provider: 'google', name: 'Despina · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Enceladus', provider: 'google', name: 'Enceladus · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Erinome', provider: 'google', name: 'Erinome · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Fenrir', provider: 'google', name: 'Fenrir · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Gacrux', provider: 'google', name: 'Gacrux · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Iapetus', provider: 'google', name: 'Iapetus · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Kore', provider: 'google', name: 'Kore · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Leda', provider: 'google', name: 'Leda · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Orus', provider: 'google', name: 'Orus · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Puck', provider: 'google', name: 'Puck · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Sulafat', provider: 'google', name: 'Sulafat · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Umbriel', provider: 'google', name: 'Umbriel · nam', gender: 'male', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
  { id: 'vi-VN-Chirp3-HD-Zephyr', provider: 'google', name: 'Zephyr · nữ', gender: 'female', locale: 'vi-VN', quality: 'hd', note: 'Google Chirp 3 HD' },
];

function getGoogleTtsKey(): string | undefined {
  return process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY || undefined;
}

function getAzureConfig(): { key: string; region: string } | null {
  const key = process.env.AZURE_SPEECH_KEY || process.env.SPEECH_KEY || '';
  const region = process.env.AZURE_SPEECH_REGION || process.env.SPEECH_REGION || '';
  return key && region ? { key, region } : null;
}

export function getReaderOnlineVoices(): ReaderOnlineVoice[] {
  const azureReady = Boolean(getAzureConfig());
  const googleReady = Boolean(getGoogleTtsKey());
  return [
    ...AZURE_VOICE_DEFS.map((voice) => ({
      ...voice,
      available: azureReady,
      note: azureReady ? voice.note : `${voice.note} · cần AZURE_SPEECH_KEY + AZURE_SPEECH_REGION`,
    })),
    ...GOOGLE_VOICE_DEFS.map((voice) => ({
      ...voice,
      available: googleReady,
      note: googleReady ? voice.note : `${voice.note} · cần GOOGLE_TTS_API_KEY`,
    })),
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function synthesizeAzure(text: string, voice: string, rate: number, pitch: number): Promise<{ audio: Buffer; contentType: string }> {
  const config = getAzureConfig();
  if (!config) throw new Error('Azure Speech chưa được cấu hình.');
  const allowed = AZURE_VOICE_DEFS.some((item) => item.id === voice);
  const voiceId = allowed ? voice : AZURE_VOICE_DEFS[0].id;
  const rateOffset = Math.round((clamp(rate, 0.7, 1.4) - 1) * 100);
  const pitchOffset = Math.round((clamp(pitch, 0.8, 1.2) - 1) * 100);
  const ssml = `<speak version="1.0" xml:lang="vi-VN"><voice name="${voiceId}"><prosody rate="${rateOffset >= 0 ? '+' : ''}${rateOffset}%" pitch="${pitchOffset >= 0 ? '+' : ''}${pitchOffset}%">${escapeXml(text)}</prosody></voice></speak>`;
  const response = await fetch(`https://${encodeURIComponent(config.region)}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'GnoudReader',
    },
    body: ssml,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Azure Speech lỗi ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`);
  }
  return { audio: Buffer.from(await response.arrayBuffer()), contentType: 'audio/mpeg' };
}

async function synthesizeGoogle(text: string, voice: string, rate: number, pitch: number): Promise<{ audio: Buffer; contentType: string }> {
  const key = getGoogleTtsKey();
  if (!key) throw new Error('Google TTS chưa được cấu hình.');
  const allowed = GOOGLE_VOICE_DEFS.some((item) => item.id === voice);
  if (!allowed) throw new Error('Giọng Google không hợp lệ.');
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'vi-VN', name: voice },
      audioConfig: voice.includes('Chirp3-HD-')
        ? { audioEncoding: 'MP3' }
        : {
            audioEncoding: 'MP3',
            speakingRate: clamp(rate, 0.7, 1.4),
            pitch: clamp((pitch - 1) * 10, -10, 10),
          },
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Google TTS lỗi ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`);
  }
  const payload = await response.json() as { audioContent?: string };
  if (!payload.audioContent) throw new Error('Google TTS không trả về audio.');
  return { audio: Buffer.from(payload.audioContent, 'base64'), contentType: 'audio/mpeg' };
}

export async function synthesizeReaderTts(input: {
  text: string;
  provider?: ReaderOnlineTtsProvider;
  voice?: string;
  rate?: number;
  pitch?: number;
}): Promise<{ audio: Buffer; contentType: string }> {
  const text = String(input.text || '').trim().slice(0, 1400);
  if (!text) throw new Error('Không có nội dung để đọc.');
  const provider: ReaderOnlineTtsProvider = input.provider === 'google' ? 'google' : 'azure';
  const rate = Number.isFinite(input.rate) ? Number(input.rate) : 0.95;
  const pitch = Number.isFinite(input.pitch) ? Number(input.pitch) : 1;
  if (provider === 'google') return synthesizeGoogle(text, input.voice || 'vi-VN-Neural2-A', rate, pitch);
  return synthesizeAzure(text, input.voice || 'vi-VN-HoaiMyNeural', rate, pitch);
}
