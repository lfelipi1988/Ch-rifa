import React, { useState } from 'react';
import { ThemeConfig } from '../themeHelper.js';
import { Ticket, RaffleSettings, DiaperSize } from '../types.js';
import Countdown from './Countdown.tsx';
import { ShieldCheck, Heart, Sparkles, Gift, Coins, Trophy, Calendar, Users, HelpCircle, Activity, ChevronDown } from 'lucide-react';

interface GuestDashboardProps {
  settings: RaffleSettings;
  tickets: Record<number, Ticket>;
  drawnNumbers: number[];
  onSelectNumber: (num: number) => void;
  onOpenAdminLogin: () => void;
  theme: ThemeConfig;
  selectedNumbers: number[];
  onClearCart: () => void;
  onCheckout: () => void;
}

export default function GuestDashboard({
  settings,
  tickets,
  drawnNumbers,
  onSelectNumber,
  onOpenAdminLogin,
  theme,
  selectedNumbers,
  onClearCart,
  onCheckout
}: GuestDashboardProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'reserved' | 'paid'>('all');

  const totalTickets = settings.numberOfTickets;
  const soldList = Object.values(tickets);
  const paidCount = soldList.filter(t => t.status === 'paid').length;
  const reservedCount = soldList.filter(t => t.status === 'reserved').length;
  const availableCount = totalTickets - soldList.length;

  // Compile ticket status by array lookup
  const getTicketStatus = (num: number): 'available' | 'reserved' | 'paid' => {
    const t = tickets[num];
    if (!t) return 'available';
    return t.status;
  };

  // Compile visual grid numbers based on filters
  const gridNumbers: number[] = [];
  for (let i = 1; i <= totalTickets; i++) {
    const status = getTicketStatus(i);
    if (filterMode === 'all') {
      gridNumbers.push(i);
    } else if (filterMode === 'available' && status === 'available') {
      gridNumbers.push(i);
    } else if (filterMode === 'reserved' && status === 'reserved') {
      gridNumbers.push(i);
    } else if (filterMode === 'paid' && status === 'paid') {
      gridNumbers.push(i);
    }
  }

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          let processedLine = line.trim();
          if (!processedLine) return <div key={idx} className="h-2" />;
          
          const isBullet = processedLine.startsWith('•') || processedLine.startsWith('-') || processedLine.startsWith('*');
          
          if (isBullet) {
            processedLine = processedLine.replace(/^[•\-*]\s*/, '');
          }

          const parts: React.ReactNode[] = [];
          let keyTracker = 0;

          // Split line by formatting tokens: **bold** and __underline__
          const regex = /(\*\*.*?\*\*|__.*?__)/g;
          const splitParts = processedLine.split(regex);

          splitParts.forEach((part) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              parts.push(<strong key={keyTracker++} className="font-extrabold text-stone-900 dark:text-white">{part.slice(2, -2)}</strong>);
            } else if (part.startsWith('__') && part.endsWith('__')) {
              parts.push(<span key={keyTracker++} className="underline decoration-yellow-500 font-bold decoration-2">{part.slice(2, -2)}</span>);
            } else if (part) {
              parts.push(<span key={keyTracker++}>{part}</span>);
            }
          });

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-1.5 text-[10px] leading-relaxed">
                <span className="text-yellow-500 font-black shrink-0 mt-0.5">•</span>
                <div className="text-stone-600 dark:text-stone-400 font-medium flex-1">{parts}</div>
              </div>
            );
          }

          return (
            <p key={idx} className="text-[10px] leading-relaxed text-stone-600 dark:text-stone-400 font-medium min-h-[1em]">
              {parts}
            </p>
          );
        })}
      </div>
    );
  };

  // Choose a cute illustration header based on theme
  const renderThemeIllustration = () => {
    switch (theme.id) {
      case 'astronaut':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50/80 via-purple-100/50 to-indigo-100/60 rounded-3xl border border-indigo-200 text-center space-y-3 relative overflow-hidden shadow-xs">
            <span className="text-6xl animate-bounce duration-1000 inline-block">👨‍🚀</span>
            <div className="absolute top-2 left-6 text-xl opacity-40 animate-pulse">🛸</div>
            <div className="absolute bottom-4 right-10 text-xl opacity-30">🪐</div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-indigo-900 font-sans uppercase tracking-wider">Nave espacial baby</h3>
              <p className="text-[10.5px] font-medium text-indigo-750">Embarque nessa jornada espacial para comemorar a vinda do bebê nas estrelas!</p>
            </div>
          </div>
        );
      case 'safari':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-orange-50/50 rounded-3xl border border-amber-600/10 text-center space-y-3 relative overflow-hidden">
            <div className="flex justify-center gap-2">
              <span className="text-5xl hover:scale-110 transition-all cursor-pointer">🦁</span>
              <span className="text-5xl hover:scale-110 transition-all cursor-pointer">🦒</span>
              <span className="text-5xl hover:scale-110 transition-all cursor-pointer">🐘</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-yellow-800 font-sans uppercase tracking-wider">Aventura Florestal</h3>
              <p className="text-[10px] text-emerald-800">Uma selva cheia de sorrisos e bichinhos fofos aguardando pela vinda do nosso aventureiro!</p>
            </div>
          </div>
        );
      case 'floral':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-rose-50/50 rounded-3xl border border-rose-200/50 text-center space-y-3 relative overflow-hidden">
            <div className="flex justify-center gap-3">
              <span className="text-5xl hover:rotate-12 transition-all inline-block">🌸</span>
              <span className="text-5xl hover:scale-105 transition-all inline-block">🦋</span>
              <span className="text-5xl hover:-rotate-12 transition-all inline-block">🌺</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-800 font-sans italic tracking-wide">Jardim Encantado</h3>
              <p className="text-[10px] text-rose-700">Florescendo alegria e ternura para perfumar o lindo caminho do nosso bebezinho!</p>
            </div>
          </div>
        );
      case 'natural':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-[#F9F7F2] rounded-3xl border border-[#E5DCC3] text-center space-y-3 relative overflow-hidden">
            <div className="flex justify-center gap-3">
              <span className="text-5xl hover:scale-110 transition-all cursor-pointer">🌿</span>
              <span className="text-5xl hover:scale-110 transition-all cursor-pointer">🦒</span>
              <span className="text-5xl hover:scale-110 transition-all cursor-pointer">🦁</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#5A5A40] font-sans uppercase tracking-wider">Tons Naturais</h3>
              <p className="text-[10px] text-[#6B645E]">Aconchego, sálvia e amor em todos os detalhes para celebrar a vinda do bebê!</p>
            </div>
          </div>
        );
    }
  };

  const getPrizesBoxStyle = () => {
    switch (theme.id) {
      case 'astronaut':
        return {
          container: "p-4.5 bg-indigo-50/75 border border-indigo-150/40 rounded-2xl space-y-3",
          titleText: "text-indigo-950 font-black",
          itemCard: "flex flex-col justify-between p-3.5 bg-white/90 hover:bg-indigo-50/40 border border-indigo-100/60 rounded-2xl transition-all shadow-xs gap-3",
          badge: "bg-indigo-100/80 text-indigo-800 font-extrabold",
          tagtext: "text-indigo-500 font-black",
          bodyText: "text-indigo-950",
          borderLine: "border-indigo-100/60",
          statusLabel: "text-indigo-600 font-black",
          awaitingText: "text-indigo-700 font-bold",
          awaitingDot: "bg-indigo-600",
          drawnNum: "bg-indigo-600 text-white font-extrabold",
          drawnHolder: "text-indigo-955 font-black"
        };
      case 'safari':
        return {
          container: "p-4.5 bg-emerald-50/60 border border-emerald-800/10 rounded-2xl space-y-3",
          titleText: "text-emerald-950 font-black",
          itemCard: "flex flex-col justify-between p-3.5 bg-white/90 hover:bg-emerald-50/40 border border-emerald-100/40 rounded-2xl transition-all shadow-xs gap-3",
          badge: "bg-emerald-100/80 text-emerald-800 font-extrabold",
          tagtext: "text-emerald-700 font-black",
          bodyText: "text-emerald-955",
          borderLine: "border-emerald-100/50",
          statusLabel: "text-emerald-800 font-black",
          awaitingText: "text-emerald-700 font-bold",
          awaitingDot: "bg-emerald-700",
          drawnNum: "bg-emerald-700 text-white font-extrabold",
          drawnHolder: "text-emerald-955 font-black"
        };
      case 'floral':
        return {
          container: "p-4.5 bg-rose-50/60 border border-rose-200/40 rounded-2xl space-y-3",
          titleText: "text-rose-950 font-black",
          itemCard: "flex flex-col justify-between p-3.5 bg-white/95 hover:bg-rose-55/30 border border-rose-100/60 rounded-2xl transition-all shadow-xs gap-3",
          badge: "bg-rose-100/80 text-rose-800 font-extrabold",
          tagtext: "text-rose-600/90 font-black",
          bodyText: "text-rose-955",
          borderLine: "border-rose-150/40",
          statusLabel: "text-rose-700 font-black",
          awaitingText: "text-rose-600 font-bold",
          awaitingDot: "bg-rose-600",
          drawnNum: "bg-rose-600 text-white font-extrabold",
          drawnHolder: "text-rose-955 font-black"
        };
      case 'natural':
        return {
          container: "p-4.5 bg-[#F9F7F2]/90 border border-[#E5DCC3] rounded-2xl space-y-3",
          titleText: "text-[#5A5A40] font-black",
          itemCard: "flex flex-col justify-between p-3.5 bg-white hover:bg-[#F9F7F2]/40 border border-[#E5DCC3]/40 rounded-2xl transition-all shadow-xs gap-3",
          badge: "bg-[#E5DCC3]/50 text-[#5a5a40]/90 font-extrabold",
          tagtext: "text-[#6B645E]/90 font-black",
          bodyText: "text-[#433D40]",
          borderLine: "border-[#E5DCC3]/30",
          statusLabel: "text-[#6B645E] font-black",
          awaitingText: "text-[#5A5A40] font-bold",
          awaitingDot: "bg-[#5A5A40]",
          drawnNum: "bg-[#5A5A40] text-white font-extrabold",
          drawnHolder: "text-[#433D40] font-black"
        };
      default:
        return {
          container: "p-4.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3",
          titleText: "text-stone-900 font-black",
          itemCard: "flex flex-col justify-between p-3.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-2xl transition-all shadow-xs gap-3",
          badge: "bg-stone-100 text-stone-800 font-extrabold",
          tagtext: "text-stone-600 font-black",
          bodyText: "text-stone-900",
          borderLine: "border-stone-150",
          statusLabel: "text-stone-700 font-black",
          awaitingText: "text-stone-600 font-bold",
          awaitingDot: "bg-stone-600",
          drawnNum: "bg-stone-700 text-white font-extrabold",
          drawnHolder: "text-stone-900 font-black"
        };
    }
  };

  const prizeStyles = getPrizesBoxStyle();

  return (
    <div id="guest-dashboard-root" className="space-y-6">
      
      {/* Upper info card */}
      <div className={`${theme.cardClass} grid grid-cols-1 md:grid-cols-12 gap-6 items-center`}>
        <div className="md:col-span-8 space-y-3 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
            <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-1 uppercase">
              👶 Chá Rifa Online
            </span>
            {settings.allowPix && (
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold tracking-widest flex items-center gap-0.5 uppercase">
                ⚡ Pix R$ {settings.ticketPrice.toFixed(2)}
              </span>
            )}
            {settings.allowDiaper && (
              <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[9px] font-bold tracking-widest flex items-center gap-0.5 uppercase">
                🎁 Doar Fralda
              </span>
            )}
          </div>
          <h1 className={`text-2xl md:text-3xl font-extrabold ${theme.fontClass}`}>{settings.title}</h1>

          <div className={prizeStyles.container}>
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${prizeStyles.titleText}`}>
              <Trophy size={13} className="animate-pulse" /> Sorteio das Premiações:
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 font-sans">
              {(() => {
                const prizesList = settings.prizes && settings.prizes.length > 0
                  ? settings.prizes
                  : (settings.prize ? settings.prize.split('|').map(p => p.trim()).filter(Boolean) : []);
                  
                return prizesList.map((prizeText, idx) => {
                  const winningNum = drawnNumbers[idx];
                  const holder = winningNum !== undefined ? tickets[winningNum] : null;
                  
                  return (
                    <div key={idx} className={prizeStyles.itemCard}>
                      <div className="flex items-start gap-2.5 overflow-hidden">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs shrink-0 font-mono ${prizeStyles.badge}`}>
                          {idx + 1}º
                        </span>
                        <div className="overflow-hidden">
                          <span className={`text-[9.5px] font-black uppercase tracking-widest block leading-none mb-1 ${prizeStyles.tagtext}`}>
                            {prizeText.split(':')[0] || `Prêmio ${idx + 1}`}
                          </span>
                          <p className={`text-xs font-extrabold truncate ${prizeStyles.bodyText}`}>
                            {prizeText.includes(':') ? prizeText.split(':').slice(1).join(':').trim() : prizeText}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`border-t pt-2 flex items-center justify-between text-[11px] ${prizeStyles.borderLine}`}>
                        <span className={`font-black uppercase text-[10px] tracking-widest ${prizeStyles.statusLabel}`}>Status:</span>
                        {winningNum !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-black px-1 rounded text-[9.5px] ${prizeStyles.drawnNum}`}>
                              Nº {String(winningNum).padStart(2, '0')}
                            </span>
                            <span className={`font-extrabold max-w-[100px] truncate ${prizeStyles.drawnHolder}`}>
                              👑 {holder ? holder.name.split(' ')[0] : 'Ninguém (Vago)'}
                            </span>
                          </div>
                        ) : (
                          <span className={`font-bold flex items-center gap-1 text-[9.5px] ${prizeStyles.awaitingText}`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-ping ${prizeStyles.awaitingDot}`} />
                            Aguardando sorteio...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Right column: Countdown widget */}
        <div className="md:col-span-4 flex justify-center border-t md:border-t-0 md:border-l border-stone-200/10 pt-4 md:pt-0 md:pl-6">
          <Countdown targetDate={settings.raffleDate} theme={theme} />
        </div>
      </div>

      {/* Mobile Scroll Indicator */}
      <div id="mobile-scroll-indicator" className="md:hidden flex flex-col items-center justify-center p-3.5 bg-amber-500/10 border border-amber-500/15 rounded-2xl text-center shadow-xs animate-pulse">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 justify-center">
          <ChevronDown size={14} className="animate-bounce shrink-0" />
          Role para baixo para escolher seus números no quadro!
          <ChevronDown size={14} className="animate-bounce shrink-0" />
        </p>
      </div>

      {/* THREE THEMED ILLUSTRATIONS BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Theme visual helper banner */}
        <div className="md:col-span-4 space-y-4">
          {renderThemeIllustration()}
          
          {/* Dedicated Description box */}
          <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 space-y-3 shadow-sm text-stone-800 dark:text-stone-100">
            <h4 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 border-b border-stone-100 dark:border-stone-800 pb-2 text-stone-900 dark:text-white">
              <Heart size={14} className="text-red-500 fill-current" /> Sobre a Celebração:
            </h4>
            <p className="text-xs leading-relaxed font-semibold text-stone-600 dark:text-stone-400 whitespace-pre-line">
              {settings.description}
            </p>
          </div>
          
          {/* How it works card */}
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 space-y-3.5 shadow-sm text-stone-800 dark:text-stone-100">
            <h4 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 border-b border-stone-100 dark:border-stone-800 pb-2">
              <HelpCircle size={14} className="text-yellow-500" /> Como funciona?
            </h4>
            {settings.howItWorks ? (
              renderFormattedText(settings.howItWorks)
            ) : (
              <ol className="text-[10px] space-y-2 list-decimal list-inside text-stone-600 dark:text-stone-400 font-medium">
                <li>Escolha um ou mais **números disponíveis** no quadro.</li>
                <li>Preencha seu Nome Completo e Whatsapp para contato.</li>
                <li>Observe que **cada número possui um tamanho de fralda fixado** pelo organizador.</li>
                <li>Ao escolher doar Fralda, você presenteará com o tamanho do número escolhido. Também pode optar por Pix!</li>
                <li>Sua reserva é registrada na hora. Caso opte por Pix, simule e ative o bilhete instantaneamente! 🎉</li>
              </ol>
            )}
          </div>
        </div>

        <div className="md:col-span-8 space-y-4">
          {/* Status summary tracker */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/80 dark:bg-stone-900 border border-stone-155 dark:border-stone-850 rounded-2xl shadow-sm text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-stone-100 border border-stone-300 inline-block" />
                <span>Livre ({availableCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400 pulse-subtle inline-block" />
                <span>Reservado ({reservedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-800 dark:bg-cyan-500 inline-block" />
                <span>Pago ({paidCount})</span>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1">
              {(['all', 'available', 'reserved', 'paid'] as const).map((mode) => (
                <button
                  id={`filter-grid-to-${mode}`}
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg capitalize cursor-pointer transition-all ${
                    filterMode === mode
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-gray-300'
                  }`}
                >
                  {mode === 'all' ? 'Ver Todos' : mode === 'available' ? 'Livres' : mode === 'reserved' ? 'Reservados' : 'Confirmados'}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN RAFFLE GRID */}
          <div className="p-5 bg-white/80 dark:bg-stone-900 border border-stone-150 dark:border-stone-850 rounded-3xl shadow-sm">
            {gridNumbers.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-8">
                Nenhum número corresponde ao filtro selecionado.
              </p>
            ) : (
              <div id="raffle-ticket-grid" className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 justify-center">
                {gridNumbers.map((num) => {
                  const status = getTicketStatus(num);
                  const ticket = tickets[num];
                  const visualStatusClass = theme.gridStatusClasses[status];

                  const getDiaperSizeForNumber = (n: number) => {
                    if (!settings.diaperRanges) return null;
                    const r = settings.diaperRanges.find(range => n >= range.from && n <= range.to);
                    return r ? r.size : null;
                  };
                  const ticketDiaperSize = getDiaperSizeForNumber(num);

                  const isSelectedInCart = selectedNumbers.includes(num);
                  const isSelectable = status === 'available';
                  const displayStatusClass = isSelectedInCart
                    ? 'scale-105 border-2 border-amber-500 bg-amber-500 text-stone-950 ring-4 ring-amber-400/30 font-black shadow-lg animate-pulse'
                    : visualStatusClass;

                  return (
                    <button
                      id={`ticket-number-${num}`}
                      key={num}
                      disabled={!isSelectable && !isSelectedInCart}
                      onClick={() => onSelectNumber(num)}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${displayStatusClass}`}
                    >
                      <span className="text-sm font-mono font-black tracking-tighter block leading-none">
                        {String(num).padStart(2, '0')}
                      </span>
                      {ticket ? (
                        <span className="text-[7.5px] max-w-[45px] truncate block opacity-85 mt-1 leading-none bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-bold">
                          {ticket.name.split(' ')[0]}
                        </span>
                      ) : (
                        status === 'available' && settings.allowDiaper && ticketDiaperSize && (
                          <span className="text-[7.5px] font-extrabold block opacity-85 mt-1 px-1 bg-black/5 dark:bg-white/10 rounded-sm leading-none border border-black/10 dark:border-white/10">
                            {ticketDiaperSize}
                          </span>
                        )
                      )}
                      
                      {/* diaper size indicator */}
                      {ticket && ticket.option === 'diaper' && ticket.diaperSize && (
                        <span className="absolute top-1 right-1 text-[6px] font-bold bg-amber-500 text-stone-950 scale-90 px-0.5 rounded leading-none">
                          {ticket.diaperSize}
                        </span>
                      )}

                      {/* drawn tick indicator */}
                      {drawnNumbers.includes(num) && (
                        <span className="absolute bottom-1 right-1 text-[8px] animate-pulse">👑</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* REAL-TIME PARTICIPANT HISTORY LIST */}
          <div className="bg-white/80 dark:bg-stone-900 border border-stone-150 dark:border-stone-850 p-5 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 uppercase tracking-wide border-b border-stone-100 dark:border-stone-800 pb-2">
              <Users size={16} className="text-yellow-500" /> Histórico de Compra em Tempo Real
            </h3>
            
            {soldList.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2 text-center">
                Seja o primeiro a garantir o seu número da sorte! Escolha no quadro acima.
              </p>
            ) : (
              <div id="participant-history-scroll" className="max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
                {soldList.map((t) => (
                  <div
                    key={t.number}
                    className="flex items-center justify-between text-xs py-2 px-3 rounded-xl border border-stone-200/50 dark:border-stone-850/50 bg-stone-50/50 dark:bg-stone-950/20 text-stone-800 dark:text-stone-200"
                  >
                    <div className="flex items-center gap-2">
                       <span className="font-mono bg-stone-900 border border-amber-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none">
                        Nº {String(t.number).padStart(2, '0')}
                      </span>
                      <p className="font-semibold">{t.name}</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {t.option === 'diaper' ? (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          🎁 Fralda ({t.diaperSize})
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          ⚡ Pix R$ {settings.ticketPrice.toFixed(0)}
                        </span>
                      )}

                      {t.status === 'paid' ? (
                        <span className="text-[9px] text-emerald-600 font-bold">● Confirmado</span>
                      ) : (
                        <span className="text-[9px] text-yellow-500 font-bold animate-pulse">● Reservado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Footer manager button strictly following requirements */}
      <div className="text-center py-4 border-t border-stone-200/10">
        <button
          id="host-login-modal-reveal"
          onClick={onOpenAdminLogin}
          className="inline-flex items-center gap-1.5 p-2 px-3 text-stone-500 dark:text-stone-400 hover:text-stone-850 text-xs font-semibold hover:bg-stone-50/10 bg-white/5 border border-stone-200 dark:border-stone-800 rounded-2xl cursor-pointer transition-all"
        >
          <ShieldCheck size={14} />
          Sou Organizador (Acesso Administrador)
        </button>
      </div>

      {/* FLOATING SHOPPING CART DRAWER */}
      {selectedNumbers.length > 0 && (
        <div id="shopping-cart-drawer" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] sm:w-full sm:max-w-md bg-[#1c1917]/95 border border-amber-500/40 p-4 rounded-3xl shadow-2xl flex flex-col gap-3 animate-slideUp text-stone-100">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-400">
              🛒 Carrinho de Escolhas ({selectedNumbers.length})
            </span>
            <button
              id="clear-cart-btn"
              onClick={onClearCart}
              className="text-[9px] uppercase font-bold text-stone-400 hover:text-red-400 transition-all cursor-pointer"
            >
              Excluir Tudo
            </button>
          </div>
          
          <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto scrollbar-thin py-1">
            {selectedNumbers.map((num) => (
              <span
                key={num}
                onClick={() => onSelectNumber(num)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-black bg-amber-500 text-stone-950 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer group shadow-sm"
                title="Clique para remover"
              >
                Nº {String(num).padStart(2, '0')}
                <span className="text-[10px] opacity-60 group-hover:opacity-100 font-sans">×</span>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
            <div>
              <span className="block text-[8px] uppercase tracking-wider text-stone-400 font-bold">Total a Pagar / Reservar:</span>
              <span className="text-base font-black text-amber-400">
                R$ {(selectedNumbers.length * settings.ticketPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <button
              id="checkout-cart-btn"
              onClick={onCheckout}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 animate-pulse"
            >
              Reservar Agora!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
