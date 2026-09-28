import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReaderProgress, createReaderBook, detectReaderFormat, paginateBookContent, sanitizeSpeechText } from '../src/services/readerService';

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
