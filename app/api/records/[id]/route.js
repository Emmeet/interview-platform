import { NextResponse } from 'next/server';
import { deleteRecord } from '@/lib/records';

/** DELETE /api/records/:id —— 看板删除面试记录 */
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteRecord(id);
    if (!ok) {
      return NextResponse.json({ error: '记录不存在或已被删除' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/records] 删除失败:', e);
    return NextResponse.json({ error: '删除失败：' + e.message }, { status: 500 });
  }
}
