import React from 'react';
import { Target, ArrowRight, ShieldCheck, TrendingUp, Clock, CheckCircle2, FileText, Zap } from 'lucide-react';

interface WelcomeStepProps {
  onStart: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart }) => {
  return (
    <div id="welcome-container" className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden text-[#1A1A1A]">
        
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F4E8C1] border border-[#D4AF37]/40 text-[#6B0F1A] text-xs font-bold uppercase tracking-wider mb-6">
          <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Diagnóstico Estratégico TFAZZIO • PMEs (300k a 5M/ano)</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl font-black text-[#1A1A1A] tracking-tight leading-tight mb-6">
          Descubra o <span className="text-[#6B0F1A]">Ponto de Impacto</span> que está travando o crescimento da sua empresa.
        </h1>

        <p className="text-[#5A6270] text-base sm:text-lg mb-8 leading-relaxed max-w-3xl">
          Em menos de <strong className="text-[#6B0F1A] font-bold">10 minutos</strong>, o método TFAZZIO cruza dados oficiais do seu <strong className="text-[#1A1A1A] font-bold">CNPJ</strong> com a realidade da sua operação para gerar um relatório completo com seu <strong className="text-[#1A1A1A] font-bold">Índice de Clareza</strong>, cálculo do <strong className="text-[#1A1A1A] font-bold">Ponto de Equilíbrio</strong>, avaliação de reputação online e um <strong className="text-[#6B0F1A] font-bold">Plano de Ação de 90 Dias</strong>.
        </p>

        {/* Highlight Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#E8E2D8] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#6B0F1A]/10 text-[#6B0F1A] border border-[#6B0F1A]/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A] mb-0.5">Rápido & Direto</h4>
              <p className="text-xs text-[#5A6270]">Menos de 10 minutos sem cadastros longos</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#E8E2D8] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#AA8B22] border border-[#D4AF37]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A] mb-0.5">Dados Oficiais</h4>
              <p className="text-xs text-[#5A6270]">Busca automática CNPJ via BrasilAPI</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#E8E2D8] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A] mb-0.5">Ponto de Equilíbrio</h4>
              <p className="text-xs text-[#5A6270]">Cálculo de margem e faturamento alvo</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#E8E2D8] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#6B0F1A]/10 text-[#6B0F1A] border border-[#6B0F1A]/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A] mb-0.5">Plano de 90 Dias</h4>
              <p className="text-xs text-[#5A6270]">Passo a passo com exportação em PDF</p>
            </div>
          </div>
        </div>

        {/* Deliverables Checklist */}
        <div className="bg-[#F9F7F3] rounded-2xl p-5 border border-[#D8D3CB] mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6270] mb-3">O que você receberá ao final:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#6B0F1A] shrink-0" />
              <span>Índice de Clareza das 6 áreas estratégicas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#6B0F1A] shrink-0" />
              <span>Mapeamento do seu principal gargalo</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#6B0F1A] shrink-0" />
              <span>Demonstrativo do Ponto de Equilíbrio (Break-Even)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#6B0F1A] shrink-0" />
              <span>Evidências públicas (CNPJ, Google Places e Imprensa)</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            id="btn-start-diagnostic"
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 bg-[#6B0F1A] hover:bg-[#500B13] text-white font-extrabold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            <span>Iniciar Diagnóstico TFAZZIO</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          <div className="flex items-center gap-2 text-xs text-[#5A6270]">
            <ShieldCheck className="w-4 h-4 text-[#5A6270]" />
            <span>Seus dados são estritamente confidenciais e protegidos</span>
          </div>
        </div>

      </div>
    </div>
  );
};
