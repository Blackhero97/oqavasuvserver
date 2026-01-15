Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "C:\bm-crm-server\start-server.bat", 0, False
Set WshShell = Nothing
