import React, { useState } from 'react';
import { DiagnosticResult, ActionPlanPhase, AreaScoreInfo } from '../../types';
import {
  Download,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Building2,
  PieChart as PieChartIcon,
  Zap,
  Target,
  Clock,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  BarChart2,
  PhoneCall,
  CheckSquare,
  Square,
  Sparkles,
  Search,
  Star,
  Globe,
  Newspaper,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import confetti from 'canvas-confetti';

interface ReportDashboardProps {
  result: DiagnosticResult;
  onDownloadPdf: () => void;
  onRestart: () => void;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ result, onDownloadPdf, onRestart }) => {
  const [activePhaseTab, setActivePhaseTab] = useState<1 | 2 | 3>(1);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [showModalCTA, setShowModalCTA] = useState(false);

  const form = result.formSummary;
  const breakEven = result.breakEven;
  const primaryBottleneck = result.primaryBottleneck;
  const secondaryBottleneck = result.secondaryBottleneck;
  const evidence = result.evidenceData;

  // Trigger confetti on initial load
  React.useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Prepare Radar Chart Data
  const radarData = (Object.values(result.areaScores) as AreaScoreInfo[]).map((area) => ({
    area: area.name,
    Nota: area.score,
    Benchmark: 7.5,
  }));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verde':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'Amarelo':
        return 'bg-[#F4E8C1] border-[#D4AF37]/50 text-[#6B0F1A]';
      case 'Vermelho':
        return 'bg-rose-50 border-rose-200 text-rose-800';
      default:
        return 'bg-[#F9F7F3] border-[#D8D3CB] text-[#1A1A1A]';
    }
  };

  const currentPhase: ActionPlanPhase =
    activePhaseTab === 1
      ? result.actionPlan90Days.phase1
      : activePhaseTab === 2
      ? result.actionPlan90Days.phase2
      : result.actionPlan90Days.phase3;

  return (
    <div id="report-visual-container" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8 text-[#1A1A1A]">
      
      {/* HEADER BANNER */}
      <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4E8C1] border border-[#D4AF37]/50 text-[#6B0F1A] text-xs font-extrabold uppercase">
            <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Relatório Executivo TFAZZIO • Gerado em {result.generatedAt}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-[#1A1A1A] tracking-tight">
            Diagnóstico Ponto de Impacto: <span className="text-[#6B0F1A]">{form.companyName || form.cnpjData?.razaoSocial || 'Sua Empresa'}</span>
          </h1>

          <p className="text-[#5A6270] text-xs sm:text-sm flex flex-wrap items-center gap-3">
            <span>CNPJ: <strong className="text-[#1A1A1A]">{form.cnpj || 'Não informado'}</strong></span>
            <span>•</span>
            <span>Segmento: <strong className="text-[#1A1A1A]">{form.segment}</strong></span>
            <span>•</span>
            <span>Porte: <strong className="text-[#1A1A1A]">{form.cnpjData?.porte || 'PME'}</strong></span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            id="btn-download-pdf-top"
            onClick={onDownloadPdf}
            className="px-6 py-3.5 bg-[#6B0F1A] hover:bg-[#500B13] text-white font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition hover:scale-[1.02] cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Baixar Relatório PDF (TFAZZIO)</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: CLARITY INDEX & BOTTLENECK CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Clarity Score Card */}
        <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5A6270]">Índice de Clareza</span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                result.clarityStatus === 'Excelente'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : result.clarityStatus === 'Saudável'
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : result.clarityStatus === 'Atenção'
                  ? 'bg-[#F4E8C1] border-[#D4AF37] text-[#6B0F1A]'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}>
                {result.clarityStatus}
              </span>
            </div>

            {/* Score Ring / Display */}
            <div className="flex items-baseline gap-2 py-2">
              <span className="text-6xl font-black tracking-tight text-[#6B0F1A]">{result.clarityIndex}</span>
              <span className="text-2xl font-bold text-[#5A6270]">/100</span>
            </div>

            <p className="text-xs text-[#5A6270] leading-relaxed">
              {result.clarityDescription}
            </p>
          </div>

          <div className="pt-4 border-t border-[#D8D3CB] mt-4 text-[11px] text-[#5A6270] flex items-center justify-between">
            <span>Média das 6 Áreas Ajustada</span>
            <span className="font-extrabold text-[#6B0F1A]">Diagnóstico Método TFAZZIO</span>
          </div>
        </div>

        {/* Primary Bottleneck Card */}
        <div className="bg-white border-2 border-rose-300 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-rose-100 border-b border-l border-rose-200 rounded-bl-2xl text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
            Gargalo Principal
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm uppercase">
              <AlertTriangle className="w-5 h-5" />
              <span>Área: {primaryBottleneck.name}</span>
            </div>

            <h3 className="text-xl font-black text-[#1A1A1A]">Nota: {primaryBottleneck.score}/10</h3>

            <p className="text-xs text-[#5A6270] leading-relaxed">
              {primaryBottleneck.description}
            </p>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900">
              <strong className="block font-bold text-rose-950 mb-0.5">Impacto Prático:</strong>
              {primaryBottleneck.impact}
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8D3CB] text-xs text-[#6B0F1A] flex items-center gap-2">
            <Target className="w-4 h-4 shrink-0 text-[#6B0F1A]" />
            <span className="font-bold truncate">Ação Imediata: {primaryBottleneck.immediateAction}</span>
          </div>
        </div>

        {/* Secondary Bottleneck Card */}
        <div className="bg-white border-2 border-[#D4AF37] rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#F4E8C1] border-b border-l border-[#D4AF37]/50 rounded-bl-2xl text-[10px] font-extrabold uppercase tracking-wider text-[#6B0F1A]">
            Gargalo Secundário
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-[#6B0F1A] font-extrabold text-sm uppercase">
              <ShieldAlert className="w-5 h-5" />
              <span>Área: {secondaryBottleneck.name}</span>
            </div>

            <h3 className="text-xl font-black text-[#1A1A1A]">Nota: {secondaryBottleneck.score}/10</h3>

            <p className="text-xs text-[#5A6270] leading-relaxed">
              {secondaryBottleneck.description}
            </p>

            <div className="p-3 bg-[#F9F7F3] rounded-xl border border-[#D8D3CB] text-xs text-[#1A1A1A]">
              <strong className="block font-bold text-[#6B0F1A] mb-0.5">Impacto Prático:</strong>
              {secondaryBottleneck.impact}
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8D3CB] text-xs text-[#5A6270] flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-[#D4AF37]" />
            <span>Foco no segundo mês de execução</span>
          </div>
        </div>

      </div>

      {/* NEW SECTION: EVIDÊNCIAS COLETADAS (CNPJ, Google Places & News) */}
      <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8D3CB] pb-4">
          <div>
            <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Auditoria de Dados</span>
            <h2 className="text-2xl font-black text-[#1A1A1A] mt-0.5 flex items-center gap-2">
              <Search className="w-6 h-6 text-[#6B0F1A]" />
              <span>Evidências Coletadas (APIs Integradas)</span>
            </h2>
            <p className="text-xs text-[#5A6270]">Dados em tempo real do CNPJ, Google Places e Imprensa para contextualizar a análise.</p>
          </div>
          {evidence?.fetchedAt && (
            <span className="text-xs text-[#5A6270] font-semibold bg-[#F9F7F3] px-3 py-1 rounded-full border border-[#D8D3CB]">
              Coletado em: {evidence.fetchedAt}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: BrasilAPI / CNPJ */}
          <div className="bg-[#F9F7F3] rounded-2xl p-5 border border-[#D8D3CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8D3CB] pb-2">
              <span className="text-xs font-extrabold uppercase text-[#6B0F1A] flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Dados Públicos (CNPJ)
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {form.cnpjData?.situacaoCadastral || 'Ativa'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#1A1A1A]">
              <div>
                <span className="text-[#5A6270] block font-medium">Razão Social:</span>
                <span className="font-bold text-sm text-[#1A1A1A]">{form.cnpjData?.razaoSocial || form.companyName}</span>
              </div>
              <div>
                <span className="text-[#5A6270] block font-medium">Nome Fantasia:</span>
                <span className="font-semibold">{form.cnpjData?.nomeFantasia || 'Não informado'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[#5A6270] block font-medium">Porte:</span>
                  <span className="font-bold text-[#6B0F1A]">{form.cnpjData?.porte || 'PME'}</span>
                </div>
                <div>
                  <span className="text-[#5A6270] block font-medium">Capital Social:</span>
                  <span className="font-semibold">{form.cnpjData?.capitalSocial ? formatCurrency(form.cnpjData.capitalSocial) : 'N/A'}</span>
                </div>
              </div>
              <div className="pt-1">
                <span className="text-[#5A6270] block font-medium">Atividade Principal (CNAE):</span>
                <span className="text-[11px] font-medium text-[#1A1A1A]">{form.cnpjData?.cnaeCodigo} - {form.cnpjData?.cnaeDescricao || form.segment}</span>
              </div>
              {form.cnpjData?.logradouro && (
                <div className="pt-1">
                  <span className="text-[#5A6270] block font-medium">Endereço Registrado:</span>
                  <span className="text-[11px] text-[#5A6270]">{form.cnpjData.logradouro}, {form.cnpjData.municipio} - {form.cnpjData.uf}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Google Places Evidence */}
          <div className="bg-[#F9F7F3] rounded-2xl p-5 border border-[#D8D3CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8D3CB] pb-2">
              <span className="text-xs font-extrabold uppercase text-[#6B0F1A] flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" /> Reputação (Google Places)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                evidence?.googlePlaces?.status === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {evidence?.googlePlaces?.status === 'success' ? 'Verificado' : 'Não Vinculado'}
              </span>
            </div>

            {evidence?.googlePlaces?.rating ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-2xl border border-[#D8D3CB] text-center shrink-0">
                    <span className="text-3xl font-black text-[#6B0F1A]">{evidence.googlePlaces.rating}</span>
                    <span className="text-[10px] block text-[#5A6270] font-bold">★ de 5.0</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1A1A1A]">{evidence.googlePlaces.name}</h4>
                    <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                      {evidence.googlePlaces.userRatingsTotal} avaliações reais de clientes
                    </p>
                    {evidence.googlePlaces.address && (
                      <p className="text-[11px] text-[#5A6270] mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#6B0F1A]" />
                        <span className="truncate max-w-[200px]">{evidence.googlePlaces.address}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#D8D3CB] text-[11px] text-[#5A6270]">
                  <span className="font-bold text-[#1A1A1A] block mb-0.5">Análise de Atração:</span>
                  A pontuação no Google reflete a saúde do topo do funil e a satisfação da carteira atual de clientes.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-[#D8D3CB] text-center space-y-2">
                <Globe className="w-8 h-8 text-[#5A6270] mx-auto opacity-50" />
                <p className="text-xs text-[#5A6270]">
                  Não foi localizado perfil verificado de avaliações públicas para este nome no Google Places ou a chave de API não foi configurada.
                </p>
                <p className="text-[11px] text-[#6B0F1A] font-semibold">
                  Recomendação: Criar e otimizar o perfil no Google Meu Negócio.
                </p>
              </div>
            )}
          </div>

          {/* Card 3: News / Imprensa */}
          <div className="bg-[#F9F7F3] rounded-2xl p-5 border border-[#D8D3CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8D3CB] pb-2">
              <span className="text-xs font-extrabold uppercase text-[#6B0F1A] flex items-center gap-1.5">
                <Newspaper className="w-4 h-4" /> Imprensa & Menções
              </span>
              <span className="text-[10px] font-bold text-[#5A6270] bg-white px-2 py-0.5 rounded border border-[#D8D3CB]">
                {evidence?.news?.length || 0} Notícias
              </span>
            </div>

            {evidence?.news && evidence.news.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {evidence.news.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-[#D8D3CB] space-y-1">
                    <a
                      href={item.link || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-xs text-[#1A1A1A] hover:text-[#6B0F1A] flex items-center justify-between gap-1 group"
                    >
                      <span className="line-clamp-2">{item.title}</span>
                      <ExternalLink className="w-3 h-3 text-[#5A6270] group-hover:text-[#6B0F1A] shrink-0" />
                    </a>
                    <div className="flex items-center justify-between text-[10px] text-[#5A6270]">
                      <span className="font-semibold text-[#6B0F1A]">{item.source}</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border border-[#D8D3CB] text-center space-y-2">
                <Newspaper className="w-8 h-8 text-[#5A6270] mx-auto opacity-50" />
                <p className="text-xs text-[#5A6270]">
                  Nenhuma menção ou notícia pública recente foi encontrada nos portais monitorados para a marca.
                </p>
                <p className="text-[11px] text-[#6B0F1A] font-semibold">
                  Oportunidade: Desenvolver ações de assessoria de imprensa e PR.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: RADAR CHART & HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Radar Chart */}
        <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-[#D8D3CB] pb-3">
            <div>
              <h3 className="text-base font-extrabold text-[#1A1A1A] flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#6B0F1A]" />
                <span>Matriz de Diagnóstico (Radar 6 Áreas)</span>
              </h3>
              <p className="text-xs text-[#5A6270]">Comparativo das suas notas vs Benchmark PME (7.5)</p>
            </div>
          </div>

          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#D8D3CB" />
                <PolarAngleAxis dataKey="area" stroke="#1A1A1A" tick={{ fill: '#1A1A1A', fontSize: 11, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#5A6270" />
                <Radar name="Sua Empresa" dataKey="Nota" stroke="#6B0F1A" fill="#6B0F1A" fillOpacity={0.4} />
                <Radar name="Benchmark PME" dataKey="Benchmark" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} strokeDasharray="3 3" />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D8D3CB', borderRadius: '12px', color: '#1A1A1A' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Light Heatmap */}
        <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-[#D8D3CB] pb-3">
            <div>
              <h3 className="text-base font-extrabold text-[#1A1A1A] flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-[#6B0F1A]" />
                <span>Mapa de Calor por Área (Heatmap)</span>
              </h3>
              <p className="text-xs text-[#5A6270]">Status atual da operação (Verde, Amarelo, Vermelho)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {(Object.values(result.areaScores) as AreaScoreInfo[]).map((area) => (
              <div
                key={area.key}
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${getStatusColor(area.status)}`}
              >
                <div>
                  <h4 className="font-extrabold text-sm">{area.name}</h4>
                  <span className="text-[11px] font-semibold opacity-90">
                    Status: {area.status === 'Verde' ? 'Saudável' : area.status === 'Amarelo' ? 'Atenção' : 'Crítico'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black">{area.score}</span>
                  <span className="text-xs opacity-75">/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 3: FINANCIAL BREAK-EVEN ANALYSIS */}
      <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8D3CB] pb-4">
          <div>
            <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Engenharia Financeira</span>
            <h2 className="text-2xl font-black text-[#1A1A1A] mt-0.5">Análise do Ponto de Equilíbrio (Break-Even)</h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#5A6270] block font-medium">Faturamento Atual Informado</span>
            <span className="text-xl font-mono font-bold text-[#6B0F1A]">{formatCurrency(breakEven.monthlyRevenue)}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#D8D3CB] space-y-1">
            <span className="text-xs text-[#5A6270] block font-medium">Ponto de Equilíbrio (Break-Even)</span>
            <span className="text-xl font-mono font-extrabold text-[#6B0F1A]">{formatCurrency(breakEven.breakEvenRevenue)}</span>
            <p className="text-[11px] text-[#5A6270]">Mínimo necessário p/ zerar custos</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#D8D3CB] space-y-1">
            <span className="text-xs text-[#5A6270] block font-medium">Ocupação do Faturamento</span>
            <span className={`text-xl font-mono font-extrabold ${breakEven.breakEvenPercentage > 85 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {breakEven.breakEvenPercentage}%
            </span>
            <p className="text-[11px] text-[#5A6270]">% da receita gasta em custos</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#D8D3CB] space-y-1">
            <span className="text-xs text-[#5A6270] block font-medium">Margem de Contribuição %</span>
            <span className="text-xl font-mono font-extrabold text-[#6B0F1A]">{breakEven.contributionMarginPercent}%</span>
            <p className="text-[11px] text-[#5A6270]">Margem que sobra pós variáveis</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#D8D3CB] space-y-1">
            <span className="text-xs text-[#5A6270] block font-medium">Lucro Líquido Estimado</span>
            <span className={`text-xl font-mono font-extrabold ${breakEven.estimatedNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(breakEven.estimatedNetProfit)}
            </span>
            <p className="text-[11px] text-[#5A6270]">Margem líquida: {breakEven.estimatedNetMarginPercent}%</p>
          </div>

        </div>

        {/* Break-Even Progress Bar */}
        <div className="space-y-2 bg-[#F9F7F3] p-4 rounded-2xl border border-[#D8D3CB]">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-[#1A1A1A]">Termômetro de Ponto de Equilíbrio</span>
            <span className="text-[#6B0F1A] font-mono font-bold">
              {breakEven.monthlyRevenue >= breakEven.breakEvenRevenue
                ? `Acima do Break-Even (Margem de Segurança: ${breakEven.marginOfSafetyPercent}%)`
                : `Abaixo do Break-Even (Déficit de ${formatCurrency(breakEven.breakEvenRevenue - breakEven.monthlyRevenue)})`}
            </span>
          </div>
          
          <div className="w-full bg-[#E8E2D8] h-3 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                breakEven.monthlyRevenue >= breakEven.breakEvenRevenue ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, (breakEven.monthlyRevenue / breakEven.breakEvenRevenue) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#5A6270] pt-1">
            Você precisa atender a pelo menos <strong className="text-[#1A1A1A]">{breakEven.breakEvenClientsNeeded} clientes/mês</strong> com ticket médio de {formatCurrency(form.averageTicket || 1)} para cobrir todos os seus custos fixos operacionais.
          </p>
        </div>

      </div>

      {/* SECTION 4: 90-DAY ACTION PLAN */}
      <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8D3CB] pb-4">
          <div>
            <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Execução Tática</span>
            <h2 className="text-2xl font-black text-[#1A1A1A] mt-0.5">Plano de Ação de 90 Dias (3 Fases)</h2>
            <p className="text-[#5A6270] text-xs">Focado em eliminar o gargalo de {primaryBottleneck.name}</p>
          </div>

          {/* Phase Tabs */}
          <div className="flex items-center gap-2 bg-[#F9F7F3] p-1.5 rounded-2xl border border-[#D8D3CB]">
            {[1, 2, 3].map((ph) => (
              <button
                key={ph}
                onClick={() => setActivePhaseTab(ph as 1 | 2 | 3)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activePhaseTab === ph
                    ? 'bg-[#6B0F1A] text-white shadow-md'
                    : 'text-[#5A6270] hover:text-[#1A1A1A]'
                }`}
              >
                Fase {ph} ({ph === 1 ? '1-30d' : ph === 2 ? '31-60d' : '61-90d'})
              </button>
            ))}
          </div>
        </div>

        {/* Phase Header */}
        <div className="p-4 rounded-2xl bg-[#F4E8C1] border border-[#D4AF37]/50 space-y-1">
          <div className="flex justify-between items-center text-xs font-extrabold text-[#6B0F1A]">
            <span>{currentPhase.period} • {currentPhase.title}</span>
            <span className="uppercase">Meta da Fase</span>
          </div>
          <p className="text-sm font-bold text-[#1A1A1A]">{currentPhase.goal}</p>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {currentPhase.tasks.map((task) => {
            const isDone = completedTasks[task.id];

            return (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                  isDone
                    ? 'bg-[#F9F7F3] border-emerald-300 text-[#5A6270] line-through'
                    : 'bg-[#F9F7F3] border-[#D8D3CB] text-[#1A1A1A] hover:border-[#6B0F1A]/50'
                }`}
              >
                <button type="button" className="mt-0.5 shrink-0 text-[#6B0F1A]">
                  {isDone ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-[#5A6270]" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-[#1A1A1A]">{task.title}</h4>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      task.priority === 'Alta'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-[#F4E8C1] text-[#6B0F1A] border border-[#D4AF37]/40'
                    }`}>
                      Prioridade: {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6270] mt-1">{task.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: EXECUTIVE TEXTUAL DIAGNOSIS & AI RECOMMENDATIONS */}
      <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#D8D3CB] pb-4">
          <div>
            <span className="text-xs font-bold text-[#6B0F1A] uppercase tracking-wider">Síntese do Consultor TFAZZIO</span>
            <h2 className="text-2xl font-black text-[#1A1A1A] mt-0.5">Diagnóstico Executivo Humanizado</h2>
          </div>
          {result.aiGenerated && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4E8C1] border border-[#D4AF37]/50 text-[#6B0F1A] text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Gerado por IA Gemini 3.6</span>
            </div>
          )}
        </div>

        {/* Executive Summary */}
        <div className="p-5 rounded-2xl bg-[#F9F7F3] border border-[#D8D3CB] text-[#1A1A1A] text-sm leading-relaxed space-y-3">
          <h4 className="font-bold text-[#6B0F1A] text-base">Resumo do Cenário:</h4>
          <p className="text-[#5A6270]">{result.executiveSummary}</p>
        </div>

        {/* Detailed Text Diagnosis */}
        <div className="p-5 rounded-2xl bg-[#F9F7F3] border border-[#D8D3CB] text-[#1A1A1A] text-sm leading-relaxed space-y-3">
          <h4 className="font-bold text-[#6B0F1A] text-base">Análise de Riscos e Gargalos:</h4>
          <div className="whitespace-pre-line text-xs sm:text-sm text-[#5A6270]">{result.textualDiagnosis}</div>
        </div>

        {/* Strategic Recommendations */}
        <div className="space-y-3">
          <h4 className="font-bold text-[#1A1A1A] text-sm uppercase tracking-wider">Recomendações Estratégicas Prioritárias:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.strategicRecommendations.map((rec, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#F9F7F3] border border-[#D8D3CB] flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#6B0F1A] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#500B13]">
                  {idx + 1}
                </div>
                <p className="text-xs text-[#1A1A1A] font-medium leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 6: STRATEGIC SESSION CTA */}
      <div className="bg-[#6B0F1A] rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-[#500B13]">
        <div className="space-y-2 max-w-2xl text-center md:text-left">
          <span className="text-xs font-black uppercase tracking-wider bg-[#D4AF37] text-[#1A1A1A] px-3 py-1 rounded-full">
            Sessão Estratégica TFAZZIO
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Quer ajuda para executar este plano de 90 dias na sua empresa?
          </h2>
          <p className="text-[#E8E2D8] font-medium text-sm">
            Agende uma Sessão Estratégica de Diagnóstico com os consultores do Grupo TFAZZIO para aprofundar na implementação do seu Ponto de Impacto.
          </p>
        </div>

        <button
          id="btn-schedule-session"
          onClick={() => setShowModalCTA(true)}
          className="px-8 py-4 bg-[#D4AF37] hover:bg-[#AA8B22] text-[#1A1A1A] font-extrabold text-base rounded-2xl shadow-xl flex items-center gap-3 transition hover:scale-105 shrink-0 cursor-pointer"
        >
          <PhoneCall className="w-5 h-5 text-[#1A1A1A]" />
          <span>Agendar Sessão Estratégica</span>
        </button>
      </div>

      {/* STRATEGIC SESSION MODAL */}
      {showModalCTA && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8D3CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 text-[#1A1A1A] relative shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#D8D3CB] pb-3">
              <h3 className="text-xl font-black text-[#1A1A1A] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#6B0F1A]" />
                <span>Agendar Sessão Estratégica TFAZZIO</span>
              </h3>
              <button
                onClick={() => setShowModalCTA(false)}
                className="text-[#5A6270] hover:text-[#1A1A1A] text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5A6270] leading-relaxed">
              Na Sessão Estratégica de 45 minutos com o consultor Thiago Fazzio e equipe, iremos revisar o seu relatório em detalhes e montar a rota de execução personalizada para o seu negócio.
            </p>

            <div className="space-y-3">
              <a
                href={`https://wa.me/5511999999999?text=Ol%C3%A1%20Thiago!%20Acabei%20de%20fazer%20o%20diagn%C3%B3stico%20Ponto%20de%20Impacto%20para%20a%20empresa%20${encodeURIComponent(
                  form.companyName || 'minha empresa'
                )}%20e%20gostaria%20de%20agendar%20minha%20sess%C3%A3o%20estrat%C3%A9gica.`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Falar com Thiago Fazzio via WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  alert('Sua solicitação foi recebida com sucesso! Em breve a equipe TFAZZIO entrará em contato.');
                  setShowModalCTA(false);
                }}
                className="w-full py-3 bg-[#F9F7F3] hover:bg-[#E8E2D8] text-[#1A1A1A] font-bold text-xs rounded-xl transition cursor-pointer border border-[#D8D3CB]"
              >
                Receber Contato por E-mail / Telefone
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
