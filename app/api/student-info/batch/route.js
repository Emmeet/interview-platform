import { NextResponse } from 'next/server';
import { batchCreateStudentInfo } from '@/lib/student-info';

/** POST /api/student-info/batch —— Excel 批量导入 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  try {
    const { imported, skipped } = await batchCreateStudentInfo(body && body.items, body && body.configId);
    return NextResponse.json({ imported, skipped });
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/student-info/batch] 导入失败:', e);
    return NextResponse.json({ error: '导入失败：' + e.message }, { status: 500 });
  }
}
