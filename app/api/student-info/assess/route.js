import { NextResponse } from 'next/server';
import { assessStudentInfoBatch } from '@/lib/student-info';

/**
 * POST /api/student-info/assess —— 按规则批量判定。
 * body: { configId, overwrite }。overwrite 省略或 false 时只补写仍为「待判定」的字段。
 * 成功：{ assessed, kept, total }。
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  try {
    const result = await assessStudentInfoBatch(body && body.configId, {
      overwrite: Boolean(body && body.overwrite),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/student-info/assess] 判定失败:', e);
    return NextResponse.json({ error: '判定失败：' + e.message }, { status: 500 });
  }
}
