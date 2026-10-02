import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReaderProgress, createReaderBook, detectReaderFormat, paginateBookContent, pickLatestReaderPosition, restoreReaderPagePosition, sanitizeSpeechText } from '../src/services/readerService';

test('reader detects supported book formats', () => {
  assert.equal(detectReaderFormat('book.pdf'), 'pdf');
  assert.equal(detectReaderFormat('book.EPUB'), 'epub');
  assert.equal(detectReaderFormat('notes.md'), 'text');
  assert.equal(detectReaderFormat('notes.txt'), 'text');
  assert.equal(detectReaderFormat('archive.zip'), null);
});

test('reader pagination keeps paragraph content in order', () => {
  const content = 'Đoạn một ngắn.\n\nĐoạn hai dài hơn một chút.\n\nĐoạn ba.';
  const pages = paginateBookContent(content, 35);
  assert.ok(pages.length >= 2);
  assert.equal(pages.join('\n\n').replace(/\n\n+/g, '\n\n'), content);
});

test('new reader book starts at first chapter and page with compact defaults', () => {
  const book = createReaderBook({ title: '  Sách thử  ', author: ' Tác giả ', content: ' Nội dung ' });
  assert.equal(book.title, 'Sách thử');
  assert.equal(book.author, 'Tác giả');
  assert.equal(book.content, 'Nội dung');
  assert.equal(book.format, 'text');
  assert.equal(book.currentChapter, 0);
  assert.equal(book.currentPage, 0);
  assert.equal(book.scrollProgress, 0);
  assert.equal(book.overallProgress, 0);
  assert.equal(book.fontSize, 19);
  assert.equal(book.lineHeight, 1.8);
  assert.equal(book.fontFamily, 'book');
  assert.equal(book.contentWidth, 'medium');
  assert.equal(book.textAlign, 'justify');
  assert.equal(book.pageTransition, 'none');
  assert.equal(book.ttsRate, 0.95);
  assert.equal(book.ttsPitch, 1);
  assert.equal(book.ttsCleanText, true);
  assert.equal(book.ttsMode, 'device');
  assert.equal(book.ttsOnlineProvider, 'azure');
  assert.equal(book.ttsOnlineVoiceId, 'vi-VN-HoaiMyNeural');
  assert.equal(book.listeningProgress, 0);
  assert.equal(book.theme, 'paper');
});


test('reader progress is whole-book progress for EPUB', () => {
  assert.equal(calculateReaderProgress('epub', 0, 10, 0), 0);
  assert.equal(calculateReaderProgress('epub', 4, 10, 0.5), 0.45);
  assert.equal(calculateReaderProgress('epub', 9, 10, 1), 1);
  assert.equal(calculateReaderProgress('text', 0, undefined, 0.37), 0.37);
});


test('speech cleanup removes URLs, emails, domains and noisy reference markers', () => {
  const source = 'Đọc nội dung này. https://example.com/a?q=1 Liên hệ test@example.com. Xem www.thuvien.vn [12] ISBN: 978-604-00-0000-0. Tiếp tục câu cuối.';
  const cleaned = sanitizeSpeechText(source);
  assert.equal(cleaned.includes('https'), false);
  assert.equal(cleaned.includes('example.com'), false);
  assert.equal(cleaned.includes('test@'), false);
  assert.equal(cleaned.includes('www.'), false);
  assert.equal(cleaned.includes('[12]'), false);
  assert.match(cleaned, /Đọc nội dung này/);
  assert.match(cleaned, /Tiếp tục câu cuối/);
});


test('reader keeps the newest reading position even when other metadata is newer', () => {
  const local = createReaderBook({ title: 'Local', content: 'Nội dung' });
  const cloud = createReaderBook({ title: 'Cloud', content: 'Nội dung' });

  local.currentChapter = 3;
  local.currentPage = 11;
  local.pageScrollProgress = 0.42;
  local.scrollProgress = 0.61;
  local.overallProgress = 0.58;
  local.lastPositionAt = '2026-10-02T14:00:00.000Z';
  local.updatedAt = '2026-10-02T14:00:00.000Z';

  cloud.currentChapter = 0;
  cloud.currentPage = 0;
  cloud.pageScrollProgress = 0;
  cloud.scrollProgress = 0;
  cloud.overallProgress = 0;
  cloud.lastPositionAt = '2026-10-02T13:55:00.000Z';
  cloud.updatedAt = '2026-10-02T14:05:00.000Z';

  const position = pickLatestReaderPosition(local, cloud);
  assert.equal(position.currentChapter, 3);
  assert.equal(position.currentPage, 11);
  assert.equal(position.pageScrollProgress, 0.42);
  assert.equal(position.scrollProgress, 0.61);
  assert.equal(position.overallProgress, 0.58);
  assert.equal(position.lastPositionAt, local.lastPositionAt);
});


test('reader restores progress after reload even when page count changes', () => {
  const beforeReload = restoreReaderPagePosition('scroll', 12, 7, 0.4, (7 + 0.4) / 12);
  assert.equal(beforeReload.page, 8);
  assert.ok(Math.abs(beforeReload.withinPage - 0.4) < 0.0001);

  // Same reading progress, but viewport repaginates the chapter to 18 visual pages.
  const afterReload = restoreReaderPagePosition('scroll', 18, 7, 0.4, (7 + 0.4) / 12);
  assert.equal(afterReload.page, 12);
  assert.ok(afterReload.withinPage > 0);

  const paged = restoreReaderPagePosition('paged', 20, 7, 0, 7 / 11);
  assert.equal(paged.page, 13);
});

test('reader falls back to legacy saved page when ratio is absent', () => {
  assert.deepEqual(restoreReaderPagePosition('scroll', 20, 6, 0.25, 0), { page: 7, withinPage: 0.25 });
  assert.deepEqual(restoreReaderPagePosition('paged', 20, 6, 0.75, 0), { page: 7, withinPage: 0 });
});
