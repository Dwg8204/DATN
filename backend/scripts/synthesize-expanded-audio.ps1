param([Parameter(Mandatory=$true)][string]$InputJson)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -LiteralPath $InputJson -Raw -Encoding UTF8 | ConvertFrom-Json
$speech = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $speech.Rate = -1
  foreach ($job in $jobs) {
    if (Test-Path -LiteralPath $job.path) { continue }
    $prompt = New-Object System.Speech.Synthesis.PromptBuilder
    $prompt.AppendBreak([TimeSpan]::FromMilliseconds(500))
    foreach ($turn in $job.turns) {
      $prompt.StartVoice("Microsoft " + $turn.voice + " Desktop")
      $prompt.AppendText($turn.text)
      $prompt.EndVoice()
      $prompt.AppendBreak([TimeSpan]::FromMilliseconds(850))
    }
    $speech.SetOutputToWaveFile($job.path + '.partial')
    $speech.Speak($prompt)
    $speech.SetOutputToNull()
    Move-Item -LiteralPath ($job.path + '.partial') -Destination $job.path
    Write-Output ("Synthesized " + $job.key)
  }
} finally { $speech.Dispose() }
