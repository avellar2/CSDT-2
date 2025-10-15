import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import BarcodeScanner from "@/components/Scanner/BarcodeScanner";
import { BarcodeScannerAdvanced } from "@/components/Scanner/BarcodeScannerAdvanced";
import { dataCache, persistentCache } from '@/utils/cache';
import Select from 'react-select';
import { 
  Computer, 
  Barcode, 
  Building2, 
  Tag, 
  Package, 
  Scan, 
  Save, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Camera,
  History,
  Plus,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SchoolOption {
  value: number;
  label: string;
}

interface RecentItem {
  name: string;
  brand: string;
  timestamp: string;
}

const predefinedItems = [
  "COMPUTADOR", "MONITOR", "MOUSE", "TECLADO", "ESTABILIZADOR", 
  "IMPRESSORA", "NOTEBOOK", "TABLET", "PROJETOR", "SWITCH", "FONTE DE NOTEBOOK", "CABO DE FORÇA"
];

const commonBrands = {
  COMPUTADOR: ["DELL", "HP", "LENOVO", "ACER", "ASUS"],
  MONITOR: ["DELL", "LG", "SAMSUNG", "AOC", "HP"],
  IMPRESSORA: ["HP", "CANON", "EPSON", "BROTHER", "KYOCERA"],
  NOTEBOOK: ["DELL", "HP", "LENOVO", "ACER", "ASUS"],
  TABLET: ["SAMSUNG", "APPLE", "LENOVO", "MULTILASER"]
};

interface ItemFormModernProps {
  onToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
}

export const ItemFormModern: React.FC<ItemFormModernProps> = ({ onToast }) => {
  const router = useRouter();
  
  // Form States
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    serialNumber: "",
    schoolId: ""
  });

  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  
  // UI States
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Validation States
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  // Load user and data on mount
  useEffect(() => {
    initializeComponent();
    loadRecentItems();
  }, []);

  const initializeComponent = async () => {
    try {
      // Get current user from Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      
      setCurrentUser(user);
      await loadSchools();
    } catch (error) {
      console.error('Erro ao inicializar:', error);
      onToast('Erro ao carregar dados iniciais', 'error');
    }
  };

  const loadSchools = async () => {
    try {
      // Try to get from cache first
      let schoolOptions = dataCache.getSchools();
      
      if (!schoolOptions) {
        // If not in cache, fetch from API
        const response = await fetch('/api/all-schools');
        const data = await response.json();
        
        if (Array.isArray(data)) {
          schoolOptions = data.map((school: { id: number, name: string }) => ({
            value: school.id,
            label: school.name,
          }));
          // Cache the data
          dataCache.setSchools(schoolOptions);
        }
      }
      
      if (schoolOptions) {
        setSchools(schoolOptions);
      }
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      onToast('Erro ao carregar lista de escolas', 'error');
    }
  };

  const loadRecentItems = () => {
    // Try cache first, then persistent storage
    let recent = dataCache.getRecentItems();
    if (!recent) {
      recent = persistentCache.get<RecentItem[]>('recent-items') || [];
      if (recent.length > 0) {
        dataCache.setRecentItems(recent);
      }
    }
    setRecentItems(recent || []);
  };

  const saveRecentItem = (item: { name: string; brand: string }) => {
    const newItem: RecentItem = {
      ...item,
      timestamp: new Date().toISOString()
    };
    
    const updated = [newItem, ...recentItems.filter(r => 
      !(r.name === item.name && r.brand === item.brand)
    )].slice(0, 10); // Keep last 10 items
    
    setRecentItems(updated);
    
    // Update both cache and persistent storage
    dataCache.setRecentItems(updated);
    persistentCache.set('recent-items', updated);
  };

  // Real-time validation
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Nome do item é obrigatório';
        } else {
          delete newErrors.name;
        }
        break;
      
      case 'brand':
        if (!value.trim()) {
          newErrors.brand = 'Marca é obrigatória';
        } else if (value.trim().length < 2) {
          newErrors.brand = 'Marca deve ter pelo menos 2 caracteres';
        } else {
          delete newErrors.brand;
        }
        break;
      
      case 'serialNumber':
        if (!value.trim()) {
          newErrors.serialNumber = 'Número de série é obrigatório';
        } else if (value.trim().length < 3) {
          newErrors.serialNumber = 'Número de série deve ter pelo menos 3 caracteres';
        } else {
          delete newErrors.serialNumber;
        }
        break;
      
      case 'schoolId':
        if (!value && !selectedSchool) {
          newErrors.schoolId = 'Escola é obrigatória';
        } else {
          delete newErrors.schoolId;
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const handleSchoolChange = (selectedOption: SchoolOption | null) => {
    setSelectedSchool(selectedOption);
    setFormData(prev => ({ 
      ...prev, 
      schoolId: selectedOption ? selectedOption.value.toString() : "" 
    }));
    setTouched(prev => ({ ...prev, schoolId: true }));
    validateField('schoolId', selectedOption ? selectedOption.value.toString() : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const isValid = Object.keys(formData).every(field => 
      validateField(field, formData[field as keyof typeof formData])
    );
    
    if (!isValid) {
      onToast('Por favor, corrija os erros no formulário', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onToast('Sessão expirada. Faça login novamente.', 'error');
        router.push('/login');
        return;
      }

      // Convert to uppercase
      const itemData = {
        name: formData.name.toUpperCase(),
        brand: formData.brand.toUpperCase(),
        serialNumber: formData.serialNumber.toUpperCase(),
        schoolId: parseInt(formData.schoolId)
      };

      const response = await fetch('/api/items/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(itemData)
      });

      if (response.ok) {
        onToast('Item cadastrado com sucesso!', 'success');
        
        // Save to recent items
        saveRecentItem({ name: itemData.name, brand: itemData.brand });
        
        // Reset form
        if (!quickMode) {
          setFormData({ name: "", brand: "", serialNumber: "", schoolId: "" });
          setSelectedSchool(null);
          setTouched({});
          setErrors({});
        } else {
          // In quick mode, only reset serial number
          setFormData(prev => ({ ...prev, serialNumber: "" }));
          setTouched(prev => ({ ...prev, serialNumber: false }));
          delete errors.serialNumber;
          setErrors({ ...errors });
        }
      } else {
        const errorData = await response.json();
        onToast(`Erro: ${errorData.error}`, 'error');
      }
    } catch (error) {
      console.error('Erro ao cadastrar item:', error);
      onToast('Erro interno. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (data: string) => {
    handleFieldChange('serialNumber', data);
    setShowScanner(false);
    onToast('Código escaneado com sucesso!', 'success');
  };

  const handleScanError = (error: any) => {
    console.error("Erro ao escanear:", error);
  };

  const selectRecentItem = (item: RecentItem) => {
    setFormData(prev => ({
      ...prev,
      name: item.name,
      brand: item.brand
    }));
    
    setTouched(prev => ({ ...prev, name: true, brand: true }));
    validateField('name', item.name);
    validateField('brand', item.brand);
  };

  const getSuggestedBrands = () => {
    if (!formData.name) return [];
    return commonBrands[formData.name as keyof typeof commonBrands] || [];
  };

  const isFormValid = Object.keys(errors).length === 0 && 
                     formData.name && 
                     formData.brand && 
                     formData.serialNumber && 
                     selectedSchool;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Cadastro de Itens
          </h1>
          <p className="text-gray-600">
            Adicione novos equipamentos ao sistema de forma rápida e eficiente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              {/* Quick Mode Toggle */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Informações do Item
                </h2>
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${quickMode ? 'text-orange-500' : 'text-gray-400'}`} />
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quickMode}
                      onChange={(e) => setQuickMode(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative inline-block w-10 h-6 rounded-full transition-colors ${
                      quickMode ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        quickMode ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                  <span className="text-sm text-gray-600">Modo Rápido</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-2" />
                    Nome do Item *
                  </label>
                  <select
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.name && touched.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione o tipo de item</option>
                    {predefinedItems.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  {errors.name && touched.name && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-sm text-red-600 flex items-center"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </motion.p>
                  )}
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="w-4 h-4 inline mr-2" />
                    Marca *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => handleFieldChange('brand', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.brand && touched.brand ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Digite a marca do item"
                      list={formData.name ? `brands-${formData.name}` : undefined}
                    />
                    {formData.name && (
                      <datalist id={`brands-${formData.name}`}>
                        {getSuggestedBrands().map(brand => (
                          <option key={brand} value={brand} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  {errors.brand && touched.brand && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-sm text-red-600 flex items-center"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.brand}
                    </motion.p>
                  )}
                </div>

                {/* Serial Number with Scanner */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Barcode className="w-4 h-4 inline mr-2" />
                    Número de Série *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
                      className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.serialNumber && touched.serialNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Digite ou escaneie o número de série"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(!showScanner)}
                      className={`px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors ${
                        showScanner ? 'bg-blue-50 border-blue-300 text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  {errors.serialNumber && touched.serialNumber && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-sm text-red-600 flex items-center"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.serialNumber}
                    </motion.p>
                  )}
                </div>

                {/* Barcode Scanner */}
                <AnimatePresence>
                  {showScanner && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900">Scanner de Código</h3>
                        <button
                          type="button"
                          onClick={() => setShowScanner(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <BarcodeScannerAdvanced 
                        onScan={handleScan} 
                        onError={handleScanError}
                        onClose={() => setShowScanner(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* School */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Escola/Unidade *
                  </label>
                  <Select
                    value={selectedSchool}
                    onChange={handleSchoolChange}
                    options={schools}
                    placeholder="Digite para buscar uma escola..."
                    isClearable
                    isSearchable
                    noOptionsMessage={() => "Nenhuma escola encontrada"}
                    loadingMessage={() => "Carregando..."}
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${
                          errors.schoolId && touched.schoolId 
                            ? '#FCA5A5' 
                            : state.isFocused 
                              ? '#3B82F6' 
                              : '#D1D5DB'
                        }`,
                        backgroundColor: errors.schoolId && touched.schoolId ? '#FEF2F2' : 'white',
                        boxShadow: state.isFocused 
                          ? '0 0 0 2px rgba(59, 130, 246, 0.5)' 
                          : 'none',
                        '&:hover': {
                          borderColor: errors.schoolId && touched.schoolId 
                            ? '#FCA5A5' 
                            : '#9CA3AF'
                        }
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isSelected 
                          ? '#3B82F6' 
                          : state.isFocused 
                            ? '#EBF4FF' 
                            : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                        ':active': {
                          backgroundColor: '#3B82F6',
                          color: 'white'
                        }
                      }),
                      menu: (provided) => ({
                        ...provided,
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #E5E7EB'
                      })
                    }}
                    className={`react-select-container ${
                      errors.schoolId && touched.schoolId ? 'react-select-error' : ''
                    }`}
                    classNamePrefix="react-select"
                  />
                  {errors.schoolId && touched.schoolId && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-sm text-red-600 flex items-center"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.schoolId}
                    </motion.p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    loading || !isFormValid
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {quickMode ? 'Cadastrar e Continuar' : 'Cadastrar Item'}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Items */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <History className="w-5 h-5 mr-2" />
                Itens Recentes
              </h3>
              {recentItems.length > 0 ? (
                <div className="space-y-2">
                  {recentItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => selectRecentItem(item)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.brand}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum item cadastrado recentemente</p>
              )}
            </motion.div>

            {/* Quick Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-blue-50 rounded-xl border border-blue-200 p-6"
            >
              <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Dicas Rápidas</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Use o <strong>Modo Rápido</strong> para cadastrar vários itens do mesmo tipo</li>
                <li>• O scanner funciona com códigos de barras e QR codes</li>
                <li>• Clique nos itens recentes para preencher automaticamente</li>
                <li>• Todas as informações são convertidas para MAIÚSCULO</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};