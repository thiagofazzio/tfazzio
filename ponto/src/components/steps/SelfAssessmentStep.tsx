import React from 'react';
import { Star, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SelfAssessmentStepProps {
  areaKey: string;
  areaTitle: string;
  stepNumber: number; // 6 to 11
  currentValue: number; // 1 to 5
  onSelect: (val: number) => void;
}

const AREA_GUIDES: Record<string, { subtitle: string; levels: Record<number, { title: string; desc: string }> }> = {
  Financeiro: {
    subtitle: 'Avalie a saúde financeira, clareza de caixa, precificação e controle de margem.',
    levels: {
      1: { title: 'Muito Crítico', desc: 'Não temos controle de caixa, misturamos contas de pessoa física/jurídica e não sabemos se há lucro.' },
      2: { title: 'Inconstante', desc: 'Anotamos entradas e saídas básicas em planilha, mas a precificação é chutada e o caixa vive apertado.' },
      3: { title: 'Regular', desc: 'Temos controle financeiro básico funcional, pagamos contas em dia, mas falta visão futura de DRE.' },
      4: { title: 'Bom', desc: 'Previsão de caixa projetada, DRE mensal organizada, pró-labore definido e margem saudável.' },
      5: { title: 'Excelente', desc: 'Caixa previsível com reserva operacional de 3+ meses, margem alta e orçamento por setores definido.' },
    },
  },
  Comercial: {
    subtitle: 'Avalie a atração de clientes, previsibilidade de vendas e funil comercial.',
    levels: {
      1: { title: 'Dependência de Indicações', desc: 'Não temos processo comercial. As vendas acontecem por indicação sem nenhuma previsibilidade.' },
      2: { title: 'Oscilante', desc: 'Tentamos vender ativamente de vez em quando, mas não temos metas diárias nem funil claro.' },
      3: { title: 'Razoável', desc: 'Temos um fluxo mínimo de contatos e propostas, mas a taxa de fechamento varia muito sem CRM.' },
      4: { title: 'Sólido', desc: 'Processo comercial padronizado com CRM ativo, metas semanais e vendedores treinados.' },
      5: { title: 'Escalável', desc: 'Máquina de vendas com atração previsível de leads, playbook comercial e cadência automatizada.' },
    },
  },
  Operacao: {
    subtitle: 'Avalie a capacidade de entrega, padrão de qualidade, prazos e erros.',
    levels: {
      1: { title: 'Caótico', desc: 'A operação depende 100% dos sócios apagando incêndios diários. Erros e atrasos frequentes.' },
      2: { title: 'Sobrecarregado', desc: 'Entregamos o produto/serviço, mas a equipe vive no limite e ocorrem muitos retrabalhos.' },
      3: { title: 'Estável', desc: 'Entregas em dia no geral, porém sem procedimentos escritos (POPs). Se alguém falta, gera travamento.' },
      4: { title: 'Organizado', desc: 'Processos mapeados com POPs claros, baixo índice de erros e gestão de tarefas em sistema.' },
      5: { title: 'Alta Performance', desc: 'Operação autônoma, rápida e com alto padrão de qualidade sem necessidade de intervenção do dono.' },
    },
  },
  Gestao: {
    subtitle: 'Avalie os indicadores (KPIs), rotinas de acompanhamento e sistemas da empresa.',
    levels: {
      1: { title: 'Sem Dados', desc: 'Decisões tomadas 100% por intuição. Não medimos nenhum indicador de desempenho (KPI).' },
      2: { title: 'Básico', desc: 'Acompanhamos apenas o faturamento bruto no fim do mês sem reuniões estruturadas.' },
      3: { title: 'Intermediário', desc: 'Acompanhamos 2 a 3 metas principais, mas falta rotina semanal de gestão com a liderança.' },
      4: { title: 'Estruturado', desc: 'Dashboard de indicadores atualizado semanalmente com reuniões fixas de acompanhamento tático.' },
      5: { title: 'Governança Forte', desc: 'Gestão por OKRs, indicadores em tempo real e cultura orientada a dados e melhoria contínua.' },
    },
  },
  Pessoas: {
    subtitle: 'Avalie o alinhamento da equipe, autonomia, liderança e rotatividade.',
    levels: {
      1: { title: 'Sem Autonomia', desc: 'Equipe desmotivada ou dependente. Tudo passa pelo dono para aprovação.' },
      2: { title: 'Reativa', desc: 'A equipe faz o básico que é pedido, mas com pouca proatividade e erros por falta de treinamento.' },
      3: { title: 'Alinhada', desc: 'Boa convivência e papéis definidos, porém ainda falta liderança intermediária forte.' },
      4: { title: 'Engajada', desc: 'Pessoas com clareza de suas metas, reuniões de feedback 1on1 ativas e pouca rotatividade.' },
      5: { title: 'Liderança Autônoma', desc: 'Líderes formados internamente que gerenciam os times e buscam metas com autonomia.' },
    },
  },
  Estrategia: {
    subtitle: 'Avalie a clareza de visão de futuro, diferenciais de mercado e plano de expansão.',
    levels: {
      1: { title: 'Sem Direção', desc: 'Apenas sobrevivendo ao dia a dia sem saber onde a empresa estará daqui a 1 ano.' },
      2: { title: 'Foco Curto Prazo', desc: 'Temos vontade de crescer, mas nos distraímos facilmente com projetos sem foco.' },
      3: { title: 'Definido', desc: 'Metas anuais traçadas, mas falta desdobramento prático em planos de ação de 90 dias.' },
      4: { title: 'Claro & Focado', desc: 'Posicionamento de mercado único, nicho bem definido e metas trimestrais alinhadas com a equipe.' },
      5: { title: 'Visão Exponencial', desc: 'Plano de expansão agressivo validado, empresa atrativa e preparada para escalar.' },
    },
  },
};

export const SelfAssessmentStep: React.FC<SelfAssessmentStepProps> = ({
  areaKey,
  areaTitle,
  stepNumber,
  currentValue,
  onSelect,
}) => {
  const guide = AREA_GUIDES[areaKey] || AREA_GUIDES['Financeiro'];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Etapa {stepNumber} de 16 • Autoavaliação Direcionada</span>
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mt-1">Como você avalia a área de {areaTitle}?</h2>
        <p className="text-[#5A6270] text-sm mt-1">{guide.subtitle}</p>
      </div>

      <div className="bg-white border border-[#D8D3CB] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
          Selecione a nota de 1 a 5 que melhor reflete a realidade atual da sua empresa:
        </label>

        {/* Rating cards 1 to 5 */}
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3, 4, 5].map((star) => {
            const isSelected = currentValue === star;
            const level = guide.levels[star];

            return (
              <button
                key={star}
                type="button"
                onClick={() => onSelect(star)}
                className={`p-4 rounded-xl border text-left transition duration-150 flex items-start gap-4 cursor-pointer ${
                  isSelected
                    ? 'bg-[#F4E8C1] border-[#D4AF37] text-[#1A1A1A] shadow-md'
                    : 'bg-[#F9F7F3] border-[#D8D3CB] text-[#1A1A1A] hover:border-[#6B0F1A]/50'
                }`}
              >
                {/* Score badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm border ${
                    isSelected
                      ? 'bg-[#6B0F1A] text-white border-[#500B13] shadow'
                      : 'bg-white text-[#5A6270] border-[#D8D3CB]'
                  }`}
                >
                  {star}★
                </div>

                {/* Level details */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm ${isSelected ? 'text-[#6B0F1A]' : 'text-[#1A1A1A]'}`}>
                      Nota {star}: {level.title}
                    </span>
                    {isSelected && (
                      <span className="text-xs font-bold text-[#6B0F1A] flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5A6270] mt-0.5 leading-relaxed">{level.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
