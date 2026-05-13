# =============================================================================
# Deploy 4b — Recon step 4: Report Detail section inspection
# scripts/mmn-recon-step4.ps1
#
# Pulls the Report Detail section for Ohio (slug 2851) for the most recent
# date. Header section has no narrative for OH/IN, so we need to compute
# state averages from the per-location bid records in Report Detail.
# =============================================================================

cd C:\Users\Andrew\harvestfile

Write-Host "=== MMN Recon Step 4: Report Detail Inspection ===`n"

$apiKey = Read-Host -Prompt "Paste your USDA_AMS_MARS_API_KEY (not displayed)" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
$apiKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$pair = $apiKeyPlain + ":"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{
    Authorization = "Basic $encoded"
    Accept = "application/json"
}

# Try both URL patterns for the Report Detail section
$urls = @(
    "https://marsapi.ams.usda.gov/services/v1.2/reports/2851/Report%20Detail?q=report_begin_date=05/12/2026",
    "https://marsapi.ams.usda.gov/services/v1.2/reports/2851?q=report_begin_date=05/12/2026&allSections=true"
)

$counter = 1
foreach ($url in $urls) {
    Write-Host "`n=== URL #$counter ==="
    Write-Host "URL: $url"
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
        $outPath = "scripts\mmn-detail-oh-$counter.json"
        $response | ConvertTo-Json -Depth 15 | Out-File -LiteralPath $outPath -Encoding UTF8
        Write-Host "Saved to: $outPath"

        Write-Host "Top-level keys:"
        $response.PSObject.Properties | ForEach-Object { Write-Host "  $($_.Name)" }

        $resultCount = if ($response.results) { $response.results.Count } else { 0 }
        Write-Host "Total result rows: $resultCount"

        if ($resultCount -gt 0) {
            Write-Host "`nFirst result row field names + sample values:"
            $response.results[0].PSObject.Properties | ForEach-Object {
                $val = "$($_.Value)"
                if ($val.Length -gt 80) { $val = $val.Substring(0, 80) + "..." }
                Write-Host ("  {0,-30} {1}" -f $_.Name, $val)
            }

            Write-Host "`nSecond result row (to see variation):"
            if ($resultCount -gt 1) {
                $response.results[1].PSObject.Properties | ForEach-Object {
                    $val = "$($_.Value)"
                    if ($val.Length -gt 80) { $val = $val.Substring(0, 80) + "..." }
                    Write-Host ("  {0,-30} {1}" -f $_.Name, $val)
                }
            }

            # Try to find the commodity and price-like fields
            Write-Host "`n=== Hunting for commodity + price fields in all results ==="
            $cornCount = 0
            $soyCount = 0
            foreach ($r in $response.results) {
                $combinedText = ($r.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join " | "
                if ($combinedText -like "*corn*" -or $combinedText -like "*Corn*") { $cornCount++ }
                if ($combinedText -like "*soybean*" -or $combinedText -like "*Soybean*") { $soyCount++ }
            }
            Write-Host "Records mentioning corn:     $cornCount"
            Write-Host "Records mentioning soybeans: $soyCount"
        }
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                Write-Host "Response body: $($reader.ReadToEnd())"
            } catch {
                Write-Host "(could not read response body)"
            }
        }
    }
    $counter++
}

Write-Host "`n=== Done ==="