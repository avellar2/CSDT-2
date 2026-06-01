import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from "@/utils/api-auth";

interface PrinterConfig {
  brand: string;
  model: string;
  customModel: string;
  ipAddress: string;
  printerName: string;
  sector: string;
  setDefault: boolean;
  printTest: boolean;
  driverName: string;
  isNetwork: boolean;
  driverUrl?: string;
}

function generateScript(config: PrinterConfig): string {
  const lines: string[] = [];

  const push = (...args: string[]) => lines.push(...args);

  const printerName = config.printerName.trim();
  const portName = config.ipAddress || 'USB001';
  const driverName = config.driverName.trim();

  push(
    '#Requires -RunAsAdministrator',
    '# ============================================================',
    '#  CSDT SME Duque de Caxias — Script de Instalação de Impressora',
   `#  Setor   : ${config.sector}`,
   `#  Modelo  : ${config.model}`,
   `#  IP      : ${config.ipAddress || 'USB'}`,
   `#  Gerado  : ${new Date().toLocaleString('pt-BR')}`,
    '# ============================================================',
    '',
    'cls',
    'Write-Host ""',
    'Write-Host "======================================================" -ForegroundColor Cyan',
    'Write-Host "  CSDT - Instalação de Impressora" -ForegroundColor White',
    'Write-Host "======================================================" -ForegroundColor Cyan',
    'Write-Host ""',
   `Write-Host "  Setor     : ${printerName}" -ForegroundColor White`,
   `Write-Host "  Modelo    : ${config.model}" -ForegroundColor White`,
   `Write-Host "  IP        : ${config.ipAddress || 'USB'}" -ForegroundColor White`,
    'Write-Host "======================================================" -ForegroundColor Cyan',
    'Write-Host ""',
    'Read-Host "Pressione ENTER para iniciar a instalação"',
    'Write-Host ""',
    '',
    '# Função para pausar e não fechar',
    'function Pause-Script {',
    '  Write-Host ""',
    '  Write-Host "======================================================" -ForegroundColor Yellow',
    '  Read-Host "Pressione ENTER para sair"',
    '}',
    '',
    '# Tratamento de erro global',
    'trap {',
    '  Write-Host ""',
    '  Write-Host "ERRO: $_" -ForegroundColor Red',
    '  Pause-Script',
    '  exit 1',
    '}',
    '',
    '$ErrorActionPreference = "Continue"',
    '$ProgressPreference = "SilentlyContinue"',
    '',
    'function Write-Step {',
    '  param([string]$msg)',
    '  Write-Host ""',
    '  Write-Host "  >>> $msg" -ForegroundColor Cyan',
    '}',
    'function Write-OK   { param([string]$msg) Write-Host "  [OK] $msg" -ForegroundColor Green }',
    'function Write-WARN { param([string]$msg) Write-Host "  [!]  $msg" -ForegroundColor Yellow }',
    'function Write-ERR  { param([string]$msg) Write-Host "  [✗]  $msg" -ForegroundColor Red }',
    '',
    'Write-Host "Iniciando instalação..." -ForegroundColor Green',
    'Write-Host ""',
  );

  // 1. Verificar conectividade (se for rede)
  if (config.isNetwork && config.ipAddress) {
    push(
      'Write-Step "Verificando conectividade com a impressora..."',
     `$ip = "${config.ipAddress}"`,
      '$ping = Test-Connection -ComputerName $ip -Count 2 -Quiet',
      'if ($ping) {',
      '  Write-OK "Impressora respondendo em $ip"',
      '} else {',
      '  Write-WARN "Impressora não responde em $ip"',
      '  $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"',
      '  if ($continue -ne "S" -and $continue -ne "s") {',
      '    Write-ERR "Instalação cancelada"',
      '    Pause-Script',
      '    exit 1',
      '  }',
      '}',
      '',
    );
  }

  // 2. Instalar Chocolatey (se necessário)
  push(
    'Write-Step "Verificando Chocolatey..."',
    'if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {',
    '  Write-Host "  Instalando Chocolatey..." -ForegroundColor Gray',
    '  Set-ExecutionPolicy Bypass -Scope Process -Force',
    '  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072',
    '  Invoke-Expression ((New-Object System.Net.WebClient).DownloadString("https://community.chocolatey.org/install.ps1"))',
    '  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")',
    '  Write-OK "Chocolatey instalado"',
    '} else {',
    '  Write-OK "Chocolatey já instalado"',
    '}',
    '',
    '$choco = "$env:ProgramData\\chocolatey\\bin\\choco.exe"',
    'if (-not (Test-Path $choco)) { $choco = "choco" }',
    '',
  );

  // 3. Instalar Python (se necessário)
  push(
    'Write-Step "Verificando Python..."',
    'if (-not (Get-Command python -ErrorAction SilentlyContinue)) {',
    '  Write-Host "  Instalando Python..." -ForegroundColor Gray',
    '  & $choco install python -y --no-progress',
    '  Write-OK "Python instalado"',
    '} else {',
    '  $pythonVersion = python --version 2>&1',
    '  Write-OK "Python já instalado: $pythonVersion"',
    '}',
    '',
  );

  // 4. Verificar/Instalar driver com download automático
  push(
    'Write-Step "Verificando driver da impressora..."',
   `$driverName = "${driverName}"`,
    '$driverExists = Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue',
    '',
    'if ($driverExists) {',
    '  Write-OK "Driver já instalado: $driverName"',
    '} else {',
    '  Write-Host "  Driver não encontrado no Windows." -ForegroundColor Gray',
    '  Write-Host "  Procurando driver na pasta do script..." -ForegroundColor Gray',
    '  ',
    '  $scriptPath = $PSScriptRoot',
    '  $driverFound = $false',
    '  ',
    '  # Procura driver na pasta: driver.zip, driver.exe, ou pasta Drivers/',
    '  $searchPaths = @(',
    '    "$scriptPath\\driver.zip",',
    '    "$scriptPath\\driver.exe",',
    `    "$scriptPath\\Drivers\\${config.brand}.zip",`,
    `    "$scriptPath\\Drivers\\${config.brand}.exe",`,
    '    "$scriptPath\\Drivers\\driver.zip",',
    '    "$scriptPath\\Drivers\\driver.exe"',
    '  )',
    '  ',
    '  foreach ($file in $searchPaths) {',
    '    if (Test-Path $file) {',
    '      Write-OK "Driver encontrado: $(Split-Path $file -Leaf)"',
    '      $driverFound = $true',
    '      $driverFile = $file',
    '      break',
    '    }',
    '  }',
    '  ',
    '  if ($driverFound) {',
    '    Write-Host "  Instalando driver..." -ForegroundColor Gray',
    '    try {',
    '      if ($driverFile -like "*.zip") {',
    '        $extractPath = "$env:TEMP\\driver"',
    '        if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath }',
    '        Expand-Archive -Path $driverFile -DestinationPath $extractPath -Force',
    '        $infFile = Get-ChildItem -Path $extractPath -Recurse -Filter "*.inf" | Select-Object -First 1',
    '        if ($infFile) {',
    '          Write-Host "  INF: $($infFile.Name)" -ForegroundColor Gray',
    '          pnputil /add-driver $infFile.FullName /install | Out-Null',
    '          Write-OK "Driver instalado com sucesso"',
    '        } else {',
    '          Write-WARN "Arquivo .inf não encontrado no ZIP"',
    '        }',
    '      } elseif ($driverFile -like "*.exe") {',
    '        $argsList = @("/S", "/silent", "/quiet")',
    '        foreach ($args in $argsList) {',
    '          $process = Start-Process -FilePath $driverFile -ArgumentList $args -Wait -PassThru -WindowStyle Hidden',
    '          if ($process.ExitCode -eq 0) {',
    '            Write-OK "Driver instalado"',
    '            break',
    '          }',
    '        }',
    '      }',
    '    } catch {',
    '      Write-WARN "Erro ao instalar driver: $_"',
    '    }',
    '  }',
    '  ',
    '  # Verifica se instalou',
    '  $driverExists = Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue',
    '  if (-not $driverExists -and -not $driverFound) {',
    '    Write-ERR "Driver não encontrado na pasta do script"',
    '    Write-Host ""',
    '    Write-Host "  ======================================" -ForegroundColor Yellow',
    '    Write-Host "  DRIVER NAO ENCONTRADO" -ForegroundColor Yellow',
    '    Write-Host "  ======================================" -ForegroundColor Yellow',
    '    Write-Host ""',
    '    Write-Host "  Coloque o driver na mesma pasta deste script:" -ForegroundColor White',
    '    Write-Host "    - driver.zip  (recomendado)" -ForegroundColor Gray',
    '    Write-Host "    - driver.exe" -ForegroundColor Gray',
    '    Write-Host ""',
    '    Write-Host "  Ou crie pasta Drivers/:" -ForegroundColor White',
    `    Write-Host "    - Drivers/${config.brand}.zip" -ForegroundColor Gray`,
    `    Write-Host "    - Drivers/${config.brand}.exe" -ForegroundColor Gray`,
    '    Write-Host ""',
   `    Write-Host "  Download: ${config.brand}: https://www.oki.com/global/support/ " -ForegroundColor Cyan`,
    '    Write-Host ""',
    '    $continue = Read-Host "Deseja continuar sem o driver? (S/N)"',
    '    if ($continue -ne "S" -and $continue -ne "s") {',
    '      Pause-Script',
    '      exit 1',
    '    }',
    '  }',
    '}',
    '',
    '  # Se download automático falhou, tenta arquivo local',
    '  if (-not $downloadAttempted) {',
    '    Write-Host "  Procurando driver na pasta do script..." -ForegroundColor Gray',
    '    $scriptPath = $PSScriptRoot',
    '    $localFiles = @(',
    '      "$scriptPath\\driver.zip",',
    '      "$scriptPath\\driver.exe"',
    '    )',
    '    foreach ($file in $localFiles) {',
    '      if (Test-Path $file) {',
    '        Write-OK "Encontrado: $(Split-Path $file -Leaf)"',
    '        if ($file -like "*.zip") {',
    '          $extractPath = "$env:TEMP\\driver"',
    '          if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath }',
    '          Expand-Archive -Path $file -DestinationPath $extractPath -Force',
    '          $infFile = Get-ChildItem -Path $extractPath -Recurse -Filter "*.inf" | Select-Object -First 1',
    '          if ($infFile) {',
    '            pnputil /add-driver $infFile.FullName /install | Out-Null',
    '            Write-OK "Driver instalado"',
    '            $downloadAttempted = $true',
    '          }',
    '        } elseif ($file -like "*.exe") {',
    '          $argsList = @("/S", "/silent", "/quiet")',
    '          foreach ($args in $argsList) {',
    '            $process = Start-Process -FilePath $file -ArgumentList $args -Wait -PassThru -WindowStyle Hidden',
    '            if ($process.ExitCode -eq 0) {',
    '              Write-OK "Driver instalado"',
    '              $downloadAttempted = $true',
    '              break',
    '            }',
    '          }',
    '        }',
    '        break',
    '      }',
    '    }',
    '  }',
    '  ',
    '  # Verifica se o driver foi instalado',
    '  $driverExists = Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue',
    '  if (-not $driverExists) {',
    '    Write-ERR "Não foi possível instalar o driver automaticamente"',
    '    Write-Host ""',
    '    Write-Host "  ======================================" -ForegroundColor Yellow',
    '    Write-Host "  BAIXE MANUALMENTE:" -ForegroundColor Yellow',
    '    Write-Host "  ======================================" -ForegroundColor Yellow',
   `    Write-Host "     Fabricante: ${config.brand}" -ForegroundColor White`,
   `    Write-Host "     Modelo: ${config.model}" -ForegroundColor White`,
    '    Write-Host ""',
   `    Write-Host "     Xerox:  https://www.support.xerox.com" -ForegroundColor Cyan`,
   `    Write-Host "     OKI:    https://www.oki.com.br/support" -ForegroundColor Cyan`,
    '    Write-Host ""',
    '    $continue = Read-Host "Deseja continuar sem o driver? (S/N)"',
    '    if ($continue -ne "S" -and $continue -ne "s") {',
    '      Pause-Script',
    '      exit 1',
    '    }',
    '  } else {',
    '    Write-OK "Driver instalado: $driverName"',
    '  }',
    '}',
    '',
  );

  // 5. Configurar porta
  if (config.isNetwork && config.ipAddress) {
    push(
      'Write-Step "Configurando porta TCP/IP..."',
     `$portName = "${portName}"`,
     `$portAddress = "${config.ipAddress}"`,
      '$portExists = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue',
      '',
      'if ($portExists) {',
      '  Write-OK "Porta já existe: $portName"',
      '  # Atualiza o IP caso tenha mudado',
      '  Set-PrinterPort -Name $portName -PrinterHostAddress $portAddress -ErrorAction SilentlyContinue',
      '} else {',
      '  try {',
      '    Add-PrinterPort -Name $portName -PrinterHostAddress $portAddress',
      '    Write-OK "Porta criada: $portName -> $portAddress"',
      '  } catch {',
      '    Write-ERR "Erro ao criar porta: $_"',
      '    Pause-Script',
      '    exit 1',
      '  }',
      '}',
      '',
    );
  } else {
    push(
      'Write-Step "Verificando porta USB..."',
      '# Para impressoras USB, o Windows cria a porta automaticamente',
      '$usbPorts = Get-PrinterPort | Where-Object { $_.Name -like "USB*" } | Select-Object -First 1',
      'if ($usbPorts) {',
      '  $portName = $usbPorts.Name',
     `  Write-OK "Porta USB detectada: $portName"`,
      '} else {',
      '  Write-WARN "Nenhuma porta USB detectada. Conecte a impressora e execute novamente."',
      '  $portName = "USB001"',
      '}',
      '',
    );
  }

  // 6. Remover impressora antiga com o mesmo nome (se existir)
  push(
    'Write-Step "Verificando impressoras existentes..."',
   `$printerName = "${printerName}"`,
    '$oldPrinter = Get-Printer -Name $printerName -ErrorAction SilentlyContinue',
    'if ($oldPrinter) {',
    '  Write-WARN "Impressora \'$printerName\' já existe. Removendo..."',
    '  Remove-Printer -Name $printerName -Confirm:$false',
    '  Write-OK "Impressora antiga removida"',
    '} else {',
    '  Write-OK "Nome disponível: $printerName"',
    '}',
    '',
  );

  // 7. Adicionar impressora
  push(
    'Write-Step "Adicionando impressora..."',
    'try {',
   `  Add-Printer -Name $printerName -PortName $portName -DriverName $driverName`,
   `  Write-OK "Impressora instalada: $printerName"`,
    '} catch {',
    '  Write-ERR "Erro ao adicionar impressora: $_"',
    '  Write-ERR "Verifique se o driver está correto: $driverName"',
    '  Pause-Script',
    '  exit 1',
    '}',
    '',
  );

  // 8. Definir como padrão (se solicitado)
  if (config.setDefault) {
    push(
      'Write-Step "Definindo como impressora padrão..."',
      'Set-DefaultPrinter -Name $printerName',
      'Write-OK "Impressora definida como padrão"',
      '',
    );
  }

  // 9. Imprimir página de teste (se solicitado)
  if (config.printTest) {
    push(
      'Write-Step "Imprimindo página de teste..."',
      'try {',
      '  $testPage = Invoke-CimMethod -ClassName Win32_Printer -MethodName PrintTestPage -Arguments @{',
      `    Name = "$printerName"`,
      '  }',
      '  Write-OK "Página de teste enviada para $printerName"',
      '  Write-Host ""',
      '  Write-Host "  ============================================ " -ForegroundColor Green',
      '  Write-Host "    VERIFIQUE SE A IMPRESSORA IMPRIMIU" -ForegroundColor Green',
      '  Write-Host "  ============================================ " -ForegroundColor Green',
      '} catch {',
      '  Write-WARN "Não foi possível imprimir página de teste"',
      '  Write-WARN "Verifique se a impressora está ligada e com papel"',
      '}',
      '',
    );
  }

  // Finalização
  push(
    'Write-Host ""',
    'Write-Host "======================================================" -ForegroundColor DarkGreen',
    'Write-Host "  Instalação concluída com sucesso!" -ForegroundColor Green',
   `Write-Host "  Impressora: $printerName" -ForegroundColor White`,
    'Write-Host "======================================================" -ForegroundColor DarkGreen',
    'Write-Host ""',
    'Write-Host "  Você pode imprimir uma nova página de teste com:" -ForegroundColor Gray',
   `Write-Host "  Print-TestPage -PrinterName \\"$printerName\\"" -ForegroundColor White`,
    'Write-Host ""',
    'Pause-Script',
  );

  return lines.join('\r\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;


  const config: PrinterConfig = req.body;

  if (!config.brand || !config.model || !config.ipAddress) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  const script = generateScript(config);
  const filename = `Setup_Impressora_${config.printerName.replace(/\s+/g, '_')}.ps1`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(script);
}
