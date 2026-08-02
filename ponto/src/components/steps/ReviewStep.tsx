import React from 'react';
import { DiagnosticFormData } from '../../types';
import { CheckCircle2, ArrowRight, Building, DollarSign, Target, PieChart } from 'lucide-react';

interface ReviewStepProps {
  formData: DiagnosticFormData;
  onRunDiagnostic: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ formData, onRunDiagnostic }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa 13 de 16 • Confirmação</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">Tudo pronto para gerar o seu relatório!</h2>
        <p className="text-[#5A6270] text-sm mt-1">
          Revise os dados da sua empresa antes do processamento do diagnóstico estratégico TFAZZIO.
        </p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
        
        {/* Company & CNPJ Summary */}
        <div className="p-4 rounded-xl bg-[#F9F7F3] border border-[#D8D3CB] space-y-2">
          <div className="flex items-center gap-2 text-[#6B0F1A] font-extrabold text-sm">
            <Building className="w-4 h-4" />
            <span>{formData.companyName || formData.cnpjData?.razaoSocial || 'Empresa PME'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#1A1A1A] pt-1">
            <div><span className="text-[#5A6270] block">CNPJ:</span> {formData.cnpj || 'Não informado'}</div>
            <div><span className="text-[#5A6270] block">Segmento:</span> {formData.segment}</div>
            <div><span className="text-[#5A6270] block">Funcionários:</span> {formData.employeesCount}</div>
            <div><span className="text-[#5A6270] block">Regime:</span> {formData.taxRegime}</div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#F9F7F3] rounded-xl border border-[#D8D3CB] text-xs">
            <span className="text-[#5A6270] block">Faturamento Mensal</span>
            <span className="font-mono font-bold text-[#6B0F1A] text-sm">{formatCurrency(formData.monthlyRevenue || 0)}</span>
          </div>

          <div className="p-3 bg-[#F9F7F3] rounded-xl border border-[#D8D3CB] text-xs">
            <span className="text-[#5A6270] block">Custos Fixos</span>
            <span className="font-mono font-bold text-[#1A1A1A] text-sm">{formatCurrency(formData.fixedCosts || 0)}</span>
          </div>

          <div className="p-3 bg-[#F9F7F3] rounded-xl border border-[#D8D3CB] text-xs">
            <span className="text-[#5A6270] block">Custos Variáveis</span>
            <span className="font-mono font-bold text-[#1A1A1A] text-sm">{formData.variableCostsPercent}%</span>
          </div>

          <div className="p-3 bg-[#F9F7F3] rounded-xl border border-[#D8D3CB] text-xs">
            <span className="text-[#5A6270] block">Impostos s/ Venda</span>
            <span className="font-mono font-bold text-[#1A1A1A] text-sm">{formData.taxesPercent}%</span>
          </div>
        </div>

        {/* Self Assessment Scores */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6270] mb-3">Notas da Autoavaliação (1 a 5★):</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] flex justify-between">
              <span className="text-[#5A6270]">Financeiro</span>
              <span className="font-bold text-[#6B0F1A]">{formData.scoreFinanceiro}★</span>
            </div>
            <div className="p-2.5 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] flex justify-between">
              <span className="text-[#5A6270]">Comercial</span>
              <span className="font-bold text-[#6B0F1A]">{formData.scoreComercial}★</span>
            </div>
            <div className="p-2.5 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] flex justify-between">
              <span className="text-[#5A6270]">Operação</span>
              <span className="font-bold text-[#6B0F1A]">{formData.scoreOperacao}★</span>
            </div>
            <div className="p-2.5 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] flex justify-between">
              <span className="text-[#5A6270]">Gestão</span>
              <span className="font-bold text-[#6B0F1A]">{formData.scoreGestao}★</span>
            </div>
            <div className="p-2.5 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] flex justify-between">
              <span className="text-[#5A6270]">Pessoas</span>
              <span className="font-bold text-[#6B0F1A]">{formData.scorePessoas}★</span>
            </div>
            <div className="p-2.5 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] flex justify-between">
              <span className="text-[#5A6270]">Estratégia</span>
              <span className="font-bold text-[#6B0F1A]">{formData.scoreEstrategia}★</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            id="btn-generate-report-final"
            onClick={onRunDiagnostic}
            className="w-full py-4 bg-[#6B0F1A] hover:bg-[#500B13] text-white font-extrabold text-lg rounded-xl shadow-lg flex items-center justify-center gap-3 transition hover:scale-[1.01] cursor-pointer"
          >
            <span>Processar Diagnóstico & Gerar Relatório Visual</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

      </div>
    </div>
  );
};
