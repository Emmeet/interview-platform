import { NextResponse } from 'next/server';
import { batchCreateRecords } from '@/lib/records';

/** POST /api/records/batch —— Excel 批量导入面试记录 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  try {
    const { imported, skipped } = await batchCreateRecords(body && body.items);
    return NextResponse.json({ imported, skipped });
  } catch (e) {
    console.error('[api/records/batch] 导入失败:', e);
    return NextResponse.json({ error: '导入失败：' + e.message }, { status: 500 });
  }
}
