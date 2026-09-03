import { NextResponse } from 'next/server';
import { listStudentInfo, upsertStudentInfo } from '@/lib/student-info';

/** GET /api/student-info —— 看板列表，可按 configId 过滤 */
export async function GET(request) {
  try {
    const configId = request.nextUrl.searchParams.get('configId');
    const records = await listStudentInfo(configId);
    return NextResponse.json({ records });
  } catch (e) {
    console.error('[api/student-info] 查询失败:', e);
    return NextResponse.json({ error: '数据库查询失败：' + e.message }, { status: 500 });
  }
}

/** POST /api/student-info —— 新建或按学号更新 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  try {
    const { record, created } = await upsertStudentInfo(body);
    return NextResponse.json({ record, created }, { status: created ? 201 : 200 });
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/student-info] 保存失败:', e);
    return NextResponse.json({ error: '保存失败：' + e.message }, { status: 500 });
  }
}
