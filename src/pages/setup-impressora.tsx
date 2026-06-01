import React, { useState, useEffect } from 'react';
import {
  Printer, Download, CheckCircle, Wrench, FlaskConical,
  FileText, Globe
} from 'lucide-react';
import ProtectedRoute from "@/components/ProtectedRoute";

// Lista de impressoras comuns com drivers/URLs de download
const PRINTER_MODELS = [
  {
    key: 'hp',
    brand: 'HP',
    models: [
      { name: 'HP LaserJet 1020', driver: 'HP LaserJet 1020', type: 'usb' },
      { name: 'HP LaserJet 1200', driver: 'HP LaserJet 1200', type: 'usb' },
      { name: 'HP LaserJet P1102', driver: 'HP LaserJet Professional P 1102', type: 'usb' },
      { name: 'HP LaserJet P1108', driver: 'HP LaserJet Professional P 1108', type: 'usb' },
      { name: 'HP LaserJet 2035', driver: 'HP LaserJet M2035', type: 'usb' },
      { name: 'HP LaserJet M127/M128 MFP', driver: 'HP LaserJet Professional M127-M128', type: 'usb' },
      { name: 'HP LaserJet M227', driver: 'HP LaserJet Pro MFP M227', type: 'usb' },
      { name: 'HP LaserJet M428', driver: 'HP LaserJet Pro MFP M428', type: 'network' },
      { name: 'HP Neverstop 1200w', driver: 'HP Neverstop 1200w', type: 'network' },
    ],
  },
  {
    key: 'brother',
    brand: 'Brother',
    models: [
      { name: 'Brother DCP-1510', driver: 'Brother DCP-1510', type: 'usb' },
      { name: 'Brother DCP-1602', driver: 'Brother DCP-1602', type: 'usb' },
      { name: 'Brother HL-1112', driver: 'Brother HL-1112', type: 'usb' },
      { name: 'Brother HL-1212W', driver: 'Brother HL-1212W', type: 'network' },
      { name: 'Brother DCP-T520W', driver: 'Brother DCP-T520W', type: 'network' },
      { name: 'Brother DCP-T720DW', driver: 'Brother DCP-T720DW', type: 'network' },
      { name: 'Brother MFC-L2710DW', driver: 'Brother MFC-L2710DW', type: 'network' },
    ],
  },
  {
    key: 'epson',
    brand: 'Epson',
    models: [
      { name: 'Epson L3150', driver: 'Epson L3150 Series', type: 'network' },
      { name: 'Epson L3250', driver: 'Epson L3250 Series', type: 'network' },
      { name: 'Epson L3750', driver: 'Epson L3750 Series', type: 'network' },
      { name: 'Epson L4150', driver: 'Epson L4150 Series', type: 'network' },
      { name: 'Epson L6170', driver: 'Epson L6170 Series', type: 'network' },
      { name: 'Epson L805', driver: 'Epson L805 Series', type: 'usb' },
      { name: 'Epson Expression XP-2100', driver: 'Epson XP-2100 Series', type: 'usb' },
    ],
  },
  {
    key: 'canon',
    brand: 'Canon',
    models: [
      { name: 'Canon E400', driver: 'Canon E400 series', type: 'usb' },
      { name: 'Canon E480', driver: 'Canon E480 series', type: 'usb' },
      { name: 'Canon G1010', driver: 'Canon G1000 series', type: 'usb' },
      { name: 'Canon G2010', driver: 'Canon G2000 series', type: 'usb' },
      { name: 'Canon G3010', driver: 'Canon G3000 series', type: 'network' },
      { name: 'Canon G4010', driver: 'Canon G4000 series', type: 'network' },
      { name: 'Canon Pixma MG2510', driver: 'Canon MG2500 series', type: 'usb' },
      { name: 'Canon Pixma MG2910', driver: 'Canon MG2900 series', type: 'usb' },
      { name: 'Canon i-SENSYS MF244dw', driver: 'Canon MF240 series', type: 'network' },
    ],
  },
  {
    key: 'samsung',
    brand: 'Samsung',
    models: [
      { name: 'Samsung Xpress M2020W', driver: 'Samsung M2020 Series', type: 'network' },
      { name: 'Samsung Xpress M2070', driver: 'Samsung M2070 Series', type: 'usb' },
      { name: 'Samsung Xpress M2070W', driver: 'Samsung M2070 Series', type: 'network' },
      { name: 'Samsung Xpress M2876', driver: 'Samsung M2876 Series', type: 'network' },
      { name: 'Samsung SL-M2028', driver: 'Samsung SL-M2020 Series', type: 'network' },
    ],
  },
  {
    key: 'kyocera',
    brand: 'Kyocera',
    models: [
      { name: 'Kyocera ECOSYS M2040dn', driver: 'Kyocera ECOSYS M2040dn', type: 'network' },
      { name: 'Kyocera ECOSYS M2635dw', driver: 'Kyocera ECOSYS M2635dw', type: 'network' },
      { name: 'Kyocera ECOSYS P2040dn', driver: 'Kyocera ECOSYS P2040dn', type: 'network' },
      { name: 'Kyocera FS-1040', driver: 'Kyocera FS-1040', type: 'usb' },
      { name: 'Kyocera FS-1060DN', driver: 'Kyocera FS-1060DN', type: 'network' },
    ],
  },
  {
    key: 'xerox',
    brand: 'Xerox',
    models: [
      { name: 'Xerox AltaLink C8035', driver: 'Xerox AltaLink C8035', type: 'network' },
      { name: 'Xerox AltaLink C8055', driver: 'Xerox AltaLink C8055', type: 'network' },
      { name: 'Xerox AltaLink C8030', driver: 'Xerox AltaLink C8030', type: 'network' },
      { name: 'Xerox AltaLink C7020', driver: 'Xerox AltaLink C7020', type: 'network' },
      { name: 'Xerox AltaLink C7025', driver: 'Xerox AltaLink C7025', type: 'network' },
      { name: 'Xerox AltaLink B8045', driver: 'Xerox AltaLink B8045', type: 'network' },
      { name: 'Xerox VersaLink B400', driver: 'Xerox VersaLink B400', type: 'network' },
      { name: 'Xerox VersaLink B405', driver: 'Xerox VersaLink B405', type: 'network' },
      { name: 'Xerox VersaLink C400', driver: 'Xerox VersaLink C400', type: 'network' },
      { name: 'Xerox VersaLink C405', driver: 'Xerox VersaLink C405', type: 'network' },
      { name: 'Xerox WorkCentre 3025', driver: 'Xerox WorkCentre 3025', type: 'network' },
      { name: 'Xerox WorkCentre 3215', driver: 'Xerox WorkCentre 3215', type: 'network' },
      { name: 'Xerox WorkCentre 3225', driver: 'Xerox WorkCentre 3225', type: 'network' },
      { name: 'Xerox WorkCentre 3335', driver: 'Xerox WorkCentre 3335', type: 'network' },
      { name: 'Xerox WorkCentre 6515', driver: 'Xerox WorkCentre 6515', type: 'network' },
    ],
  },
  {
    key: 'oki',
    brand: 'OKI',
    models: [
      { name: 'OKI ES8473', driver: 'OKI ES8473', type: 'network' },
      { name: 'OKI ES8461', driver: 'OKI ES8461', type: 'network' },
      { name: 'OKI ES4161', driver: 'OKI ES4161', type: 'network' },
      { name: 'OKI MC573', driver: 'OKI MC573', type: 'network' },
      { name: 'OKI MC780', driver: 'OKI MC780', type: 'network' },
      { name: 'OKI MC572', driver: 'OKI MC572', type: 'network' },
      { name: 'OKI MC562', driver: 'OKI MC562', type: 'network' },
      { name: 'OKI MB492', driver: 'OKI MB492', type: 'network' },
      { name: 'OKI MB472', driver: 'OKI MB472', type: 'network' },
      { name: 'OKI MB432', driver: 'OKI MB432', type: 'network' },
      { name: 'OKI B512', driver: 'OKI B512', type: 'network' },
      { name: 'OKI B432', driver: 'OKI B432', type: 'network' },
      { name: 'OKI C712', driver: 'OKI C712', type: 'network' },
      { name: 'OKI C612', driver: 'OKI C612', type: 'network' },
      { name: 'OKI C332', driver: 'OKI C332', type: 'network' },
    ],
  },
];

