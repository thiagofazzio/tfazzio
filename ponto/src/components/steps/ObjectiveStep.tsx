import React from 'react';
import { Target, AlertTriangle, Lightbulb } from 'lucide-react';

interface ObjectiveStepProps {
  mainGoal: string;
  biggestDifficulty: string;
  onUpdate: (data: { mainGoal: string; biggestDifficulty: string }) => void;
}

export const ObjectiveStep: React.FC<ObjectiveStepProps> = ({
  mainGoal,
  biggestDifficulty,
  onUpdate,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa 2 de 16 • Objetivos & Desafios</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">O que você quer alcançar nos próximos 12 meses?</h2>
        <p className="text-[#5A6270] text-sm mt-1">
          Essas respostas direcionam a análise para focar exatamente na sua prioridade atual.
        </p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
        
        {/* Goal */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
            <Target className="w-4 h-4 text-[#6B0F1A]" />
            <span>1. Qual é o seu principal objetivo estratégico para este ano? *</span>
          </label>
          <textarea
            id="input-main-goal"
            rows={3}
            value={mainGoal}
            onChange={(e) => onUpdate({ mainGoal: e.target.value, biggestDifficulty })}
            placeholder="Ex: Dobrar o faturamento, estruturar equipe comercial, reduzir custos e trabalhar menos horas no operacional..."
            className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 placeholder:text-[#5A6270]"
          />
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#6B0F1A]" />
            <span>2. Qual é a sua maior dificuldade ou gargalo hoje? *</span>
          </label>
          <textarea
            id="input-biggest-difficulty"
            rows={3}
            value={biggestDifficulty}
            onChange={(e) => onUpdate({ mainGoal, biggestDifficulty: e.target.value })}
            placeholder="Ex: Faturamento inconstante, equipe não assume responsabilidades, margem líquida baixa, falta de tempo..."
            className="w-full bg-[#F9F7F3] border border-[#D8D3CB] focus:border-[#6B0F1A] text-[#1A1A1A] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 placeholder:text-[#5A6270]"
          />
        </div>

        <div className="p-3 bg-[#F9F7F3] rounded-xl border border-[#D8D3CB] flex items-start gap-2.5 text-xs text-[#5A6270]">
          <Lightbulb className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <span>Quanto mais específico você for, mais preciso e prático será o seu relatório com o plano de ação de 90 dias.</span>
        </div>

      </div>
    </div>
  );
};
