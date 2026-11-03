/**
 * MySQL 连接池与表结构初始化
 * 面试登记数据统一持久化到远端 MySQL（库名 dd），首次访问自动建库建表
 */
import mysql from 'mysql2/promise';

const DB_NAME = process.env.DB_NAME || 'dd';

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000,
};

let pool = null;
let initPromise = null;

async function ensureSchema() {
  // 1. 先用“无库”连接创建数据库（若不存在），保证换库名后开箱即用
  const conn = await mysql.createConnection({
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    password: poolConfig.password,
    connectTimeout: poolConfig.connectTimeout,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }

  // 2. 面试记录表：questions 存 JSON 数组字符串，created_at/updated_at 为审计字段
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      student_name VARCHAR(100) NOT NULL COMMENT '学生姓名',
      student_id VARCHAR(100) NOT NULL DEFAULT '' COMMENT '学号',
      department VARCHAR(200) NOT NULL DEFAULT '' COMMENT '部门',
      company VARCHAR(200) NOT NULL COMMENT '单位名称',
      position VARCHAR(200) NOT NULL DEFAULT '' COMMENT '岗位',
      jd_text MEDIUMTEXT COMMENT '岗位招聘要求(JD)',
      questions MEDIUMTEXT NOT NULL COMMENT '面试问题列表(JSON数组)',
      result VARCHAR(50) NOT NULL DEFAULT '' COMMENT '面试结果',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
      PRIMARY KEY (id),
      KEY idx_company (company),
      KEY idx_department (department),
      KEY idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面试登记记录'
  `);

  const [deptCols] = await pool.query("SHOW COLUMNS FROM interview_records LIKE 'department'");
  if (!deptCols.length) {
    await pool.query(
      "ALTER TABLE interview_records ADD COLUMN department VARCHAR(200) NOT NULL DEFAULT '' COMMENT '部门' AFTER student_id"
    );
  }
  const [deptKeys] = await pool.query("SHOW INDEX FROM interview_records WHERE Key_name = 'idx_department'");
  if (!deptKeys.length) {
    await pool.query('ALTER TABLE interview_records ADD KEY idx_department (department)');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracking_configs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(200) NOT NULL COMMENT '展示名称，如2027届实习数据跟踪',
      type VARCHAR(20) NOT NULL DEFAULT '实习' COMMENT '实习 或 就业',
      is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=启用并对外展示，0=隐藏不展示',
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_title (title)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实习就业跟踪项目配置'
  `);

  const [typeCols] = await pool.query("SHOW COLUMNS FROM tracking_configs LIKE 'type'");
  if (!typeCols.length) {
    await pool.query(
      "ALTER TABLE tracking_configs ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT '实习' COMMENT '实习 或 就业' AFTER title"
    );
  }
  await pool.query(
    "ALTER TABLE tracking_configs MODIFY COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=启用并对外展示，0=隐藏不展示'"
  );
  await pool.query(
    "UPDATE tracking_configs SET type = '实习' WHERE type IS NULL OR type = '' OR type NOT IN ('实习','就业')"
  );

  const [oldCfgs] = await pool.query(
    "SELECT id FROM tracking_configs WHERE title = '2027届实习就业数据跟踪'"
  );
  for (const row of oldCfgs) {
    await pool.query('DELETE FROM student_info WHERE config_id = ?', [row.id]);
    await pool.query('DELETE FROM tracking_configs WHERE id = ?', [row.id]);
  }

  const defaultConfigs = [
    ['2027届实习数据跟踪', '实习', 1, 1],
    ['2027届就业数据跟踪', '就业', 1, 2],
  ];
  for (const [title, type, isActive, sortOrder] of defaultConfigs) {
    const [exist] = await pool.query('SELECT id FROM tracking_configs WHERE title = ? LIMIT 1', [title]);
    if (!exist.length) {
      await pool.query(
        'INSERT INTO tracking_configs (title, type, is_active, sort_order) VALUES (?, ?, ?, ?)',
        [title, type, isActive, sortOrder]
      );
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_info (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      config_id BIGINT UNSIGNED NOT NULL COMMENT '跟踪配置ID',
      student_name VARCHAR(100) NOT NULL COMMENT '学生姓名',
      student_id VARCHAR(100) NOT NULL COMMENT '学号',
      class_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '班级',
      hometown VARCHAR(100) NOT NULL DEFAULT '' COMMENT '籍贯',
      training_direction VARCHAR(100) NOT NULL DEFAULT '' COMMENT '实训方向',
      gender VARCHAR(10) NOT NULL DEFAULT '' COMMENT '性别',
      phone VARCHAR(50) NOT NULL DEFAULT '' COMMENT '手机号',
      destination VARCHAR(50) NOT NULL DEFAULT '' COMMENT '毕业后去向',
      intern_company VARCHAR(200) NOT NULL DEFAULT '' COMMENT '实习单位名称',
      intern_location VARCHAR(500) NOT NULL DEFAULT '' COMMENT '实习单位地点',
      intern_contact VARCHAR(100) NOT NULL DEFAULT '' COMMENT '实习单位联系人',
      intern_contact_phone VARCHAR(50) NOT NULL DEFAULT '' COMMENT '联系人电话',
      business_line VARCHAR(200) NOT NULL DEFAULT '' COMMENT '具体业务线',
      intern_position VARCHAR(200) NOT NULL DEFAULT '' COMMENT '实习岗位',
      intern_salary VARCHAR(100) NOT NULL DEFAULT '' COMMENT '实习薪资',
      intern_start_date VARCHAR(50) NOT NULL DEFAULT '' COMMENT '入职时间',
      intern_end_date VARCHAR(50) NOT NULL DEFAULT '' COMMENT '实习结束时间',
      grad_school VARCHAR(200) NOT NULL DEFAULT '' COMMENT '考研目标院校',
      grad_major VARCHAR(200) NOT NULL DEFAULT '' COMMENT '目标专业',
      remark TEXT COMMENT '备注',
      job_category VARCHAR(50) NOT NULL DEFAULT '待判定' COMMENT '岗位分类',
      sop_status VARCHAR(20) NOT NULL DEFAULT '待判定' COMMENT '是否SOP岗位（按岗位分类自动派生）',
      star_status VARCHAR(20) NOT NULL DEFAULT '待判定' COMMENT '是否实习明星',
      quality_status VARCHAR(20) NOT NULL DEFAULT '待判定' COMMENT '是否优质企业',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_config_student (config_id, student_id),
      KEY idx_config_name (config_id, student_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实习就业跟踪学生信息'
  `);

  // 已有库的增量列：先建表语句不会改动既有表，缺列时补上
  await ensureColumn(
    'student_info',
    'quality_status',
    "quality_status VARCHAR(20) NOT NULL DEFAULT '待判定' COMMENT '是否优质企业' AFTER star_status"
  );
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  );
  if (rows.length) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
}

/**
 * 获取连接池（懒初始化，保证库表就绪）
 */
export async function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  if (!initPromise) {
    initPromise = ensureSchema().catch((e) => {
      initPromise = null; // 初始化失败允许下次请求重试
      throw e;
    });
  }
  await initPromise;
  return pool;
}
