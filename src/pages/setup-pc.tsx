import React, { useState } from 'react';
import {
  HardDrive, Download, User, Lock, Monitor, Package,
  CheckCircle, Wrench, WifiHigh, Desktop
} from 'phosphor-react';

const SOFTWARE_OPTIONS = [
  { key: 'winrar',        label: 'WinRAR',                icon: '📦', desc: 'Compactador de arquivos' },
  { key: 'libreoffice',   label: 'LibreOffice',           icon: '📝', desc: 'Suite de escritório gratuita' },
  { key: 'chrome',        label: 'Google Chrome',         icon: '🌐', desc: 'Navegador web' },
  { key: 'adobeReader',   label: 'Adobe Acrobat Reader',  icon: '📄', desc: 'Leitor de PDF' },
  { key: 'vlc',           label: 'VLC Media Player',      icon: '🎬', desc: 'Reprodutor de mídia' },
  { key: 'anydesk',       label: 'AnyDesk',               icon: '🖥️', desc: 'Acesso remoto' },
  { key: 'officeFromUsb', label: 'Microsoft Office',      icon: '💼', desc: 'Instalar do pendrive (pasta /Office)' },
];

const EXTRA_OPTIONS = [
  { key: 'setTimezone',       label: 'Fuso horário Brasília (UTC-3)',   desc: 'Configura automaticamente' },
  { key: 'disableHibernation',label: 'Desativar hibernação',            desc: 'Recomendado para máquinas de secretaria' },
  { key: 'disableOneDrive',   label: 'Remover OneDrive',                desc: 'Desinstala o OneDrive' },
  { key: 'enableRDP',         label: 'Habilitar Acesso Remoto (RDP)',   desc: 'Permite suporte remoto' },
  { key: 'setWallpaper',      label: 'Papel de parede CSDT',            desc: 'Arquivo wallpaper.jpg no pendrive' },
];

const DEFAULT_FORM = {
  pcName: '',
  school: '',
  adminPassword: '',
  standardUser: 'secretaria',
  standardPassword: '',
  software: {
    winrar: true,
    libreoffice: false,
    chrome: true,
    adobeReader: true,
    vlc: false,
    anydesk: true,
    officeFromUsb: false,
  },
  options: {
    setTimezone: true,
    disableHibernation: true,
    disableOneDrive: true,
    enableRDP: false,
    setWallpaper: false,
  },
};

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm p-6">
    <div className="flex items-center gap-2 mb-5">
      <Icon size={20} className="text-orange-500" />
      <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
    {children}
  </div>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none";

