# Genera un audio ficticio en inglés (consultora y repartidor) para la toma del Laboratorio del video.
# Voces de Windows: Zira (consultora) y David (repartidor). Salida: WAV mono 16 bits.
#   powershell -ExecutionPolicy Bypass -File video/scripts/audio-ingles.ps1

param([string]$Salida = 'video/scripts/entrevista-ficticia-en.wav')

$ErrorActionPreference = 'Stop'

$entrevistadora = 'Microsoft Zira'
$entrevistado = 'Microsoft David'

$dialogo = @(
    @($entrevistadora, 'Good morning, and thanks for meeting me. What is your role here at the bakery?'),
    @($entrevistado, 'I drive the north route. Four years now.'),
    @($entrevistadora, 'What is going wrong with the cafe orders?'),
    @($entrevistado, 'They leave late almost every day since March. We used to leave at seven, now it is after nine.'),
    @($entrevistadora, 'Why the delay?'),
    @($entrevistado, 'We wait for the boxes. The new supplier boxes arrive late, and without boxes the cafe bread cannot go out.'),
    @($entrevistadora, 'The manager thinks the drivers are slow on the route.'),
    @($entrevistado, 'I do not see it that way. The route takes the same time as before. The problem starts in the warehouse.')
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

# WinRT devuelve operaciones asíncronas; AsTask las convierte en tareas de .NET que se pueden esperar.
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
    Select-Object -First 1
function Esperar($operacion, [Type]$tipo) {
    $tarea = $asTask.MakeGenericMethod($tipo).Invoke($null, @($operacion))
    $tarea.Wait()
    $tarea.Result
}

# Sintetiza un texto y devuelve el WAV completo como bytes.
function Sintetizar($sintetizador, [string]$texto) {
    $flujo = Esperar ($sintetizador.SynthesizeTextToStreamAsync($texto)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $lector = New-Object Windows.Storage.Streams.DataReader($flujo.GetInputStreamAt(0))
    $null = Esperar ($lector.LoadAsync([uint32]$flujo.Size)) ([uint32])
    $bytes = New-Object byte[] $flujo.Size
    $lector.ReadBytes($bytes)
    $bytes
}

# Recorre los bloques RIFF y devuelve el formato y las muestras PCM del bloque 'data'.
function LeerWav([byte[]]$wav) {
    $pos = 12
    $formato = $null
    while ($pos + 8 -le $wav.Length) {
        $id = [System.Text.Encoding]::ASCII.GetString($wav, $pos, 4)
        $tam = [BitConverter]::ToInt32($wav, $pos + 4)
        $disponible = $wav.Length - $pos - 8
        # Un WAV escrito en streaming puede declarar el tamaño de 'data' como 0xFFFFFFFF (-1):
        # entonces los datos son el resto del archivo.
        if ($id -eq 'data' -and ($tam -lt 0 -or $tam -gt $disponible)) { $tam = $disponible }
        elseif ($tam -lt 0) { throw "Bloque '$id' con tamaño inválido en el WAV sintetizado." }
        if ($id -eq 'fmt ') {
            $formato = @{ Canales = [BitConverter]::ToInt16($wav, $pos + 10); Hz = [BitConverter]::ToInt32($wav, $pos + 12); Bits = [BitConverter]::ToInt16($wav, $pos + 22) }
        }
        elseif ($id -eq 'data') {
            $pcm = New-Object byte[] $tam
            [Array]::Copy($wav, $pos + 8, $pcm, 0, $tam)
            return @{ Formato = $formato; Pcm = $pcm }
        }
        $pos += 8 + $tam + ($tam % 2)
    }
    throw 'El WAV sintetizado no tiene bloque data.'
}

$voces = @{}
foreach ($nombre in @($entrevistadora, $entrevistado)) {
    $voz = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object DisplayName -eq $nombre
    if (-not $voz) { throw "No está instalada la voz '$nombre'." }
    $sintetizador = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
    $sintetizador.Voice = $voz
    $voces[$nombre] = $sintetizador
}

$pcm = New-Object System.IO.MemoryStream
$formato = $null
foreach ($turno in $dialogo) {
    $wav = LeerWav (Sintetizar $voces[$turno[0]] $turno[1])
    if (-not $formato) { $formato = $wav.Formato }
    elseif ($wav.Formato.Hz -ne $formato.Hz -or $wav.Formato.Bits -ne $formato.Bits -or $wav.Formato.Canales -ne $formato.Canales) {
        throw 'Las voces entregan formatos distintos; no se pueden unir.'
    }
    $pcm.Write($wav.Pcm, 0, $wav.Pcm.Length)
    # Pausa de 600 ms entre turnos, como en una conversación.
    $silencio = New-Object byte[] ([int]($formato.Hz * $formato.Canales * $formato.Bits / 8 * 0.6))
    $pcm.Write($silencio, 0, $silencio.Length)
}

if ($formato.Canales -ne 1 -or $formato.Bits -ne 16 -or $formato.Hz -notin 16000, 24000) {
    throw "Formato no aceptado por Meta: $($formato.Canales) canal(es), $($formato.Bits) bits, $($formato.Hz) Hz."
}

$ruta = if ([System.IO.Path]::IsPathRooted($Salida)) { $Salida } else { Join-Path (Get-Location) $Salida }
New-Item -ItemType Directory -Force -Path (Split-Path $ruta) | Out-Null

$datos = $pcm.ToArray()
$bytesPorSegundo = $formato.Hz * $formato.Canales * $formato.Bits / 8
$archivo = [System.IO.File]::Create($ruta)
$escritor = New-Object System.IO.BinaryWriter($archivo)
try {
    $escritor.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF')); $escritor.Write([int](36 + $datos.Length))
    $escritor.Write([System.Text.Encoding]::ASCII.GetBytes('WAVEfmt ')); $escritor.Write([int]16)
    $escritor.Write([int16]1); $escritor.Write([int16]$formato.Canales); $escritor.Write([int]$formato.Hz)
    $escritor.Write([int]$bytesPorSegundo); $escritor.Write([int16]($formato.Canales * $formato.Bits / 8)); $escritor.Write([int16]$formato.Bits)
    $escritor.Write([System.Text.Encoding]::ASCII.GetBytes('data')); $escritor.Write([int]$datos.Length)
    $escritor.Write($datos)
}
finally {
    $escritor.Dispose()
}

Write-Output ("Audio generado: {0} ({1:N1} s)" -f $ruta, ($datos.Length / $bytesPorSegundo))
