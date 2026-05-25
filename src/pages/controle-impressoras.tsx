import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import {
  ArrowLeft,
  Search,
  List,
  LayoutGrid,
  PrinterCheck,
  FileText,
  Check,
  X,
} from 'lucide-react';

interface Printer {
  id: number;
  sigla: string;
  setor: string;
  modelo: string;
  fabricante: string;
  serial: string;
  ip: string;
}

interface EditablePrinter extends Printer {
  selected: boolean;
}

type EditableField = 'modelo' | 'fabricante' | 'serial' | 'ip' | 'setor';

const ControleImpressoras: React.FC = () => {
  const router = useRouter();

  const [printers, setPrinters] = useState<EditablePrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterFabricante, setFilterFabricante] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const data = await response.json();

        if (response.ok && data.role) {
          setUserRole(data.role);
          setUserName(data.displayName || '');

          if (!['ADMTOTAL', 'ADMIN'].includes(data.role)) {
            router.push('/dashboard');
            return;
          }
        } else {
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Erro ao buscar role do usuario:', err);
        router.push('/dashboard');
        return;
      }
    };

    checkAuth();
  }, [router]);

  // Fetch printers
  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/printers');
        const data = await response.json();
        if (Array.isArray(data)) {
          setPrinters(data.map((p: Printer) => ({ ...p, selected: false })));
        }
      } catch (err) {
        console.error('Erro ao buscar impressoras:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrinters();
  }, []);

  // Auto-focus edit input
  useEffect(() => {
    if (editingId !== null && editingField !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId, editingField]);

  // Derived: unique filter values
  const uniqueSetores = Array.from(new Set(printers.map(p => p.setor).filter(Boolean))).sort();
  const uniqueFabricantes = Array.from(new Set(printers.map(p => p.fabricante).filter(Boolean))).sort();

  // Derived: filtered printers
  const filteredPrinters = printers.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      p.sigla.toLowerCase().includes(term) ||
      p.modelo.toLowerCase().includes(term) ||
      p.fabricante.toLowerCase().includes(term) ||
      p.serial.toLowerCase().includes(term) ||
      p.ip.toLowerCase().includes(term) ||
      p.setor.toLowerCase().includes(term);

    const matchesSetor = !filterSetor || p.setor === filterSetor;
    const matchesFabricante = !filterFabricante || p.fabricante === filterFabricante;

    return matchesSearch && matchesSetor && matchesFabricante;
  });

  const selectedCount = filteredPrinters.filter(p => p.selected).length;

  // Toggle all selection
  const toggleSelectAll = useCallback(() => {
    const allSelected = filteredPrinters.every(p => p.selected);
    setPrinters(prev => prev.map(p => {
      const isInFiltered = filteredPrinters.some(fp => fp.id === p.id);
      return isInFiltered ? { ...p, selected: !allSelected } : p;
    }));
  }, [filteredPrinters]);

  // Toggle single selection
  const togglePrinter = useCallback((id: number) => {
    setPrinters(prev => prev.map(p =>
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  }, []);

  // Inline editing
  const startEdit = useCallback((id: number, field: EditableField, value: string) => {
    setEditingId(id);
    setEditingField(field);
    setEditValue(value);
  }, []);

  const confirmEdit = useCallback(() => {
    if (editingId !== null && editingField !== null) {
      setPrinters(prev => prev.map(p =>
        p.id === editingId ? { ...p, [editingField]: editValue } : p
      ));
    }
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  }, [editingId, editingField, editValue]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  }, []);

  // PDF generation
  const handleGeneratePDF = async () => {
    const selectedPrinters = printers.filter(p => p.selected);
    if (selectedPrinters.length === 0) return;

    setGenerating(true);
    try {
      const payload = {
        printers: selectedPrinters.map(p => ({
          sigla: p.sigla,
          modelo: p.modelo,
          fabricante: p.fabricante,
          serial: p.serial,
          ip: p.ip,
          setor: p.setor,
        })),
        responsavel: userName || undefined,
      };

      const response = await fetch('/api/generate-printer-control-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'controle-impressoras.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-b-2 border-b-blue-500 rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 text-sm">Carregando impressoras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Voltar ao Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Controle de Impressoras
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecione e edite impressoras para gerar o PDF de controle
                </p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
                Tabela
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por sigla, modelo, fabricante, serial, IP ou setor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Setor filter */}
            <select
              value={filterSetor}
              onChange={e => setFilterSetor(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Todos os setores</option>
              {uniqueSetores.map(setor => (
                <option key={setor} value={setor}>{setor}</option>
              ))}
            </select>

            {/* Fabricante filter */}
            <select
              value={filterFabricante}
              onChange={e => setFilterFabricante(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Todos os fabricantes</option>
              {uniqueFabricantes.map(fab => (
                <option key={fab} value={fab}>{fab}</option>
              ))}
            </select>

            {/* Toggle all */}
            <button
              onClick={toggleSelectAll}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filteredPrinters.every(p => p.selected)
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
              }`}
            >
              {filteredPrinters.every(p => p.selected)
                ? 'Desselecionar Todos'
                : 'Selecionar Todos'
              }
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-32">
        {filteredPrinters.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <PrinterCheck className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
              Nenhuma impressora encontrada
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Tente ajustar os filtros ou termo de busca
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table view */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={filteredPrinters.length > 0 && filteredPrinters.every(p => p.selected)}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Sigla</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Modelo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Fabricante</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Serial</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Setor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredPrinters.map((printer, index) => {
                    const isEditing = editingId === printer.id;
                    const isRowSelected = printer.selected;

                    const renderEditableCell = (field: EditableField, value: string) => {
                      if (isEditing && editingField === field) {
                        return (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onBlur={confirmEdit}
                              className="w-full px-2 py-1 text-sm bg-yellow-50 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-600 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 dark:text-white"
                            />
                          </div>
                        );
                      }
                      return (
                        <span
                          onClick={() => startEdit(printer.id, field, value)}
                          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 px-2 py-1 rounded text-sm transition-colors"
                          title="Clique para editar"
                        >
                          {value || <span className="text-gray-300 dark:text-gray-500 italic">vazio</span>}
                        </span>
                      );
                    };

                    return (
                      <tr
                        key={printer.id}
                        className={`transition-colors ${
                          isRowSelected
                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                            : index % 2 === 0
                              ? 'bg-white dark:bg-gray-800'
                              : 'bg-gray-50 dark:bg-gray-750'
                        } ${!isRowSelected ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={printer.selected}
                            onChange={() => togglePrinter(printer.id)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {printer.sigla}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {renderEditableCell('modelo', printer.modelo)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {renderEditableCell('fabricante', printer.fabricante)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {renderEditableCell('serial', printer.serial)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {renderEditableCell('ip', printer.ip)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {renderEditableCell('setor', printer.setor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrinters.map(printer => {
              const isCardSelected = printer.selected;

              const renderEditableField = (field: EditableField, label: string, value: string) => {
                const isEditingThis = editingId === printer.id && editingField === field;
                if (isEditingThis) {
                  return (
                    <div onClick={e => e.stopPropagation()}>
                      <label className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">{label}</label>
                      <div className="flex items-center gap-1">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') confirmEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          onBlur={confirmEdit}
                          className="w-full px-2 py-1 text-xs bg-yellow-50 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-600 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  );
                }
                return (
                  <div onClick={e => e.stopPropagation()}>
                    <label className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">{label}</label>
                    <span
                      onClick={() => startEdit(printer.id, field, value)}
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 px-1.5 py-0.5 rounded text-xs transition-colors block"
                      title="Clique para editar"
                    >
                      {value || <span className="text-gray-300 dark:text-gray-500 italic">vazio</span>}
                    </span>
                  </div>
                );
              };

              return (
                <div
                  key={printer.id}
                  onClick={() => togglePrinter(printer.id)}
                  className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    isCardSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400 shadow-md'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                  } ${!isCardSelected ? 'opacity-70' : ''}`}
                >
                  {/* Selection badge */}
                  {isCardSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Card title */}
                  <div className="mb-3 pr-8">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{printer.sigla}</span>
                    <span className="text-gray-400 dark:text-gray-500 mx-1.5">/</span>
                    <span className="text-gray-600 dark:text-gray-300 text-sm">{printer.modelo}</span>
                  </div>

                  {/* Card fields */}
                  <div className="grid grid-cols-2 gap-2">
                    {renderEditableField('fabricante', 'Fabricante', printer.fabricante)}
                    {renderEditableField('serial', 'Serial', printer.serial)}
                    {renderEditableField('ip', 'IP', printer.ip)}
                    {renderEditableField('setor', 'Setor', printer.setor)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {selectedCount} de {filteredPrinters.length} impressora{filteredPrinters.length !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={selectedCount === 0 || generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Gerar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControleImpressoras;