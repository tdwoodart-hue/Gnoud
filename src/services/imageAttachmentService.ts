const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const TARGET_DATA_URL_CHARS = 70_000;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Ảnh không hợp lệ.'));
    image.src = src;
  });

const drawCompressed = (
  image: HTMLImageElement,
  maxSide: number,
  quality: number,
): string => {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không thể xử lý ảnh.');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/webp', quality);
};

/**
 * Ảnh được nén nhỏ rồi lưu cùng task. Cách này giúp ảnh tự đồng bộ qua Firestore
 * trên PC/điện thoại mà không cần thêm Firebase Storage hoặc một backend upload riêng.
 */
export async function fileToCompactDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ hỗ trợ file ảnh.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Ảnh quá lớn. Hãy chọn ảnh dưới 15 MB.');

  const source = await readAsDataUrl(file);
  const image = await loadImage(source);
  const attempts: Array<[number, number]> = [
    [520, 0.72],
    [440, 0.66],
    [360, 0.60],
    [300, 0.54],
    [260, 0.48],
  ];

  let result = source;
  for (const [maxSide, quality] of attempts) {
    result = drawCompressed(image, maxSide, quality);
    if (result.length <= TARGET_DATA_URL_CHARS) return result;
  }
  return result;
}
