
$path = "components\LoanViews.tsx"
$content = [System.IO.File]::ReadAllText($path)

# Fix encoding issues
$content = $content.Replace("Aguardando ConfirmaÃ§Ã£o", "Aguardando Confirmação")
$content = $content.Replace("NÃ£o hÃ¡", "Não há")

[System.IO.File]::WriteAllText($path, $content)
Write-Host "Success Fixed Encoding"
