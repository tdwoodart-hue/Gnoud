import assert from 'node:assert/strict';
import test from 'node:test';
import { getReaderTtsConfig } from '../readerTtsServer.ts';

const KEYS = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_TTS_API_KEY',
  'GOOGLE_API_KEY',
  'AZURE_SPEECH_KEY',
  'AZURE_SPEECH_REGION',
  'SPEECH_KEY',
  'SPEECH_REGION',
] as const;

test('TTS config ưu tiên Firebase service account cho Google Cloud', () => {
  const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  try {
    KEYS.forEach((key) => delete process.env[key]);
    process.env.GOOGLE_TTS_API_KEY = 'legacy-key';
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: 'demo-project',
      client_email: 'reader@demo-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });

    assert.deepEqual(getReaderTtsConfig().google, {
      configured: true,
      authMode: 'service-account',
    });

    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    assert.deepEqual(getReaderTtsConfig().google, {
      configured: true,
      authMode: 'api-key',
    });

    delete process.env.GOOGLE_TTS_API_KEY;
    assert.deepEqual(getReaderTtsConfig().google, {
      configured: false,
      authMode: 'none',
    });
  } finally {
    KEYS.forEach((key) => {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});

test('TTS config chỉ báo Azure sẵn sàng khi có đủ key và region', () => {
  const previousKey = process.env.AZURE_SPEECH_KEY;
  const previousRegion = process.env.AZURE_SPEECH_REGION;
  try {
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;
    assert.equal(getReaderTtsConfig().azure.configured, false);

    process.env.AZURE_SPEECH_KEY = 'key';
    assert.equal(getReaderTtsConfig().azure.configured, false);

    process.env.AZURE_SPEECH_REGION = 'southeastasia';
    assert.equal(getReaderTtsConfig().azure.configured, true);
  } finally {
    if (previousKey === undefined) delete process.env.AZURE_SPEECH_KEY;
    else process.env.AZURE_SPEECH_KEY = previousKey;
    if (previousRegion === undefined) delete process.env.AZURE_SPEECH_REGION;
    else process.env.AZURE_SPEECH_REGION = previousRegion;
  }
});
