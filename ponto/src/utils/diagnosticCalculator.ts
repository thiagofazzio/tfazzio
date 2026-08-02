import {
  DiagnosticFormData,
  DiagnosticResult,
  AreaScoreInfo,
  BottleneckInfo,
  BreakEvenAnalysis,
  ActionPlan90Days,
} from '../types';

export const AREA_NAMES: Record<string, string> = {
  Financeiro: 'Financeiro',
  Comercial: 'Comercial',
  Operacao: 'Operação & Entrega',
  Gestao: 'Gestão & Processos',
  Pessoas: 'Pessoas & Liderança',
  Estrategia: 'Estratégia & Visão',
};

export const AREA_DESCRIPTIONS: Record<string, { description: string; impact: string; immediateAction: string }> = {
  Financeiro: {
    description: 'A empresa enfrenta fragilidades no controle de caixa, margem imprevisível ou risco de insolvência.',
    impact: 'Risco iminente de desabastecimento financeiro, falta de capital para investimentos e dependência de crédito bancário caro.',
    immediateAction: 'Mapear todos os custos fixos do próximo mês, revisar precificação e implantar DRE gerencial simplificado.',
  },
  Comercial: {
    description: 'O fluxo de novos clientes ou vendas é inconstante, dependendo excessivamente de indicações ou esforço direto dos sócios.',
    impact: 'Faturamento oscilante, vulnerabilidade a perda de clientes chave e estagnação da receita.',
    immediateAction: 'Implantar um funil de vendas visível, definir metas semanais de prospecção e padronizar o script comercial.',
  },
  Operacao: {
    description: 'A operação consome energia excessiva, apresenta gargalos de entrega, retrabalhos ou estouro de prazos.',
    impact: 'Aumento de custos ocultos, insatisfação de clientes, baixa margem operacional e dependência do dono apagando incêndios.',
    immediateAction: 'Mapear os 3 principais processos operacionais e criar Procedimentos Operacionais Padrão (POPs) visíveis.',
  },
  Gestao: {
    description: 'Falta de indicadores estratégicos (KPIs), processos desestruturados e decisões tomadas por intuição sem dados.',
    impact: 'Perda de eficiência, desalinhamento da equipe e incapacidade de prever os resultados dos próximos meses.',
    immediateAction: 'Definir o Dashboard da Empresa com no máximo 5 indicadores vitais (Receita, Margem, CAC, Retenção, NPS).',
  },
  Pessoas: {
    description: 'A equipe apresenta alta rotatividade, baixa autonomia ou dificuldades de alinhamento e produtividade.',
    impact: 'Sobrecarga nos sócios, erros recorrentes em tarefas básicas e teto de crescimento por falta de liderança qualificada.',
    immediateAction: 'Alinhar papéis e responsabilidades claras (RACI) e realizar reuniões de alinhamento semanal de 30 min.',
  },
  Estrategia: {
    description: 'A empresa opera no piloto automático do dia a dia sem clareza de posicionamento, metas anuais e plano de expansão.',
    impact: 'Evolução lenta em mercado competitivo, desperdício de recursos em iniciativas sem foco e desalinhamento de sócios.',
    immediateAction: 'Definir a Meta Destino de 12 meses e desdobrar em 3 objetivos prioritários para o trimestre atual.',
  },
};