// URLs de download de drivers
const DRIVER_URLS: Record<string, Record<string, string>> = {
  xerox: {
    'AltaLink C8035': 'https://download.support.xerox.com/pub/drivers/WC80xx/WC8055/8055_7.220.1.0_Win10_Win8.1_Win8_Win7_x64.zip',
    'AltaLink C8055': 'https://download.support.xerox.com/pub/drivers/WC80xx/WC8055/8055_7.220.1.0_Win10_Win8.1_Win8_Win7_x64.zip',
    'AltaLink C8030': 'https://download.support.xerox.com/pub/drivers/WC80xx/WC8030/8030_7.220.1.0_Win10_Win8.1_Win8_Win7_x64.zip',
    'AltaLink C7020': 'https://download.support.xerox.com/pub/drivers/WC70xx/WC7020/7020_7.220.1.0_Win10_Win8.1_Win8_Win7_x64.zip',
    'AltaLink C7025': 'https://download.support.xerox.com/pub/drivers/WC70xx/WC7025/7025_7.220.1.0_Win10_Win8.1_Win8_Win7_x64.zip',
    'AltaLink B8045': 'https://download.support.xerox.com/pub/drivers/WB80xx/WB8045/8045_7.220.1.0_Win10_Win8.1_Win8_Win7_x64.zip',
    'VersaLink B400': 'https://download.support.xerox.com/pub/drivers/VLB4xx/VLB400/B400_7.85.10.00_Win10_Win8.1_Win8_Win7_x64.zip',
    'VersaLink B405': 'https://download.support.xerox.com/pub/drivers/VLB4xx/VLB405/B405_7.85.10.00_Win10_Win8.1_Win8_Win7_x64.zip',
    'VersaLink C400': 'https://download.support.xerox.com/pub/drivers/VLC4xx/VLC400/C400_7.85.10.00_Win10_Win8.1_Win8_Win7_x64.zip',
    'VersaLink C405': 'https://download.support.xerox.com/pub/drivers/VLC4xx/VLC405/C405_7.85.10.00_Win10_Win8.1_Win8_Win7_x64.zip',
  },
  oki: {
    'ES8473': 'https://www.oki.com.br/support/download/printer/OKI_ES8473_255_127_119_PS.zip',
    'ES8461': 'https://www.oki.com.br/support/download/printer/OKI_ES8461_255_127_119_PS.zip',
    'ES4161': 'https://www.oki.com.br/support/download/printer/OKI_ES4161_255_127_119_PS.zip',
    'MC573': 'https://www.oki.com.br/support/download/printer/OKI_MC573_255_127_119_PS.zip',
    'MC780': 'https://www.oki.com.br/support/download/printer/OKI_MC780_255_127_119_PS.zip',
    'MC572': 'https://www.oki.com.br/support/download/printer/OKI_MC572_255_127_119_PS.zip',
    'MC562': 'https://www.oki.com.br/support/download/printer/OKI_MC562_255_127_119_PS.zip',
    'MB492': 'https://www.oki.com.br/support/download/printer/OKI_MB492_255_127_119_PS.zip',
    'MB472': 'https://www.oki.com.br/support/download/printer/OKI_MB472_255_127_119_PS.zip',
    'MB432': 'https://www.oki.com.br/support/download/printer/OKI_MB432_255_127_119_PS.zip',
    'C712': 'https://www.oki.com.br/support/download/printer/OKI_C712_255_127_119_PS.zip',
    'C612': 'https://www.oki.com.br/support/download/printer/OKI_C612_255_127_119_PS.zip',
    'C332': 'https://www.oki.com.br/support/download/printer/OKI_C332_255_127_119_PS.zip',
  },
};

