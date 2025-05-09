import React, { ChangeEvent, useState, useEffect, useCallback } from 'react';
import Select, { MultiValue } from 'react-select';

interface InputsItensProps {
  formData: any; // Substitua 'any' pelo tipo correto
  handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSelectChange: (selectedOption: any) => void; // Substitua 'any' pelo tipo correto
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  escolaOptions: { label: string; value: string }[];
  tecnicoResponsavelLogado: string; // Adicione esta prop para passar o nome do técnico responsável logado
}

const tecnicoParceiroOptions = [
  { label: 'João', value: 'João' },
  { label: 'Fernando', value: 'Fernando' },
  { label: 'Hélio', value: 'Hélio' },
  { label: 'Alexandre', value: 'Alexandre' },
  { label: 'Victor', value: 'Victor' },
  { label: 'Vanderson', value: 'Vanderson' }
];

const InputsItens: React.FC<InputsItensProps> = ({ formData, handleInputChange, handleSelectChange, handleFileChange, escolaOptions, tecnicoResponsavelLogado }) => {
  const [tecnicoParceiro, setTecnicoParceiro] = useState<MultiValue<{ label: string; value: string }>>([]);

  const stableHandleInputChange = useCallback(handleInputChange, []);

  useEffect(() => {
    // Inicializa o campo "Técnico Responsável" com o nome do técnico logado
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

  return (
    <div>
      <div className="bg-white p-4">
        <span className="text-center bg-gray-900 text-white font-bold text-2xl block mb-4 p-2">Principal</span>
        <Select
          name="unidadeEscolar"
          value={escolaOptions.find(option => option.value === formData.unidadeEscolar)}
          onChange={handleSelectChange}
          options={escolaOptions}
          required
          placeholder="Selecione a Unidade Escolar"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-600 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          name="tecnicoResponsavel"
          value={formData.tecnicoResponsavel}
          onChange={stableHandleInputChange}
          required
          disabled
          readOnly
          placeholder="Técnico Responsável"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500 cursor-not-allowed bg-zinc-300"
        />
        <Select
          name="tecnicoParceiro"
          value={tecnicoParceiro}
          onChange={handleTecnicoParceiroChange}
          options={tecnicoParceiroOptions}
          isMulti
          placeholder="Selecione os Técnicos Parceiros"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="email"
          name="emailResponsavel"
          value={formData.emailResponsavel}
          onChange={stableHandleInputChange}
          placeholder="Email da Escola"
          
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500 cursor-not-allowed bg-zinc-300"
        />
        <input
          type="number"
          name="numeroOs"
          value={formData.numeroOs}
          onChange={stableHandleInputChange}
          required
          placeholder="Número OS"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="date"
          name="data"
          value={formData.data}
          onChange={stableHandleInputChange}
          required
          placeholder="Data"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="time"
          name="hora"
          value={formData.hora}
          onChange={stableHandleInputChange}
          required
          placeholder="Hora"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="file"
          name="fotosAntes"
          onChange={handleFileChange}
          multiple
          accept="image/*"
          className="w-full p-2 mb-4 border border-gray-800 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="file"
          name="fotosDepois"
          onChange={handleFileChange}
          multiple
          accept="image/*"
          className="w-full p-2 mb-4 border border-gray-800 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white p-4 mt-4">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Sieduca</span>
        <input
          type="number"
          name="pcsSieduca"
          min={0}
          value={formData.pcsSieduca}
          onChange={stableHandleInputChange}
          placeholder="PCs Sieduca"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="notebooksSieduca"
          value={formData.notebooksSieduca}
          min={0}
          onChange={stableHandleInputChange}
          placeholder="Notebooks Sieduca"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="tabletsSieduca"
          value={formData.tabletsSieduca}
          onChange={stableHandleInputChange}
          placeholder="Tablets Sieduca"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="estabilizadoresSieduca"
          value={formData.estabilizadoresSieduca}
          onChange={stableHandleInputChange}
          placeholder="Estabilizadores Sieduca"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <div className="w-full p-2 mb-4 border border-gray-800 rounded focus:outline-none focus:border-blue-500">
          <label className="block mb-2 text-gray-800">Não Há Sieduca</label>
          <label className="mr-4">
            <input
              type="radio"
              name="naoHaSieduca"
              value="Sim"
              checked={formData.naoHaSieduca === "Sim"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Sim</span>
          </label>
        </div>
      </div>

      <div className="bg-white p-4 mt-4">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Secretaria</span>
        <input
          type="number"
          name="dellSecretaria"
          value={formData.dellSecretaria}
          onChange={stableHandleInputChange}
          placeholder="Dell Secretaria"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="locadosSecretaria"
          value={formData.locadosSecretaria}
          onChange={stableHandleInputChange}
          placeholder="Locados Secretaria"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="outrosSecretaria"
          value={formData.outrosSecretaria}
          onChange={stableHandleInputChange}
          placeholder="Outros Secretaria"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="notebooksSecretaria"
          value={formData.notebooksSecretaria}
          onChange={stableHandleInputChange}
          placeholder="Notebooks Secretaria"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="tabletsSecretaria"
          value={formData.tabletsSecretaria}
          onChange={stableHandleInputChange}
          placeholder="Tablets Secretaria"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="estabilizadoresSecretaria"
          value={formData.estabilizadoresSecretaria}
          onChange={stableHandleInputChange}
          placeholder="Estabilizadores Secretaria"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white p-4 mt-4">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Outro Local</span>
        <input
          type="number"
          name="dellOutroLocal"
          value={formData.dellOutroLocal}
          onChange={stableHandleInputChange}
          placeholder="Dell Outro Local"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="locadosOutroLocal"
          value={formData.locadosOutroLocal}
          onChange={stableHandleInputChange}
          placeholder="Locados Outro Local"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="outrosOutroLocal"
          value={formData.outrosOutroLocal}
          onChange={stableHandleInputChange}
          placeholder="Outros Outro Local"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="notebooksOutroLocal"
          value={formData.notebooksOutroLocal}
          onChange={stableHandleInputChange}
          placeholder="Notebooks Outro Local"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="tabletsOutroLocal"
          value={formData.tabletsOutroLocal}
          onChange={stableHandleInputChange}
          placeholder="Tablets Outro Local"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="estabilizadoresOutroLocal"
          value={formData.estabilizadoresOutroLocal}
          onChange={stableHandleInputChange}
          placeholder="Estabilizadores Outro Local"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <div className="w-full p-2 mb-4 border border-gray-800 rounded focus:outline-none focus:border-blue-500">
          <label className="block mb-2 text-gray-800">Não Há Outro Local</label>
          <label className="mr-4">
            <input
              type="radio"
              name="naoHaOutroLocal"
              value="Sim"
              checked={formData.naoHaOutroLocal === "Sim"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Sim</span>
          </label>
        </div>
      </div>

      <div className="bg-white p-4 mt-4">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Internet</span>
        <div className="w-full p-2 mb-4 border border-gray-800 rounded focus:outline-none focus:border-blue-500">
          <label className="block mb-2 text-gray-800">Rede BR</label>
          <label className="mr-4">
            <input
              type="radio"
              name="redeBr"
              value="Sim"
              checked={formData.redeBr === "Sim"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Sim</span>
          </label>
        </div>
        <div className="w-full p-2 mb-4 border border-gray-800 rounded focus:outline-none focus:border-blue-500">
          <label className="block mb-2 text-gray-800">Internet nas Escolas</label>
          <label className="mr-4">
            <input
              type="radio"
              name="internetNasEscolas"
              value="Sim"
              checked={formData.internetNasEscolas === "Sim"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Sim</span>
          </label>
        </div>
        <div className="w-full p-2 mb-4 border border-gray-800 rounded focus:outline-none focus:border-blue-500">
          <label className="block mb-2 text-gray-800">Educação Conectada</label>
          <label className="mr-4">
            <input
              type="radio"
              name="educacaoConectada"
              value="Sim"
              checked={formData.educacaoConectada === "Sim"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Sim</span>
          </label>
        </div>
        <div className="w-full p-2 mb-4 border border-gray-800 rounded focus:outline-none focus:border-blue-500">
          <label className="block mb-2 text-gray-800">Não Há Provedor</label>
          <label className="mr-4">
            <input
              type="radio"
              name="naoHaProvedor"
              value="Sim"
              checked={formData.naoHaProvedor === "Sim"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Sim</span>
          </label>
        </div>
        <input
          type="number"
          name="rack"
          value={formData.rack}
          onChange={stableHandleInputChange}
          required
          placeholder="Rack"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="switch"
          value={formData.switch}
          onChange={stableHandleInputChange}
          required
          placeholder="Switch"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="roteador"
          value={formData.roteador}
          onChange={stableHandleInputChange}
          required
          placeholder="Roteador"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white p-4 mt-4">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Impressoras</span>

        <input
          type="number"
          name="oki"
          value={formData.oki}
          onChange={stableHandleInputChange}
          required
          placeholder="Oki"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="kyocera"
          value={formData.kyocera}
          onChange={stableHandleInputChange}
          required
          placeholder="Kyocera"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="hp"
          value={formData.hp}
          onChange={stableHandleInputChange}
          required
          placeholder="HP"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="ricoh"
          value={formData.ricoh}
          onChange={stableHandleInputChange}
          required
          placeholder="Ricoh"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          name="outrasImpressoras"
          value={formData.outrasImpressoras}
          onChange={stableHandleInputChange}
          required
          placeholder="Outras Impressoras (PRÓPRIA)"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />

      </div>

      <div className="bg-white p-4 mt-4">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Relatório</span>

        <input
          type="text"
          name="solicitacaoDaVisita"
          value={formData.solicitacaoDaVisita}
          onChange={stableHandleInputChange}
          required
          placeholder="Solicitação da Visita"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
        />
        <textarea
          name="relatorio"
          value={formData.relatorio}
          onChange={stableHandleInputChange}
          required
          placeholder="Relatório"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
          rows={6}
        />
      </div>

      <div className="bg-white p-4 mt-4 mb-6">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Foi solucionado?</span>
        <div className="w-full p-2 mb-4 border border-gray-800 rounded focus:outline-none focus:border-blue-500">
          <label className="mr-4">
            <input
              type="radio"
              name="solucionado"
              value="Sim"
              checked={formData.solucionado === "Sim"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Sim</span>
          </label>
          <label>
            <input
              type="radio"
              name="solucionado"
              value="Não"
              checked={formData.solucionado === "Não"}
              onChange={stableHandleInputChange}
              className="mr-2 text-gray-800"
            />
            <span className="text-gray-800">Não</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default InputsItens;