export function calculateBreakEven(data: DiagnosticFormData): BreakEvenAnalysis {
  const monthlyRevenue = Math.max(1, data.monthlyRevenue || 1);
  const fixedCostsTotal = (data.fixedCosts || 0) + (data.ownerSalary || 0);
  const varPercent = Math.min(95, Math.max(0, data.variableCostsPercent || 0));
  const taxPercent = Math.min(95, Math.max(0, data.taxesPercent || 0));

  const totalVarTaxPercent = Math.min(98, varPercent + taxPercent);
  const contributionMarginPercent = Math.max(2, 100 - totalVarTaxPercent); // Margem de contribuição %

  const variableCostsTotal = (monthlyRevenue * varPercent) / 100;
  const taxesTotal = (monthlyRevenue * taxPercent) / 100;

  // Faturamento Necessário para Break-Even = Custos Fixos / (% Margem Contribuição / 100)
  const breakEvenRevenue = Math.round(fixedCostsTotal / (contributionMarginPercent / 100));

  // % do Faturamento ocupado pelo Break Even
  const breakEvenPercentage = Math.min(200, Math.round((breakEvenRevenue / monthlyRevenue) * 100));

  // Margem de Segurança = (Faturamento Atual - Break Even) / Faturamento Atual * 100
  const marginOfSafetyPercent = Math.round(((monthlyRevenue - breakEvenRevenue) / monthlyRevenue) * 100);

  // Lucro Líquido Estimado = (Faturamento * Margem Contribuição%) - Custos Fixos
  const estimatedNetProfit = Math.round((monthlyRevenue * contributionMarginPercent) / 100 - fixedCostsTotal);
  const estimatedNetMarginPercent = Math.round((estimatedNetProfit / monthlyRevenue) * 100);

  const avgTicket = Math.max(1, data.averageTicket || 1);
  const breakEvenClientsNeeded = Math.ceil(breakEvenRevenue / avgTicket);

  return {
    monthlyRevenue,
    fixedCostsTotal,
    variableCostsTotal,
    taxesTotal,
    contributionMarginPercent,
    breakEvenRevenue,
    breakEvenPercentage,
    estimatedNetProfit,
    estimatedNetMarginPercent,
    marginOfSafetyPercent,
    breakEvenClientsNeeded,
  };
}

export function calculateAreaScores(data: DiagnosticFormData): Record<string, AreaScoreInfo> {
  const keys = ['Financeiro', 'Comercial', 'Operacao', 'Gestao', 'Pessoas', 'Estrategia'];
  const rawScores: Record<string, number> = {
    Financeiro: data.scoreFinanceiro || 1,
    Comercial: data.scoreComercial || 1,
    Operacao: data.scoreOperacao || 1,
    Gestao: data.scoreGestao || 1,
    Pessoas: data.scorePessoas || 1,
    Estrategia: data.scoreEstrategia || 1,
  };

  const areaScores: Record<string, AreaScoreInfo> = {};

  keys.forEach((key) => {
    const raw = rawScores[key];
    // Convert 1-5 raw score to 0-10 score with domain adjustments
    let adjustedScore = raw * 2;

    // Apply domain specific bonus/penalties based on strategic boolean questions
    if (key === 'Financeiro') {
      if (data.knowsNetMargin) adjustedScore += 0.5;
      if (data.hasProjectedCashFlow) adjustedScore += 0.5;
    } else if (key === 'Estrategia') {
      if (data.hasGrowthGoalsAndPlan) adjustedScore += 0.5;
      if (data.runsWithoutOwner30Days) adjustedScore += 0.5;
    } else if (key === 'Gestao') {
      if (data.hasCRM) adjustedScore += 0.5;
      if (data.hasProjectedCashFlow) adjustedScore += 0.5;
    }

    const finalScore = Math.min(10, Math.max(1, Number(adjustedScore.toFixed(1))));

    let status: 'Verde' | 'Amarelo' | 'Vermelho' = 'Green' as any;
    if (finalScore < 5.5) status = 'Vermelho';
    else if (finalScore < 7.5) status = 'Amarelo';
    else status = 'Verde';

    areaScores[key] = {
      key,
      name: AREA_NAMES[key],
      score: finalScore,
      rawScore: raw,
      status,
      description: AREA_DESCRIPTIONS[key].description,
    };
  });

  return areaScores;
}

