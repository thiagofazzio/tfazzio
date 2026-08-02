import React, { useState } from 'react';
import { DiagnosticFormData, DiagnosticResult, CompanyCNPJData } from '../types';
import { WelcomeStep } from './steps/WelcomeStep';
import { CnpjStep } from './steps/CnpjStep';
import { ObjectiveStep } from './steps/ObjectiveStep';
import { CompanyDetailsStep } from './steps/CompanyDetailsStep';
import { FinancialDataStep } from './steps/FinancialDataStep';
import { CommercialDataStep } from './steps/CommercialDataStep';
import { SelfAssessmentStep } from './steps/SelfAssessmentStep';
import { StrategicQuestionsStep } from './steps/StrategicQuestionsStep';
import { ReviewStep } from './steps/ReviewStep';
import { ProcessingStep } from './steps/ProcessingStep';
import { ReportDashboard } from './report/ReportDashboard';
import { PdfGenerator } from './report/PdfGenerator';
import { ArrowLeft, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateFullDiagnostic } from '../utils/diagnosticCalculator';

const INITIAL_FORM_DATA: DiagnosticFormData = {
  cnpj: '',
  cnpjData: null,
  mainGoal: '',
  biggestDifficulty: '',
  companyName: '',
  segment: '',
  cityState: '',
  timeInMarket: '3_5',
  employeesCount: '6_15',
  taxRegime: 'Simples Nacional',
  monthlyRevenue: 150000,
  fixedCosts: 45000,
  variableCostsPercent: 30,
  taxesPercent: 8,
  ownerSalary: 12000,
  averageTicket: 2500,
  monthlyClients: 60,
  conversionRate: 25,
  hasCRM: true,
  salesTeamSize: 2,
  scoreFinanceiro: 3,
  scoreComercial: 2,
  scoreOperacao: 3,
  scoreGestao: 2,
  scorePessoas: 3,
  scoreEstrategia: 2,
  runsWithoutOwner30Days: false,
  knowsNetMargin: false,
  hasProjectedCashFlow: false,
  hasGrowthGoalsAndPlan: false,
};

