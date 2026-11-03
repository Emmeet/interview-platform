import { NextResponse } from 'next/server';
import { describeImportError } from '@/lib/import-errors';
import { batchCreateRecords } from '@/lib/records';

/**
 * POST /api/records/batch —— Excel 批量导入面试记录
 * 成功：{ imported, skipped, issues }
 * 失败：{ error, imported, skipped, issues }；单次批量 INSERT 失败时 imported 为 0。
 * issues[].row 对应 item.sourceRow（Excel 物理行号，1-based），error 为可展示原因不含 SQL/堆栈/凭据。
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: '请求体必须是 JSON', imported: 0, skipped: 0, issues: [] },
      { status: 400 }
    );
  }

  try {
    const { imported, skipped, issues } = await batchCreateRecords(body && body.items);
    return NextResponse.json({ imported, skipped, issues });
  } catch (e) {
    console.error('[api/records/batch] 导入失败:', e);
    const issues = Array.isArray(e && e.importIssues) ? e.importIssues.slice() : [];
    issues.push({
      ...(Number.isInteger(e && e.sourceRow) && e.sourceRow > 0 ? { row: e.sourceRow } : {}),
      code: e.code || 'WRITE_FAILED',
      message: describeImportError(e),
    });
    return NextResponse.json(
      {
        error: describeImportError(e),
        imported: 0,
        skipped: Number.isFinite(e && e.importSkipped) ? e.importSkipped : 0,
        issues,
      },
      { status: 500 }
    );
  }
}
