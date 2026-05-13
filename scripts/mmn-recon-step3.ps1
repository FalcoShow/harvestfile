# =============================================================================
# Deploy 4b — Diagnostic recon for Ohio/Illinois/Indiana report content
# scripts/mmn-recon-step3.ps1
#
# Shipped after partial failure on first force-MMN test: Iowa parsed cleanly
# but Ohio (slug 2851) returned a record missing report_narrative. We need
# to see what the actual data shape looks like for OH, IL, IN to fix the
# parser to be defensive across all four states.
# =============================================================================

cd C:\Users\Andrew\harvestfile

Write-Host "=== MMN Recon Step 3: All-State Narrative Inspection ===`n"

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

$slugMap = @{
    2850 = 'Iowa (working)'
    2851 = 'Ohio (FAILED)'
    3192 = 'Illinois (untested)'
    3463 = 'Indiana (untested)'
}

foreach ($slug in 2850, 2851, 3192, 3463) {
    $url = "https://marsapi.ams.usda.gov/services/v1.2/reports/$slug"
    Write-Host "`n=== Slug $slug | $($slugMap[$slug]) ==="

    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
        $outPath = "scripts\mmn-state-$slug.json"
        $response | ConvertTo-Json -Depth 15 | Out-File -LiteralPath $outPath -Encoding UTF8

        $resultCount = if ($response.results) { $response.results.Count } else { 0 }
        Write-Host "Total results: $resultCount"
        Write-Host "Inspecting first 5 records:`n"

        $idx = 0
        foreach ($r in ($response.results | Select-Object -First 5)) {
            $idx++
            $narrative = $r.report_narrative
            $hasNarrative = if ([string]::IsNullOrWhiteSpace($narrative)) { "EMPTY/NULL" } else { "PRESENT ($($narrative.Length) chars)" }

            Write-Host ("  [{0}] Date: {1,-12} Published: {2,-22} Narrative: {3}" -f $idx, $r.report_begin_date, $r.published_date, $hasNarrative)

            if (-not [string]::IsNullOrWhiteSpace($narrative)) {
                $preview = if ($narrative.Length -gt 200) { $narrative.Substring(0, 200) } else { $narrative }
                Write-Host "      Preview: $preview"
            }
        }
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
    }
}

Write-Host "`n=== Done. Inspect scripts\mmn-state-*.json files for full content. ==="