interface WizardContainerProps {
  onStepChange?: (step: number) => void;
  onCompanyChange?: (name: string) => void;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({ onStepChange, onCompanyChange }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DiagnosticFormData>(INITIAL_FORM_DATA);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateFormData = (fields: Partial<DiagnosticFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...fields };
      if (fields.companyName && onCompanyChange) {
        onCompanyChange(fields.companyName);
      }
      return updated;
    });
    setValidationError(null);
  };

  const handleCnpjUpdate = (cnpj: string, cnpjData: CompanyCNPJData | null) => {
    setFormData((prev) => ({
      ...prev,
      cnpj,
      cnpjData,
      companyName: prev.companyName || cnpjData?.razaoSocial || cnpjData?.nomeFantasia || '',
      segment: prev.segment || cnpjData?.cnaeDescricao || '',
      cityState: prev.cityState || (cnpjData?.municipio ? `${cnpjData.municipio} / ${cnpjData.uf}` : ''),
    }));

    if (cnpjData?.razaoSocial && onCompanyChange) {
      onCompanyChange(cnpjData.razaoSocial);
    }
  };

  const totalWizardSteps = 16; // Steps 1 to 16

  const validateStep = (): boolean => {
    setValidationError(null);

    if (currentStep === 3) {
      // Objectives
      if (!formData.mainGoal.trim()) {
        setValidationError('Por favor, descreva o seu principal objetivo estratégico.');
        return false;
      }
      if (!formData.biggestDifficulty.trim()) {
        setValidationError('Por favor, informe a maior dificuldade ou gargalo atual.');
        return false;
      }
    } else if (currentStep === 4) {
      // Company Details
      if (!formData.companyName.trim()) {
        setValidationError('Por favor, informe o nome ou marca da sua empresa.');
        return false;
      }
      if (!formData.segment.trim()) {
        setValidationError('Por favor, informe o segmento de atuação.');
        return false;
      }
    } else if (currentStep === 5) {
      // Financial
      if (!formData.monthlyRevenue || formData.monthlyRevenue <= 0) {
        setValidationError('Por favor, informe um faturamento mensal válido.');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;

    const next = currentStep + 1;
    setCurrentStep(next);
    if (onStepChange) onStepChange(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setValidationError(null);
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
    if (onStepChange) onStepChange(prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAll = () => {
    setFormData(INITIAL_FORM_DATA);
    setDiagnosticResult(null);
    setCurrentStep(1);
    setShowPdfModal(false);
    setValidationError(null);
    if (onStepChange) onStepChange(1);
    if (onCompanyChange) onCompanyChange('');
  };

  const runDiagnosticCalculation = async () => {
    setCurrentStep(15); // Go to Processing Step
    if (onStepChange) onStepChange(15);

    try {
      // Attempt to call AI endpoint
      const response = await fetch('/api/diagnostico/ia-gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result: DiagnosticResult = await response.json();
        setDiagnosticResult(result);
      } else {
        // Fallback to local calculation
        const localResult = generateFullDiagnostic(formData);
        setDiagnosticResult(localResult);
      }
    } catch (e) {
      console.warn('API call failed, calculating locally:', e);
      const localResult = generateFullDiagnostic(formData);
      setDiagnosticResult(localResult);
    }
  };

  const onProcessingFinished = () => {
    setCurrentStep(16); // Show Report Dashboard
    if (onStepChange) onStepChange(16);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6">
      
      {/* Step Render Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Welcome */}
            {currentStep === 1 && <WelcomeStep onStart={nextStep} />}

            {/* Step 2: CNPJ */}
            {currentStep === 2 && (
              <CnpjStep
                cnpj={formData.cnpj}
                cnpjData={formData.cnpjData}
                onUpdate={handleCnpjUpdate}
                onNext={nextStep}
              />
            )}

            {/* Step 3: Objective */}
            {currentStep === 3 && (
              <ObjectiveStep
                mainGoal={formData.mainGoal}
                biggestDifficulty={formData.biggestDifficulty}
                onUpdate={(data) => updateFormData(data)}
              />
            )}

            {/* Step 4: Profile */}
            {currentStep === 4 && (
              <CompanyDetailsStep formData={formData} onUpdate={updateFormData} />
            )}

            {/* Step 5: Financials */}
            {currentStep === 5 && (
              <FinancialDataStep formData={formData} onUpdate={updateFormData} />
            )}

            {/* Step 6: Commercial */}
            {currentStep === 6 && (
              <CommercialDataStep formData={formData} onUpdate={updateFormData} />
            )}

            {/* Step 7: Self Eval - Financeiro */}
            {currentStep === 7 && (
              <SelfAssessmentStep
                areaKey="Financeiro"
                areaTitle="Financeiro & Caixa"
                stepNumber={6}
                currentValue={formData.scoreFinanceiro}
                onSelect={(val) => {
                  updateFormData({ scoreFinanceiro: val });
                  nextStep();
                }}
              />
            )}

            {/* Step 8: Self Eval - Comercial */}
            {currentStep === 8 && (
              <SelfAssessmentStep
                areaKey="Comercial"
                areaTitle="Comercial & Vendas"
                stepNumber={7}
                currentValue={formData.scoreComercial}
                onSelect={(val) => {
                  updateFormData({ scoreComercial: val });
                  nextStep();
                }}
              />
            )}

            {/* Step 9: Self Eval - Operação */}
            {currentStep === 9 && (
              <SelfAssessmentStep
                areaKey="Operacao"
                areaTitle="Operação & Entrega"
                stepNumber={8}
                currentValue={formData.scoreOperacao}
                onSelect={(val) => {
                  updateFormData({ scoreOperacao: val });
                  nextStep();
                }}
              />
            )}

            {/* Step 10: Self Eval - Gestão */}
            {currentStep === 10 && (
              <SelfAssessmentStep
                areaKey="Gestao"
                areaTitle="Gestão & Processos"
                stepNumber={9}
                currentValue={formData.scoreGestao}
                onSelect={(val) => {
                  updateFormData({ scoreGestao: val });
                  nextStep();
                }}
              />
            )}

            {/* Step 11: Self Eval - Pessoas */}
            {currentStep === 11 && (
              <SelfAssessmentStep
                areaKey="Pessoas"
                areaTitle="Pessoas & Liderança"
                stepNumber={10}
                currentValue={formData.scorePessoas}
                onSelect={(val) => {
                  updateFormData({ scorePessoas: val });
                  nextStep();
                }}
              />
            )}

            {/* Step 12: Self Eval - Estratégia */}
            {currentStep === 12 && (
              <SelfAssessmentStep
                areaKey="Estrategia"
                areaTitle="Estratégia & Visão"
                stepNumber={11}
                currentValue={formData.scoreEstrategia}
                onSelect={(val) => {
                  updateFormData({ scoreEstrategia: val });
                  nextStep();
                }}
              />
            )}

            {/* Step 13: Strategic Questions */}
            {currentStep === 13 && (
              <StrategicQuestionsStep formData={formData} onUpdate={updateFormData} />
            )}

            {/* Step 14: Review */}
            {currentStep === 14 && (
              <ReviewStep formData={formData} onRunDiagnostic={runDiagnosticCalculation} />
            )}

            {/* Step 15: Processing */}
            {currentStep === 15 && <ProcessingStep onFinished={onProcessingFinished} />}

            {/* Step 16: Report Dashboard */}
            {currentStep === 16 && diagnosticResult && (
              <ReportDashboard
                result={diagnosticResult}
                onDownloadPdf={() => setShowPdfModal(true)}
                onRestart={resetAll}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Validation Error Toast */}
        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation Controls */}
      {currentStep > 1 && currentStep < 15 && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 mt-6 border-t border-[#D8D3CB] flex items-center justify-between">
          <button
            id="btn-wizard-prev"
            type="button"
            onClick={prevStep}
            className="px-5 py-2.5 bg-white hover:bg-[#F9F7F3] border border-[#D8D3CB] text-[#1A1A1A] font-bold text-xs rounded-lg flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <span className="text-xs text-[#5A6270] font-medium hidden sm:inline">
            Etapa {currentStep - 1} de {totalWizardSteps - 3}
          </span>

          {currentStep !== 14 && (
            <button
              id="btn-wizard-next"
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-[#6B0F1A] hover:bg-[#500B13] text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 transition cursor-pointer"
            >
              <span>Avançar</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      )}

      {/* PDF Modal overlay */}
      {showPdfModal && diagnosticResult && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8D3CB] rounded-2xl p-6 max-w-4xl w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#D8D3CB] pb-3">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Visualização de Impressão e PDF - TFAZZIO</h3>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-[#5A6270] hover:text-[#1A1A1A] font-bold p-1 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <PdfGenerator result={diagnosticResult} onClose={() => setShowPdfModal(false)} />
          </div>
        </div>
      )}

    </div>
  );
};
