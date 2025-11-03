import React, { ChangeEvent, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, FileImage } from 'phosphor-react';
import Select, { MultiValue } from 'react-select';

interface InputsItensProps {
  formData: any;
  handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSelectChange: (selectedOption: any) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  escolaOptions: { label: string; value: string }[];
  tecnicoResponsavelLogado: string;
  currentStep?: number;
  currentStepFields?: string[];
  isLoadingTecnico?: boolean; // ADICIONAR apenas esta linha
}

const tecnicoParceiroOptions = [
  { label: 'João', value: 'João' },
  { label: 'Fernando', value: 'Fernando' },
  { label: 'Hélio', value: 'Hélio' },
  { label: 'Alexandre', value: 'Alexandre' },
  { label: 'Victor', value: 'Victor' },
  { label: 'Vanderson', value: 'Vanderson' }
];

const
  InputsItens: React.FC<InputsItensProps> = ({
    formData,
    handleInputChange,
    handleSelectChange,
    handleFileChange,
    escolaOptions,
    tecnicoResponsavelLogado,
    currentStep = 0,
    currentStepFields = [],
    isLoadingTecnico = false, // ADICIONAR apenas esta linha
  }) => {
    const [tecnicoParceiro, setTecnicoParceiro] = useState<MultiValue<{ label: string; value: string }>>([]);

    const stableHandleInputChange = useCallback(handleInputChange, []);

    useEffect(() => {
      stableHandleInputChange({
        target: {
          name: 'tecnicoResponsavel',
          value: tecnicoResponsavelLogado
        }
      } as ChangeEvent<HTMLInputElement>);
    }, [tecnicoResponsavelLogado, stableHandleInputChange]);

    const handleTecnicoParceiroChange = (selectedOptions: MultiValue<{ label: string; value: string }>) => {
      setTecnicoParceiro(selectedOptions);
      const selectedValues = selectedOptions.map(option => option.value).join(' / ');
      stableHandleInputChange({
        target: {
          name: 'tecnicoResponsavel',
          value: `${tecnicoResponsavelLogado} / ${selectedValues}`
        }
      } as ChangeEvent<HTMLInputElement>);
    };

    const shouldRenderField = (fieldName: string) => {
      return currentStepFields.includes(fieldName);
    };

    const renderFileInput = (fieldName: string, label: string, accept: string = "image/*") => {
      if (!shouldRenderField(fieldName)) return null;

      const files = formData[fieldName] as File[];

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <label className="block text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
            <Camera size={16} />
            {label}
          </label>

          <div className="relative">
            <input
              type="file"
              name={fieldName}
              onChange={handleFileChange}
              accept={accept}
              multiple
              className="hidden"
              id={fieldName}
            />

            <label
              htmlFor={fieldName}
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer bg-slate-700/30 hover:bg-slate-600/30 transition-all duration-300 hover:border-blue-400"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload size={24} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-300 font-medium">
                  Clique para selecionar fotos
                </p>
                <p className="text-xs text-slate-500">
                  PNG, JPG ou JPEG (Max: 10MB cada)
                </p>
              </div>
            </label>
          </div>

          {files && files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 space-y-2"
            >
              <p className="text-sm text-slate-300 font-medium flex items-center gap-2">
                <FileImage size={16} />
                {files.length} foto(s) selecionada(s):
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {Array.from(files).map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg text-xs"
                  >
                    <FileImage size={12} className="text-blue-400 flex-shrink-0" />
                    <span className="text-slate-300 truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      );
    };

    return (
      <div className="space-y-6">
        {/* ===== STEP 0 - PRINCIPAL ===== */}
        {shouldRenderField('unidadeEscolar') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Unidade Escolar *
            </label>
            <Select
              options={escolaOptions}
              onChange={handleSelectChange}
              placeholder="Selecione a Unidade Escolar"
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (provided) => ({
                  ...provided,
                  backgroundColor: '#1e293b',
                  borderColor: '#475569',
                  color: '#e2e8f0', // text-slate-200 - MAIS CLARO
                  '&:hover': { borderColor: '#3b82f6' }
                }),
                input: (provided) => ({
                  ...provided,
                  color: '#e2e8f0', // text-slate-200 - TEXTO DIGITADO MAIS CLARO
                }),
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569'
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isFocused ? '#3b82f6' : '#1e293b',
                  color: '#e2e8f0', // text-slate-200 - OPÇÕES MAIS CLARAS
                  '&:hover': { backgroundColor: '#3b82f6' }
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: '#e2e8f0' // text-slate-200 - VALOR SELECIONADO MAIS CLARO
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: '#94a3b8' // text-slate-400 - placeholder mantido
                })
              }}
            />
          </motion.div>
        )}

        {shouldRenderField('tecnicoResponsavel') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Técnico Responsável *
            </label>
            <input
              type="text"
              name="tecnicoResponsavel"
              value={formData.tecnicoResponsavel}
              onChange={handleInputChange}
              placeholder={isLoadingTecnico ? "Carregando..." : "Nome do técnico responsável"}
              readOnly
              disabled={isLoadingTecnico}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />

            {/* Técnicos Parceiros */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Técnicos Parceiros (Opcional)
              </label>
              <Select
                isMulti
                options={tecnicoParceiroOptions}
                value={tecnicoParceiro}
                onChange={handleTecnicoParceiroChange}
                placeholder="Selecione técnicos parceiros"
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: '#1e293b',
                    borderColor: '#475569',
                    color: '#f1f5f9',
                    '&:hover': { borderColor: '#3b82f6' }
                  }),
                  menu: (provided) => ({
                    ...provided,
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569'
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? '#3b82f6' : '#1e293b',
                    color: '#f1f5f9',
                    '&:hover': { backgroundColor: '#3b82f6' }
                  }),
                  multiValue: (provided) => ({
                    ...provided,
                    backgroundColor: '#3b82f6'
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: '#f1f5f9'
                  }),
                  multiValueRemove: (provided) => ({
                    ...provided,
                    color: '#f1f5f9',
                    '&:hover': { backgroundColor: '#1e40af', color: '#f1f5f9' }
                  })
                }}
              />
            </div>
          </motion.div>
        )}

        {shouldRenderField('emailResponsavel') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Email do Responsável *
            </label>
            <input
              type="email"
              name="emailResponsavel"
              value={formData.emailResponsavel || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              placeholder="Email será preenchido automaticamente"
              readOnly
            />
          </motion.div>
        )}

        {shouldRenderField('solicitacaoDaVisita') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Solicitação da Visita *
            </label>
            <textarea
              name="solicitacaoDaVisita"
              value={formData.solicitacaoDaVisita || ''}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
              placeholder="Descreva a solicitação da visita..."
            />
          </motion.div>
        )}

        {shouldRenderField('diretoraNaEscola') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-400/30 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">👤</span>
                </div>
                <label className="text-lg font-bold text-white">
                  A diretora estava na escola?
                  <span className="text-red-400 ml-1">*</span>
                </label>
              </div>

              <p className="text-slate-300 text-sm mb-6 italic">
                Confirme a presença da diretora no momento da visita
              </p>

              <div className="grid grid-cols-2 gap-4">
                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105
                  ${formData.diretoraNaEscola === true
                    ? 'bg-green-500/30 border-green-400 text-green-100 shadow-lg shadow-green-500/20'
                    : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-green-400/50 hover:bg-green-500/10'
                  }
                `}>
                  <input
                    type="radio"
                    name="diretoraNaEscola"
                    value="true"
                    checked={formData.diretoraNaEscola === true}
                    onChange={() => handleInputChange({
                      target: { name: 'diretoraNaEscola', value: true }
                    } as any)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.diretoraNaEscola === true
                        ? 'border-green-400 bg-green-500'
                        : 'border-slate-400'
                    }`}>
                      {formData.diretoraNaEscola === true && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg font-semibold">✅ Sim</span>
                  </div>
                </label>

                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105
                  ${formData.diretoraNaEscola === false
                    ? 'bg-red-500/30 border-red-400 text-red-100 shadow-lg shadow-red-500/20'
                    : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-red-400/50 hover:bg-red-500/10'
                  }
                `}>
                  <input
                    type="radio"
                    name="diretoraNaEscola"
                    value="false"
                    checked={formData.diretoraNaEscola === false}
                    onChange={() => handleInputChange({
                      target: { name: 'diretoraNaEscola', value: false }
                    } as any)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.diretoraNaEscola === false
                        ? 'border-red-400 bg-red-500'
                        : 'border-slate-400'
                    }`}>
                      {formData.diretoraNaEscola === false && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg font-semibold">❌ Não</span>
                  </div>
                </label>
              </div>

              {formData.diretoraNaEscola === undefined && (
                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
                  <p className="text-yellow-200 text-sm font-medium text-center">
                    ⚠️ Por favor, confirme a presença da diretora
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== STEP 1 - LABORATÓRIO ===== */}
        {shouldRenderField('temLaboratorio') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-2 border-blue-400/30 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🖥️</span>
                </div>
                <label className="text-lg font-bold text-white">
                  A escola tem laboratório de informática? 
                  <span className="text-red-400 ml-1">*</span>
                </label>
              </div>
              
              <p className="text-slate-300 text-sm mb-6 italic">
                Esta informação é obrigatória para determinar os equipamentos disponíveis
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105
                  ${formData.temLaboratorio === true 
                    ? 'bg-green-500/30 border-green-400 text-green-100 shadow-lg shadow-green-500/20' 
                    : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-green-400/50 hover:bg-green-500/10'
                  }
                `}>
                  <input
                    type="radio"
                    name="temLaboratorio"
                    value="true"
                    checked={formData.temLaboratorio === true}
                    onChange={() => handleInputChange({
                      target: { name: 'temLaboratorio', value: true }
                    } as any)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.temLaboratorio === true 
                        ? 'border-green-400 bg-green-500' 
                        : 'border-slate-400'
                    }`}>
                      {formData.temLaboratorio === true && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg font-semibold">✅ Sim</span>
                  </div>
                </label>
                
                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105
                  ${formData.temLaboratorio === false 
                    ? 'bg-red-500/30 border-red-400 text-red-100 shadow-lg shadow-red-500/20' 
                    : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-red-400/50 hover:bg-red-500/10'
                  }
                `}>
                  <input
                    type="radio"
                    name="temLaboratorio"
                    value="false"
                    checked={formData.temLaboratorio === false}
                    onChange={() => handleInputChange({
                      target: { name: 'temLaboratorio', value: false }
                    } as any)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.temLaboratorio === false 
                        ? 'border-red-400 bg-red-500' 
                        : 'border-slate-400'
                    }`}>
                      {formData.temLaboratorio === false && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg font-semibold">❌ Não</span>
                  </div>
                </label>
              </div>
              
              {formData.temLaboratorio === undefined && (
                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
                  <p className="text-yellow-200 text-sm font-medium text-center">
                    ⚠️ Por favor, selecione uma opção para continuar
                  </p>
                </div>
              )}
              
              {formData.temLaboratorio === false && (
                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400/50 rounded-lg">
                  <p className="text-blue-200 text-sm font-medium text-center">
                    ℹ️ Como a escola não possui laboratório, os campos de equipamentos do laboratório foram ocultados
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Campos do Laboratório - Só aparecem se a escola tem laboratório */}
        {formData.temLaboratorio === true && (shouldRenderField('pcsProprio') || shouldRenderField('pcsLocado') ||
          shouldRenderField('notebooksProprio') || shouldRenderField('notebooksLocado') ||
          shouldRenderField('monitoresProprio') || shouldRenderField('monitoresLocado') ||
          shouldRenderField('estabilizadoresProprio') || shouldRenderField('estabilizadoresLocado') ||
          shouldRenderField('tabletsProprio') || shouldRenderField('tabletsLocado')) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-600 pb-2">
                📱 Equipamentos do Laboratório
              </h3>

              {/* PCs */}
              {(shouldRenderField('pcsProprio') || shouldRenderField('pcsLocado')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">💻 Computadores (PCs)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('pcsProprio') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          PCs Próprio
                        </label>
                        <input
                          type="number"
                          name="pcsProprio"
                          value={formData.pcsProprio || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('pcsLocado') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          PCs Locado
                        </label>
                        <input
                          type="number"
                          name="pcsLocado"
                          value={formData.pcsLocado || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notebooks */}
              {(shouldRenderField('notebooksProprio') || shouldRenderField('notebooksLocado')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">💻 Notebooks</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('notebooksProprio') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Notebooks Próprio
                        </label>
                        <input
                          type="number"
                          name="notebooksProprio"
                          value={formData.notebooksProprio || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('notebooksLocado') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Notebooks Locado
                        </label>
                        <input
                          type="number"
                          name="notebooksLocado"
                          value={formData.notebooksLocado || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monitores */}
              {(shouldRenderField('monitoresProprio') || shouldRenderField('monitoresLocado')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">🖥️ Monitores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('monitoresProprio') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Monitores Próprio
                        </label>
                        <input
                          type="number"
                          name="monitoresProprio"
                          value={formData.monitoresProprio || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('monitoresLocado') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Monitores Locado
                        </label>
                        <input
                          type="number"
                          name="monitoresLocado"
                          value={formData.monitoresLocado || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estabilizadores */}
              {(shouldRenderField('estabilizadoresProprio') || shouldRenderField('estabilizadoresLocado')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">🔌 Estabilizadores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('estabilizadoresProprio') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Estabilizadores Próprio
                        </label>
                        <input
                          type="number"
                          name="estabilizadoresProprio"
                          value={formData.estabilizadoresProprio || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('estabilizadoresLocado') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Estabilizadores Locado
                        </label>
                        <input
                          type="number"
                          name="estabilizadoresLocado"
                          value={formData.estabilizadoresLocado || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tablets */}
              {(shouldRenderField('tabletsProprio') || shouldRenderField('tabletsLocado')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">📱 Tablets</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('tabletsProprio') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Tablets Próprio
                        </label>
                        <input
                          type="number"
                          name="tabletsProprio"
                          value={formData.tabletsProprio || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('tabletsLocado') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Tablets Locado
                        </label>
                        <input
                          type="number"
                          name="tabletsLocado"
                          value={formData.tabletsLocado || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        {/* ===== STEP 2 - OUTROS LOCAIS ===== */}
        {(shouldRenderField('pcsProprioOutrosLocais') || shouldRenderField('pcsLocadoOutrosLocais') ||
          shouldRenderField('notebooksProprioOutrosLocais') || shouldRenderField('notebooksLocadoOutrosLocais') ||
          shouldRenderField('monitoresProprioOutrosLocais') || shouldRenderField('monitoresLocadoOutrosLocais') ||
          shouldRenderField('estabilizadoresProprioOutrosLocais') || shouldRenderField('estabilizadoresLocadoOutrosLocais') ||
          shouldRenderField('tabletsProprioOutrosLocais') || shouldRenderField('tabletsLocadoOutrosLocais')) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-600 pb-2">
                🏢 Equipamentos em Outros Locais
              </h3>

              {/* PCs Outros Locais */}
              {(shouldRenderField('pcsProprioOutrosLocais') || shouldRenderField('pcsLocadoOutrosLocais')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">💻 Computadores (PCs)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('pcsProprioOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          PCs Próprio
                        </label>
                        <input
                          type="number"
                          name="pcsProprioOutrosLocais"
                          value={formData.pcsProprioOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('pcsLocadoOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          PCs Locado
                        </label>
                        <input
                          type="number"
                          name="pcsLocadoOutrosLocais"
                          value={formData.pcsLocadoOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notebooks Outros Locais */}
              {(shouldRenderField('notebooksProprioOutrosLocais') || shouldRenderField('notebooksLocadoOutrosLocais')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">💻 Notebooks</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('notebooksProprioOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Notebooks Próprio
                        </label>
                        <input
                          type="number"
                          name="notebooksProprioOutrosLocais"
                          value={formData.notebooksProprioOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('notebooksLocadoOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Notebooks Locado
                        </label>
                        <input
                          type="number"
                          name="notebooksLocadoOutrosLocais"
                          value={formData.notebooksLocadoOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monitores Outros Locais */}
              {(shouldRenderField('monitoresProprioOutrosLocais') || shouldRenderField('monitoresLocadoOutrosLocais')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">🖥️ Monitores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('monitoresProprioOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Monitores Próprio
                        </label>
                        <input
                          type="number"
                          name="monitoresProprioOutrosLocais"
                          value={formData.monitoresProprioOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('monitoresLocadoOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Monitores Locado
                        </label>
                        <input
                          type="number"
                          name="monitoresLocadoOutrosLocais"
                          value={formData.monitoresLocadoOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estabilizadores Outros Locais */}
              {(shouldRenderField('estabilizadoresProprioOutrosLocais') || shouldRenderField('estabilizadoresLocadoOutrosLocais')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">🔌 Estabilizadores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('estabilizadoresProprioOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Estabilizadores Próprio
                        </label>
                        <input
                          type="number"
                          name="estabilizadoresProprioOutrosLocais"
                          value={formData.estabilizadoresProprioOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('estabilizadoresLocadoOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Estabilizadores Locado
                        </label>
                        <input
                          type="number"
                          name="estabilizadoresLocadoOutrosLocais"
                          value={formData.estabilizadoresLocadoOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tablets Outros Locais */}
              {(shouldRenderField('tabletsProprioOutrosLocais') || shouldRenderField('tabletsLocadoOutrosLocais')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">📱 Tablets</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {shouldRenderField('tabletsProprioOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Tablets Próprio
                        </label>
                        <input
                          type="number"
                          name="tabletsProprioOutrosLocais"
                          value={formData.tabletsProprioOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('tabletsLocadoOutrosLocais') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Tablets Locado
                        </label>
                        <input
                          type="number"
                          name="tabletsLocadoOutrosLocais"
                          value={formData.tabletsLocadoOutrosLocais || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        {/* ===== STEP 3 - INTERNET ===== */}
        {(shouldRenderField('redeBr') || shouldRenderField('educacaoConectada') || shouldRenderField('naoHaProvedor') ||
          shouldRenderField('rack') || shouldRenderField('switch') || shouldRenderField('roteador')) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-600 pb-2">
                🌐 Conectividade e Rede
              </h3>

              {/* Provedores de Internet */}
              {(shouldRenderField('redeBr') || shouldRenderField('educacaoConectada') || shouldRenderField('naoHaProvedor')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">📡 Provedores de Internet</h4>
                  <div className="space-y-3">
                    {shouldRenderField('redeBr') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Rede.br
                        </label>
                        <select
                          name="redeBr"
                          value={formData.redeBr || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        >
                          <option value="">Selecione</option>
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                        </select>
                      </div>
                    )}
                    {shouldRenderField('educacaoConectada') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Educação Conectada
                        </label>
                        <select
                          name="educacaoConectada"
                          value={formData.educacaoConectada || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        >
                          <option value="">Selecione</option>
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                        </select>
                      </div>
                    )}
                    {shouldRenderField('naoHaProvedor') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Não há provedor
                        </label>
                        <select
                          name="naoHaProvedor"
                          value={formData.naoHaProvedor || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        >
                          <option value="">Selecione</option>
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Equipamentos de Rede */}
              {(shouldRenderField('rack') || shouldRenderField('switch') || shouldRenderField('roteador')) && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-slate-300 mb-3">🔌 Equipamentos de Rede</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {shouldRenderField('rack') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Rack
                        </label>
                        <input
                          type="number"
                          name="rack"
                          value={formData.rack || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('switch') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Switch
                        </label>
                        <input
                          type="number"
                          name="switch"
                          value={formData.switch || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                    {shouldRenderField('roteador') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">
                          Roteador
                        </label>
                        <input
                          type="number"
                          name="roteador"
                          value={formData.roteador || ''}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        {/* ===== STEP 4 - IMPRESSORAS ===== */}
        {(shouldRenderField('oki') || shouldRenderField('kyocera') || shouldRenderField('hp') ||
          shouldRenderField('ricoh') || shouldRenderField('outrasImpressoras')) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-600 pb-2">
                🖨️ Impressoras
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {shouldRenderField('oki') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      OKI
                    </label>
                    <input
                      type="number"
                      name="oki"
                      value={formData.oki || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    />
                  </div>
                )}
                {shouldRenderField('kyocera') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Kyocera
                    </label>
                    <input
                      type="number"
                      name="kyocera"
                      value={formData.kyocera || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    />
                  </div>
                )}
                {shouldRenderField('hp') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      HP
                    </label>
                    <input
                      type="number"
                      name="hp"
                      value={formData.hp || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    />
                  </div>
                )}
                {shouldRenderField('ricoh') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Ricoh
                    </label>
                    <input
                      type="number"
                      name="ricoh"
                      value={formData.ricoh || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    />
                  </div>
                )}
                {shouldRenderField('outrasImpressoras') && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Outras Impressoras
                    </label>
                    <input
                      type="number"
                      name="outrasImpressoras"
                      value={formData.outrasImpressoras || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

        {/* Checklist: Existe impressora com problema? */}
        {shouldRenderField('temImpressoraComProblema') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-400/30 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">⚠️</span>
                </div>
                <label className="text-lg font-bold text-white">
                  Existe alguma impressora com problema?
                  <span className="text-red-400 ml-1">*</span>
                </label>
              </div>

              <p className="text-slate-300 text-sm mb-6 italic">
                Informe se alguma impressora está com defeito ou apresentando problemas
              </p>

              <div className="grid grid-cols-2 gap-4">
                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105
                  ${formData.temImpressoraComProblema === true
                    ? 'bg-red-500/30 border-red-400 text-red-100 shadow-lg shadow-red-500/20'
                    : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-red-400/50 hover:bg-red-500/10'
                  }
                `}>
                  <input
                    type="radio"
                    name="temImpressoraComProblema"
                    value="true"
                    checked={formData.temImpressoraComProblema === true}
                    onChange={() => handleInputChange({
                      target: { name: 'temImpressoraComProblema', value: true }
                    } as any)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.temImpressoraComProblema === true
                        ? 'border-red-400 bg-red-500'
                        : 'border-slate-400'
                    }`}>
                      {formData.temImpressoraComProblema === true && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg font-semibold">⚠️ Sim</span>
                  </div>
                </label>

                <label className={`
                  flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105
                  ${formData.temImpressoraComProblema === false
                    ? 'bg-green-500/30 border-green-400 text-green-100 shadow-lg shadow-green-500/20'
                    : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-green-400/50 hover:bg-green-500/10'
                  }
                `}>
                  <input
                    type="radio"
                    name="temImpressoraComProblema"
                    value="false"
                    checked={formData.temImpressoraComProblema === false}
                    onChange={() => handleInputChange({
                      target: { name: 'temImpressoraComProblema', value: false }
                    } as any)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.temImpressoraComProblema === false
                        ? 'border-green-400 bg-green-500'
                        : 'border-slate-400'
                    }`}>
                      {formData.temImpressoraComProblema === false && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg font-semibold">✅ Não</span>
                  </div>
                </label>
              </div>

              {formData.temImpressoraComProblema === undefined && (
                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
                  <p className="text-yellow-200 text-sm font-medium text-center">
                    ⚠️ Por favor, informe se há impressora com problema
                  </p>
                </div>
              )}

              {formData.temImpressoraComProblema === false && (
                <div className="mt-4 p-3 bg-green-500/20 border border-green-400/50 rounded-lg">
                  <p className="text-green-200 text-sm font-medium text-center">
                    ✅ Ótimo! Todas as impressoras estão funcionando corretamente
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Campos condicionais - Só aparecem se houver impressora com problema */}
        {formData.temImpressoraComProblema === true && shouldRenderField('relatorioImpressora') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 mb-3">
              <p className="text-red-200 text-sm font-medium flex items-center gap-2">
                <span className="text-lg">📝</span>
                Preencha os dados da impressora com problema abaixo
              </p>
            </div>

            <label className="block text-sm font-medium text-slate-200 mb-2">
              Relatório da Impressora com Problema *
            </label>
            <textarea
              name="relatorioImpressora"
              value={formData.relatorioImpressora || ''}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
              placeholder="Descreva detalhadamente o problema da impressora (não imprime, atolamento, erro, etc)..."
            />
          </motion.div>
        )}

        {formData.temImpressoraComProblema === true && shouldRenderField('impressoraComProblema') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Identificação da Impressora (Nome, Modelo e Número de Serial) *
            </label>
            <input
              type="text"
              name="impressoraComProblema"
              value={formData.impressoraComProblema || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              placeholder="Ex: HP LaserJet Pro M404dn - Serial: ABC123XYZ"
            />
          </motion.div>
        )}

        {/* ===== STEP 5 - RELATÓRIO E FOTOS ===== */}
        {shouldRenderField('pecasOuMaterial') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Peças ou Material para comprar
            </label>
            <textarea
              name="pecasOuMaterial"
              value={formData.pecasOuMaterial || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
              placeholder="Descreva as peças ou materiais para a escola comprar..."
            />
          </motion.div>
        )}

        {shouldRenderField('relatorio') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Relatório da Visita *
            </label>
            <textarea
              name="relatorio"
              value={formData.relatorio || ''}
              onChange={handleInputChange}
              rows={5}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
              placeholder="Descreva detalhadamente o serviço realizado..."
            />
          </motion.div>
        )}

        {/* FOTOS */}
        {renderFileInput('fotosAntes', 'Fotos Antes do Serviço', 'image/*')}
        {renderFileInput('fotosDepois', 'Fotos Depois do Serviço', 'image/*')}

        {/* ===== STEP 6 - CONCLUSÃO ===== */}
        {shouldRenderField('solucionado') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Problema Solucionado? *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="solucionado"
                  value="Sim"
                  checked={formData.solucionado === 'Sim'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-600 bg-slate-700 border-slate-600 focus:ring-green-500"
                />
                <span className="ml-2 text-slate-200">Sim</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="solucionado"
                  value="Não"
                  checked={formData.solucionado === 'Não'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-red-600 bg-slate-700 border-slate-600 focus:ring-red-500"
                />
                <span className="ml-2 text-slate-200">Não</span>
              </label>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

export default InputsItens;