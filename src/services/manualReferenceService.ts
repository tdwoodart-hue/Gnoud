export interface ManualReferenceLine {
  id: string;
  label: string;
  key: string;
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export function stripReferenceMarker(value: string): string {
  return normalizeWhitespace(
    value.replace(/^\s*(?:(?:\d+|[a-zA-Z])[.)-]|[-*•–—])\s*/u, ''),
  );
}

/**
 * Lấy phần "tên ổn định" của một bước để ảnh có thể dùng lại ở lần sau.
 * Ví dụ:
 * - "Leg press 3x10" -> "Leg press"
 * - "Dead bug 3x10 mỗi bên" -> "Dead bug"
 * - "Chest press machine hoặc dumbbell bench 3x10" -> "Chest press machine"
 *
 * Chỉ bỏ các thông tin lặp/khẩu lượng phổ biến; nội dung khác vẫn được giữ nguyên.
 */
export function referenceSubject(value: string): string {
  let subject = stripReferenceMarker(value);

  // Nếu một dòng ghi các phương án thay thế, lấy phương án đầu làm khóa ảnh mặc định.
  subject = subject.split(/\s+(?:hoặc|hoac|or)\s+/iu)[0]?.trim() || subject;

  // Bỏ phần sets x reps ở cuối, cùng các hậu tố "mỗi bên/mỗi chân".
  subject = subject
    .replace(
      /\s*[([{]?\s*\d+\s*(?:x|×)\s*\d+(?:\s*[-–]\s*\d+)?\s*[)\]}]?\s*(?:(?:mỗi|moi|each)\s+(?:bên|ben|chân|chan|side|leg))?\s*$/iu,
      '',
    )
    .replace(
      /\s+\d+\s*(?:sets?|hiệp|hiep)\s*(?:x|×)\s*\d+(?:\s*[-–]\s*\d+)?\s*(?:reps?|lần|lan)?\s*$/iu,
      '',
    )
    .replace(/\s+(?:(?:mỗi|moi|each)\s+(?:bên|ben|chân|chan|side|leg))\s*$/iu, '')
    .trim();

  return normalizeWhitespace(subject) || stripReferenceMarker(value);
}

export function canonicalReferenceKey(value: string): string {
  return referenceSubject(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function referenceLibraryId(value: string): string {
  const normalized = canonicalReferenceKey(value) || 'reference';
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ref-${(hash >>> 0).toString(36)}`;
}

export function parseManualReferenceList(value?: string): ManualReferenceLine[] {
  if (!value?.trim()) return [];

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const listLines = lines.filter((line) => /^(?:(?:\d+|[a-zA-Z])[.)-]|[-*•–—])\s+/u.test(line));

  // Chỉ biến thành card khi nội dung thực sự là một danh sách, tránh phá đoạn mô tả bình thường.
  if (listLines.length < 2 || listLines.length < Math.ceil(lines.length * 0.6)) return [];

  return listLines.map((line) => {
    const label = stripReferenceMarker(line);
    return {
      id: referenceLibraryId(label),
      label,
      key: canonicalReferenceKey(label),
    };
  });
}
