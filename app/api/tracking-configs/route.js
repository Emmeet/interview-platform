import { NextResponse } from 'next/server';
import { listTrackingConfigs } from '@/lib/student-info';

/** GET /api/tracking-configs —— 默认只返回已启用(is_active=1)的跟踪项目；?all=1 含停用 */
export async function GET(request) {
  try {
    const all = request.nextUrl.searchParams.get('all') === '1';
    const configs = await listTrackingConfigs({ includeInactive: all });
    return NextResponse.json({ configs });
  } catch (e) {
    console.error('[api/tracking-configs] 查询失败:', e);
    return NextResponse.json({ error: '读取跟踪配置失败：' + e.message }, { status: 500 });
  }
}
