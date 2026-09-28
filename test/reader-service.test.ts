import assert from 'node:assert/strict';
import test from 'node:test';
import { createReaderBook, detectReaderFormat, paginateBookContent } from '../src/services/readerService';

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
  assert.equal(book.fontSize, 19);
  assert.equal(book.lineHeight, 1.8);
  assert.equal(book.fontFamily, 'book');
  assert.equal(book.contentWidth, 'medium');
  assert.equal(book.theme, 'paper');
});
