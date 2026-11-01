'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ResumeChecker } from '@/components/ResumeChecker';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { ResumeBuilder } from '@/components/ResumeBuilder';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { PricingSection } from '@/components/PricingSection';
import { FaqSection } from '@/components/FaqSection';
import { Footer } from '@/components/Footer';
import { PrivacyModal, TermsModal, ContactModal } from '@/components/Modals';
import { AnalysisResult } from '@/types';

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'builder'>('home');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const scrollToChecker = () => {
    setCurrentView('home');
    setTimeout(() => {
      const el = document.getElementById('resume-checker');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const scrollToHowItWorks = () => {
    setCurrentView('home');
    setTimeout(() => {
      const el = document.getElementById('how-it-works');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setTimeout(() => {
      const el = document.getElementById('results-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    scrollToChecker();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      {/* 1. Sleek Minimalist Navbar */}
      <Navbar
        onCheckResumeClick={scrollToChecker}
        onOpenBuilderClick={() => setCurrentView('builder')}
        onHomeClick={() => setCurrentView('home')}
      />

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {currentView === 'builder' ? (
          <ResumeBuilder
            initialAnalysis={analysisResult}
            onBackToResults={() => setCurrentView('home')}
            onBackToChecker={() => {
              setAnalysisResult(null);
              setCurrentView('home');
              scrollToChecker();
            }}
          />
        ) : (
          <>
            {/* 2. Hero Section (Spotlighting Assessments & AI Interviews) */}
            <Hero
              onCheckResumeClick={scrollToChecker}
              onSeeHowItWorksClick={scrollToHowItWorks}
              onOpenBuilderClick={() => setCurrentView('builder')}
            />

            {/* 3. Core Architectural Features */}
            <Features />

            {/* 4. Transparent Pro Pricing & Plans */}
            <PricingSection />

            {/* 5. Resume Diagnostic & Upload Section (Complimentary Entry Utility) */}
            <ResumeChecker onAnalysisComplete={handleAnalysisComplete} />

            {/* 6. Real Results Dashboard (Displayed when analysis finishes) */}
            {analysisResult && (
              <ResultsDashboard
                result={analysisResult}
                onReset={handleReset}
                onEditInBuilder={() => setCurrentView('builder')}
              />
            )}

            {/* 7. How It Works */}
            <HowItWorks />

            {/* 8. FAQ */}
            <FaqSection />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenContact={() => setIsContactOpen(true)}
      />

      {/* Legal & Contact Modals */}
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
