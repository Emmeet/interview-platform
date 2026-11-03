const FIELD_LABELS = {
  student_name: '姓名', student_id: '学号', department: '部门', company: '单位名称',
  position: '岗位', jd_text: '岗位招聘要求', questions: '面试问题', result: '面试结果',
  class_name: '班级', hometown: '籍贯', training_direction: '实训方向', gender: '性别',
  phone: '手机号', destination: '去向', intern_company: '实习单位名称',
  intern_location: '实习单位具体地点', intern_contact: '实习单位联系人',
  intern_contact_phone: '实习单位联系人电话', business_line: '具体业务线',
  intern_position: '实习岗位', intern_salary: '实习薪资', intern_start_date: '实习入职时间',
  intern_end_date: '实习结束时间', grad_school: '考研目标院校', grad_major: '目标专业', remark: '备注',
  employment_province: '就业单位省份', employment_city: '就业单位城市',
  same_intern_company: '与实习单位是否一致', same_intern_position: '与实习岗位是否一致',
  company_category: '企业分类',
};

const DATABASE_REASONS = {
  ECONNREFUSED: '数据库连接被拒绝，请检查数据库服务是否启动及服务端连接配置',
  ETIMEDOUT: '数据库连接超时，请检查服务端到数据库的网络连接',
  ENOTFOUND: '数据库地址无法解析，请检查服务端数据库地址配置',
  EHOSTUNREACH: '数据库网络不可达，请检查服务端网络连接',
  ECONNRESET: '数据库连接被中断，请检查数据库服务和网络状态',
  PROTOCOL_CONNECTION_LOST: '数据库连接已断开，请检查数据库服务状态',
  ER_ACCESS_DENIED_ERROR: '数据库身份验证失败，请检查服务端数据库账号和权限',
  ER_DBACCESS_DENIED_ERROR: '数据库账号没有目标数据库的访问权限',
  ER_BAD_DB_ERROR: '目标数据库不存在，请检查服务端数据库名称和初始化权限',
  ER_NO_SUCH_TABLE: '数据库缺少所需数据表，请检查表结构初始化结果',
  ER_DATA_TOO_LONG: '字段内容超出数据库允许长度，请缩短对应内容后重新导入',
  ER_BAD_FIELD_ERROR: '数据库字段不存在，请同步数据库表结构',
  ER_NO_DEFAULT_FOR_FIELD: '必填数据库字段没有值，请补齐对应字段',
  ER_BAD_NULL_ERROR: '必填数据库字段为空，请补齐对应字段',
  ER_TRUNCATED_WRONG_VALUE: '字段格式不符合数据库要求，请检查对应字段的内容',
  ER_WARN_DATA_OUT_OF_RANGE: '字段数值超出数据库允许范围',
  ER_DUP_ENTRY: '数据与数据库中的唯一键重复，请检查对应记录',
  ER_PARSE_ERROR: '数据库语句执行失败，请联系维护人员检查服务端日志',
};

/** 向导入页面返回可操作的原因和错误代码，不暴露 SQL、堆栈或连接凭据。 */
export function describeImportError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  const reason = DATABASE_REASONS[code];
  if (reason) {
    const match = String(error.sqlMessage || '').match(/(?:column|field) ['`]([^'`]+)['`]/i);
    const field = match ? `；对应字段：${FIELD_LABELS[match[1]] || match[1]}` : '';
    return `${reason}${field}（${code}）`;
  }
  if (code.startsWith('ER_') || code.startsWith('PROTOCOL_')) {
    return `数据库写入失败（${code}），请联系维护人员检查服务端日志`;
  }
  return error?.message || '未知错误，请检查文件内容或联系维护人员';
}
