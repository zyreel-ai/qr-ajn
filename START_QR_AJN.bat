@echo off
cd /d "%~dp0"
npm.cmd run verify && npm.cmd start
