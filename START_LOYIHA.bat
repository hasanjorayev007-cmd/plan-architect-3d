@echo off
echo Loyiha ishga tushirilmoqda...
cd /d C:\Users\user\.gemini\antigravity\scratch\plan-architect-3d
npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Xatolik: npm topilmadi yoki loyiha yurmadi. 
    echo Iltimos, Node.js o'rnatilganini tekshiring.
    pause
)
pause
