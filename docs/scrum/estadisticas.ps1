# Estadísticas de commits y pull requests por integrante y por sprint (rama main de origin).
# Uso (desde la raíz del repositorio):  powershell -ExecutionPolicy Bypass -File docs/scrum/estadisticas.ps1
#
# - Commits: commits que no son merge y que llegaron a main, agrupados por autor y por fecha de autor.
# - PRs fusionados: si GitHub CLI (gh) está instalado y autenticado, se usan los datos reales de
#   GitHub (autor del PR, fecha de fusión y revisiones aprobadas). Si no, se usan los merges
#   "Merge pull request #N" de main y el autor se APROXIMA con el autor del último commit de la rama
#   (falla cuando otro integrante fusionó main dentro de esa rama); el script lo advierte.
# - Los rangos van de la fecha de inicio (incluida) a la fecha de inicio del sprint siguiente (excluida).
# No muestra correos: los nombres se normalizan con la tabla $Alias.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Sprints = @(
  @{ Nombre = 'Sprint 1'; Desde = '2026-09-23'; Hasta = '2026-10-27' },
  @{ Nombre = 'Sprint 2'; Desde = '2026-10-27'; Hasta = '2026-11-14' },
  @{ Nombre = 'Sprint 3'; Desde = '2026-11-14'; Hasta = '2026-11-28' }
)

$Alias = @{
  'mauriloopezb17'       = 'Mauricio López'
  '3LRexD'               = 'Ian Coaquira'
  'Mauricio Lopez'       = 'Mauricio López'
  'Samiel Trujillo'      = 'Samiel Trujillo'
  'SamielTrujillo'       = 'Samiel Trujillo'
  'Ian Coaquira Uriarte' = 'Ian Coaquira'
}
$Integrantes = @('Ian Coaquira', 'Mauricio López', 'Samiel Trujillo')

function Get-Nombre([string]$autor) {
  if ($Alias.ContainsKey($autor)) { return $Alias[$autor] }
  return $autor
}

git fetch --quiet origin main | Out-Null
$rama = 'origin/main'

# Datos de GitHub (opcional).
$prsGithub = $null
if (Get-Command gh -ErrorAction SilentlyContinue) {
  $url = git remote get-url origin
  if ($url -match 'github\.com[:/](.+?)(\.git)?$') {
    try {
      $json = gh pr list --repo $Matches[1] --state merged --limit 500 --json number,author,mergedAt,reviews 2>$null
      if ($LASTEXITCODE -eq 0 -and $json) { $prsGithub = $json | ConvertFrom-Json }
    } catch { $prsGithub = $null }
  }
}
if ($null -eq $prsGithub) {
  Write-Output 'AVISO: sin GitHub CLI; el autor de cada PR se aproxima con el último commit de su rama.'
} else {
  Write-Output 'Fuente de PRs: GitHub (autor real del PR y revisiones aprobadas).'
}

foreach ($s in $Sprints) {
  $desde = "$($s.Desde)T00:00:00-04:00"
  $hasta = "$($s.Hasta)T00:00:00-04:00"

  # Commits (sin merges) por autor, filtrados por la fecha de autor (hora de Bolivia, -04:00).
  $commits = @{}
  foreach ($n in $Integrantes) { $commits[$n] = 0 }
  $dias = @{}
  $lineas = git log $rama --no-merges --format='%an|%aI' | Where-Object { $_ }
  foreach ($l in $lineas) {
    $autor, $fecha = $l -split '\|', 2
    $f = [datetimeoffset]::Parse($fecha)
    if ($f -ge [datetimeoffset]::Parse($desde) -and $f -lt [datetimeoffset]::Parse($hasta)) {
      $n = Get-Nombre $autor
      $commits[$n] = 1 + ($commits[$n] | ForEach-Object { if ($_) { $_ } else { 0 } })
      $dia = $f.ToString('yyyy-MM-dd')
      $dias[$dia] = 1 + ($dias[$dia] | ForEach-Object { if ($_) { $_ } else { 0 } })
    }
  }

  # PRs fusionados por autor.
  $prs = @{}
  foreach ($n in $Integrantes) { $prs[$n] = 0 }
  $numeros = @()
  $aprobados = 0
  if ($null -ne $prsGithub) {
    foreach ($pr in $prsGithub) {
      $f = [datetimeoffset]::Parse($pr.mergedAt)
      if ($f -ge [datetimeoffset]::Parse($desde) -and $f -lt [datetimeoffset]::Parse($hasta)) {
        $n = Get-Nombre $pr.author.login
        $prs[$n] = 1 + ($prs[$n] | ForEach-Object { if ($_) { $_ } else { 0 } })
        $numeros += [int]$pr.number
        if (@($pr.reviews | Where-Object { $_.state -eq 'APPROVED' }).Count -gt 0) { $aprobados++ }
      }
    }
  } else {
    $merges = git log $rama --first-parent --merges --format='%H|%cI|%s' | Where-Object { $_ -match 'Merge pull request #' }
    foreach ($m in $merges) {
      $hash, $fecha, $asunto = $m -split '\|', 3
      $f = [datetimeoffset]::Parse($fecha)
      if ($f -ge [datetimeoffset]::Parse($desde) -and $f -lt [datetimeoffset]::Parse($hasta)) {
        $autorRama = git log -1 --format='%an' "$hash^2"
        $n = Get-Nombre $autorRama
        $prs[$n] = 1 + ($prs[$n] | ForEach-Object { if ($_) { $_ } else { 0 } })
        if ($asunto -match '#(\d+)') { $numeros += [int]$Matches[1] }
      }
    }
  }

  Write-Output ''
  Write-Output "== $($s.Nombre) ($($s.Desde) a $($s.Hasta), fin excluido) =="
  Write-Output ('{0,-18} {1,8} {2,15}' -f 'Integrante', 'Commits', 'PRs fusionados')
  foreach ($n in ($commits.Keys + $prs.Keys | Sort-Object -Unique)) {
    Write-Output ('{0,-18} {1,8} {2,15}' -f $n, [int]$commits[$n], [int]$prs[$n])
  }
  $totalC = ($commits.Values | Measure-Object -Sum).Sum
  $totalP = ($prs.Values | Measure-Object -Sum).Sum
  Write-Output ('{0,-18} {1,8} {2,15}' -f 'TOTAL', $totalC, $totalP)
  if ($numeros.Count -gt 0) {
    Write-Output ("PRs: #" + (($numeros | Sort-Object) -join ', #'))
  }
  if ($null -ne $prsGithub) {
    Write-Output ('PRs con al menos una revisión aprobada en GitHub: {0} de {1}' -f $aprobados, $numeros.Count)
  }
  if ($dias.Count -gt 0) {
    Write-Output ('Días con commits: {0}' -f $dias.Count)
    $top = $dias.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3
    Write-Output ('Días con más commits: ' + (($top | ForEach-Object { "$($_.Key) ($($_.Value))" }) -join ', '))
  }
}