export function calculateClarityIndex(areaScores: Record<string, AreaScoreInfo>, data: DiagnosticFormData): {
  clarityIndex: number;
  clarityStatus: 'Crítico' | 'Atenção' | 'Saudável' | 'Excelente';
  clarityDescription: string;
} {
  const scores = Object.values(areaScores).map((a) => a.score);
  const averageAreaScore = scores.reduce((sum, s) => sum + s, 0) / scores.length; // 0 to 10

  // Key strategic boolean bonus (up to 10 bonus points)
  let strategicBonus = 0;
  if (data.runsWithoutOwner30Days) strategicBonus += 2.5;
  if (data.knowsNetMargin) strategicBonus += 2.5;
  if (data.hasProjectedCashFlow) strategicBonus += 2.5;
  if (data.hasGrowthGoalsAndPlan) strategicBonus += 2.5;

  const rawClarity = averageAreaScore * 9 + strategicBonus; // 0 to 100
  const clarityIndex = Math.min(100, Math.max(10, Math.round(rawClarity)));

  let clarityStatus: 'Crítico' | 'Atenção' | 'Saudável' | 'Excelente' = 'Atenção';
  let clarityDescription = '';

  if (clarityIndex < 45) {
    clarityStatus = 'Crítico';
    clarityDescription =
      'Sua empresa opera em alto risco operacional e financeiro. O crescimento está travado por falta de previsibilidade, processos e margem de manobra.';
  } else if (clarityIndex < 68) {
    clarityStatus = 'Atenção';
    clarityDescription =
      'A empresa tem um motor funcionando, porém consome muita energia dos sócios. Existem gargalos claros retendo o potencial de faturamento e escala.';
  } else if (clarityIndex < 85) {
    clarityStatus = 'Saudável';
    clarityDescription =
      'Sua empresa tem boa estrutura gerencial e financeira. O desafio agora é alinhar eficiência operacional e vendas para acelerar o crescimento sem perder qualidade.';
  } else {
    clarityStatus = 'Excelente';
    clarityDescription =
      'Excelente nível de maturidade empresarial. A empresa possui tração, clareza financeira e autonomia. O foco deve ser expansão estratégica e delegação.';
  }

  return { clarityIndex, clarityStatus, clarityDescription };
}

export function identifyBottlenecks(areaScores: Record<string, AreaScoreInfo>): {
  primaryBottleneck: BottleneckInfo;
  secondaryBottleneck: BottleneckInfo;
} {
  const sorted = Object.values(areaScores).sort((a, b) => a.score - b.score);
  const primary = sorted[0];
  const secondary = sorted[1];

  const primaryBottleneck: BottleneckInfo = {
    key: primary.key,
    name: primary.name,
    score: primary.score,
    description: AREA_DESCRIPTIONS[primary.key].description,
    impact: AREA_DESCRIPTIONS[primary.key].impact,
    immediateAction: AREA_DESCRIPTIONS[primary.key].immediateAction,
  };

  const secondaryBottleneck: BottleneckInfo = {
    key: secondary.key,
    name: secondary.name,
    score: secondary.score,
    description: AREA_DESCRIPTIONS[secondary.key].description,
    impact: AREA_DESCRIPTIONS[secondary.key].impact,
    immediateAction: AREA_DESCRIPTIONS[secondary.key].immediateAction,
  };

  return { primaryBottleneck, secondaryBottleneck };
}

