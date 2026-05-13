# =============================================================================
# Deploy 4b — MMN Recon Step 2: Inspect actual report content
# scripts/mmn-recon-step2.ps1
#
# Pulls the most recent Iowa Daily Cash Grain Bids (slug 2850) so we can see
# the actual JSON shape: which fields hold the cash price, the commodity
# name, the location, the report date.
# =============================================================================

cd C:\Users\Andrew\harvestfile

Write-Host "=== USDA MARS API Recon - Step 2: Sample Iowa Report ===`n"

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

$urls = @(
    "https://marsapi.ams.usda.gov/services/v1.2/reports/2850",
    "https://marsapi.ams.usda.gov/services/v1.2/reports/2850?q=report_begin_date=05/12/2026"
)

$counter = 1
foreach ($url in $urls) {
    Write-Host "`n=== URL #$counter ==="
    Write-Host "URL: $url"
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
        $outPath = "scripts\mmn-sample-$counter.json"
        $response | ConvertTo-Json -Depth 15 | Out-File -LiteralPath $outPath -Encoding UTF8
        Write-Host "Saved to: $outPath"

        if ($response -is [Array]) {
            Write-Host "Type: Array. Count: $($response.Count)"
            if ($response.Count -gt 0) {
                Write-Host "First item field names + sample values:"
                $response[0].PSObject.Properties | ForEach-Object {
                    $val = "$($_.Value)"
                    if ($val.Length -gt 80) { $val = $val.Substring(0, 80) + "..." }
                    Write-Host ("  {0,-30} {1}" -f $_.Name, $val)
                }
            }
        } else {
            Write-Host "Type: Object. Top-level keys:"
            $response.PSObject.Properties | ForEach-Object {
                Write-Host "  $($_.Name)"
            }
            Write-Host "`nFull response (first 3000 chars):"
            $json = $response | ConvertTo-Json -Depth 10
            $preview = if ($json.Length -gt 3000) { $json.Substring(0, 3000) } else { $json }
            Write-Host $preview
        }
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
    }
    $counter++
}

Write-Host "`n=== Done ==="