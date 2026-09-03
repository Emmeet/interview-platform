import { NextResponse } from 'next/server';
import { lookupStudentInfo } from '@/lib/student-info';

/** GET /api/student-info/lookup?configId=&studentName=&studentId= */
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
