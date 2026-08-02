import React from 'react';
import { Target, RefreshCw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentStep: number;
  totalSteps: number;
  onReset: () => void;
  companyName?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentStep, totalSteps, onReset, companyName }) => {
  const isReport = currentStep === 16;

  return (
    <header id="header-main" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D8D3CB] text-[#1A1A1A] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onReset}>
          <div className="w-8.5 h-8.5 rounded-lg bg-[#6B0F1A] flex items-center justify-center text-[#D4AF37] font-bold shadow-sm border border-[#500B13]">
            <Target className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#1A1A1A]">
                Ponto de Impacto
              </span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-[#F4E8C1] text-[#6B0F1A] border border-[#D4AF37]/50">
                TFAZZIO
              </span>
            </div>
            <p className="text-[11px] text-[#5A6270] hidden sm:block">Aceleração Estratégica para PMEs</p>
          </div>
        </div>

        {/* Center Progress or Title */}
        <div className="hidden md:flex items-center gap-4">
          {!isReport && currentStep > 1 && currentStep < 15 && (
            <div className="flex items-center gap-3 bg-[#F9F7F3] px-4 py-1.5 rounded-full border border-[#D8D3CB]">
              <span className="text-xs font-semibold text-[#5A6270]">Etapa {currentStep - 1} de {totalSteps - 3}</span>
              <div className="w-32 bg-[#E8E2D8] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#6B0F1A] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${((currentStep - 1) / (totalSteps - 3)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isReport && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Diagnóstico TFAZZIO Concluído</span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {companyName && (
            <div className="hidden lg:flex flex-col items-end text-xs">
              <span className="text-[#5A6270] font-semibold uppercase text-[10px]">Empresa</span>
              <span className="font-bold text-[#6B0F1A] max-w-[180px] truncate">{companyName}</span>
            </div>
          )}

          {currentStep > 1 && (
            <button
              id="btn-restart-diagnostic"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5A6270] hover:text-[#1A1A1A] bg-[#F9F7F3] hover:bg-[#E8E2D8] border border-[#D8D3CB] rounded-lg transition"
              title="Reiniciar diagnóstico"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#5A6270]" />
              <span className="hidden sm:inline">Novo Diagnóstico</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile progress bar */}
      {!isReport && currentStep > 1 && currentStep < 15 && (
        <div className="md:hidden w-full bg-[#E8E2D8] h-1">
          <div
            className="bg-[#6B0F1A] h-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (totalSteps - 3)) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
};
