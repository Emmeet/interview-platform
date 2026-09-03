import { NextResponse } from 'next/server';
import { deleteStudentInfoRow, updateStudentAssessment } from '@/lib/student-info';

/** PATCH /api/student-info/:id —— 看板更新判定字段 */
export async function PATCH(request, { params }) {
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  try {
    const record = await updateStudentAssessment(id, body);
    return NextResponse.json({ record });
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/student-info] 更新失败:', e);
    return NextResponse.json({ error: '更新失败：' + e.message }, { status: 500 });
  }
}

/** DELETE /api/student-info/:id */
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteStudentInfoRow(id);
    if (!ok) {
      return NextResponse.json({ error: '记录不存在或已被删除' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/student-info] 删除失败:', e);
    return NextResponse.json({ error: '删除失败：' + e.message }, { status: 500 });
  }
}
