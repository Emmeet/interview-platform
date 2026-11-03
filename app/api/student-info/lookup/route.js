import { NextResponse } from 'next/server';
import { lookupStudentInfo } from '@/lib/student-info';

/** GET /api/student-info/lookup?configId=&studentName=&studentId=
 * 返回 { found, record, nameMismatch, prefill, internship }。
 * prefill 仅带出同届实习基本信息，internship 仅用于显示原单位/岗位对照，不创建就业记录。
 */
export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  try {
    const result = await lookupStudentInfo({
      configId: sp.get('configId'),
      studentName: sp.get('studentName'),
      studentId: sp.get('studentId'),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[api/student-info/lookup] 查询失败:', e);
    return NextResponse.json({ error: '查询失败：' + e.message }, { status: 500 });
  }
}
