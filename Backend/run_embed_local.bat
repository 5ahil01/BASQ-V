@echo off
set "PYTHONPATH=D:\BASQ-V\Backend"
"d:\BASQ-V\Backend\venv\Scripts\python.exe" -u "d:\BASQ-V\Backend\scripts\embed_schema_local.py" > "d:\BASQ-V\Backend\embed_local_logs.txt" 2>&1
echo Done!
