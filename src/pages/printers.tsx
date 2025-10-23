import React, { useEffect, useState } from 'react';
import { MagnifyingGlass, Warning, CheckCircle, XCircle, Clock, Printer as PrinterIcon, Bell } from 'phosphor-react';
import { supabase } from "@/lib/supabaseClient";
import { jwtDecode } from "jwt-decode";

interface Printer {
  id: number;
  sigla: string;
  setor: string;
  modelo: string;
  fabricante: string;
  serial: string;
  ip: string;
}

interface ErrorDetail {
  error: string;
  severity: 'warning' | 'error' | 'critical';
  action: string;
  description: string;
}

interface PrinterStatus {
  id: number;
  ip: string;
  sigla: string;
  status: string;
  errorState: string;
  errors: string[];
  errorDetails?: ErrorDetail[];
  tonerLevel?: number;
  paperStatus: string;
  isOnline: boolean;
  lastChecked: string;
  uptime?: string;
  pageCount?: number;
  hasCriticalErrors?: boolean;
  responseTime?: number;
}

interface PrinterStatusResponse {
  timestamp: string;
  total: number;
  withIssues: number;
  printers: PrinterStatus[];
  source?: string;
  dataAge?: number;
  fallback?: string;
}

const Printers: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatusResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchPrinters = async () => {
    try {
      const response = await fetch('/api/printers');
      const data = await response.json();
      if (Array.isArray(data)) {
        setPrinters(data);
      } else {
        console.error('A resposta da API não é um array:', data);
      }
    } catch (error) {
      console.error('Erro ao buscar impressoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrinterStatus = async () => {
    if (printers.length === 0) return;

    setStatusLoading(true);
    try {
      const response = await fetch('/api/printer-status');
      const data = await response.json();
      setPrinterStatus(data);
    } catch (error) {
      console.error('Erro ao buscar status das impressoras:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchUserRole = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<{ userId: string }>(token);
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) return;

      const response = await fetch(`/api/get-role?userId=${user.id}`);
      const data = await response.json();

      if (response.ok && data.role) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Erro ao buscar role do usuário:", error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchPrinters();
      await fetchUserRole();
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (printers.length > 0) {
      fetchPrinterStatus();

      // Atualizar status a cada 30 segundos
      const interval = setInterval(fetchPrinterStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [printers]);

  const filteredPrinters = printers.filter((printer) =>
    printer.sigla.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.fabricante.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.ip.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrinterStatus = (printerId: number): PrinterStatus | undefined => {
    return printerStatus?.printers.find(p => p.id === printerId);
  };

  const getStatusColor = (status: PrinterStatus | undefined) => {
    if (!status || !status.isOnline) return 'bg-gray-400';
    if (status.errors.some(error => error !== 'Sem Erro')) return 'bg-red-500';
    if (status.status === 'imprimindo') return 'bg-blue-500';
    if (status.status === 'aguardando') return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getStatusIcon = (status: PrinterStatus | undefined) => {
    if (!status || !status.isOnline) return <XCircle size={20} />;
    if (status.errors.some(error => error !== 'Sem Erro')) return <Warning size={20} />;
    return <CheckCircle size={20} />;
  };

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR');
  };

  const printersWithIssues = printerStatus?.printers.filter(p => 
    !p.isOnline || p.errors.some(error => error !== 'Sem Erro')
  ) || [];

  const testPrinterDetail = async (ip: string) => {
    try {
      const response = await fetch(`/api/test-printer-detail?ip=${ip}`);
      const data = await response.json();
      
      if (data.success) {
        // Mostrar resultados em um modal ou console
        console.log('Detalhes SNMP da impressora:', data.data);
        
        // Criar uma mensagem mais detalhada e organizada
        const results = data.data.oids;
        let message = `=== DIAGNÓSTICO DETALHADO ===\nImpressora: ${ip}\n\n`;
        
        // Informações básicas
        if (results.sysDescr?.value) {
          message += `📟 Modelo: ${results.sysDescr.value}\n`;
        }
        
        if (results.hrDeviceStatus?.interpretation) {
          message += `🔄 Status: ${results.hrDeviceStatus.interpretation}\n`;
        }
        
        // Erros específicos detectados
        if (results.hrPrinterDetectedErrorState?.errorBits?.length > 0) {
          message += `\n❌ ERROS DETECTADOS:\n`;
          results.hrPrinterDetectedErrorState.errorBits.forEach((error: string) => {
            message += `   • ${error}\n`;
          });
        }
        
        // Análise de consumíveis
        message += `\n🖨️ CONSUMÍVEIS:\n`;
        
        for (let i = 1; i <= 4; i++) {
          const descricao = results[`consumivel${i}_descricao`]?.value;
          const nivel = results[`consumivel${i}_nivel`]?.value;
          const tipo = results[`consumivel${i}_tipo`]?.interpretation;
          const capacidade = results[`consumivel${i}_capacidade`]?.value;
          const porcentagem = results[`consumivel${i}_nivel`]?.percentage;
          
          if (descricao || nivel !== undefined || tipo) {
            message += `   Slot ${i}:\n`;
            
            if (descricao) {
              message += `     Nome: ${descricao}\n`;
            }
            
            if (tipo) {
              message += `     Tipo: ${tipo}\n`;
            }
            
            if (nivel !== undefined) {
              if (porcentagem !== undefined) {
                message += `     Nível: ${nivel} unidades (${porcentagem}%)\n`;
              } else {
                message += `     Nível: ${nivel} unidades\n`;
              }
              
              // Interpretar nível
              if (porcentagem !== undefined) {
                if (porcentagem <= 5) {
                  message += `     ⚠️ CRÍTICO - Substituir urgentemente!\n`;
                } else if (porcentagem <= 15) {
                  message += `     ⚠️ BAIXO - Solicitar reposição\n`;
                } else if (porcentagem >= 80) {
                  message += `     ✅ OK - Nível adequado\n`;
                }
              }
            }
            
            if (capacidade) {
              message += `     Capacidade máxima: ${capacidade} unidades\n`;
            }
            
            message += `\n`;
          }
        }
        
        // Status do papel
        if (results.papel_bandeja1_status?.value !== undefined || results.papel_bandeja2_status?.value !== undefined) {
          message += `📄 PAPEL:\n`;
          
          if (results.papel_bandeja1_status?.value !== undefined) {
            const status = results.papel_bandeja1_status.value;
            message += `   Bandeja 1: ${status === 0 ? '❌ Vazia' : status === 1 ? '⚠️ Baixa' : '✅ OK'}\n`;
          }
          
          if (results.papel_bandeja2_status?.value !== undefined) {
            const status = results.papel_bandeja2_status.value;
            message += `   Bandeja 2: ${status === 0 ? '❌ Vazia' : status === 1 ? '⚠️ Baixa' : '✅ OK'}\n`;
          }
        }
        
        message += `\n💡 Dica: Se os valores parecem incorretos, a impressora pode usar OIDs proprietários diferentes.`;
        
        alert(message);
      } else {
        alert(`Erro ao testar impressora: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao testar impressora:', error);
      alert('Erro ao conectar com a impressora');
    }
  };

  const discoverPrinterOIDs = async (ip: string) => {
    try {
      const response = await fetch(`/api/discover-printer-oids?ip=${ip}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Descoberta de OIDs:', data.data);
        
        const results = data.data;
        let message = `=== DESCOBERTA DE CONSUMÍVEIS ===\nImpressora: ${ip}\n\n`;
        
        message += `📟 Modelo: ${results.sysDescr}\n`;
        message += `🏭 Fabricante detectado: ${results.manufacturer.toUpperCase()}\n\n`;
        
        if (results.consumables && results.consumables.length > 0) {
          message += `🖨️ CONSUMÍVEIS ENCONTRADOS:\n`;
          
          results.consumables.forEach((consumable: any, index: number) => {
            message += `\n   ${consumable.slot}. ${consumable.name}\n`;
            message += `      Tipo: ${consumable.type}\n`;
            message += `      Nível: ${consumable.level}${consumable.level < 100 ? ' unidades' : '%'}\n`;
            message += `      OID: ${consumable.oid}\n`;
            message += `      Específico do fabricante: ${consumable.manufacturer_specific ? 'Sim' : 'Não'}\n`;
            
            // Interpretar nível
            if (typeof consumable.level === 'number') {
              if (consumable.level <= 5) {
                message += `      🚨 CRÍTICO - Substituir urgentemente!\n`;
              } else if (consumable.level <= 15) {
                message += `      ⚠️ BAIXO - Solicitar reposição\n`;
              } else if (consumable.level >= 80) {
                message += `      ✅ OK - Nível adequado\n`;
              }
            }
          });
        } else {
          message += `❌ Nenhum consumível detectado automaticamente.\n`;
          message += `\nIsso pode significar que:\n`;
          message += `• A impressora usa OIDs proprietários não mapeados\n`;
          message += `• SNMP não está totalmente habilitado\n`;
          message += `• Modelo não suportado pelo sistema padrão\n`;
        }
        
        message += `\n💡 Dica: Esta funcionalidade tenta detectar automaticamente os consumíveis usando OIDs específicos do fabricante.`;
        
        alert(message);
      } else {
        alert(`Erro ao descobrir OIDs: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao descobrir OIDs:', error);
      alert('Erro ao conectar com a impressora');
    }
  };

  const diagnoseSNMP = async (ip: string) => {
    try {
      const response = await fetch(`/api/diagnose-snmp?ip=${ip}`);
      const data = await response.json();
      
      let message = `=== DIAGNÓSTICO SNMP ===\nImpressora: ${ip}\n`;
      message += `Ambiente: ${data.diagnostics.environment}\n`;
      message += `Servidor: ${data.diagnostics.server.platform} ${data.diagnostics.server.arch}\n\n`;
      
      message += `TESTES REALIZADOS:\n`;
      data.diagnostics.tests.forEach((test: any, index: number) => {
        const status = test.status === 'success' ? '✅' : test.status === 'failed' ? '❌' : 'ℹ️';
        message += `${status} ${test.test}: ${test.details}\n`;
        if (test.error) message += `   Erro: ${test.error}\n`;
        if (test.result) message += `   Resultado: ${test.result}\n`;
        message += `\n`;
      });
      
      if (data.suggestions && data.suggestions.length > 0) {
        message += `SUGESTÕES:\n`;
        data.suggestions.forEach((suggestion: string, index: number) => {
          message += `• ${suggestion}\n`;
        });
      }
      
      alert(message);
    } catch (error) {
      console.error('Erro ao diagnosticar SNMP:', error);
      alert('Erro ao executar diagnóstico');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Lista de Impressoras</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-md animate-pulse"
            >
              <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lista de Impressoras</h1>
        <div className="flex items-center gap-4">
          {printerStatus && (
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2">
                Última atualização: {formatLastChecked(printerStatus.timestamp)}
                {statusLoading && <Clock className="inline ml-2 animate-spin" size={16} />}
              </div>
              {printerStatus.source && (
                <div className="text-xs mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    printerStatus.source === 'local-agent' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {printerStatus.source === 'local-agent' ? '🏠 Agente Local' : '☁️ Vercel SNMP'}
                    {printerStatus.dataAge !== undefined && printerStatus.source === 'local-agent' && (
                      <span className="ml-1">({printerStatus.dataAge}s)</span>
                    )}
                  </span>
                  {printerStatus.fallback && (
                    <span className="ml-2 text-yellow-600 text-xs">
                      (Fallback: {printerStatus.fallback})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full ${showNotifications ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            <Bell size={20} />
          </button>
          
          <button
            onClick={fetchPrinterStatus}
            disabled={statusLoading}
            className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
            title="Atualizar status agora"
          >
            {statusLoading ? <Clock className="animate-spin" size={20} /> : "🔄"}
          </button>
        </div>
      </div>

      {/* Painel de Notificações - Apenas para ADMIN e ADMTOTAL */}
      {showNotifications && printersWithIssues.length > 0 && (userRole === 'ADMIN' || userRole === 'ADMTOTAL') && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center mb-2">
            <Warning className="text-red-500 mr-2" size={24} />
            <h3 className="text-lg font-semibold text-red-800">
              Impressoras com Problemas ({printersWithIssues.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {printersWithIssues.map((printer) => {
              const printerInfo = printers.find(p => p.id === printer.id);
              return (
                <div key={printer.id} className="bg-white p-3 rounded border border-red-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-red-800">{printer.sigla}</div>
                    {printerInfo && printerInfo.ip && printerInfo.ip !== 'não informado' && (
                      <a
                        href={`http://${printerInfo.ip}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        title="Abrir interface da impressora"
                      >
                        🔗 {printerInfo.ip}
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-red-600">
                    {printer.isOnline ? (
                      <ul className="list-disc list-inside">
                        {printer.errors.filter(error => error !== 'No Error' && error !== 'Sem Erro').map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    ) : (
                      'Offline'
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicador de Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium text-blue-800">
              Modo: SNMP (Status Detalhado)
            </span>
          </div>
          <div className="text-xs text-blue-600">
            Obtém informações detalhadas sobre papel, toner e erros via protocolo SNMP
          </div>
        </div>
      </div>

      {/* Aviso sobre Problemas de Conectividade */}
      {printerStatus && printerStatus.printers.filter(p => p.isOnline).length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 text-lg">⚠️</span>
            <h3 className="font-bold text-red-800">Todas as impressoras estão offline</h3>
          </div>
          <p className="text-sm text-red-700 mb-3">
            Isso pode indicar problema de conectividade de rede entre o servidor e as impressoras.
          </p>
          <div className="text-xs text-red-600">
            <strong>Possíveis causas:</strong>
            <ul className="list-disc list-inside mt-1">
              <li>Servidor em rede/VLAN diferente das impressoras</li>
              <li>Firewall bloqueando protocolo SNMP (porta 161)</li>
              <li>SNMP desabilitado nas impressoras</li>
              <li>Community string diferente de "public"</li>
            </ul>
            <p className="mt-2">
              <strong>Dica:</strong> Use o botão "🔍 Diagnóstico SNMP" em qualquer impressora para investigar.
            </p>
          </div>
        </div>
      )}

      {/* Resumo do Status */}
      {printerStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{printerStatus.total}</p>
              </div>
              <PrinterIcon className="text-gray-400" size={32} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Online</p>
                <p className="text-2xl font-bold text-green-600">
                  {printerStatus.printers.filter(p => p.isOnline).length}
                </p>
              </div>
              <CheckCircle className="text-green-400" size={32} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Com Problemas</p>
                <p className="text-2xl font-bold text-red-600">{printerStatus.withIssues}</p>
              </div>
              <Warning className="text-red-400" size={32} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-gray-600">
                  {printerStatus.printers.filter(p => !p.isOnline).length}
                </p>
              </div>
              <XCircle className="text-gray-400" size={32} />
            </div>
          </div>
        </div>
      )}


      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Pesquisar impressoras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 rounded-lg dark:bg-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrinters.map((printer) => {
          const status = getPrinterStatus(printer.id);
          const statusColor = getStatusColor(status);
          const hasIssues = status && (!status.isOnline || status.errors.some(error => error !== 'Sem Erro'));
          
          return (
            <div
              key={printer.id}
              className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-l-4 ${
                hasIssues ? 'border-red-500' : status?.isOnline ? 'border-green-500' : 'border-gray-400'
              }`}
            >
              {/* Header com Status */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-blue-600">{printer.sigla}</h2>
                  <p className="text-sm text-gray-500">{printer.setor}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs ${statusColor}`}>
                    {getStatusIcon(status)}
                    <span className="capitalize">
                      {status ? (status.isOnline ? status.status : 'offline') : 'checking...'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <a
                      href={`http://${printer.ip}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 text-xs underline"
                    >
                      Acessar Interface
                    </a>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => diagnoseSNMP(printer.ip)}
                        className="text-red-500 hover:text-red-700 text-xs underline font-semibold"
                      >
                        🔍 Diagnóstico SNMP
                      </button>
                      {status && !status.isOnline && (
                        <>
                          <button
                            onClick={() => testPrinterDetail(printer.ip)}
                            className="text-orange-500 hover:text-orange-700 text-xs underline"
                          >
                            Diagnóstico Completo
                          </button>
                          <button
                            onClick={() => discoverPrinterOIDs(printer.ip)}
                            className="text-purple-500 hover:text-purple-700 text-xs underline"
                          >
                            Detectar Consumíveis
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações da Impressora */}
              <div className="space-y-2 mb-4">
                <p className="text-gray-600 text-sm"><strong>Modelo:</strong> {printer.modelo}</p>
                <p className="text-gray-600 text-sm"><strong>Fabricante:</strong> {printer.fabricante}</p>
                <p className="text-gray-600 text-sm"><strong>IP:</strong> {printer.ip}</p>
              </div>

              {/* Status Detalhado */}
              {status && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Papel:</span>
                      <span className={`ml-1 font-medium ${
                        status.paperStatus === 'empty' ? 'text-red-600' :
                        status.paperStatus === 'low' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {status.paperStatus === 'empty' ? 'Vazio' :
                         status.paperStatus === 'low' ? 'Baixo' :
                         status.paperStatus === 'ok' ? 'OK' : 'N/A'}
                      </span>
                    </div>
                    {status.tonerLevel !== undefined && (
                      <div>
                        <span className="text-gray-500">Toner:</span>
                        <span className={`ml-1 font-medium ${
                          status.tonerLevel < 20 ? 'text-red-600' :
                          status.tonerLevel < 50 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {status.tonerLevel}%
                        </span>
                      </div>
                    )}
                    {status.uptime && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Uptime:</span>
                        <span className="ml-1 text-gray-700">{status.uptime}</span>
                      </div>
                    )}
                  </div>

                  {/* Erros Detalhados */}
                  {status.errors.some(error => error !== 'Sem Erro') && (
                    <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                      <div className="text-xs font-bold text-red-800 mb-2">Problemas Detectados:</div>
                      <div className="space-y-2">
                        {status.errorDetails && status.errorDetails.length > 0 ? (
                          status.errorDetails.map((errorDetail, idx) => (
                            <div key={idx} className={`p-2 rounded text-xs ${
                              errorDetail.severity === 'critical' ? 'bg-red-100 border border-red-300' :
                              errorDetail.severity === 'error' ? 'bg-orange-100 border border-orange-300' :
                              'bg-yellow-100 border border-yellow-300'
                            }`}>
                              <div className="flex items-center gap-1 font-medium">
                                <Warning size={12} className={
                                  errorDetail.severity === 'critical' ? 'text-red-600' :
                                  errorDetail.severity === 'error' ? 'text-orange-600' :
                                  'text-yellow-600'
                                } />
                                <span className={
                                  errorDetail.severity === 'critical' ? 'text-red-800' :
                                  errorDetail.severity === 'error' ? 'text-orange-800' :
                                  'text-yellow-800'
                                }>{errorDetail.error}</span>
                              </div>
                              <div className={`mt-1 text-xs ${
                                errorDetail.severity === 'critical' ? 'text-red-700' :
                                errorDetail.severity === 'error' ? 'text-orange-700' :
                                'text-yellow-700'
                              }`}>
                                <div className="font-medium">Ação: {errorDetail.action}</div>
                                <div className="mt-1 italic">{errorDetail.description}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback para erros sem detalhes
                          status.errors.filter(error => error !== 'Sem Erro').map((error, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-xs text-red-700">
                              <Warning size={12} />
                              {error}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    Última verificação: {formatLastChecked(status.lastChecked)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Painel de Diagnóstico Rápido */}
      {printerStatus && printersWithIssues.length > 0 && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-4">🔧 Diagnóstico Rápido</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded border border-blue-300">
              <h4 className="font-semibold text-blue-800 mb-2">Online</h4>
              <p className="text-sm text-blue-700">
                {printerStatus.printers.filter(p => p.isOnline && p.errors.every(error => error === 'Sem Erro')).length} impressoras 
                funcionando normalmente sem problemas detectados.
              </p>
            </div>
            <div className="bg-white p-4 rounded border border-red-300">
              <h4 className="font-semibold text-red-800 mb-2">Erros Críticos</h4>
              <p className="text-sm text-red-700">
                {printerStatus.printers.filter(p => p.hasCriticalErrors).length} impressoras 
                com problemas que impedem impressão.
              </p>
            </div>
            <div className="bg-white p-4 rounded border border-gray-300">
              <h4 className="font-semibold text-gray-800 mb-2">Offline</h4>
              <p className="text-sm text-gray-700">
                {printerStatus.printers.filter(p => !p.isOnline).length} impressoras 
                não estão respondendo na rede.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> O sistema agora mostra apenas problemas realmente críticos que impedem 
              o funcionamento das impressoras. Estados de aviso menores não são mais exibidos como erro.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Printers;