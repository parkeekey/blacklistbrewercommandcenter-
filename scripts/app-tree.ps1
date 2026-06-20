param(
  [string]$Root = (Get-Location).Path,
  [string]$Out = "$Root\project-tree.txt",
  [int]$Depth = 4
)

$skip = @('node_modules', '.git', 'dist', '.vite', 'package-lock.json', 'day-overtime.png', 'screenshot.png', 'posexample.xlsx')

$lines = @()
$lines += "Project: $(Split-Path -Leaf $Root)"
$lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$lines += "-" * 50

function Walk($dir, $prefix, $d) {
  if ($d -gt $Depth) { return }
  $items = Get-ChildItem -LiteralPath $dir | Where-Object { $_.Name -notin $skip } | Sort-Object @{e={$_.PSIsContainer -eq 0}}, Name
  for ($i = 0; $i -lt $items.Count; $i++) {
    $it = $items[$i]
    $last = $i -eq $items.Count - 1
    $c = if ($last) { '└── ' } else { '├── ' }
    $lines += "$prefix$c$($it.Name)"
    if ($it.PSIsContainer) {
      $next = "$prefix$(if ($last) { '    ' } else { '│   ' })"
      Walk $it.FullName $next ($d + 1)
    }
  }
}

Walk $Root "" 0
$lines | Out-File -LiteralPath $Out -Encoding utf8
Write-Host "Wrote $Out"
