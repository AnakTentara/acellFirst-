<#
.SYNOPSIS
    Launcher script for Claude Code CLI with OhhMyAgent (Claude Opus) and bypassed permissions.
.DESCRIPTION
    Sets up the environment variables for OhhMyAgent.com (ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_MODEL),
    verifies Claude Code CLI installation, and starts Claude with --dangerously-skip-permissions.
#>

param (
    [string]$ApiKey = "",
    [string]$Model = "claude-opus-5",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PromptArgs
)

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🏰 Acell & Haikal Sanctuary - Claude Code CLI (OMA)      " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Resolve API Key from parameters, environment, or .env file
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    if ($env:ANTHROPIC_AUTH_TOKEN) {
        $ApiKey = $env:ANTHROPIC_AUTH_TOKEN
    } elseif ($env:AI_API_KEY) {
        $ApiKey = $env:AI_API_KEY
    } elseif (Test-Path "$PSScriptRoot\.env") {
        Get-Content "$PSScriptRoot\.env" | ForEach-Object {
            if ($_ -match "^\s*AI_API_KEY\s*=\s*(.+)$") {
                $ApiKey = $matches[1].Trim('"' -replace "'", "").Trim()
            }
        }
    }
}

# If still empty, prompt the user
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Host "Masukkan API Key OhhMyAgent kamu (contoh: oma-*** atau sk-***):" -ForegroundColor Green
    $ApiKey = Read-Host "OhhMyAgent API Key"
}

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Host "❌ Error: API Key tidak boleh kosong!" -ForegroundColor Red
    Exit 1
}

# 2. Configure Environment for OhhMyAgent Compatibility
$env:ANTHROPIC_BASE_URL = "https://ohhmyagent.com/v1"
$env:ANTHROPIC_AUTH_TOKEN = $ApiKey.Trim()
$env:ANTHROPIC_API_KEY = "" # Empty to prevent conflicts with custom gateway
$env:ANTHROPIC_MODEL = $Model

Write-Host "⚙️  Konfigurasi Gateway OhhMyAgent:" -ForegroundColor Cyan
Write-Host "   • Base URL : $env:ANTHROPIC_BASE_URL" -ForegroundColor Gray
Write-Host "   • Model    : $env:ANTHROPIC_MODEL (Claude Opus)" -ForegroundColor Gray
Write-Host "   • Autonomy : --dangerously-skip-permissions (Full Autonomy)" -ForegroundColor Gray
Write-Host ""

# 3. Ensure npm global bin is in PATH
$npmGlobalPath = "$env:APPDATA\npm"
if (Test-Path $npmGlobalPath) {
    if ($env:PATH -notlike "*$npmGlobalPath*") {
        $env:PATH = "$npmGlobalPath;$env:PATH"
    }
}

# 4. Check if claude is installed
$claudeCommand = Get-Command "claude" -ErrorAction SilentlyContinue
if (-not $claudeCommand) {
    Write-Host "📦 Memasang @anthropic-ai/claude-code CLI secara global via npm..." -ForegroundColor Yellow
    npm install -g @anthropic-ai/claude-code
    $claudeCommand = Get-Command "claude" -ErrorAction SilentlyContinue
}

if (-not $claudeCommand) {
    # Check direct cmd path
    $directClaudeCmd = "$env:APPDATA\npm\claude.cmd"
    if (Test-Path $directClaudeCmd) {
        $claudeExecutable = $directClaudeCmd
    } else {
        $claudeExecutable = "npx -y @anthropic-ai/claude-code"
    }
} else {
    $claudeExecutable = "claude"
}

Write-Host "🚀 Menjalankan Claude Code CLI dengan Bypass Permissions..." -ForegroundColor Green
Write-Host ""

# 5. Execute Claude CLI with --dangerously-skip-permissions
if ($claudeExecutable -eq "claude" -or (Test-Path $claudeExecutable)) {
    if ($PromptArgs -and $PromptArgs.Length -gt 0) {
        $extraArgs = $PromptArgs -join " "
        & $claudeExecutable --dangerously-skip-permissions $extraArgs
    } else {
        & $claudeExecutable --dangerously-skip-permissions
    }
} else {
    if ($PromptArgs -and $PromptArgs.Length -gt 0) {
        $extraArgs = $PromptArgs -join " "
        npx -y @anthropic-ai/claude-code --dangerously-skip-permissions $extraArgs
    } else {
        npx -y @anthropic-ai/claude-code --dangerously-skip-permissions
    }
}
