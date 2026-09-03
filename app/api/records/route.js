import { NextResponse } from 'next/server';
import { createRecord, listRecords } from '@/lib/records';

/** GET /api/records —— 看板拉取全部面试记录 */
export async function GET() {
  try {
    const records = await listRecords();
    return NextResponse.json({ records });
  } catch (e) {
    console.error('[api/records] 查询失败:', e);
    return NextResponse.json({ error: '数据库查询失败：' + e.message }, { status: 500 });
  }
}

/** POST /api/records —— 面试登记表单提交 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  try {
    const record = await createRecord(body);
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/records] 新增失败:', e);
    return NextResponse.json({ error: '保存失败：' + e.message }, { status: 500 });
  }
}
