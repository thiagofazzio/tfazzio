import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Target, Cpu, TrendingUp, ShieldCheck } from 'lucide-react';

interface ProcessingStepProps {
  onFinished: () => void;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ onFinished }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    'Enriquecendo dados públicos do CNPJ...',
    'Consultando reputação (Google Places) & Imprensa...',
    'Calculando Margem de Contribuição & Break-Even...',
    'Avaliando o Índice de Clareza das 6 áreas...',
    'Identificando o Gargalo Principal de crescimento...',
    'Estruturando o Plano de Ação de 90 Dias...',
    'Sintetizando recomendações executivas TFAZZIO com IA...',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(() => {
            onFinished();
          }, 600);
          return prev;
        }
      });
    }, 700);

    return () => clearInterval(timer);
  }, [onFinished]);

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-[#D8D3CB] rounded-3xl shadow-xl text-center space-y-8">
      
      {/* Animated icon container */}
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-[#6B0F1A]/10 rounded-full animate-ping" />
        <div className="w-20 h-20 rounded-2xl bg-[#6B0F1A] flex items-center justify-center text-[#D4AF37] shadow-xl relative z-10 border border-[#500B13]">
          <Cpu className="w-10 h-10 animate-pulse stroke-[2.5]" />
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-black text-[#1A1A1A]">Analisando o Ponto de Impacto</h3>
        <p className="text-[#5A6270] text-sm mt-1">Aguarde alguns segundos enquanto processamos o diagnóstico com o método TFAZZIO...</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E8E2D8] h-2.5 rounded-full overflow-hidden border border-[#D8D3CB]">
        <div
          className="bg-[#6B0F1A] h-full transition-all duration-500 rounded-full"
          style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Ticks */}
      <div className="space-y-3 text-left bg-[#F9F7F3] p-4 rounded-2xl border border-[#D8D3CB]">
        {steps.map((st, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                isDone
                  ? 'text-emerald-700 font-semibold'
                  : isCurrent
                  ? 'text-[#6B0F1A] font-bold'
                  : 'text-[#5A6270] opacity-50'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-[#6B0F1A] animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-[#D8D3CB] shrink-0" />
              )}
              <span>{st}</span>
            </div>
          );
        })}
      </div>

    </div>
  );
};
