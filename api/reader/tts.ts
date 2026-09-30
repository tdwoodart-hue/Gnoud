import { getReaderOnlineVoices, getReaderTtsConfig, synthesizeReaderTts } from '../../readerTtsServer';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      voices: getReaderOnlineVoices(),
      config: getReaderTtsConfig(),
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const result = await synthesizeReaderTts(req.body || {});
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'private, max-age=0');
    return res.status(200).send(result.audio);
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'TTS failed' });
  }
}
