@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 22 ou superior para abrir o jogo.
  pause
  exit /b 1
)
echo Abra http://127.0.0.1:8080/ no navegador.
node tools\serve.cjs
if errorlevel 1 pause
