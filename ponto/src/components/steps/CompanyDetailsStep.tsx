import React from 'react';
import { DiagnosticFormData, TimeInMarket, EmployeesCount, TaxRegime } from '../../types';
import { Building, MapPin, Users, Calendar, ShieldAlert } from 'lucide-react';

interface CompanyDetailsStepProps {
  formData: DiagnosticFormData;
  onUpdate: (fields: Partial<DiagnosticFormData>) => void;
}

export const CompanyDetailsStep: React.FC<CompanyDetailsStepProps> = ({ formData, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa 3 de 16 • Perfil Operacional</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">Dados gerais da sua empresa</h2>
        <p className="text-[#5A6270] text-sm mt-1">
          Confirme ou ajuste as informações sobre o momento e porte do seu negócio.
        </p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Nome da Empresa / Marca *
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => onUpdate({ companyName: e.target.value })}
              placeholder="Ex: ACME Soluções"
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20"
            />
          </div>

          {/* Segment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Segmento de Atuação *
            </label>
            <input
              type="text"
              value={formData.segment}
              onChange={(e) => onUpdate({ segment: e.target.value })}
              placeholder="Ex: Tecnologia, B2B, Comércio, Serviços Fin., Saúde..."
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20"
            />
          </div>

          {/* City / UF */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Cidade / Estado (UF)
            </label>
            <input
              type="text"
              value={formData.cityState}
              onChange={(e) => onUpdate({ cityState: e.target.value })}
              placeholder="Ex: São Paulo / SP"
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20"
            />
          </div>

          {/* Tax Regime */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Regime Tributário
            </label>
            <select
              value={formData.taxRegime}
              onChange={(e) => onUpdate({ taxRegime: e.target.value as TaxRegime })}
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 cursor-pointer"
            >
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
              <option value="Lucro Real">Lucro Real</option>
              <option value="MEI">MEI</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#D8D3CB] pt-4">
          
          {/* Time in market */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#6B0F1A]" />
              <span>Tempo no Mercado</span>
            </label>
            <select
              value={formData.timeInMarket}
              onChange={(e) => onUpdate({ timeInMarket: e.target.value as TimeInMarket })}
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 cursor-pointer"
            >
              <option value="menos_1">Menos de 1 ano</option>
              <option value="1_3">De 1 a 3 anos</option>
              <option value="3_5">De 3 a 5 anos</option>
              <option value="5_10">De 5 a 10 anos</option>
              <option value="mais_10">Mais de 10 anos</option>
            </select>
          </div>

          {/* Number of Employees */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#6B0F1A]" />
              <span>Número de Colaboradores</span>
            </label>
            <select
              value={formData.employeesCount}
              onChange={(e) => onUpdate({ employeesCount: e.target.value as EmployeesCount })}
              className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 cursor-pointer"
            >
              <option value="1_5">1 a 5 colaboradores</option>
              <option value="6_15">6 a 15 colaboradores</option>
              <option value="16_30">16 a 30 colaboradores</option>
              <option value="31_50">31 a 50 colaboradores</option>
              <option value="mais_50">Mais de 50 colaboradores</option>
            </select>
          </div>

        </div>

      </div>
    </div>
  );
};
