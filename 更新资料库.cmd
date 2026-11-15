@echo off
chcp 65001 >nul
setlocal
pushd "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo 未找到 Python。请安装 Python 3 后再更新；已生成的 HTML 仍可直接打开。
  pause
  popd
  exit /b 1
)
python "资料库\生成资料库.py"
if errorlevel 1 (
  echo 更新未完成，原资料库文件已保留。请查看上方提示。
  pause
  popd
  exit /b 1
)
echo 更新完成。请刷新已打开的资料库页面。
pause
popd
endlocal
