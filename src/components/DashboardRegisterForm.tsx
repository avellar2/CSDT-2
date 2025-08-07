import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Select, { SingleValue } from "react-select";
import { 
  X, 
  User, 
  Envelope, 
  Lock, 
  Users, 
  MapPin, 
  Check, 
  Warning 
} from "phosphor-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface School {
  id: number;
  name: string;
  address: string;
  district: string;
}

interface SchoolOption {
  value: number;
  label: string;
}

interface DashboardRegisterFormProps {
  onClose: () => void;
}

const DashboardRegisterForm: React.FC<DashboardRegisterFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "ONLYREAD" as "ADMIN" | "TECH" | "ONLYREAD" | "ADMTOTAL" | "SCHOOL",
    schoolId: 225 // Padrão CSDT
  });
  
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Carregar escolas
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch("/api/schools");
        if (response.ok) {
          const schoolData = await response.json();
          setSchools(schoolData);
          
          // Transformar escolas para formato do react-select
          const options: SchoolOption[] = schoolData.map((school: School) => ({
            value: school.id,
            label: `${school.name}${school.district ? ` - ${school.district}` : ""}`
          }));
          setSchoolOptions(options);
          
          // Definir escola padrão (CSDT - ID 225)
          const csdtSchool = options.find(option => option.value === 225);
          if (csdtSchool) {
            setSelectedSchool(csdtSchool);
          }
        } else {
          console.error("Erro ao carregar escolas");
          setMessage({ type: "error", text: "Erro ao carregar lista de escolas" });
        }
      } catch (error) {
        console.error("Erro na requisição de escolas:", error);
        setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
      } finally {
        setSchoolsLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpar mensagens quando o usuário começar a digitar
    if (message.text) {
      setMessage({ type: "", text: "" });
    }
  };

  const handleSchoolChange = (selectedOption: SingleValue<SchoolOption>) => {
    setSelectedSchool(selectedOption);
    if (selectedOption) {
      setFormData(prev => ({ ...prev, schoolId: selectedOption.value }));
    }
    // Limpar mensagens
    if (message.text) {
      setMessage({ type: "", text: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. Criar usuário no Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) {
        setMessage({ type: "error", text: `Erro no Supabase: ${signUpError.message}` });
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        setMessage({ type: "error", text: "Erro ao obter ID do usuário" });
        return;
      }

      // 2. Criar perfil no Prisma com a escola associada
      const profileData = {
        userId,
        displayName: formData.name,
        photoUrl: "/images/perfil.jpg",
        role: formData.role,
        schoolId: formData.schoolId // Agora sempre será um número válido
      };

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const selectedSchoolData = schools.find(s => s.id === formData.schoolId);
        setMessage({ 
          type: "success", 
          text: `Usuário ${formData.name} registrado com sucesso! Vinculado à escola: ${selectedSchoolData?.name || "CSDT"}` 
        });
        
        // Limpar formulário após sucesso
        setTimeout(() => {
          setFormData({
            name: "",
            email: "",
            password: "",
            role: "ONLYREAD",
            schoolId: 225 // Voltar para CSDT como padrão
          });
          // Resetar school selection para CSDT
          const csdtSchool = schoolOptions.find(option => option.value === 225);
          if (csdtSchool) {
            setSelectedSchool(csdtSchool);
          }
          setMessage({ type: "", text: "" });
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: `Erro ao salvar perfil: ${errorData.error}` });
      }
    } catch (error) {
      console.error("Erro no registro:", error);
      setMessage({ type: "error", text: "Erro interno do sistema" });
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: "ONLYREAD", label: "Somente Leitura", description: "Acesso apenas para visualização" },
    { value: "TECH", label: "Técnico", description: "Acesso técnico com permissões de execução" },
    { value: "ADMIN", label: "Administrador", description: "Acesso administrativo completo" },
    { value: "ADMTOTAL", label: "Administrador Total", description: "Acesso total ao sistema" },
    { value: "SCHOOL", label: "Escola", description: "Acesso para escolas abrirem chamados técnicos" }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User size={24} className="text-blue-500" />
            Registrar Novo Usuário
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome Completo *
            </label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Digite o nome completo"
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <div className="relative">
              <Envelope size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="exemplo@email.com"
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Senha *
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nível de Acesso *
            </label>
            <div className="relative">
              <Users size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {roleOptions.find(opt => opt.value === formData.role)?.description}
            </p>
          </div>

          {/* Escola */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Escola Vinculada *
            </label>
            {schoolsLoading ? (
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                <span className="text-gray-500">Carregando escolas...</span>
              </div>
            ) : (
              <Select
                value={selectedSchool}
                onChange={handleSchoolChange}
                options={schoolOptions}
                placeholder="Selecione uma escola..."
                isSearchable={true}
                isClearable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    backgroundColor: 'rgb(55 65 81)', // dark:bg-gray-700
                    borderColor: state.isFocused ? 'rgb(59 130 246)' : 'rgb(75 85 99)', // dark:border-gray-600
                    boxShadow: state.isFocused ? '0 0 0 2px rgb(59 130 246)' : 'none',
                    '&:hover': {
                      borderColor: 'rgb(75 85 99)'
                    },
                    minHeight: '42px'
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: 'rgb(243 244 246)' // dark:text-white
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'rgb(243 244 246)' // dark:text-white
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: 'rgb(156 163 175)' // text-gray-400
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: 'rgb(55 65 81)', // dark:bg-gray-700
                    border: '1px solid rgb(75 85 99)'
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected 
                      ? 'rgb(59 130 246)' 
                      : state.isFocused 
                        ? 'rgb(75 85 99)' 
                        : 'transparent',
                    color: 'rgb(243 244 246)',
                    '&:active': {
                      backgroundColor: 'rgb(59 130 246)'
                    }
                  }),
                  indicatorSeparator: (base) => ({
                    ...base,
                    backgroundColor: 'rgb(75 85 99)'
                  }),
                  dropdownIndicator: (base) => ({
                    ...base,
                    color: 'rgb(156 163 175)'
                  })
                }}
                noOptionsMessage={() => "Nenhuma escola encontrada"}
                loadingMessage={() => "Carregando..."}
              />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Selecione a escola à qual o usuário será vinculado (obrigatório)
            </p>
          </div>

          {/* Mensagem de Status */}
          {message.text && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              message.type === "success" 
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" 
                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
            }`}>
              {message.type === "success" ? (
                <Check size={20} />
              ) : (
                <Warning size={20} />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Registrando...
                </>
              ) : (
                "Registrar Usuário"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DashboardRegisterForm;