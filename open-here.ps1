$env:Path =
  [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [Environment]::GetEnvironmentVariable('Path', 'User')
$root = $PSScriptRoot
Start-Process -FilePath 'cursor' -ArgumentList "`"$root`""
