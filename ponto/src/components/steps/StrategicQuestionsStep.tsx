import React from 'react';
import { DiagnosticFormData } from '../../types';
import { CheckCircle2, XCircle, ShieldQuestion, Zap, Lock } from 'lucide-react';

interface StrategicQuestionsStepProps {
  formData: DiagnosticFormData;
  onUpdate: (fields: Partial<DiagnosticFormData>) => void;
}

export const StrategicQuestionsStep: React.FC<StrategicQuestionsStepProps> = ({ formData, onUpdate }) => {
  const questions = [
    {
      key: 'runsWithoutOwner30Days',
      title: '1. Sua empresa funciona normalmente sem você por 30 dias?',
      desc: 'Se você tirar 30 dias de férias 100% desconectado, a empresa continua vendendo, entregando e faturando sem surpresas?',
      val: formData.runsWithoutOwner30Days,
    },
    {
      key: 'knowsNetMargin',
      title: '2. Você conhece exatamente a Margem Líquida % da empresa?',
      desc: 'Sabe exatamente a porcentagem de lucro líquido real que sobra após pagar todos os custos, impostos e o seu pró-labore?',
      val: formData.knowsNetMargin,
    },
    {
      key: 'hasProjectedCashFlow',
      title: '3. Você possui um Fluxo de Caixa Projetado para os próximos meses?',
      desc: 'A empresa tem previsibilidade de entradas e saídas planejadas com pelo menos 60 a 90 dias de antecedência?',
      val: formData.hasProjectedCashFlow,
    },
    {
      key: 'hasGrowthGoalsAndPlan',
      title: '4. A empresa possui Metas e Plano de Crescimento de 90 Dias escrito?',
      desc: 'Existe um plano tático impresso ou compartilhado com a liderança com metas semanais claras de faturamento e margem?',
      val: formData.hasGrowthGoalsAndPlan,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa 12 de 16 • Perguntas Estratégicas</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">4 Testes de Autonomia e Maturidade</h2>
        <p className="text-[#5A6270] text-sm mt-1">
          Responda honestamente Sim ou Não para calibrar a nota final de governança do seu negócio.
        </p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
        {questions.map((q) => (
          <div key={q.key} className="p-4 rounded-xl bg-[#F9F7F3] border border-[#D8D3CB] space-y-3">
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A]">{q.title}</h4>
              <p className="text-xs text-[#5A6270] mt-0.5">{q.desc}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onUpdate({ [q.key]: true })}
                className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  q.val
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                    : 'bg-white border-[#D8D3CB] text-[#5A6270] hover:border-[#6B0F1A]/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>SIM</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdate({ [q.key]: false })}
                className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  !q.val
                    ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm'
                    : 'bg-white border-[#D8D3CB] text-[#5A6270] hover:border-[#6B0F1A]/50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>NÃO</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
