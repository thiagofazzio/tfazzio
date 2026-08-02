import React, { useState } from 'react';
import { CompanyCNPJData } from '../../types';
import { Search, Building2, MapPin, Tag, Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface CnpjStepProps {
  cnpj: string;
  cnpjData: CompanyCNPJData | null;
  onUpdate: (cnpj: string, cnpjData: CompanyCNPJData | null) => void;
  onNext: () => void;
}

export const CnpjStep: React.FC<CnpjStepProps> = ({ cnpj, cnpjData, onUpdate, onNext }) => {
  const [inputCnpj, setInputCnpj] = useState(cnpj || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Format CNPJ as user types 00.000.000/0000-00
  const formatCnpjMask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpjMask(e.target.value);
    setInputCnpj(formatted);
    setErrorMsg(null);
  };

  const fetchCnpjData = async () => {
    const clean = inputCnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      setErrorMsg('Por favor, informe um CNPJ válido com 14 dígitos.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/cnpj/${clean}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível consultar os dados do CNPJ.');
      }

      onUpdate(inputCnpj, data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar à API de CNPJ. Você pode continuar preenchendo os dados manualmente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!cnpjData) {
        fetchCnpjData();
      } else {
        onNext();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa 1 de 16 • Identificação Pública</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">Qual é o CNPJ da sua empresa?</h2>
        <p className="text-[#5A6270] text-sm mt-1">
          Usamos o CNPJ para buscar automaticamente a razão social, porte e segmento oficial (CNAE) via BrasilAPI, enriquecendo o relatório.
        </p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
          Informe o CNPJ da empresa
        </label>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="input-cnpj"
              type="text"
              value={inputCnpj}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-4 py-3 text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20"
            />
          </div>

          <button
            id="btn-search-cnpj"
            type="button"
            onClick={fetchCnpjData}
            disabled={loading || inputCnpj.replace(/\D/g, '').length !== 14}
            className="px-6 py-3 bg-[#6B0F1A] hover:bg-[#500B13] disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4 text-[#D4AF37]" />}
            <span>{loading ? 'Consultando...' : 'Buscar CNPJ'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#F4E8C1]/50 border border-[#D4AF37] rounded-xl text-[#6B0F1A] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#6B0F1A] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
              <p className="text-[11px] text-[#5A6270] mt-1">Dica: Se preferir não consultar agora, você pode prosseguir para a próxima etapa.</p>
            </div>
          </div>
        )}

        {/* Live Preview Card when data is found */}
        {cnpjData && (
          <div className="mt-4 p-4 rounded-xl bg-[#F9F7F3] border border-[#D8D3CB] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D8D3CB] pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Dados Localizados Oficialmente</span>
              </div>
              <span className="text-[10px] text-[#5A6270] uppercase font-bold">Status: {cnpjData.situacaoCadastral}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#5A6270] block font-medium">Razão Social:</span>
                <span className="font-bold text-[#1A1A1A] text-sm">{cnpjData.razaoSocial}</span>
              </div>
              <div>
                <span className="text-[#5A6270] block font-medium">Nome Fantasia:</span>
                <span className="font-semibold text-[#1A1A1A]">{cnpjData.nomeFantasia || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#5A6270] block font-medium">Porte da Empresa:</span>
                <span className="font-bold text-[#6B0F1A]">{cnpjData.porte}</span>
              </div>
              <div>
                <span className="text-[#5A6270] block font-medium">Cidade / UF:</span>
                <span className="font-medium text-[#1A1A1A]">{cnpjData.municipio} - {cnpjData.uf}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#5A6270] block font-medium">Atividade Principal (CNAE):</span>
                <span className="font-medium text-[#1A1A1A]">{cnpjData.cnaeCodigo} - {cnpjData.cnaeDescricao}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
