import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { THEME_CONFIGS, ThemeConfig } from './themeHelper.js';
import { RaffleSettings, Ticket, ThemeType } from './types.js';
import GuestDashboard from './components/GuestDashboard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import PaymentModal from './components/PaymentModal.tsx';
import SorteadorModal from './components/SorteadorModal.tsx';
import { ShieldAlert, LogOut, Loader2, Sparkles, AlertCircle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function App() {
  // Authentication & Mode State
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginInputKey, setLoginInputKey] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Raffle State
  const [settings, setSettings] = useState<RaffleSettings | null>(null);
  const [tickets, setTickets] = useState<Record<number, Ticket>>({});
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);

  // Modal Interactive Triggers
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSorteadorOpen, setIsSorteadorOpen] = useState(false);

  // General Loading & Feedback State
  const [isLoading, setIsLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  // 1. Initial Load & URL Route Check
  useEffect(() => {
    // Check URL parameters for an administrative access key (?key=XYZ)
    const params = new URLSearchParams(window.location.search);
    const keyParam = params.get('key') || params.get('admin');
    
    let keyToUse = keyParam;
    if (keyParam) {
      setAdminKey(keyParam);
      sessionStorage.setItem('raffle_admin_key', keyParam);
      
      // Clean up the URL query parameter key so it is not visible in the address bar!
      const url = new URL(window.location.href);
      url.searchParams.delete('key');
      url.searchParams.delete('admin');
      window.history.replaceState({}, '', url.pathname + url.search);
    } else {
      // Try to load from session storage fallback
      const storedKey = sessionStorage.getItem('raffle_admin_key');
      if (storedKey) {
        setAdminKey(storedKey);
        keyToUse = storedKey;
      }
    }

    fetchInitialData(keyToUse);
  }, []);

  // 2. Real-time Polling Synchronization (Every 3.5 seconds)
  useEffect(() => {
    if (isPaymentModalOpen) return; // Pause polling while reserving to avoid typing/input focus loss
    const pollInterval = setInterval(() => {
      syncDataRealtime();
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [adminKey, isAdmin, isPaymentModalOpen]);

  // Main data synchronizer (pulls admin details if key is active, or gets public info)
  const fetchInitialData = async (keyToUse: string | null = adminKey) => {
    setIsLoading(true);
    setErrorHeader(null);

    try {
      if (keyToUse) {
        // Authenticated fetch: returns full names, addresses, and telephone details
        const response = await fetch(`/api/raffle/admin?key=${keyToUse}`);
        if (response.ok) {
          const dbState = await response.json();
          setSettings(dbState.settings);
          setTickets(dbState.tickets);
          setDrawnNumbers(dbState.drawnNumbers);
          setIsAdmin(true);
          setAdminKey(keyToUse);
          setIsLoading(false);
          return;
        } else if (response.status === 401) {
          // If 401, administrative credentials might have changed, fallback to public mode
          setAdminKey(null);
          setIsAdmin(false);
        } else {
          try {
            const errData = await response.json();
            setErrorHeader(`Erro de carregamento (Banco de dados): ${errData.error || response.statusText}`);
          } catch {
            setErrorHeader(`Instabilidade temporária no servidor (Erro ${response.status}).`);
          }
          setIsLoading(false);
          return;
        }
      }

      // Public fetch: contains censored phone information for privacy
      const resPublic = await fetch('/api/raffle');
      if (resPublic.ok) {
        const dataPublic = await resPublic.json();
        setSettings(dataPublic.settings);
        setTickets(dataPublic.tickets);
        setDrawnNumbers(dataPublic.drawnNumbers);
      } else {
        try {
          const errData = await resPublic.json();
          setErrorHeader(`Falha ao inicializar banco de rifas: ${errData.error || resPublic.statusText}`);
        } catch {
          setErrorHeader(`Falha ao inicializar banco de rifas (Erro ${resPublic.status}).`);
        }
      }
    } catch {
      setErrorHeader("Erro de comunicação ao conectar com a API.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncDataRealtime = async () => {
    try {
      if (adminKey && isAdmin) {
        const response = await fetch(`/api/raffle/admin?key=${adminKey}`);
        if (response.ok) {
          const dbState = await response.json();
          setSettings(dbState.settings);
          setTickets(dbState.tickets);
          setDrawnNumbers(dbState.drawnNumbers);
          return;
        }
      }

      const resPublic = await fetch('/api/raffle');
      if (resPublic.ok) {
        const dataPublic = await resPublic.json();
        setSettings(dataPublic.settings);
        setTickets(dataPublic.tickets);
        setDrawnNumbers(dataPublic.drawnNumbers);
      }
    } catch {
      // Slidely fail silent during active polling to avoid disruptive banners
    }
  };

  // Password submission to unlock organizational panel
  const handleAdminVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginInputKey.trim()) {
      setLoginError("Por favor informe sua senha.");
      return;
    }

    try {
      const response = await fetch(`/api/raffle/admin?key=${loginInputKey.trim()}`);
      if (!response.ok) {
        setLoginError("Senha / Chave de acesso inválida.");
        return;
      }

      const dbState = await response.json();
      setSettings(dbState.settings);
      setTickets(dbState.tickets);
      setDrawnNumbers(dbState.drawnNumbers);
      setAdminKey(loginInputKey.trim());
      sessionStorage.setItem('raffle_admin_key', loginInputKey.trim());
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginInputKey('');

      // Clean search parameters from URL so that the key is not visible
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('key');
      newUrl.searchParams.delete('admin');
      window.history.pushState({}, '', newUrl);

    } catch {
      setLoginError("Erro de comunicação com o servidor.");
    }
  };

  // Logout / clear administrative layout back to guest view
  const handleLogOutAdmin = () => {
    setIsAdmin(false);
    setAdminKey(null);
    sessionStorage.removeItem('raffle_admin_key');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('key');
    newUrl.searchParams.delete('admin');
    window.history.pushState({}, '', newUrl);
    fetchInitialData(null);
  };

  // Grid number selection: handles multi-toggles for Guest shopping cart
  const handleSelectNumber = (num: number) => {
    const existing = tickets[num];
    // Cannot pick already reserved or paid numbers from the grid
    if (existing && (existing.status === 'paid' || existing.status === 'reserved')) return;
    
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((item) => item !== num);
      } else {
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  // Clean trigger when guest reservation finishes
  const handleReserveSuccess = (status: 'reserved' | 'paid') => {
    syncDataRealtime();
  };

  const currentThemeId: ThemeType = settings?.theme || 'safari';
  const themeConfig: ThemeConfig = THEME_CONFIGS[currentThemeId];

  // Force reset action
  const handleResetAction = async () => {
    if (!adminKey) return;
    try {
      const response = await fetch('/api/raffle/admin/reset', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (response.ok) {
        fetchInitialData(adminKey);
        alert("Rifa redefinida com sucesso!");
      }
    } catch {
      alert("Erro ao redefinir rifa.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-amber-500" size={36} />
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest animate-pulse">
          Carregando Chá Rifa...
        </p>
      </div>
    );
  }

  return (
    <div className={themeConfig.bgClass}>
      
      {/* Dynamic Header Floating Rail */}
      <header className="p-4 border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{themeConfig.bannerEmoji}</span>
            <span className={`text-base font-bold dark:text-white ${themeConfig.fontClass}`}>
              {settings?.title || "Chá Rifa Online"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] rounded-full font-bold uppercase tracking-wider">
                  <ShieldCheck size={12} /> Organizador Ativo
                </span>
                
                <button
                  id="action-logout-btn"
                  onClick={handleLogOutAdmin}
                  className="flex items-center gap-1.5 p-1.5 px-3 bg-red-650/15 text-red-400 hover:text-white border border-red-500/20 hover:bg-red-600 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  <LogOut size={13} />
                  Sair Painel
                </button>
              </div>
            ) : (
              <button
                id="header-admin-reveal"
                onClick={() => setShowLoginModal(true)}
                className="p-1 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/15 text-white/90 cursor-pointer transition-all"
              >
                Painel Organizador
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout container */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        
        {errorHeader && (
          <div id="error-header-container" className="p-4 bg-red-100 text-red-700 rounded-2xl flex items-center gap-2 text-xs border border-red-200 shadow-sm animate-pulse">
            <AlertCircle className="shrink-0" size={16} />
            <span>{errorHeader}</span>
          </div>
        )}

        {/* Core Layout bifurcation */}
        {isAdmin && adminKey && settings ? (
          /* Host Admin dashboard mode */
          <AdminDashboard
            adminKey={adminKey}
            settings={settings}
            tickets={tickets}
            drawnNumbers={drawnNumbers}
            onSettingsUpdated={(newSet) => setSettings(newSet)}
            onTicketsUpdated={(newTk) => setTickets(newTk)}
            onOpenSorteador={() => setIsSorteadorOpen(true)}
            onResetRaffle={handleResetAction}
            theme={themeConfig}
          />
        ) : settings ? (
          /* Standard Guest visualization mode */
          <GuestDashboard
            settings={settings}
            tickets={tickets}
            drawnNumbers={drawnNumbers}
            onSelectNumber={handleSelectNumber}
            onOpenAdminLogin={() => setShowLoginModal(true)}
            theme={themeConfig}
            selectedNumbers={selectedNumbers}
            onClearCart={() => setSelectedNumbers([])}
            onCheckout={() => setIsPaymentModalOpen(true)}
          />
        ) : null}
      </main>

      {/* FOOTER credit line */}
      <footer className="text-center py-6 pb-12 text-[10px] opacity-40 font-mono">
        Chá Rifa Online Hub © {new Date().getFullYear()} • Plataforma de Eventos Real-time
      </footer>

      {/* REGISTRATION WIZARD / PIX SIMULATOR POPUP */}
      {settings && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          numbers={selectedNumbers}
          onClose={() => setIsPaymentModalOpen(false)}
          onClearCart={() => setSelectedNumbers([])}
          ticketPrice={settings.ticketPrice}
          allowDiaper={settings.allowDiaper}
          allowPix={settings.allowPix}
          diaperSizes={settings.diaperSizes}
          diaperRanges={settings.diaperRanges || []}
          onReserveSuccess={handleReserveSuccess}
          theme={themeConfig}
          pixKey={settings.pixKey}
          pixKeyType={settings.pixKeyType}
          pixQrCode={settings.pixQrCode}
          whatsappNumber={settings.whatsappNumber}
          pixCopyAndPaste={settings.pixCopyAndPaste}
          paymentDeadline={settings.paymentDeadline}
          diaperObservation={settings.diaperObservation}
        />
      )}

      {/* LOTTERY DRAW / SPIN WHEEL POPUP */}
      {settings && adminKey && (
        <SorteadorModal
          isOpen={isSorteadorOpen}
          onClose={() => setIsSorteadorOpen(false)}
          adminKey={adminKey}
          numberOfTickets={settings.numberOfTickets}
          drawnNumbers={drawnNumbers}
          tickets={tickets}
          onDrawSuccess={(winner, allDrawn) => {
            setDrawnNumbers(allDrawn);
            // Refresh local state lists as well
            syncDataRealtime();
          }}
          onClearHistory={() => setDrawnNumbers([])}
          theme={themeConfig}
          settings={settings}
        />
      )}

      {/* PARENT LOGIN PASSWORD VERIFY POPUP */}
      {showLoginModal && (
        <div id="login-popup-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div id="login-popup-panel" className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-850 shadow-2xl text-stone-800 dark:text-stone-100">
            
            <button
              id="close-login-popup"
              onClick={() => {
                setShowLoginModal(false);
                setLoginError(null);
                setLoginInputKey('');
              }}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-2 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-sm font-bold">Acesso Organizador</h3>
              <p className="text-[10px] text-stone-400">Insira a chave de proteção administrativa cadastrada para liberar pagamentos e gerenciar a rifa.</p>
            </div>

            {loginError && (
              <div id="login-error-display" className="p-2.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-xl border border-red-200 mb-3 flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminVerifyLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1">Chave do Painel:</label>
                <input
                  id="admin-passcode-input"
                  type="password"
                  required
                  placeholder="Senha de gerenciador (Ex: admin123)"
                  value={loginInputKey}
                  onChange={(e) => setLoginInputKey(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-900 dark:text-white font-mono"
                />
                <span className="text-[9px] text-stone-400 mt-1 block">A chave de acesso inicial por padrão é <strong className="text-yellow-600 dark:text-yellow-400 font-mono">admin123</strong></span>
              </div>

              <button
                id="submit-login-passcode"
                type="submit"
                className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-stone-900 border border-yellow-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Acessar Painel Gestor
              </button>
            </form>

          </div>
        </div>
      )}

      <Analytics />
    </div>
  );
}
