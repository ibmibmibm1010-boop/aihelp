$env:Path =
  [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [Environment]::GetEnvironmentVariable('Path', 'User')
Set-Location $PSScriptRoot
npm run dev
