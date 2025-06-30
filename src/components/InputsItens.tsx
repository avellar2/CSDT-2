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
          readOnly
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
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Laboratório</span>

        {/* PCs */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">PCs</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="pcsProprio"
              min={0}
              value={formData.pcsProprio}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="pcsLocado"
              min={0}
              value={formData.pcsLocado}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notebooks */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Notebooks</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="notebooksProprio"
              min={0}
              value={formData.notebooksProprio}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="notebooksLocado"
              min={0}
              value={formData.notebooksLocado}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Monitores */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Monitores</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="monitoresProprio"
              min={0}
              value={formData.monitoresProprio}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="monitoresLocado"
              min={0}
              value={formData.monitoresLocado}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Estabilizadores */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Estabilizadores</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="estabilizadoresProprio"
              min={0}
              value={formData.estabilizadoresProprio}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="estabilizadoresLocado"
              min={0}
              value={formData.estabilizadoresLocado}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tablets */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Tablets</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="tabletsProprio"
              min={0}
              value={formData.tabletsProprio}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="tabletsLocado"
              min={0}
              value={formData.tabletsLocado}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Checkbox para indicar se há laboratório */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Não há Laboratório?</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="temLaboratorio"
                checked={formData.temLaboratorio}
                onChange={(e) =>
                  stableHandleInputChange({
                    target: {
                      name: "temLaboratorio",
                      value: e.target.checked,
                    },
                  } as unknown as ChangeEvent<HTMLInputElement>)
                }
                className="mr-2"
              />
              <span className="text-gray-800">Não, não tem laboratório</span>
            </label>
          </div>
        </div>
      </div>


      <div className="bg-white p-4 mt-4">
        <span className="text-center bg-gray-900 p-2 text-white font-bold text-2xl block mb-4">Outros locais</span>

        {/* PCs */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">PCs</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="pcsProprioOutrosLocais"
              min={0}
              value={formData.pcsProprioOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="pcsLocadoOutrosLocais"
              min={0}
              value={formData.pcsLocadoOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notebooks */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Notebooks</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="notebooksProprioOutrosLocais"
              min={0}
              value={formData.notebooksProprioOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="notebooksLocadoOutrosLocais"
              min={0}
              value={formData.notebooksLocadoOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Monitores */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Monitores</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="monitoresProprioOutrosLocais"
              min={0}
              value={formData.monitoresProprioOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="monitoresLocadoOutrosLocais"
              min={0}
              value={formData.monitoresLocadoOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Estabilizadores */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Estabilizadores</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="estabilizadoresProprioOutrosLocais"
              min={0}
              value={formData.estabilizadoresProprioOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="estabilizadoresLocadoOutrosLocais"
              min={0}
              value={formData.estabilizadoresLocadoOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tablets */}
        <div className="mb-4">
          <label className="block text-gray-800 font-bold mb-2">Tablets</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="tabletsProprioOutrosLocais"
              min={0}
              value={formData.tabletsProprioOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Próprios"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              name="tabletsLocadoOutrosLocais"
              min={0}
              value={formData.tabletsLocadoOutrosLocais}
              onChange={stableHandleInputChange}
              placeholder="Locados"
              className="w-full p-2 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
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

        {/* Campo para Peças ou Material a Ser Comprado */}
        <textarea
          name="pecasOuMaterial"
          value={formData.pecasOuMaterial}
          onChange={stableHandleInputChange}
          placeholder="Peças ou Material a Ser Comprado"
          className="w-full p-2 mb-4 border border-gray-800 placeholder:text-gray-300 text-gray-800 rounded focus:outline-none focus:border-blue-500"
          rows={4}
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