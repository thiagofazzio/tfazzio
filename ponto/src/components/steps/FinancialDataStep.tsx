import React from 'react';
import { DiagnosticFormData } from '../../types';
import { DollarSign, PieChart, Info, Landmark, Users } from 'lucide-react';

interface FinancialDataStepProps {
  formData: DiagnosticFormData;
  onUpdate: (fields: Partial<DiagnosticFormData>) => void;
}

export const FinancialDataStep: React.FC<FinancialDataStepProps> = ({ formData, onUpdate }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa 4 de 16 • Estrutura Financeira</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">Números Financeiros da Empresa</h2>
        <p className="text-[#5A6270] text-sm mt-1">
          Usamos esses números para calcular com precisão o seu <strong className="text-[#6B0F1A] font-bold">Ponto de Equilíbrio (Break-Even)</strong> e Margem de Segurança.
        </p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
        
        {/* Monthly Revenue & Fixed Costs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                1. Faturamento Mensal Médio (R$) *
              </label>
              <span className="text-xs font-mono font-bold text-[#6B0F1A]">{formatCurrency(formData.monthlyRevenue || 0)}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[#5A6270] font-semibold text-sm">R$</span>
              <input
                id="input-monthly-revenue"
                type="number"
                min={0}
                step={1000}
                value={formData.monthlyRevenue || ''}
                onChange={(e) => onUpdate({ monthlyRevenue: Number(e.target.value) })}
                placeholder="Ex: 150000"
                className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20"
              />
            </div>
            <p className="text-[11px] text-[#5A6270]">Média bruta dos últimos 3 a 6 meses.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                2. Custos Fixos Mensais (R$) *
              </label>
              <span className="text-xs font-mono font-bold text-[#6B0F1A]">{formatCurrency(formData.fixedCosts || 0)}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[#5A6270] font-semibold text-sm">R$</span>
              <input
                id="input-fixed-costs"
                type="number"
                min={0}
                step={500}
                value={formData.fixedCosts || ''}
                onChange={(e) => onUpdate({ fixedCosts: Number(e.target.value) })}
                placeholder="Ex: 45000"
                className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20"
              />
            </div>
            <p className="text-[11px] text-[#5A6270]">Aluguel, salários operacionais, softwares, contabilidade.</p>
          </div>

        </div>

        {/* Variable Costs & Taxes Percentages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-[#D8D3CB] pt-5">
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                3. Custos Variáveis (%)
              </label>
              <span className="text-xs font-mono font-bold text-[#6B0F1A]">{formData.variableCostsPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              step={1}
              value={formData.variableCostsPercent}
              onChange={(e) => onUpdate({ variableCostsPercent: Number(e.target.value) })}
              className="w-full accent-[#6B0F1A] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#5A6270]">
              <span>Insumos / Comissões / Taxas de cartão</span>
              <span>Atualmente: {formData.variableCostsPercent}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                4. Impostos sobre Venda (%)
              </label>
              <span className="text-xs font-mono font-bold text-[#6B0F1A]">{formData.taxesPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={0.5}
              value={formData.taxesPercent}
              onChange={(e) => onUpdate({ taxesPercent: Number(e.target.value) })}
              className="w-full accent-[#6B0F1A] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#5A6270]">
              <span>Alíquota efetiva de imposto na Nota Fiscal</span>
              <span>Atualmente: {formData.taxesPercent}%</span>
            </div>
          </div>

        </div>

        {/* Owner Salary, Ticket & Clients */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#D8D3CB] pt-5">
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Pró-labore dos Sócios (R$)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={formData.ownerSalary || ''}
              onChange={(e) => onUpdate({ ownerSalary: Number(e.target.value) })}
              placeholder="Ex: 15000"
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Ticket Médio (R$)
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={formData.averageTicket || ''}
              onChange={(e) => onUpdate({ averageTicket: Number(e.target.value) })}
              placeholder="Ex: 2500"
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Clientes Atendidos/mês
            </label>
            <input
              type="number"
              min={1}
              value={formData.monthlyClients || ''}
              onChange={(e) => onUpdate({ monthlyClients: Number(e.target.value) })}
              placeholder="Ex: 60"
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none"
            />
          </div>

        </div>

      </div>
    </div>
  );
};
