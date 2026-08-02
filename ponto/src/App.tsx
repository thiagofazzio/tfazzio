import React, { useState } from 'react';
import { Header } from './components/Header';
import { WizardContainer } from './components/WizardContainer';

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [companyName, setCompanyName] = useState('');

  return (
    <div className="min-h-screen bg-[#F9F7F3] text-[#1A1A1A] font-sans selection:bg-[#6B0F1A] selection:text-white flex flex-col">
      <Header
        currentStep={currentStep}
        totalSteps={16}
        onReset={() => window.location.reload()}
        companyName={companyName}
      />

      <main className="flex-1">
        <WizardContainer
          onStepChange={(step) => setCurrentStep(step)}
          onCompanyChange={(name) => setCompanyName(name)}
        />
      </main>

      <footer className="py-4 border-t border-[#D8D3CB] bg-white text-center text-xs text-[#5A6270]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} TFAZZIO • Ponto de Impacto • Diagnóstico Estratégico de PMEs.</p>
          <div className="flex items-center gap-4 text-[#5A6270] text-[11px]">
            <span>Grupo TFAZZIO</span>
            <span>•</span>
            <span>Segurança SSL / APIs Integradas</span>
            <span>•</span>
            <span>Relatório PDF Executivo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