export default function SetupPCPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const setSoftware = (key: string, value: boolean) =>
    setForm(f => ({ ...f, software: { ...f.software, [key]: value } }));

  const setOption = (key: string, value: boolean) =>
    setForm(f => ({ ...f, options: { ...f.options, [key]: value } } ));

  const handleGenerate = async () => {
    if (!form.pcName.trim() || !form.adminPassword.trim()) {
      alert('Preencha: Nome do PC e Senha do Administrador');
      return;
    }
    if (form.standardUser.trim().length > 20) {
      alert(`Nome de usuário muito longo (${form.standardUser.trim().length} chars). Windows aceita no máximo 20 caracteres.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-setup-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Erro ao gerar script');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Setup_${form.pcName.replace(/\s+/g, '_') || 'PC'}.ps1`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerated(true);
    } catch (e) {
      alert('Erro ao gerar o script. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const swCount = Object.values(form.software).filter(Boolean).length;
  const optCount = Object.values(form.options).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <HardDrive size={24} className="text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Setup Automático de PC</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Preencha as configurações e baixe o script PowerShell pronto para o pendrive
              </p>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Como usar:</p>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>Preencha as configurações abaixo e clique em <strong>Gerar Script</strong></li>
            <li>Coloque o arquivo <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.ps1</code> na raiz do pendrive</li>
            <li>No PC novo, clique com botão direito no arquivo → <strong>Executar com PowerShell</strong></li>
            <li>Aguarde a conclusão e reinicie o computador</li>
          </ol>
        </div>

        <div className="space-y-6">

          {/* Identificação */}
          <Section icon={Monitor} title="Identificação do Computador">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome do PC" required>
                <input
                  className={inputCls}
                  placeholder="Ex: CSDT-ESCOLA-001"
                  value={form.pcName}
                  onChange={e => setForm(f => ({ ...f, pcName: e.target.value.toUpperCase() }))}
                />
                <p className="text-xs text-gray-400 mt-1">Sem espaços. Use hífens.</p>
              </Field>
              <Field label="Escola / Setor">
                <input
                  className={inputCls}
                  placeholder="Ex: E.M. Santos Dumont"
                  value={form.school}
                  onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
                />
              </Field>
            </div>
          </Section>

          {/* Usuários */}
          <Section icon={User} title="Usuários">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin embutido */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                  Administrador do Windows (conta embutida)
                </p>
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <span className="text-orange-500">🔐</span>
                  <div>
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-300">Conta: Administrador / Administrator</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">O script ativa e define a senha automaticamente</p>
                  </div>
                </div>
                <Field label="Senha do Administrador" required>
                  <input
                    className={inputCls}
                    type="password"
                    placeholder="••••••••"
                    value={form.adminPassword}
                    onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                  />
                </Field>
              </div>
              {/* Padrão */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Conta Padrão (Secretaria)
                </p>
                <Field label="Usuário">
                  <input
                    className={inputCls}
                    placeholder="secretaria"
                    value={form.standardUser}
                    onChange={e => setForm(f => ({ ...f, standardUser: e.target.value }))}
                  />
                  {form.standardUser.trim().length > 20 && (
                    <p className="text-xs text-red-500 mt-1">
                      Máximo 20 caracteres (Windows). Atual: {form.standardUser.trim().length}
                    </p>
                  )}
                </Field>
                <Field label="Senha">
                  <input
                    className={inputCls}
                    type="password"
                    placeholder="••••••••"
                    value={form.standardPassword}
                    onChange={e => setForm(f => ({ ...f, standardPassword: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Software */}
          <Section icon={Package} title={`Programas a Instalar (${swCount} selecionado${swCount !== 1 ? 's' : ''})`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOFTWARE_OPTIONS.map(sw => {
                const checked = (form.software as any)[sw.key];
                return (
                  <label
                    key={sw.key}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      checked
                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-zinc-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-orange-500"
                      checked={checked}
                      onChange={e => setSoftware(sw.key, e.target.checked)}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {sw.icon} {sw.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{sw.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {form.software.officeFromUsb && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-800 dark:text-yellow-300">
                ⚠️ Coloque os arquivos do Office na pasta <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">/Office/</code> na raiz do pendrive (setup.exe + configuration.xml)
              </div>
            )}
          </Section>

          {/* Opções extras */}
          <Section icon={Wrench} title={`Configurações Extras (${optCount} ativa${optCount !== 1 ? 's' : ''})`}>
            <div className="space-y-3">
              {EXTRA_OPTIONS.map(opt => {
                const checked = (form.options as any)[opt.key];
                return (
                  <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="accent-orange-500 w-4 h-4"
                      checked={checked}
                      onChange={e => setOption(opt.key, e.target.checked)}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{opt.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </Section>

          {/* Preview resumo */}
          <div className="bg-zinc-900 dark:bg-zinc-950 rounded-xl p-5 font-mono text-sm text-green-400">
            <p className="text-gray-500 text-xs mb-3"># Prévia do que o script vai executar:</p>
            {form.pcName && <p>Rename-Computer -NewName "<span className="text-yellow-300">{form.pcName}</span>"</p>}
            <p>Enable-LocalUser <span className="text-yellow-300">"Administrador"</span>  <span className="text-gray-500"># conta embutida SID *-500</span></p>
            {form.adminPassword && <p>Set-LocalUser <span className="text-yellow-300">"Administrador"</span> -Password ****</p>}
            {form.standardUser && <p>New-LocalUser <span className="text-yellow-300">"{form.standardUser}"</span> [Padrão]</p>}
            {Object.entries(form.software).filter(([, v]) => v).map(([k]) => {
              const sw = SOFTWARE_OPTIONS.find(s => s.key === k);
              return sw ? (
                <p key={k}>
                  {k === 'officeFromUsb'
                    ? <>setup.exe <span className="text-yellow-300">/configure</span> configuration.xml  <span className="text-gray-500"># Office</span></>
                    : <>winget install <span className="text-yellow-300">{sw.label}</span></>
                  }
                </p>
              ) : null;
            })}
            {form.options.setTimezone && <p>Set-TimeZone <span className="text-yellow-300">"E. South America Standard Time"</span></p>}
            {form.options.disableHibernation && <p>powercfg <span className="text-yellow-300">-h off</span></p>}
            {form.options.disableOneDrive && <p>OneDriveSetup.exe <span className="text-yellow-300">/uninstall</span></p>}
            {form.options.enableRDP && <p>Enable-NetFirewallRule <span className="text-yellow-300">"Área de Trabalho Remota"</span></p>}
            {form.options.setWallpaper && <p>Copy-Item <span className="text-yellow-300">wallpaper.jpg</span> → C:\Windows\Web\Wallpaper\</p>}
          </div>

          {/* Botão */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base shadow-lg"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gerando script...</>
            ) : generated ? (
              <><CheckCircle size={22} weight="bold" /> Script gerado! Clique para gerar novamente</>
            ) : (
              <><Download size={22} weight="bold" /> Gerar e Baixar Script (.ps1)</>
            )}
          </button>

          {generated && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <p className="text-green-800 dark:text-green-300 font-medium">✅ Script baixado com sucesso!</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Coloque o <code className="bg-green-100 dark:bg-green-900 px-1 rounded">.ps1</code> na raiz do pendrive e execute como Administrador no PC novo.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async () => ({ props: {} });
