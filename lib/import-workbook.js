/**
 * Excel 保持二进制读取；CSV 支持 UTF-8（含无 BOM 文件）和带 BOM 的 UTF-16。
 * 不支持的 CSV 编码抛出 INVALID_CSV_ENCODING，供导入面板提示另存为 UTF-8。
 */
export function readImportWorkbook(XLSX, data, fileName) {
  if (!/\.csv$/i.test(fileName || '')) return XLSX.read(data);

  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';

  let text;
  try {
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    const error = new Error('CSV 编码无法识别，请将文件另存为 UTF-8 CSV 后重新导入');
    error.code = 'INVALID_CSV_ENCODING';
    throw error;
  }
  return XLSX.read(text, { type: 'string' });
}
