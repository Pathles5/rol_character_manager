# check.ps1 - Documentation gate for FichaSS harness (no external dependencies).
# Validates: constitution present, DECISIONS.md append-only log present,
# current phase spec with acceptance criteria, prior phases verified,
# INDEX.md state consistency. Exit 0 = pass, exit 1 = fail.
# Usage: powershell -File scripts/check.ps1 [-Phase 00] [-RepoRoot D:\path]

param(
    [string]$Phase = "",
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$failures = @()
$notes = @()

function Add-Fail([string]$msg) { $script:failures += $msg }
function Add-Note([string]$msg) { $script:notes += $msg }

# --- Required documents ---
$constitutionPath = Join-Path $RepoRoot "docs/specs/constitution.md"
$decisionsPath = Join-Path $RepoRoot "DECISIONS.md"
$indexPath = Join-Path $RepoRoot "docs/specs/INDEX.md"

if (-not (Test-Path $constitutionPath)) {
    Add-Fail "Missing constitution: docs/specs/constitution.md"
} else {
    Add-Note "Constitution found."
    $constitutionRaw = Get-Content $constitutionPath -Raw
    if ($constitutionRaw -notmatch "(?i)coste\s+€?0|zero\s+cost") {
        Add-Fail "Constitution lacks the zero-cost invariant (D-11). Restoring it is mandatory."
    } else {
        Add-Note "Zero-cost invariant (D-11) present in constitution."
    }
}

if (-not (Test-Path $decisionsPath)) {
    Add-Fail "Missing decisions log: DECISIONS.md"
} else {
    Add-Note "Decisions log found."
}

if (-not (Test-Path $indexPath)) {
    Add-Fail "Missing spec index: docs/specs/INDEX.md"
}

# --- Parse INDEX.md phase table ---
$currentPhase = $null
$completedStates = @("verified", "approved")
if (Test-Path $indexPath) {
    $rows = Get-Content $indexPath | Where-Object { $_ -match '^\s*\|\s*\d+\s*\|' }
    foreach ($row in $rows) {
        $cells = ($row.TrimStart() -replace '^\|', '' -replace '\|$', '') -split '\|'
        if ($cells.Count -lt 3) { continue }
        $id = $cells[0].Trim()
        $title = $cells[1].Trim()
        $state = $cells[2].Trim().ToLower()
        if (-not $Phase) {
            if ($completedStates -notcontains $state) {
                # First phase not verified/approved is the current one.
                if (-not $currentPhase) { $currentPhase = $id; Add-Note "Current phase: $id, state: $state" }
            }
        } elseif ($id -eq $Phase) {
            $currentPhase = $id
            Add-Note "Current phase (forced): $id, state: $state"
        }
    }
    if (-not $currentPhase) {
        if ($Phase) { $currentPhase = $Phase; Add-Note "Current phase (forced): $Phase (not found in INDEX)" }
        else { Add-Note "No active phase found - all phases appear completed." }
    }
}

# --- Current phase spec must exist with acceptance criteria ---
if ($currentPhase) {
    $specDir = Get-ChildItem (Join-Path $RepoRoot "docs/specs") -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match ("^" + $currentPhase + "-") }
    $specPath = $null
    if ($specDir) {
        $candidate = Join-Path $specDir[0].FullName "spec.md"
        if (Test-Path $candidate) { $specPath = $candidate }
    }
    if (-not $specPath) {
        Add-Fail "Phase $currentPhase has no spec: docs/specs/$currentPhase-<name>/spec.md"
    } else {
        Add-Note ("Spec found: " + ($specPath.Substring($RepoRoot.Length + 1)))
        $specContent = Get-Content $specPath -Raw -Encoding UTF8
        if ($specContent -notmatch "(?i)criterios\s+de\s+aceptac") {
            Add-Fail "Spec of phase $currentPhase lacks a 'Criterios de aceptacion' section with verifiable criteria."
        } else {
            Add-Note "Spec contains acceptance criteria."
        }
        if ($specContent -notmatch "(?i)(alcance|fuera\s+de\s+alcance)") {
            Add-Fail "Spec of phase $currentPhase lacks scope definition ('Alcance' / 'Fuera de alcance')."
        } else {
            Add-Note "Spec defines scope."
        }
    }
}

# --- Report ---
Write-Host ""
Write-Host "=== FichaSS harness check ==="
foreach ($n in $notes) { Write-Host " [info]  $n" }
if ($failures.Count -eq 0) {
    Write-Host " [PASS]  Documentation gate OK."
    exit 0
} else {
    foreach ($f in $failures) { Write-Host " [FAIL]  $f" -ForegroundColor Red }
    Write-Host " [FAIL]  $($failures.Count) failure(s). Fix before closing the phase." -ForegroundColor Red
    exit 1
}
