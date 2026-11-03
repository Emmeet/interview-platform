import { NextResponse } from 'next/server';
import { describeImportError } from '@/lib/import-errors';
import { batchCreateStudentInfo } from '@/lib/student-info';

/**
 * POST /api/student-info/batch —— Excel 批量导入学生信息。
 * 成功：{ imported, existing, skipped, issues }。existing 为学号已存在、保留原值未覆盖的条数。
 * 失败：{ error, imported, existing, skipped, issues }，imported 为已完成写入数量（逐条写入、失败即停）。
 * 错误文案经 describeImportError 映射，不回传 SQL、堆栈或连接凭据。
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: '请求体必须是 JSON', imported: 0, existing: 0, skipped: 0, issues: [] },
      { status: 400 }
    );
  }

  try {
    const { imported, existing, skipped, issues } = await batchCreateStudentInfo(body && body.items, body && body.configId);
    return NextResponse.json({ imported, existing, skipped, issues: Array.isArray(issues) ? issues : [] });
  } catch (e) {
    const imported = Number.isInteger(e.imported) ? e.imported : 0;
    const existing = Number.isInteger(e.existing) ? e.existing : 0;
    const skipped = Number.isInteger(e.skipped) ? e.skipped : 0;
    const issues = Array.isArray(e.issues) ? e.issues.slice() : [];
    if (e.name !== 'ValidationError') {
      const row = Number.isInteger(e.sourceRow) && e.sourceRow > 0 ? e.sourceRow : 0;
      issues.push({
        ...(row ? { row } : {}),
        code: e.code || 'WRITE_FAILED',
        message: describeImportError(e),
      });
      console.error('[api/student-info/batch] 导入失败:', e);
    }
    return NextResponse.json(
      {
        error: e.name === 'ValidationError' ? e.message : describeImportError(e),
        imported,
        existing,
        skipped,
        issues,
      },
      { status: e.name === 'ValidationError' ? 400 : 500 }
    );
  }
}
