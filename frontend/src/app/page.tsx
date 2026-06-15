'use client';

import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';

// Helper for dot pattern background
const DotPattern = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03] dark:opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="currentColor"></circle>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dotPattern)"></rect>
  </svg>
);

export default function RootPage() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className="min-h-screen bg-bg-primary text-text-main font-sans selection:bg-brand-accent/20 flex flex-col">
      
      {/* COMPONENT A: Global Navigation Header */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-bg-primary/70 border-b border-border-subtle py-4 px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight text-text-main">Expense2Split</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 bg-bg-secondary/50 px-6 py-2.5 rounded-full border border-border-subtle/50 backdrop-blur-sm">
            {['Features', 'Core Problem Solved', 'Tech Specifications'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm font-semibold text-text-muted hover:text-brand-accent transition-colors">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2.5 rounded-full border border-border-subtle hover:bg-bg-secondary transition-colors text-text-muted flex items-center justify-center w-10 h-10 hover:shadow-sm bg-bg-primary/50">
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <Link href="/login" className="bg-text-main text-bg-primary text-sm font-bold px-5 py-2.5 rounded-full hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
              Launch App Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        
        {/* COMPONENT B: Hero Master Layout Section */}
        <section className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden bg-bg-primary border-b border-border-subtle flex flex-col justify-center">
          <DotPattern />
          {/* Background Gradients */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-brand-accent/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="px-6 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="flex flex-col gap-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full w-max mx-auto lg:mx-0 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
                Engineered for Messy Real-World Data
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-text-main">
                Shared expense tracking is a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-semantic-danger">mess</span>.
                <br/>We built the algorithmic broom.
              </h1>
              <p className="text-lg text-text-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Inconsistent currency exchanges, flatmates moving mid-month, duplicate transactions, and opaque balance calculations. Expense2Split reads through the anomalies to produce clear, mathematical debt settlements instantly.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start pt-4">
                <Link href="/login" className="bg-brand-accent text-white text-base font-bold px-8 py-4 rounded-full hover:bg-sky-500 hover:shadow-xl hover:shadow-brand-accent/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
                  Get Started For Free
                </Link>
                <a href="#tech-specifications" className="text-sm font-bold text-text-muted hover:text-brand-primary bg-bg-secondary border border-border-subtle px-6 py-4 rounded-full transition-all duration-300 flex items-center gap-2 group hover:shadow-md">
                  View Architecture 
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
            </div>
            
            <div className="relative w-full max-w-lg mx-auto lg:max-w-none aspect-square lg:aspect-auto lg:h-[600px] rounded-[2.5rem] bg-gradient-to-br from-bg-secondary to-bg-primary border border-border-subtle p-8 overflow-hidden shadow-2xl flex items-center justify-center group transform transition-transform duration-700 hover:scale-[1.02]">
               <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none opacity-20"></div>
               
               {/* Decorative floating elements */}
               <div className="absolute top-10 left-10 w-24 h-24 bg-semantic-danger/20 rounded-full blur-2xl"></div>
               <div className="absolute bottom-10 right-10 w-32 h-32 bg-brand-accent/20 rounded-full blur-2xl"></div>
               
               {/* Interactive Visual Breakdown Grid Card */}
               <div className="w-full max-w-sm bg-bg-primary rounded-3xl shadow-2xl border border-border-subtle p-8 transition-all duration-500 transform group-hover:-translate-y-2 relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-slate-700 text-white flex items-center justify-center font-bold text-lg shadow-lg">A</div>
                      <div className="absolute w-8 h-px bg-border-subtle left-full top-1/2 -translate-y-1/2"></div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-accent to-sky-400 text-white flex items-center justify-center font-bold text-lg shadow-lg ml-6 z-10">R</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Aisha owes Rohan</div>
                      <div className="text-3xl font-black text-semantic-danger">₹2,300</div>
                    </div>
                  </div>
                  
                  {/* Line-item audit trail (Expands on hover) */}
                  <div className="overflow-hidden h-0 group-hover:h-[140px] transition-all duration-700 ease-in-out opacity-0 group-hover:opacity-100 flex flex-col gap-3 pt-4 border-t border-border-subtle mt-0 group-hover:mt-2">
                    <div className="flex justify-between items-center bg-bg-secondary p-3 rounded-xl border border-border-subtle/50">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text-main">Groceries</span>
                        <span className="text-[10px] text-text-muted">Mar 12, 2026</span>
                      </div>
                      <span className="font-black text-sm text-text-main">₹800</span>
                    </div>
                    <div className="flex justify-between items-center bg-bg-secondary p-3 rounded-xl border border-border-subtle/50">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text-main">Utilities</span>
                        <span className="text-[10px] text-text-muted">Mar 15, 2026</span>
                      </div>
                      <span className="font-black text-sm text-text-main">₹1,500</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* COMPONENT C: The Real Problem & Persona Solution Board */}
        <section id="features" className="py-24 md:py-32 px-6 md:px-12 bg-bg-secondary border-b border-border-subtle relative">
          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="text-center mb-20">
              <span className="text-brand-accent font-bold tracking-widest uppercase text-sm mb-3 block">Features</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-text-main mb-6">The Complete Algorithmic Toolkit</h2>
              <p className="text-text-muted text-lg max-w-2xl mx-auto font-medium">Transforming raw flatmate requests into professional programmatic solutions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: '🕸️', title: 'One-Number Settlement', desc: 'Minimizes circular paths using Graph Theory to output exactly one clear transaction coordinate direction row per individual.' },
                { icon: '🔍', title: 'Line-Item Audit Traceability', desc: 'No blind math vectors. Clicking a user balance expands a scrollable layout displaying exact historical timestamps and expense IDs contributing to the valuation metrics.' },
                { icon: '💱', title: 'Cross-Border Pipeline', desc: 'Automated, historic exchange index integrations. Converts multiple international currencies (USD to INR conversions) with transparent rate verification markers.' },
                { icon: '⏳', title: 'Temporal Matrix', desc: 'Dynamic timestamp boundaries. Users are insulated from historical ledger calculations that occurred outside their specific move-in/move-out chronological boundaries.' },
                { icon: '⚖️', title: 'De-Duplication Workflow', desc: 'An alert logging console listing twin-entry anomalies, requiring programmatic stakeholder approval tags before data fields are altered or pruned.', colSpan: 'lg:col-span-2 xl:col-span-1' }
              ].map((feature, i) => (
                <div key={i} className={`bg-bg-primary p-8 rounded-3xl border border-border-subtle hover:border-brand-accent/50 hover:shadow-2xl hover:shadow-brand-accent/10 transition-all duration-300 group ${feature.colSpan || ''}`}>
                  <div className="w-14 h-14 bg-bg-secondary rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-border-subtle group-hover:scale-110 group-hover:bg-brand-accent/10 transition-all duration-300">
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-text-main mb-3">{feature.title}</h3>
                  <p className="text-text-muted leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPONENT D: Deep Technical Feature Specification Module */}
        <section id="tech-specifications" className="py-24 md:py-32 px-6 md:px-12 bg-bg-primary border-b border-border-subtle">
          <div className="max-w-7xl mx-auto w-full">
            <div className="bg-slate-900 text-white rounded-[3rem] p-10 md:p-16 overflow-hidden relative shadow-2xl">
              {/* Background geometric accents */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-semantic-success/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
              <DotPattern />
              
              <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
                <div className="lg:w-1/3">
                  <span className="text-brand-accent font-bold tracking-widest uppercase text-xs mb-3 block">Architecture</span>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6 text-white leading-tight">Imperfect Data Handling Engine</h2>
                  <p className="text-slate-300 text-lg font-medium leading-relaxed mb-8">
                    Our parsing engine runs imported `expenses_export.csv` files through programmatic data anomalies (duplicate parsing, retroactive lease validation) to map into a relational structure without ever silently guessing.
                  </p>
                  <Link href="/login" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-full font-bold transition-colors">
                    Try The Importer Now <span className="text-brand-accent">→</span>
                  </Link>
                </div>
                
                {/* Visual Sequence Component */}
                <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { stage: '01', title: 'Raw Ingestion', desc: 'Parse CSV buffer via streaming parser. Typecast string numeric fields.', color: 'text-brand-accent', border: 'border-white/10' },
                    { stage: '02', title: 'Anomaly Detection', desc: 'Run 12 heuristic checks (duplicates, missing actors, currency mismatches).', color: 'text-brand-accent', border: 'border-white/10' },
                    { stage: '03', title: 'Resolution Queue', desc: 'Surface conflict matrix to stakeholder. Await explicit approval markers.', color: 'text-brand-accent', border: 'border-brand-accent border-l-4 bg-white/5' },
                    { stage: '04', title: 'Relational Commit', desc: 'ACID transaction bundle insertion into Postgres expense/split nodes.', color: 'text-semantic-success', border: 'border-white/10' }
                  ].map((step, i) => (
                    <div key={i} className={`bg-black/20 backdrop-blur-md p-6 rounded-2xl border ${step.border} hover:bg-black/30 transition-colors`}>
                      <div className={`text-xs font-black ${step.color} mb-3 tracking-widest`}>STAGE {step.stage}</div>
                      <div className="font-bold text-xl mb-2 text-white">{step.title}</div>
                      <div className="text-sm text-slate-400 font-medium leading-relaxed">{step.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPONENT E: Responsive App Dashboard Preview Wrapper */}
        <section id="core-problem-solved" className="py-24 md:py-32 px-6 md:px-12 bg-bg-secondary relative">
          <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-16">
              <span className="text-brand-accent font-bold tracking-widest uppercase text-sm mb-3 block">Interface</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-text-main mb-6">Command Center Architecture</h2>
              <p className="text-text-muted text-lg max-w-2xl mx-auto font-medium">A highly optimized interface container showcasing the core application dashboard frame.</p>
            </div>
            
            <div className="rounded-[2.5rem] border border-border-subtle bg-bg-primary shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-700 hover:-translate-y-2">
              {/* Fake Browser Header */}
              <div className="h-14 bg-bg-secondary flex items-center px-6 gap-2.5 border-b border-border-subtle">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] shadow-sm"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] shadow-sm"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] shadow-sm"></div>
                <div className="mx-auto bg-bg-primary text-text-muted text-[11px] py-1.5 px-12 md:px-32 rounded-lg font-mono border border-border-subtle shadow-inner flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  app.expense2split.com/dashboard
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 bg-bg-secondary/30">
                {/* Sidebar */}
                <div className="w-full md:w-64 flex flex-col gap-4">
                  <div className="h-10 w-2/3 bg-border-subtle rounded-xl mb-4 animate-pulse"></div>
                  <div className="h-12 w-full bg-brand-accent/10 text-brand-accent font-bold text-sm flex items-center px-5 rounded-2xl shadow-inner border border-brand-accent/20">🔥 Active: Goa Trip</div>
                  <div className="h-12 w-full bg-bg-primary text-text-muted font-bold text-sm flex items-center px-5 rounded-2xl border border-border-subtle shadow-sm hover:border-border-subtle/80 transition-colors">👥 Flatmates</div>
                  <div className="h-12 w-full bg-bg-primary text-text-muted font-bold text-sm flex items-center px-5 rounded-2xl border border-border-subtle shadow-sm hover:border-border-subtle/80 transition-colors">⚙️ Settings</div>
                </div>
                
                {/* Main Matrix */}
                <div className="flex-1 flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-32 bg-bg-primary rounded-3xl border border-border-subtle p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-border-subtle/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                      <span className="text-sm text-text-muted font-bold flex items-center gap-2">Total Group Spend <span className="bg-bg-secondary px-2 py-0.5 rounded text-[10px]">ALL TIME</span></span>
                      <span className="text-3xl font-black text-text-main tracking-tight">₹45,200.00</span>
                    </div>
                    <div className="h-32 bg-bg-primary rounded-3xl border border-border-subtle p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-semantic-success/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                      <span className="text-sm text-text-muted font-bold flex items-center gap-2">You are owed <span className="bg-semantic-success/10 text-semantic-success px-2 py-0.5 rounded text-[10px]">NET POSITIVE</span></span>
                      <span className="text-3xl font-black text-semantic-success tracking-tight">₹12,400.00</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[250px] bg-bg-primary rounded-3xl border border-border-subtle p-8 flex flex-col gap-6 relative shadow-sm">
                    {/* Status Notification Tray */}
                    <div className="absolute -top-4 right-8 bg-gradient-to-r from-semantic-danger to-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-red-400 flex items-center gap-2 animate-bounce">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      3 Anomalies Detected
                    </div>
                    <h4 className="text-base font-bold text-text-main border-b border-border-subtle pb-4 flex items-center justify-between">
                      Recent Transactions Matrix
                      <button className="text-xs font-bold text-brand-accent bg-brand-accent/10 px-3 py-1.5 rounded-full">View All</button>
                    </h4>
                    <div className="flex flex-col gap-4">
                      {[1,2,3].map((i, idx) => (
                        <div key={i} className="flex justify-between items-center py-3 px-4 bg-bg-secondary/50 rounded-2xl border border-border-subtle/50 hover:bg-bg-secondary transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs ${['bg-brand-primary', 'bg-brand-accent', 'bg-semantic-success'][idx]}`}>
                              {['D', 'S', 'P'][idx]}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <div className={`h-2.5 w-32 rounded-full ${['bg-slate-300 dark:bg-slate-600', 'bg-slate-200 dark:bg-slate-700', 'bg-slate-300 dark:bg-slate-600'][idx]}`}></div>
                              <div className="h-1.5 w-16 bg-border-subtle rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="h-3 w-16 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                            <div className="h-1.5 w-10 bg-border-subtle rounded-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* COMPONENT F: Global Interface Action Footer Card */}
      <footer className="border-t border-border-subtle bg-bg-primary py-16 px-6 md:px-12 relative overflow-hidden">
        <DotPattern />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-12 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-text-main">Expense2Split</span>
            </div>
            <span className="text-sm text-text-muted max-w-xs leading-relaxed">A Next-Generation, Non-Linear Group Expense Splitting Platform.</span>
          </div>
          
          <div className="flex flex-wrap gap-16">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-black text-text-main uppercase tracking-widest">Resources</span>
              <a href="#" className="text-sm font-medium text-text-muted hover:text-brand-accent transition-colors">Documentation</a>
              <a href="#" className="text-sm font-medium text-text-muted hover:text-brand-accent transition-colors">Anomaly Engine API</a>
              <a href="#" className="text-sm font-medium text-text-muted hover:text-brand-accent transition-colors">Support Center</a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-xs font-black text-text-main uppercase tracking-widest">Legal</span>
              <a href="#" className="text-sm font-medium text-text-muted hover:text-brand-accent transition-colors">MIT License</a>
              <a href="#" className="text-sm font-medium text-text-muted hover:text-brand-accent transition-colors">Privacy Policy</a>
              <a href="#" className="text-sm font-medium text-text-muted hover:text-brand-accent transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-border-subtle text-xs font-bold text-text-muted flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <span>&copy; {new Date().getFullYear()} Expense2Split Systems. All mathematical rights reserved.</span>
          <span className="bg-bg-secondary px-3 py-1 rounded-full border border-border-subtle">Version 1.0.0-rc</span>
        </div>
      </footer>

    </div>
  );
}
