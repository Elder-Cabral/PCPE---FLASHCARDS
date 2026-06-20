$json = Get-Content "reports\estatistica_camadas_lote1_output.json" -Encoding BigEndianUnicode -Raw | ConvertFrom-Json
Write-Host "Cards: $($json.Count)"
Write-Host "Sample: $($json[0].camada1.Substring(0,60))"
$raw = $json | ConvertTo-Json -Depth 10
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText("$PWD\reports\lote1_clean.json", $raw, $utf8)
Write-Host "Saved to reports\lote1_clean.json (no BOM)"
