import React from 'react';
import { DiagnosticFormData } from '../../types';
import { ShoppingCart, Users, CheckSquare, XSquare, Zap } from 'lucide-react';

interface CommercialDataStepProps {
  formData: DiagnosticFormData;
  onUpdate: (fields: Partial<DiagnosticFormData>) => void;
}

export const CommercialDataStep: React.FC<CommercialDataStepProps> = ({ formData, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa 5 de 16 • Estrutura Comercial</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">Como funciona seu processo de vendas?</h2>
        <p className="text-[#5A6270] text-sm mt-1">
          A previsibilidade de faturamento depende da maturidade do funil de vendas e da equipe comercial.
        </p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
        
        {/* Conversion rate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              1. Taxa de Conversão Estimada (%) *
            </label>
            <span className="text-xs font-mono font-bold text-[#6B0F1A]">{formData.conversionRate}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={80}
            step={1}
            value={formData.conversionRate}
            onChange={(e) => onUpdate({ conversionRate: Number(e.target.value) })}
            className="w-full accent-[#6B0F1A] cursor-pointer"
          />
          <p className="text-[11px] text-[#5A6270]">
            De cada 100 orçamentos/propostas ou reuniões de vendas, quantos se tornam clientes fechados?
          </p>
        </div>

        {/* CRM usage */}
        <div className="space-y-2 border-t border-[#D8D3CB] pt-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
            2. A empresa utiliza algum sistema CRM para gerenciar as vendas? *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onUpdate({ hasCRM: true })}
              className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition cursor-pointer font-bold text-sm ${
                formData.hasCRM
                  ? 'bg-[#F4E8C1] border-[#D4AF37] text-[#6B0F1A]'
                  : 'bg-[#F9F7F3] border-[#D8D3CB] text-[#5A6270] hover:border-[#6B0F1A]/50'
              }`}
            >
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <span>Sim, usamos CRM (Ex: Pipedrive, RD, HubSpot)</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ hasCRM: false })}
              className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition cursor-pointer font-bold text-sm ${
                !formData.hasCRM
                  ? 'bg-[#F4E8C1] border-[#D4AF37] text-[#6B0F1A]'
                  : 'bg-[#F9F7F3] border-[#D8D3CB] text-[#5A6270] hover:border-[#6B0F1A]/50'
              }`}
            >
              <XSquare className="w-5 h-5 text-rose-600" />
              <span>Não, usamos planilhas ou cadernos</span>
            </button>
          </div>
        </div>

        {/* Sales team size */}
        <div className="space-y-2 border-t border-[#D8D3CB] pt-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
            3. Tamanho da Equipe Comercial (Vendedores / SDRs / Closers)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { val: 0, label: 'Apenas os sócios vendem' },
              { val: 1, label: '1 Vendedor dedicado' },
              { val: 3, label: '2 a 4 Vendedores' },
              { val: 5, label: '5 ou mais Vendedores' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => onUpdate({ salesTeamSize: item.val })}
                className={`p-3 rounded-xl border text-xs font-semibold transition text-center cursor-pointer ${
                  formData.salesTeamSize === item.val
                    ? 'bg-[#F4E8C1] border-[#D4AF37] text-[#6B0F1A] font-bold'
                    : 'bg-[#F9F7F3] border-[#D8D3CB] text-[#5A6270] hover:border-[#6B0F1A]/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