const DEFAULT_FORM = {
  brand: '',
  model: '',
  customModel: '',
  ipAddress: '',
  printerName: '',
  sector: '',
  setDefault: false,
  printTest: true,
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

function SetupPrinterPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);

  // Buscar setores da API
  useEffect(() => {
    fetch('/api/chada-diagnostics/sectors')
      .then(res => res.json())
      .then(data => {
        // A API retorna um array de objetos { value, label, sector: { id, name } }
        const sectorNames = data.map((s: any) => s.sector?.name || s.label || s.value);
        setSectors(sectorNames);
      })
      .catch(err => {
        console.error('Erro ao buscar setores:', err);
        // Lista de fallback caso a API falhe
        setSectors([
          'CSDT', 'NAI', 'CAED', 'DGP', 'DJUR', 'CIE', 'CAE', 'CME',
          'CACS FUNDEB', 'DIGITALIZAÇÃO', 'NCR', 'SUPED', 'CEI', 'DEB',
          'DAISE', 'DAIE', 'DPPE', 'CEJA', 'CLL', 'NUMP', 'CEF I',
          'CEF II', 'COTRAN', 'SAGP', 'ASS/SAGP', 'CAT', 'DIE', 'NF',
          'CAESC', 'NL', 'CAPC', 'AC', 'NAA', 'EAG', 'CGP', 'GAB',
          'SUPLAN', 'DCC', 'DCF', 'AG', 'PATRIMONIO', 'REC', 'RG',
          'CHADA', 'OUV', 'NSGE', 'NSGE LAB', 'RPP'
        ]);
      });
  }, []);

  const selectedBrand = PRINTER_MODELS.find(b => b.key === form.brand);
  const selectedModel = selectedBrand?.models.find(m => m.name === form.model);

  // Quando muda a marca, limpa o modelo
  const setBrand = (brand: string) => {
    setForm(f => ({ ...f, brand, model: '' }));
  };

  // Nome da impressora é o nome da escola/setor
  const generatedPrinterName = form.sector;

  const handleGenerate = async () => {
    if (!form.brand || !form.model || !form.ipAddress) {
      alert('Preencha: Marca, Modelo e IP da impressora');
      return;
    }
    if (!form.sector || form.sector.trim() === '') {
      alert('Preencha: Setor');
      return;
    }
    // Validação de IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(form.ipAddress)) {
      alert('IP inválido. Use o formato: 192.168.0.100');
      return;
    }

    setLoading(true);
    try {
      // Busca URL do driver se disponível
      const brandKey = form.brand.toLowerCase();
      let driverUrl: string | null = null;
      const brandDrivers = DRIVER_URLS[brandKey];
      if (brandDrivers) {
        // Procura por match parcial no nome do modelo
        for (const [key, url] of Object.entries(brandDrivers)) {
          if (form.model.includes(key)) {
            driverUrl = url;
            break;
          }
        }
      }

      const res = await fetch('/api/generate-printer-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          printerName: generatedPrinterName,
          driverName: selectedModel?.driver || form.customModel,
          isNetwork: selectedModel?.type === 'network' || form.model === 'custom',
          driverUrl: driverUrl,
        }),
      });

      if (!res.ok) throw new Error('Erro ao gerar script');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Setup_Impressora_${generatedPrinterName.replace(/\s+/g, '_')}.ps1`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerated(true);
    } catch (e) {
      alert('Erro ao gerar o script. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Printer size={24} className="text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Setup Automático de Impressora</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Instalação automática de impressora em rede para setor da SME Duque de Caxias
              </p>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Como usar:</p>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>Configure a impressora com o IP fixo na rede (ex: 192.168.1.100)</li>
            <li>Preencha os dados da impressora abaixo e clique em <strong>Gerar Script</strong></li>
            <li>Execute o script no computador como <strong>Administrador</strong></li>
            <li>Aguarde a instalação e a página de teste</li>
          </ol>
        </div>

        {/* Aviso */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-6">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            ⚠️ <strong>Importante:</strong> A impressora deve estar ligada e conectada na rede antes de executar o script.
            Para impressoras USB, conecte antes de executar.
          </p>
        </div>

        <div className="space-y-6">

          {/* Dados da Impressora */}
          <Section icon={Printer} title="Dados da Impressora">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Marca" required>
                <select
                  className={inputCls}
                  value={form.brand}
                  onChange={e => setBrand(e.target.value)}
                >
                  <option value="">Selecione a marca...</option>
                  {PRINTER_MODELS.map(brand => (
                    <option key={brand.key} value={brand.key}>{brand.brand}</option>
                  ))}
                </select>
              </Field>

              <Field label="Modelo" required>
                {form.brand ? (
                  <select
                    className={inputCls}
                    value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value, customModel: '' }))}
                  >
                    <option value="">Selecione o modelo...</option>
                    {selectedBrand?.models.map(model => (
                      <option key={model.name} value={model.name}>
                        {model.name} {model.type === 'network' ? '🌐' : '🔌'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputCls}
                    disabled
                    placeholder="Selecione a marca primeiro"
                  />
                )}
              </Field>

              <Field label="IP da Impressora" required>
                <input
                  className={inputCls}
                  placeholder="Ex: 192.168.1.100"
                  value={form.ipAddress}
                  onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {selectedModel?.type === 'network' || form.model === 'custom'
                    ? '🌐 Impressora de rede - informe o IP'
                    : '🔌 Impressora USB - deixe em branco ou use para identificação'}
                </p>
              </Field>

              <Field label="Setor" required>
                <input
                  list="sectors-list"
                  className={inputCls}
                  placeholder="Digite o nome do setor..."
                  value={form.sector}
                  onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                />
                <datalist id="sectors-list">
                  {sectors.map(sector => (
                    <option key={sector} value={sector} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-400 mt-1">
                  {sectors.length} setores cadastrados. Digite para buscar.
                </p>
              </Field>
            </div>

            {/* Opções adicionais */}
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-orange-500 w-4 h-4"
                  checked={form.setDefault}
                  onChange={e => setForm(f => ({ ...f, setDefault: e.target.checked }))}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Definir como impressora padrão do Windows
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-orange-500 w-4 h-4"
                  checked={form.printTest}
                  onChange={e => setForm(f => ({ ...f, printTest: e.target.checked }))}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Imprimir página de teste após instalação
                </span>
              </label>
            </div>
          </Section>

          {/* Info da impressora selecionada */}
          {selectedModel && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">📋 Impressora selecionada:</h3>
              <div className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                <p><strong>Marca:</strong> {selectedBrand?.brand}</p>
                <p><strong>Modelo:</strong> {selectedModel.name}</p>
                <p><strong>Driver:</strong> {selectedModel.driver}</p>
                <p><strong>Tipo:</strong> {selectedModel.type === 'network' ? '🌐 Rede' : '🔌 USB'}</p>
                {form.ipAddress && <p><strong>IP:</strong> {form.ipAddress}</p>}
                <p><strong>Nome:</strong> {generatedPrinterName}</p>
              </div>
            </div>
          )}

          {/* Preview do script */}
          <div className="bg-zinc-900 dark:bg-zinc-950 rounded-xl p-5 font-mono text-sm text-green-400">
            <p className="text-gray-500 text-xs mb-3"># Prévia do que o script vai executar:</p>
            {form.ipAddress && <p>Add-PrinterPort -Name "<span className="text-yellow-300">{form.ipAddress}</span>" -PrinterHostAddress "<span className="text-yellow-300">{form.ipAddress}</span>"</p>}
            {selectedModel && <p>Add-PrinterDriver -Name "<span className="text-yellow-300">{selectedModel.driver}</span>"</p>}
            {generatedPrinterName && <p>Add-Printer -Name "<span className="text-yellow-300">{generatedPrinterName}</span>" -PortName "<span className="text-yellow-300">{form.ipAddress || 'USB'}</span>" -DriverName "<span className="text-yellow-300">{selectedModel?.driver || '...'}</span>"</p>}
            {form.setDefault && <p>Set-DefaultPrinter -Name "<span className="text-yellow-300">{generatedPrinterName}</span>"</p>}
            {form.printTest && <p>Print-TestPage -PrinterName "<span className="text-yellow-300">{generatedPrinterName}</span>"</p>}
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
              <><CheckCircle size={22} /> Script gerado! Clique para gerar novamente</>
            ) : (
              <><Download size={22} /> Gerar e Baixar Script (.ps1)</>
            )}
          </button>

          {generated && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <p className="text-green-800 dark:text-green-300 font-medium">✅ Script baixado com sucesso!</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Execute como Administrador no computador onde deseja instalar a impressora.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async () => ({ props: {} });


export default function ProtectedSetupPrinterPage() {
  return <ProtectedRoute><SetupPrinterPage /></ProtectedRoute>;
}