export function generateActionPlan90Days(
  primaryKey: string,
  companyName: string,
  breakEven: BreakEvenAnalysis
): ActionPlan90Days {
  const name = companyName || 'sua empresa';

  const defaultPlans: Record<string, ActionPlan90Days> = {
    Financeiro: {
      phase1: {
        phaseNumber: 1,
        title: 'Estabilização de Caixa e Precificação',
        period: 'Dias 1 a 30',
        goal: 'Saber exatamente para onde vai cada centavo e garantir margem de contribuição saudável.',
        tasks: [
          {
            id: 'f1-1',
            title: 'Mapeamento Geral de Custos',
            description: 'Listar todos os custos fixos, assinaturas, pró-labore e despesas recorrentes.',
            priority: 'Alta',
          },
          {
            id: 'f1-2',
            title: 'Revisão de Precificação',
            description: `Ajustar preços para garantir margem de contribuição acima de ${Math.max(
              30,
              breakEven.contributionMarginPercent
            )}%.`,
            priority: 'Alta',
          },
          {
            id: 'f1-3',
            title: 'Separação de PF e PJ',
            description: 'Fixar o valor exato do Pró-Labore dos sócios e proibir retiradas aleatórias no caixa da empresa.',
            priority: 'Alta',
          },
        ],
      },
      phase2: {
        phaseNumber: 2,
        title: 'Fluxo de Caixa Projetado e DRE',
        period: 'Dias 31 a 60',
        goal: 'Implantar rotina diária de fluxo de caixa e relatórios de DRE mensal.',
        tasks: [
          {
            id: 'f2-1',
            title: 'Projeção de Caixa a 90 Dias',
            description: 'Criar planilha ou sistema com previsão semanal de entradas e saídas.',
            priority: 'Alta',
          },
          {
            id: 'f2-2',
            title: 'Renegociação de Fornecedores',
            description: 'Revisar contratos com fornecedores buscando prazos maiores ou desconto para pagamento à vista.',
            priority: 'Média',
          },
          {
            id: 'f2-3',
            title: 'Criação de Reserva Operacional',
            description: 'Destinar de 5% a 10% do lucro mensal para construir reserva de emergência equivalente a 3 meses de custos fixos.',
            priority: 'Média',
          },
        ],
      },
      phase3: {
        phaseNumber: 3,
        title: 'Gestão Orçamentária e Lucratividade',
        period: 'Dias 61 a 90',
        goal: 'Estabelecer orçamento tático por setor e metas de lucro líquido.',
        tasks: [
          {
            id: 'f3-1',
            title: 'Definição de Teto Orçamentário',
            description: 'Fixar limite máximo de gastos por setor (marketing, operação, administrativo).',
            priority: 'Média',
          },
          {
            id: 'f3-2',
            title: 'Política de Distribuição de Lucros',
            description: 'Criar regras claras para distribuição semestral de dividendos atreladas ao cumprimento de metas.',
            priority: 'Normal',
          },
        ],
      },
    },

    Comercial: {
      phase1: {
        phaseNumber: 1,
        title: 'Estruturação do Funil de Vendas',
        period: 'Dias 1 a 30',
        goal: 'Tornar o processo de prospecção e vendas previsível e rastreável.',
        tasks: [
          {
            id: 'c1-1',
            title: 'Mapeamento do Processo Comercial',
            description: 'Definir as etapas exatas do cliente: Prospecção -> Qualificação -> Proposta -> Fechamento.',
            priority: 'Alta',
          },
          {
            id: 'c1-2',
            title: 'Implementação de CRM de Vendas',
            description: 'Cadastrar todas as negociações em um CRM (ex: Pipedrive, RD Station CRM ou HubSpot) e eliminar anotações soltas.',
            priority: 'Alta',
          },
          {
            id: 'c1-3',
            title: 'Criação da Oferta Irresistível',
            description: 'Refinar a proposta de valor destacando diferenciais claros e reduzindo a objeção de preço.',
            priority: 'Alta',
          },
        ],
      },
      phase2: {
        phaseNumber: 2,
        title: 'Padronização de Abordagens e Metas',
        period: 'Dias 31 a 60',
        goal: 'Aumentar a taxa de conversão e criar cadência ativa de prospecção.',
        tasks: [
          {
            id: 'c2-1',
            title: 'Script e Playbook de Vendas',
            description: 'Documentar as principais objeções de clientes e criar respostas padrão testadas.',
            priority: 'Alta',
          },
          {
            id: 'c2-2',
            title: 'Canal Ativo de Geração de Leads',
            description: 'Ativar campanhas no Google Ads/Meta Ads ou implementar prospecção ativa B2B.',
            priority: 'Média',
          },
          {
            id: 'c2-3',
            title: 'Rituais Diários de Vendas',
            description: 'Realizar reuniões diárias de 15 min (Daily) para acompanhar meta de contatos e propostas enviadas.',
            priority: 'Média',
          },
        ],
      },
      phase3: {
        phaseNumber: 3,
        title: 'Aceleração de Ticket Médio e Recorrência',
        period: 'Dias 61 a 90',
        goal: 'Maximizar o valor gerado por cada cliente existente e novos contratos.',
        tasks: [
          {
            id: 'c3-1',
            title: 'Estratégia de Upsell e Cross-sell',
            description: 'Criar pacotes complementares para oferecer aos clientes no momento da compra.',
            priority: 'Média',
          },
          {
            id: 'c3-2',
            title: 'Programa de Indicação Sistemática',
            description: 'Pedir indicações ativas a 100% dos clientes satisfeitos logo após o momento do contrato/entrega.',
            priority: 'Normal',
          },
        ],
      },
    },

    Operacao: {
      phase1: {
        phaseNumber: 1,
        title: 'Mapeamento de Gargalos de Entrega',
        period: 'Dias 1 a 30',
        goal: 'Identificar onde a operação trava e reduz a margem de lucro.',
        tasks: [
          {
            id: 'o1-1',
            title: 'Mapeamento de Fluxo do Cliente',
            description: 'Desenhar passo a passo desde o fechamento do contrato até a entrega final.',
            priority: 'Alta',
          },
          {
            id: 'o1-2',
            title: 'Criação dos 5 POPs Cruciais',
            description: 'Escrever Procedimentos Operacionais Padrão para as atividades mais frequentes.',
            priority: 'Alta',
          },
          {
            id: 'o1-3',
            title: 'Redução de Retrabalhos',
            description: 'Identificar a causa raiz das 3 reclamações ou falhas mais recorrentes e eliminar a origem.',
            priority: 'Alta',
          },
        ],
      },
      phase2: {
        phaseNumber: 2,
        title: 'Automação e Padrão de Qualidade',
        period: 'Dias 31 a 60',
        goal: 'Automatizar tarefas repetitivas e garantir entregas sem dependência do dono.',
        tasks: [
          {
            id: 'o2-1',
            title: 'Implantação de Gestão de Tarefas',
            description: 'Centralizar entregas em ferramenta como Trello, Asana, Monday ou ClickUp.',
            priority: 'Alta',
          },
          {
            id: 'o2-2',
            title: 'Automação de Comunicação com Cliente',
            description: 'Enviar confirmações, atualizações de status e boletos de forma automatizada.',
            priority: 'Média',
          },
          {
            id: 'o2-3',
            title: 'Pesquisa de Satisfação NPS',
            description: 'Coletar nota de satisfação de todos os clientes pós-entrega para identificar melhorias.',
            priority: 'Média',
          },
        ],
      },
      phase3: {
        phaseNumber: 3,
        title: 'Ganho de Escala e Capacidade Operacional',
        period: 'Dias 61 a 90',
        goal: 'Aumentar a capacidade de atendimento sem necessidade de contratar proporcionalmente.',
        tasks: [
          {
            id: 'o3-1',
            title: 'Otimização de Prazos de Entrega',
            description: 'Reduzir em 20% o tempo total de produção ou prestação de serviço mantendo a qualidade.',
            priority: 'Média',
          },
          {
            id: 'o3-2',
            title: 'Gestão de Capacidade Máxima',
            description: 'Definir o teto saudável de clientes atendidos simultaneamente por funcionário/equipe.',
            priority: 'Normal',
          },
        ],
      },
    },

    Gestao: {
      phase1: {
        phaseNumber: 1,
        title: 'Painel de Indicadores da Empresa (KPIs)',
        period: 'Dias 1 a 30',
        goal: 'Substituir achismos por números exatos no acompanhamento semanal da empresa.',
        tasks: [
          {
            id: 'g1-1',
            title: 'Definição dos 5 KPIs Vitais',
            description: 'Estabelecer os indicadores cruciais: Faturamento, Margem Líquida, CAC, Vendas Novas e Retenção.',
            priority: 'Alta',
          },
          {
            id: 'g1-2',
            title: 'Implementação da Reunião de Gestão Semanal',
            description: 'Agendar reunião fixa de 45 min toda segunda-feira para analisar indicadores com a liderança.',
            priority: 'Alta',
          },
          {
            id: 'g1-3',
            title: 'Matriz de Responsabilidades (RACI)',
            description: 'Definir quem responde exatamente por qual área e projeto dentro da empresa.',
            priority: 'Alta',
          },
        ],
      },
      phase2: {
        phaseNumber: 2,
        title: 'Alinhamento Tático e Rotinas Gerenciais',
        period: 'Dias 31 a 60',
        goal: 'Desdobrar a estratégia do ano em planos de ação individuais.',
        tasks: [
          {
            id: 'g2-1',
            title: 'Plano de Metas Trimestrais (OKRs)',
            description: 'Definir 3 objetivos estratégicos para os próximos 90 dias com metas mensuráveis.',
            priority: 'Alta',
          },
          {
            id: 'g2-2',
            title: 'Centralização de Informações e Documentos',
            description: 'Criar wiki/drive organizado com senhas, relatórios e processos acessíveis.',
            priority: 'Média',
          },
          {
            id: 'g2-3',
            title: 'Auditoria Mensal de Resultados',
            description: 'Revisar mensalmente o desvio entre o planejado vs executado.',
            priority: 'Média',
          },
        ],
      },
      phase3: {
        phaseNumber: 3,
        title: 'Sistemas de Governo Corporativo Inicial',
        period: 'Dias 61 a 90',
        goal: 'Garantir gestão profissional sólida capaz de suportar novos investimentos.',
        tasks: [
          {
            id: 'g3-1',
            title: 'Conselho Consultivo Mensal',
            description: 'Realizar reunião formal com mentores ou sócios para revisão de direcionamento estratégico.',
            priority: 'Média',
          },
          {
            id: 'g3-2',
            title: 'Manual da Cultura e Regimento Interno',
            description: 'Documentar os valores, código de conduta e diretrizes da empresa para novos colaboradores.',
            priority: 'Normal',
          },
        ],
      },
    },

    Pessoas: {
      phase1: {
        phaseNumber: 1,
        title: 'Clareza de Papéis e Alinhamento de Expectativas',
        period: 'Dias 1 a 30',
        goal: 'Garantir que cada colaborador saiba exatamente o que é esperado do seu trabalho.',
        tasks: [
          {
            id: 'p1-1',
            title: 'Descritivos de Cargo Atualizados',
            description: 'Documentar as atribuições, metas e entregáveis de 100% da equipe.',
            priority: 'Alta',
          },
          {
            id: 'p1-2',
            title: 'Alinhamento Individual (1on1)',
            description: 'Realizar conversa individual de 30 minutos com cada liderado para escutar dores e alinhar expectativas.',
            priority: 'Alta',
          },
          {
            id: 'p1-3',
            title: 'Ajuste de Salários e Variável Básica',
            description: 'Adequar a remuneração ao mercado e criar comissionamento transparente focado em resultados.',
            priority: 'Alta',
          },
        ],
      },
      phase2: {
        phaseNumber: 2,
        title: 'Formação de Lideranças e Treinamento',
        period: 'Dias 31 a 60',
        goal: 'Capacitar a equipe para resolver problemas sem demandar intervenção do dono.',
        tasks: [
          {
            id: 'p2-1',
            title: 'Plano de Integração (Onboarding)',
            description: 'Criar roteiro de 7 dias para novos contratados aprenderem a cultura e os processos.',
            priority: 'Alta',
          },
          {
            id: 'p2-2',
            title: 'Trilha de Treinamento Técnico',
            description: 'Implementar sessão quinzenal de treinamento prático de ferramentas e técnicas de trabalho.',
            priority: 'Média',
          },
          {
            id: 'p2-3',
            title: 'Delegação Orientada por Níveis',
            description: 'Transferir formalmente 3 tarefas operacionais dos sócios para os líderes de setor.',
            priority: 'Média',
          },
        ],
      },
      phase3: {
        phaseNumber: 3,
        title: 'Retenção de Talentos e Desempenho',
        period: 'Dias 61 a 90',
        goal: 'Criar ambiente meritocrático e de alto rendimento.',
        tasks: [
          {
            id: 'p3-1',
            title: 'Avaliação de Desempenho Trimestral',
            description: 'Avaliar competências técnicas e comportamentais com devolutiva estruturada (Feedback).',
            priority: 'Média',
          },
          {
            id: 'p3-2',
            title: 'Plano de Carreira e Crescimento',
            description: 'Apresentar aos destaques os critérios para futuras promoções e bônus.',
            priority: 'Normal',
          },
        ],
      },
    },

    Estrategia: {
      phase1: {
        phaseNumber: 1,
        title: 'Visão de Futuro e Posicionamento de Mercado',
        period: 'Dias 1 a 30',
        goal: 'Clarificar a visão de 12 a 36 meses e a proposta de valor única frente aos concorrentes.',
        tasks: [
          {
            id: 'e1-1',
            title: 'Definição das Metas Anuais',
            description: 'Fixar metas de faturamento, margem e número de clientes para o ano.',
            priority: 'Alta',
          },
          {
            id: 'e1-2',
            title: 'Pesquisa com Clientes Atuais',
            description: 'Entrevistar os 10 melhores clientes para entender por que escolheram a empresa e o que mais valorizam.',
            priority: 'Alta',
          },
          {
            id: 'e1-3',
            title: 'Análise de Nicho e Especialização',
            description: 'Focar na solução do problema mais lucrativo e com menor concorrência direta.',
            priority: 'Alta',
          },
        ],
      },
      phase2: {
        phaseNumber: 2,
        title: 'Desdobramento Estratégico em Projetos',
        period: 'Dias 31 a 60',
        goal: 'Transformar metas gerais em projetos com prazo, orçamento e dono.',
        tasks: [
          {
            id: 'e2-1',
            title: 'Mapeamento de Motores de Crescimento',
            description: 'Identificar quais canais (vendas diretas, parcerias, marketing digital) trarão 80% dos resultados.',
            priority: 'Alta',
          },
          {
            id: 'e2-2',
            title: 'Comitê de Inovação e Novos Produtos',
            description: 'Desenvolver ou empacotar novos serviços de maior margem para a base atual de clientes.',
            priority: 'Média',
          },
          {
            id: 'e2-3',
            title: 'Desconexão Progressiva do Operacional',
            description: 'Bloquear 2 tardes por semana na agenda do empresário exclusivamente para planejamento e reuniões estratégicas.',
            priority: 'Média',
          },
        ],
      },
      phase3: {
        phaseNumber: 3,
        title: 'Autonomia Empresarial e Escala',
        period: 'Dias 61 a 90',
        goal: 'Preparar a empresa para operar com eficiência independente da presença física do sócio.',
        tasks: [
          {
            id: 'e3-1',
            title: 'Teste de Autonomia de 7 Dias',
            description: 'Empresário se ausenta das rotinas diárias operacionais por 1 semana inteira para testar a resiliência dos processos.',
            priority: 'Média',
          },
          {
            id: 'e3-2',
            title: 'Plano de Expansão e Investimentos',
            description: 'Reinvestir os lucros acumulados na ampliação do canal comercial e contratação de talentos chave.',
            priority: 'Normal',
          },
        ],
      },
    },
  };

  return defaultPlans[primaryKey] || defaultPlans['Financeiro'];
}

