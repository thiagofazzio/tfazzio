import React, { useRef, useState } from 'react';
import { DiagnosticResult, AreaScoreInfo } from '../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Loader2, CheckCircle, FileText, Target, Building2, Star, Newspaper, MapPin } from 'lucide-react';

interface PdfGeneratorProps {
  result: DiagnosticResult;
  onClose?: () => void;
}

export const PdfGenerator: React.FC<PdfGeneratorProps> = ({ result, onClose }) => {
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const form = result.formSummary;
  const breakEven = result.breakEven;
  const evidence = result.evidenceData;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setGenerating(true);

    try {
      const element = pdfRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Relatorio_TFAZZIO_Ponto_de_Impacto_${(form.companyName || 'Empresa').replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Erro ao gerar o PDF. Você também pode utilizar a função Imprimir do navegador (Ctrl+P / Cmd+P).');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleDownloadPdf}
          disabled={generating}
          className="px-6 py-3 bg-[#6B0F1A] hover:bg-[#500B13] text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Download className="w-4 h-4 text-[#D4AF37]" />}
          <span>{generating ? 'Gerando PDF Executivo TFAZZIO...' : 'Baixar PDF Agora (TFAZZIO)'}</span>
        </button>
      </div>

      {/* Printable Cover & Content Container (Styled in Light Mode for PDF printing) */}
      <div className="overflow-auto max-h-[80vh] border border-[#D8D3CB] rounded-2xl bg-[#F9F7F3] p-4">
        <div
          ref={pdfRef}
          className="w-[210mm] min-h-[297mm] bg-white text-[#1A1A1A] p-10 mx-auto space-y-6 font-sans shadow-xl text-xs leading-relaxed"
        >
          {/* COVER HEADER */}
          <div className="border-b-4 border-[#6B0F1A] pb-5 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#6B0F1A] flex items-center justify-center font-black text-[#D4AF37] text-base border border-[#500B13]">
                  T
                </div>
                <span className="font-black text-lg tracking-tight text-[#6B0F1A]">TFAZZIO • PONTO DE IMPACTO</span>
              </div>
              <h1 className="text-2xl font-black text-[#1A1A1A] uppercase">Diagnóstico Estratégico Empresarial</h1>
              <p className="text-[#5A6270] font-semibold text-xs mt-0.5">Análise de Gargalos, Ponto de Equilíbrio & Plano de 90 Dias</p>
            </div>

            <div className="text-right text-[10px] text-[#5A6270]">
              <p>Data de Emissão: <strong className="text-[#1A1A1A]">{result.generatedAt}</strong></p>
              <p className="font-bold text-[#6B0F1A]">Relatório de Uso Executivo</p>
            </div>
          </div>

          {/* COMPANY INFO BOX */}
          <div className="bg-[#F9F7F3] p-4 rounded-xl border border-[#D8D3CB] grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#5A6270] block text-[10px] uppercase font-bold">Empresa</span>
              <strong className="text-sm font-black text-[#1A1A1A]">{form.companyName || form.cnpjData?.razaoSocial || 'Empresa PME'}</strong>
            </div>
            <div>
              <span className="text-[#5A6270] block text-[10px] uppercase font-bold">CNPJ / Porte</span>
              <strong className="text-[#1A1A1A]">{form.cnpj || 'Não informado'} • {form.cnpjData?.porte || 'PME'}</strong>
            </div>
            <div>
              <span className="text-[#5A6270] block text-[10px] uppercase font-bold">Segmento / CNAE</span>
              <span className="text-[#1A1A1A] font-semibold">{form.segment}</span>
            </div>
            <div>
              <span className="text-[#5A6270] block text-[10px] uppercase font-bold">Localidade / Regime</span>
              <span className="text-[#1A1A1A] font-semibold">{form.cityState || 'Brasil'} • {form.taxRegime}</span>
            </div>
          </div>

          {/* CLARITY INDEX & BOTTLENECK SUMMARY */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-[#6B0F1A] text-white rounded-xl text-center space-y-1 border border-[#500B13]">
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase block">Índice de Clareza</span>
              <div className="text-3xl font-black">{result.clarityIndex}/100</div>
              <span className="text-[10px] bg-[#D4AF37] text-[#1A1A1A] font-extrabold px-2 py-0.5 rounded-full inline-block">
                Status: {result.clarityStatus}
              </span>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-950 rounded-xl space-y-1 col-span-2">
              <span className="text-[10px] text-rose-800 font-extrabold uppercase block">Gargalo Principal Identificado</span>
              <div className="text-sm font-black text-rose-950">{result.primaryBottleneck.name} (Nota: {result.primaryBottleneck.score}/10)</div>
              <p className="text-[11px] text-rose-900">{result.primaryBottleneck.description}</p>
            </div>
          </div>

          {/* EVIDÊNCIAS COLETADAS (CNPJ, Google Places & Notícias) */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-[#6B0F1A] uppercase text-xs border-b border-[#D8D3CB] pb-1">1. Evidências Coletadas (APIs Integradas)</h3>
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              
              <div className="p-3 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] space-y-1">
                <span className="font-bold text-[#6B0F1A] block">CNPJ & Razão Social</span>
                <p className="font-semibold text-[#1A1A1A]">{form.cnpjData?.razaoSocial || form.companyName}</p>
                <p className="text-[10px] text-[#5A6270]">Porte: {form.cnpjData?.porte || 'PME'} • Situação: {form.cnpjData?.situacaoCadastral || 'Ativa'}</p>
              </div>

              <div className="p-3 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] space-y-1">
                <span className="font-bold text-[#6B0F1A] block">Google Places Rating</span>
                {evidence?.googlePlaces?.rating ? (
                  <p className="font-bold text-[#1A1A1A]">
                    {evidence.googlePlaces.rating} ★ ({evidence.googlePlaces.userRatingsTotal} avaliações)
                  </p>
                ) : (
                  <p className="text-[10px] text-[#5A6270]">Perfil público não localizado no Google Places.</p>
                )}
              </div>

              <div className="p-3 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] space-y-1">
                <span className="font-bold text-[#6B0F1A] block">Imprensa & Notícias</span>
                <p className="font-semibold text-[#1A1A1A]">
                  {evidence?.news?.length ? `${evidence.news.length} matérias públicas encontradas` : 'Sem notícias recentes encontradas'}
                </p>
              </div>

            </div>
          </div>

          {/* FINANCIAL BREAK-EVEN TABLE */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-[#6B0F1A] uppercase text-xs border-b border-[#D8D3CB] pb-1">2. Engenharia Financeira & Ponto de Equilíbrio (Break-Even)</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F9F7F3] text-[#1A1A1A]">
                  <th className="p-2 border border-[#D8D3CB] font-bold">Métrica Financeira</th>
                  <th className="p-2 border border-[#D8D3CB] font-mono font-bold">Valor Registrado</th>
                  <th className="p-2 border border-[#D8D3CB] font-bold">Observação Tática</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-[#D8D3CB] font-semibold">Faturamento Mensal Atual</td>
                  <td className="p-2 border border-[#D8D3CB] font-mono font-bold text-[#6B0F1A]">{formatCurrency(breakEven.monthlyRevenue)}</td>
                  <td className="p-2 border border-[#D8D3CB] text-[#5A6270]">Receita bruta média declarada</td>
                </tr>
                <tr className="bg-[#F9F7F3]/50">
                  <td className="p-2 border border-[#D8D3CB] font-semibold text-rose-900">Custos Fixos Totais (c/ Pró-labore)</td>
                  <td className="p-2 border border-[#D8D3CB] font-mono font-bold text-rose-900">{formatCurrency(breakEven.fixedCostsTotal)}</td>
                  <td className="p-2 border border-[#D8D3CB] text-[#5A6270]">Custo fixo operacional + pró-labore dos sócios</td>
                </tr>
                <tr>
                  <td className="p-2 border border-[#D8D3CB] font-semibold text-[#6B0F1A]">Ponto de Equilíbrio (Break-Even)</td>
                  <td className="p-2 border border-[#D8D3CB] font-mono font-bold text-[#6B0F1A]">{formatCurrency(breakEven.breakEvenRevenue)}</td>
                  <td className="p-2 border border-[#D8D3CB] text-[#5A6270]">Representa {breakEven.breakEvenPercentage}% da receita atual para cobrir custos</td>
                </tr>
                <tr className="bg-[#F9F7F3]/50">
                  <td className="p-2 border border-[#D8D3CB] font-semibold text-emerald-900">Lucro Líquido Estimado</td>
                  <td className="p-2 border border-[#D8D3CB] font-mono font-bold text-emerald-900">{formatCurrency(breakEven.estimatedNetProfit)}</td>
                  <td className="p-2 border border-[#D8D3CB] text-[#5A6270]">Margem líquida calculada: {breakEven.estimatedNetMarginPercent}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AREA SCORES GRID */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-[#6B0F1A] uppercase text-xs border-b border-[#D8D3CB] pb-1">3. Pontuação das 6 Áreas Estratégicas</h3>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {(Object.values(result.areaScores) as AreaScoreInfo[]).map((area) => (
                <div key={area.key} className="p-2.5 bg-[#F9F7F3] rounded-lg border border-[#D8D3CB] flex justify-between items-center">
                  <span className="font-bold text-[#1A1A1A]">{area.name}</span>
                  <span className="font-mono font-bold text-[#6B0F1A]">{area.score}/10</span>
                </div>
              ))}
            </div>
          </div>

          {/* 90-DAY ACTION PLAN */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-[#6B0F1A] uppercase text-xs border-b border-[#D8D3CB] pb-1">4. Plano de Ação de 90 Dias (Execução Tática)</h3>
            
            <div className="space-y-3">
              {[result.actionPlan90Days.phase1, result.actionPlan90Days.phase2, result.actionPlan90Days.phase3].map((phase) => (
                <div key={phase.phaseNumber} className="p-3 bg-[#F9F7F3] rounded-xl border border-[#D8D3CB] space-y-1.5">
                  <div className="flex justify-between font-bold text-[#1A1A1A] text-xs">
                    <span className="text-[#6B0F1A]">{phase.period}: {phase.title}</span>
                    <span className="text-[#1A1A1A] text-[10px]">Meta: {phase.goal}</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#5A6270]">
                    {phase.tasks.map((t) => (
                      <li key={t.id}>
                        <strong className="text-[#1A1A1A]">{t.title}:</strong> {t.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* EXECUTIVE RECOMMENDATIONS */}
          <div className="space-y-2 border-t border-[#D8D3CB] pt-4 text-[#1A1A1A]">
            <h4 className="font-bold text-[#6B0F1A] uppercase text-xs">Recomendações Finais do Consultor TFAZZIO:</h4>
            <p className="text-[11px] text-[#5A6270]">{result.executiveSummary}</p>
          </div>

          {/* FOOTER */}
          <div className="border-t border-[#D8D3CB] pt-4 text-center text-[10px] text-[#5A6270]">
            <p>Grupo TFAZZIO • Ponto de Impacto • Diagnóstico Estratégico Empresarial • Todos os direitos reservados</p>
          </div>

        </div>
      </div>
    </div>
  );
};
