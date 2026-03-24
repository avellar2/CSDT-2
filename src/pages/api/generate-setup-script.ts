import type { NextApiRequest, NextApiResponse } from 'next';

interface SetupConfig {
  pcName: string;
  school: string;
  adminPassword: string;
  standardUser: string;
  standardPassword: string;
  software: {
    winrar: boolean;
    libreoffice: boolean;
    chrome: boolean;
    adobeReader: boolean;
    vlc: boolean;
    anydesk: boolean;
    officeFromUsb: boolean;
  };
  options: {
    disableHibernation: boolean;
    setWallpaper: boolean;
    enableRDP: boolean;
    disableOneDrive: boolean;
    setTimezone: boolean;
  };
}

function generateScript(config: SetupConfig): string {
  const lines: string[] = [];

  const push = (...args: string[]) => lines.push(...args);

  push(
    '#Requires -RunAsAdministrator',
    '# ============================================================',
    '#  CSDT — Script de Configuração Automática de PC',
   `#  Escola  : ${config.school}`,
   `#  PC      : ${config.pcName}`,
   `#  Gerado  : ${new Date().toLocaleString('pt-BR')}`,
    '# ============================================================',
    '',
    '$ErrorActionPreference = "Continue"',
    '$ProgressPreference    = "SilentlyContinue"',
    '',
    'function Write-Step {',
    '  param([string]$msg)',
    '  Write-Host ""',
    '  Write-Host "  >>> $msg" -ForegroundColor Cyan',
    '}',
    'function Write-OK   { param([string]$msg) Write-Host "  [OK] $msg" -ForegroundColor Green }',
    'function Write-WARN { param([string]$msg) Write-Host "  [!]  $msg" -ForegroundColor Yellow }',
    '',
    'Write-Host ""',
    'Write-Host "======================================================" -ForegroundColor DarkBlue',
   `Write-Host "  CSDT - Setup: ${config.pcName} | ${config.school}" -ForegroundColor White`,
    'Write-Host "======================================================" -ForegroundColor DarkBlue',
    '',
  );

  // 1. Renomear PC
  push(
    'Write-Step "Renomeando o computador..."',
   `$nomePc = "${config.pcName}"`,
    'if ($env:COMPUTERNAME -ne $nomePc) {',
   `  Rename-Computer -NewName $nomePc -Force -ErrorAction SilentlyContinue`,
    '  Write-OK "Computador será renomeado para $nomePc ao reiniciar"',
    '} else {',
    '  Write-OK "Nome já está correto: $nomePc"',
    '}',
    '',
  );

  // 2. Ativar conta Administrador embutida do Windows (SID *-500)
  push(
    'Write-Step "Ativando conta Administrador do Windows..."',
   `$adminPass = ConvertTo-SecureString "${config.adminPassword}" -AsPlainText -Force`,
    '# Busca pelo SID terminado em -500 (Administrador embutido, funciona em PT e EN)',
    '$builtinAdmin = Get-LocalUser | Where-Object { $_.SID -like "*-500" } | Select-Object -First 1',
    'if ($builtinAdmin) {',
    '  Enable-LocalUser -Name $builtinAdmin.Name',
    '  Set-LocalUser -Name $builtinAdmin.Name -Password $adminPass -PasswordNeverExpires $true',
    '  Write-OK "Conta \'$($builtinAdmin.Name)\' ativada e senha definida"',
    '} else {',
    '  Write-WARN "Conta Administrador embutida não encontrada"',
    '}',
    '',
  );

  // 3. Criar usuário padrão
  push(
    'Write-Step "Criando usuário padrão..."',
   `$stdPass = ConvertTo-SecureString "${config.standardPassword}" -AsPlainText -Force`,
   `$stdUser = "${config.standardUser}"`,
    'if (-not (Get-LocalUser -Name $stdUser -ErrorAction SilentlyContinue)) {',
    '  New-LocalUser -Name $stdUser -Password $stdPass -FullName "Secretaria" -Description "Usuário administrativo" -PasswordNeverExpires | Out-Null',
    '  Add-LocalGroupMember -Group "Usuários" -Member $stdUser -ErrorAction SilentlyContinue',
    '  Write-OK "Usuário padrão criado: $stdUser"',
    '} else {',
    '  Set-LocalUser -Name $stdUser -Password $stdPass',
    '  Write-OK "Usuário padrão já existe, senha atualizada: $stdUser"',
    '}',
    '',
  );

  // 4. Software via winget
  const wingetPkgs: { name: string; id: string; enabled: boolean }[] = [
    { name: 'WinRAR',          id: 'RARLab.WinRAR',                    enabled: config.software.winrar },
    { name: 'LibreOffice',     id: 'TheDocumentFoundation.LibreOffice', enabled: config.software.libreoffice },
    { name: 'Google Chrome',   id: 'Google.Chrome',                    enabled: config.software.chrome },
    { name: 'Adobe Reader',    id: 'Adobe.Acrobat.Reader.64-bit',      enabled: config.software.adobeReader },
    { name: 'VLC',             id: 'VideoLAN.VLC',                     enabled: config.software.vlc },
    { name: 'AnyDesk',         id: 'AnyDeskSoftwareGmbH.AnyDesk',      enabled: config.software.anydesk },
  ];

  const enabled = wingetPkgs.filter(p => p.enabled);
  if (enabled.length > 0) {
    push(
      'Write-Step "Instalando programas via winget..."',
      '# Garante que winget está disponível',
      'if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {',
      '  Write-WARN "winget não encontrado. Pulando instalação automática."',
      '} else {',
    );
    for (const pkg of enabled) {
      push(
       `  Write-Host "  Instalando ${pkg.name}..." -ForegroundColor Gray`,
       `  winget install -e --id ${pkg.id} --accept-license --accept-source-agreements --silent 2>&1 | Out-Null`,
       `  Write-OK "${pkg.name} instalado"`,
      );
    }
    push('}', '');
  }

  // 5. Office do pendrive
  if (config.software.officeFromUsb) {
    push(
      'Write-Step "Instalando Microsoft Office do pendrive..."',
      '$setupOffice = Join-Path $PSScriptRoot "Office\\setup.exe"',
      '$configOffice = Join-Path $PSScriptRoot "Office\\configuration.xml"',
      'if (Test-Path $setupOffice) {',
      '  Start-Process -FilePath $setupOffice -ArgumentList "/configure `"$configOffice`"" -Wait -NoNewWindow',
      '  Write-OK "Office instalado"',
      '} else {',
      '  Write-WARN "Instalador do Office não encontrado em: $setupOffice"',
      '}',
      '',
    );
  }

  // 6. Opções extras
  if (config.options.disableHibernation) {
    push(
      'Write-Step "Desativando hibernação..."',
      'powercfg -h off',
      'Write-OK "Hibernação desativada"',
      '',
    );
  }

  if (config.options.disableOneDrive) {
    push(
      'Write-Step "Desativando OneDrive..."',
      'Stop-Process -Name OneDrive -ErrorAction SilentlyContinue',
      'if (Test-Path "$env:SystemRoot\\SysWOW64\\OneDriveSetup.exe") {',
      '  & "$env:SystemRoot\\SysWOW64\\OneDriveSetup.exe" /uninstall 2>&1 | Out-Null',
      '} elseif (Test-Path "$env:SystemRoot\\System32\\OneDriveSetup.exe") {',
      '  & "$env:SystemRoot\\System32\\OneDriveSetup.exe" /uninstall 2>&1 | Out-Null',
      '}',
      'Write-OK "OneDrive desativado"',
      '',
    );
  }

  if (config.options.enableRDP) {
    push(
      'Write-Step "Habilitando Área de Trabalho Remota (RDP)..."',
      'Set-ItemProperty -Path "HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server" -Name "fDenyTSConnections" -Value 0',
      'Enable-NetFirewallRule -DisplayGroup "Área de Trabalho Remota" -ErrorAction SilentlyContinue',
      'Write-OK "RDP habilitado"',
      '',
    );
  }

  if (config.options.setTimezone) {
    push(
      'Write-Step "Configurando fuso horário (Brasília)..."',
      'Set-TimeZone -Id "E. South America Standard Time"',
      'Write-OK "Fuso horário configurado: Brasília (UTC-3)"',
      '',
    );
  }

  if (config.options.setWallpaper) {
    push(
      'Write-Step "Configurando papel de parede..."',
      '$wallpaper = Join-Path $PSScriptRoot "wallpaper.jpg"',
      'if (Test-Path $wallpaper) {',
      '  $dest = "C:\\Windows\\Web\\Wallpaper\\Windows\\wallpaper-csdt.jpg"',
      '  Copy-Item $wallpaper $dest -Force',
      '  Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "Wallpaper" -Value $dest',
      '  RUNDLL32.EXE user32.dll, UpdatePerUserSystemParameters',
      '  Write-OK "Papel de parede aplicado"',
      '} else {',
      '  Write-WARN "Arquivo wallpaper.jpg não encontrado no pendrive"',
      '}',
      '',
    );
  }

  // Finalização
  push(
    'Write-Host ""',
    'Write-Host "======================================================" -ForegroundColor DarkGreen',
    'Write-Host "  Setup concluido com sucesso!" -ForegroundColor Green',
   `Write-Host "  PC: ${config.pcName} | Escola: ${config.school}" -ForegroundColor White`,
    'Write-Host "======================================================" -ForegroundColor DarkGreen',
    'Write-Host ""',
    'Write-WARN "Reinicie o computador para aplicar todas as configuracoes."',
    'Write-Host ""',
    'Read-Host "Pressione ENTER para fechar"',
  );

  return lines.join('\r\n');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const config: SetupConfig = req.body;

  if (!config.pcName || !config.adminUser || !config.adminPassword) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  const script = generateScript(config);
  const filename = `Setup_${config.pcName.replace(/\s+/g, '_')}.ps1`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(script);
}
