# Genera en local un audio ficticio de una entrevista con dos voces (alrededor de un minuto)
# para probar la transcripción con separación de hablantes. Usa la síntesis de voz de
# Windows (Windows.Media.SpeechSynthesis): nada sale de la computadora.
# Salida: WAV mono, 16 bits, 16 kHz, uno de los formatos que acepta Meta.
#
# Uso (Windows PowerShell 5.1, que trae el puente a WinRT):
#   powershell -ExecutionPolicy Bypass -File scripts/audio-ficticio.ps1

param([string]$Salida = 'interno/smoke/entrevista-ficticia.wav')

$ErrorActionPreference = 'Stop'

$entrevistadora = 'Microsoft Sabina'
$entrevistado = 'Microsoft Raul'

$dialogo = @(
    @($entrevistadora, 'Buenos días. Gracias por recibirme. ¿Cuál es su puesto en la panadería?'),
    @($entrevistado, 'Soy el repartidor de la ruta norte. Llevo cuatro años aquí.'),
    @($entrevistadora, '¿Qué pasa con los pedidos para las cafeterías?'),
    @($entrevistado, 'Llegan tarde casi todos los días desde marzo. Antes salíamos a las siete y ahora salimos después de las nueve.'),
    @($entrevistadora, '¿Por qué salen más tarde?'),
    @($entrevistado, 'Porque esperamos las cajas. Las cajas del proveedor nuevo no llegan a tiempo, y sin caja no podemos mandar el pan de las cafeterías.'),
    @($entrevistadora, '¿Y los pedidos que no llevan caja?'),
    @($entrevistado, 'Esos salen bien. El pan suelto para las tiendas sale a tiempo todos los días.'),
    @($entrevistadora, 'La gerente cree que los repartidores se tardan en la ruta. ¿Qué opina?'),
    @($entrevistado, 'Yo no lo veo así. La ruta dura lo mismo que antes. El problema empieza en el almacén, antes de que salgamos.')
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
