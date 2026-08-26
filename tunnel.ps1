<#
    tunnel.ps1 - expose the local Flask backend over HTTPS.

    A phone running a release APK cannot reach http://localhost:5000, and
    Android blocks plain HTTP in release builds unless usesCleartextTraffic is
    set. An HTTPS tunnel sidesteps both, and works off Wi-Fi as well.

    Two modes:

      .\tunnel.ps1 -Domain your-name.ngrok-free.app
          ngrok against your reserved free domain. The URL never changes, so
          the APK keeps working across restarts. Needs an ngrok authtoken.

      .\tunnel.ps1
          cloudflared quick tunnel. No account, but the URL is regenerated
          every run, which means rebuilding the APK each time.

    Either way the URL is written into FinSight-Frontend/.env, and the script
    says whether that changed, because a changed URL means a rebuild.
#>
param([string]$Domain)

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $root 'FinSight-Frontend\.env'

function Find-Binary($name, $paths) {
    foreach ($p in $paths) { if (Test-Path $p) { return $p } }
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    # The npm ngrok shim shadows the real binary and cannot execute.
    if ($cmd -and $cmd.Source -notlike '*\npm\*') { return $cmd.Source }
    return $null
}

$ngrok = Find-Binary 'ngrok' @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
)
$cloudflared = Find-Binary 'cloudflared' @(
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
    "$env:ProgramFiles\cloudflared\cloudflared.exe"
)

# Is the backend actually up? A tunnel to nothing is a confusing failure.
try { Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/prices' -TimeoutSec 5 -UseBasicParsing | Out-Null }
catch {
    Write-Host "Backend is not responding on port 5000." -ForegroundColor Red
    Write-Host "Start it first:  cd FinSight-Backend; python main.py"
    exit 1
}

if ($Domain) {
    if (-not $ngrok) { Write-Host "ngrok not found." -ForegroundColor Red; exit 1 }
    if (-not (Test-Path "$env:LOCALAPPDATA\ngrok\ngrok.yml")) {
        Write-Host "ngrok has no authtoken yet. Run this once:" -ForegroundColor Yellow
        Write-Host "  `"$ngrok`" config add-authtoken <token from dashboard.ngrok.com>"
        exit 1
    }
    $url = "https://$Domain"
    $proc = Start-Process -FilePath $ngrok -ArgumentList @('http','5000',"--domain=$Domain") -PassThru -NoNewWindow
}
else {
    if (-not $cloudflared) { Write-Host "cloudflared not found." -ForegroundColor Red; exit 1 }
    Write-Host "No -Domain given, using a cloudflared quick tunnel." -ForegroundColor Yellow
    Write-Host "This URL changes every run. For a stable one see the header of this script.`n"

    $log = Join-Path $env:TEMP "finsight-tunnel-$PID.log"
    $proc = Start-Process -FilePath $cloudflared `
        -ArgumentList @('tunnel','--url','http://localhost:5000','--no-autoupdate') `
        -PassThru -NoNewWindow -RedirectStandardError $log -RedirectStandardOutput "$log.out"

    $url = $null
    foreach ($i in 1..40) {
        Start-Sleep -Milliseconds 750
        if (Test-Path $log) {
            $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue
            if ($m) { $url = $m.Matches[0].Value; break }
        }
    }
    if (-not $url) { Write-Host "Timed out waiting for a tunnel URL. See $log" -ForegroundColor Red; exit 1 }
}

# Keep .env in step, and be explicit about whether a rebuild is needed.
$lines   = Get-Content $envFile
$current = ($lines | Where-Object { $_ -match '^EXPO_PUBLIC_BACKEND_URL=' }) -replace '^EXPO_PUBLIC_BACKEND_URL=',''
if ($current -eq $url) {
    Write-Host "`n.env already points here. Your existing APK will work." -ForegroundColor Green
}
else {
    ($lines -replace '^EXPO_PUBLIC_BACKEND_URL=.*', "EXPO_PUBLIC_BACKEND_URL=$url") | Set-Content $envFile
    Write-Host "`n.env updated. Was: $current" -ForegroundColor Yellow
    Write-Host "REBUILD REQUIRED. EXPO_PUBLIC_* is baked in at build time:" -ForegroundColor Yellow
    Write-Host "  cd FinSight-Frontend; npx eas build -p android --profile preview"
}

Write-Host "`nTunnel live: $url" -ForegroundColor Green
Write-Host "Test it:     $url/api/prices"
Write-Host "Ctrl+C to stop.`n"

try   { Wait-Process -Id $proc.Id }
finally { if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } }
