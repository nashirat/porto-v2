# Image Renaming Script
# Renames all images to sequential numbers, continuing from the highest existing number

# Get the directory where the script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Image extensions to process
$imageExtensions = @('*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp', '*.bmp')

# Find all numbered files (e.g., 1.jpg, 2.png, 10.jpg)
$numberedFiles = Get-ChildItem -Path $scriptDir -File | Where-Object {
    $_.BaseName -match '^\d+$'
}

# Find the highest number
$highestNumber = 0
if ($numberedFiles) {
    $highestNumber = ($numberedFiles | ForEach-Object { [int]$_.BaseName } | Measure-Object -Maximum).Maximum
}

Write-Host "Highest existing number: $highestNumber" -ForegroundColor Cyan

# Get all image files that are NOT already numbered
$unnumberedFiles = Get-ChildItem -Path $scriptDir -File | Where-Object {
    $_.Extension -match '\.(jpg|jpeg|png|gif|webp|bmp)$' -and $_.BaseName -notmatch '^\d+$'
} | Sort-Object Name

if ($unnumberedFiles.Count -eq 0) {
    Write-Host "No unnumbered images found to rename." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($unnumberedFiles.Count) unnumbered images to rename" -ForegroundColor Yellow

# Start numbering from next available number
$currentNumber = $highestNumber + 1

# Rename each file
foreach ($file in $unnumberedFiles) {
    $newName = "$currentNumber$($file.Extension)"
    $newPath = Join-Path -Path $scriptDir -ChildPath $newName

    Write-Host "Renaming: $($file.Name) -> $newName" -ForegroundColor Gray

    Rename-Item -Path $file.FullName -NewName $newName
    $currentNumber++
}

Write-Host "`nRenaming complete! Renamed $($unnumberedFiles.Count) files." -ForegroundColor Green
Write-Host "Next available number: $currentNumber" -ForegroundColor Cyan
