@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   长春师范大学就业运营工作台启动中...
echo.
echo   面试问题登记: http://localhost:3000
echo   面试问题看板: http://localhost:3000/dashboard
echo   2027届实习就业数据跟踪: http://localhost:3000/student-info
echo   信息看板(隐藏): http://localhost:3000/dd
echo.
echo   按 Ctrl+C 可停止服务
echo ========================================
echo.
pnpm dev
pause
