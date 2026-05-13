# =============================================================================
# Deploy 4b — USDA MARS API Recon
# scripts/mmn-recon.ps1
#
# Pulls the full MMN table of contents, saves it to disk, and prints the
# structure so we can identify which slug IDs correspond to OH/IN/IL/MI/IA
# daily cash grain bid reports.
# =============================================================================

cd C:\Users\Andrew\harvestfile

if (-not (Test-Path -LiteralPath "scripts")) {
    New-Item -ItemType Directory -Path "scripts" | Out-Null
}

Write-Host "=== USDA MARS API Recon ===`n"

$apiKey = Read-Host -Prompt "Paste your USDA_AMS_MARS_API_KEY (not displayed)" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
$apiKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if (-not $apiKeyPlain) {
    Write-Host "ERROR: No API key provided"
    return
}

# HTTP Basic auth: API key as username, blank password
$pair = $apiKeyPlain + ":"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{
    Authorization = "Basic $encoded"
    Accept = "application/json"
}

$url = "https://marsapi.ams.usda.gov/services/v1.2/reports"
Write-Host "Calling: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "API call succeeded."
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host "Response body: $body"
        } catch {
            Write-Host "(could not read response body)"
        }
    }
    return
}

# Save full response
$outPath = "scripts\mmn-reports-toc.json"
$response | ConvertTo-Json -Depth 10 | Out-File -LiteralPath $outPath -Encoding UTF8
Write-Host "Saved full table of contents to: $outPath"

# Diagnostics on structure
Write-Host "`n=== Response diagnostics ==="
if ($response -is [Array]) {
    Write-Host "Response is an array. Total reports: $($response.Count)"
    Write-Host "`n--- First item field names ---"
    $response[0].PSObject.Properties | ForEach-Object {
        $val = if ($null -eq $_.Value) { "(null)" } else { "$($_.Value)" }
        if ($val.Length -gt 80) { $val = $val.Substring(0, 80) + "..." }
        Write-Host ("  {0,-30} {1}" -f $_.Name, $val)
    }
} else {
    Write-Host "Response is not an array. Top-level keys:"
    $response.PSObject.Properties | ForEach-Object { Write-Host "  $($_.Name)" }
}

# Try to filter — assume common field names, gracefully handle if absent
Write-Host "`n=== Searching for grain / cash bid reports in OH/IN/IL/MI/IA ==="

$items = if ($response -is [Array]) { $response } elseif ($response.results) { $response.results } else { @($response) }

$keywords = @('grain', 'corn', 'soybean', 'cash bid', 'bids')
$states = @('Ohio', 'Indiana', 'Illinois', 'Iowa', 'Michigan')

$matches = $items | Where-Object {
    $textFields = @()
    if ($_.PSObject.Properties['slug_name']) { $textFields += $_.slug_name }
    if ($_.PSObject.Properties['report_title']) { $textFields += $_.report_title }
    if ($_.PSObject.Properties['report_name']) { $textFields += $_.report_name }
    if ($_.PSObject.Properties['title']) { $textFields += $_.title }
    if ($_.PSObject.Properties['name']) { $textFields += $_.name }
    $combined = ($textFields -join " ").ToLower()

    $hasKeyword = $false
    foreach ($kw in $keywords) { if ($combined -like "*$kw*") { $hasKeyword = $true; break } }
    if (-not $hasKeyword) { return $false }

    $hasState = $false
    foreach ($s in $states) { if ($combined -like "*$($s.ToLower())*") { $hasState = $true; break } }
    $hasState
}

Write-Host "Matches found: $($matches.Count)`n"
$matches | ForEach-Object {
    $slug = if ($_.PSObject.Properties['slug_id']) { $_.slug_id } else { "?" }
    $title = if ($_.PSObject.Properties['slug_name']) { $_.slug_name }
             elseif ($_.PSObject.Properties['report_title']) { $_.report_title }
             elseif ($_.PSObject.Properties['report_name']) { $_.report_name }
             else { "(no title field)" }
    Write-Host ("  Slug {0,-8} | {1}" -f $slug, $title)
}

Write-Host "`n=== Done. Inspect scripts\mmn-reports-toc.json for the full list. ==="