export function generateTextualDiagnosis(
  data: DiagnosticFormData,
  clarityIndex: number,
  clarityStatus: string,
  primaryBottleneck: BottleneckInfo,
  secondaryBottleneck: BottleneckInfo,
  breakEven: BreakEvenAnalysis
): { textualDiagnosis: string; executiveSummary: string; strategicRecommendations: string[] } {
  const company = data.companyName || (data.cnpjData?.razaoSocial ?? 'Sua empresa');
  const segment = data.segment || (data.cnpjData?.cnaeDescricao ?? 'Mercado de atuação');

  const formattedRevenue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    data.monthlyRevenue || 0
  );
  const formattedBreakEven = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    breakEven.breakEvenRevenue
  );
  const formattedNetProfit = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    breakEven.estimatedNetProfit
  );

  const executiveSummary = `A empresa **${company}** (${segment}) apresenta atualmente um **Índice de Clareza de ${clarityIndex}/100** (Classificação: **${clarityStatus}**). O faturamento mensal de **${formattedRevenue}** exige um **Ponto de Equilíbrio (Break-Even) de ${formattedBreakEven}** para cobrir todos os custos fixos (${breakEven.breakEvenPercentage}% da receita atual). A margem de contribuição média calculada é de **${breakEven.contributionMarginPercent}%**, resultando em um lucro líquido estimado em **${formattedNetProfit}** (${breakEven.estimatedNetMarginPercent}% de margem líquida).`;

  const textualDiagnosis = `Com base nas respostas fornecidas, o principal gargalo retendo o crescimento acelerado da **${company}** é a área de **${primaryBottleneck.name}** (Nota: ${primaryBottleneck.score}/10). ${primaryBottleneck.description}\n\nAlém disso, identificou-se como segundo ponto de atenção a área de **${secondaryBottleneck.name}** (Nota: ${secondaryBottleneck.score}/10). A combinação desses dois gargalos cria uma fricção onde o empresário investe alto volume de tempo e energia sem obter o retorno financeiro e a previsibilidade condizentes. Para reverter esse cenário, a prioridade máxima para os próximos 90 dias deve ser a execução do Plano de Ação focado em **${primaryBottleneck.name}**, eliminando o desperdício de margem e estabilizando a operação.`;

  const strategicRecommendations = [
    `Atingir a Margem de Segurança recomendada de pelo menos 25% acima do Break-Even (atualmente necessita de **${breakEven.breakEvenClientsNeeded} clientes/mês** com ticket médio de R$ ${data.averageTicket}).`,
    `Atacar imediatamente o gargalo de **${primaryBottleneck.name}**: ${primaryBottleneck.immediateAction}`,
    `Formalizar rotinas de acompanhamento financeiro e comercial semanal, garantindo previsibilidade de caixa e CRM ativo.`,
    `Desenvolver autonomia da equipe para permitir que os sócios foquem na expansão estratégica e não apenas em resolver problemas do dia a dia.`,
  ];

  return {
    textualDiagnosis,
    executiveSummary,
    strategicRecommendations,
  };
}

export function generateFullDiagnostic(data: DiagnosticFormData): DiagnosticResult {
  const areaScores = calculateAreaScores(data);
  const { clarityIndex, clarityStatus, clarityDescription } = calculateClarityIndex(areaScores, data);
  const { primaryBottleneck, secondaryBottleneck } = identifyBottlenecks(areaScores);
  const breakEven = calculateBreakEven(data);
  const actionPlan90Days = generateActionPlan90Days(primaryBottleneck.key, data.companyName, breakEven);
  const { textualDiagnosis, executiveSummary, strategicRecommendations } = generateTextualDiagnosis(
    data,
    clarityIndex,
    clarityStatus,
    primaryBottleneck,
    secondaryBottleneck,
    breakEven
  );

  return {
    formSummary: data,
    clarityIndex,
    clarityStatus,
    clarityDescription,
    areaScores,
    primaryBottleneck,
    secondaryBottleneck,
    breakEven,
    actionPlan90Days,
    textualDiagnosis,
    executiveSummary,
    strategicRecommendations,
    aiGenerated: false,
    generatedAt: new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}
