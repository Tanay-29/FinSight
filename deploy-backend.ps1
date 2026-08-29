<#
    deploy-backend.ps1 - push FinSight-Backend to the repository Render builds.

    The backend lives in two places. This repository is where it is written, and
    github.com/BalajiReddy1/finsight-backend is what Render deploys, because
    Render cannot be pointed at a repository you do not administer. That second
    repository is a deployment artefact: never edit it by hand, or the next run
    of this script will overwrite whatever you did.

    The two drifted four months apart once already, and Render spent that time
    serving an April snapshot with hardcoded market prices in it while everyone
    assumed the deployed code was current. Two guards exist because of that.

    First, it copies only files git already tracks, so a stray .env or a local
    brokerage.db cannot reach a public repository even by accident.

    Second, it refuses to run with uncommitted changes under FinSight-Backend,
    so what Render serves is always a commit that exists here and can be found
    again. Use -Force only when you know why you are bypassing that.

    Usage:
      .\deploy-backend.ps1
      .\deploy-backend.ps1 -Force     # deploy a dirty tree anyway
#>
param([switch]$Force)

$ErrorActionPreference = 'Stop'

$root      = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend   = 'FinSight-Backend'
$deployUrl = 'https://github.com/BalajiReddy1/finsight-backend.git'

Push-Location $root
try {
    # ── Guard: the source must be committed ──────────────────────────────
    $dirty = git status --porcelain -- $backend
    if ($dirty -and -not $Force) {
        Write-Host "FinSight-Backend has uncommitted changes:" -ForegroundColor Red
        $dirty | ForEach-Object { Write-Host "  $_" }
        Write-Host ""
        Write-Host "Commit them first, so the deployed code matches a revision that exists here."
        Write-Host "To deploy anyway: .\deploy-backend.ps1 -Force" -ForegroundColor Yellow
        exit 1
    }

    $sourceSha = (git rev-parse --short HEAD).Trim()
    $subject   = (git log -1 --pretty=format:%s).Trim()

    # ── Only tracked files, so .env and *.db can never travel ────────────
    $tracked = git ls-files $backend
    if (-not $tracked) { Write-Host "No tracked files under $backend." -ForegroundColor Red; exit 1 }

    $work = Join-Path ([System.IO.Path]::GetTempPath()) "finsight-deploy-$PID"
    Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Cloning the deploy repository..."
    git clone -q $deployUrl $work
    if ($LASTEXITCODE -ne 0) { Write-Host "Clone failed." -ForegroundColor Red; exit 1 }

    # Clear everything except .git, then lay the tracked files down flat. The
    # backend sits at the root over there, not under FinSight-Backend.
    Get-ChildItem $work -Force |
        Where-Object { $_.Name -ne '.git' } |
        ForEach-Object { Remove-Item $_.FullName -Recurse -Force }

    foreach ($f in $tracked) {
        $rel  = $f.Substring($backend.Length + 1)
        $dest = Join-Path $work $rel
        $dir  = Split-Path -Parent $dest
        if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
        Copy-Item (Join-Path $root $f) $dest -Force
    }

    Push-Location $work
    try {
        git add -A
        if (-not (git status --porcelain)) {
            Write-Host "`nDeploy repository already matches $sourceSha. Nothing to push." -ForegroundColor Green
            exit 0
        }

        Write-Host "`nChanges to deploy:" -ForegroundColor Cyan
        git status --porcelain | ForEach-Object { Write-Host "  $_" }

        $message = "Deploy $sourceSha`n`n$subject`n`nMirrored from FinSight-Backend in the FinSight repository.`nEdit there, not here: this repository is overwritten on every deploy."
        git commit -q -m $message
        git push -q origin main
        if ($LASTEXITCODE -ne 0) { Write-Host "Push failed." -ForegroundColor Red; exit 1 }

        Write-Host "`nPushed. Render will redeploy from $sourceSha." -ForegroundColor Green
        Write-Host "Watch it: https://dashboard.render.com"
    }
    finally { Pop-Location }

    Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}
finally { Pop-Location }
