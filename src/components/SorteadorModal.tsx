import React, { useState, useEffect } from 'react';
import { ThemeConfig } from '../themeHelper.js';
import { Ticket, RaffleSettings } from '../types.js';
import { Shield, Sparkles, Trophy, Award, Trash2, X, Play, Loader2 } from 'lucide-react';

interface SorteadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminKey: string;
  numberOfTickets: number;
  drawnNumbers: number[];
  tickets: Record<number, Ticket>;
  onDrawSuccess: (winner: number, allDrawn: number[]) => void;
  onClearHistory: () => void;
  theme: ThemeConfig;
  settings: RaffleSettings;
}

export default function SorteadorModal({
  isOpen,
  onClose,
  adminKey,
  numberOfTickets,
  drawnNumbers,
  tickets,
  onDrawSuccess,
  onClearHistory,
  theme,
  settings
}: SorteadorModalProps) {
  const [drawMode, setDrawMode] = useState<'paid_only' | 'all_chosen' | 'all'>('paid_only');
  const [isDrawing, setIsDrawing] = useState(false);
  const [spinnerNumber, setSpinnerNumber] = useState<number | null>(null);
  const [winnerTicket, setWinnerTicket] = useState<Ticket | null>(null);
  const [winningNumberResult, setWinningNumberResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prizesList = settings.prizes && settings.prizes.length > 0
    ? settings.prizes
    : (settings.prize ? settings.prize.split('|').map(p => p.trim()).filter(Boolean) : []);

  const currentPrizeIndex = drawnNumbers.length;

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setWinnerTicket(null);
      setWinningNumberResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Perform draw API call with simulation animation
  const handleStartDraw = async () => {
    setError(null);
    setWinnerTicket(null);
    setWinningNumberResult(null);
    setIsDrawing(true);

    // Filter local candidates first to make sure there is at least one
    let candidatesList: number[] = [];
    if (drawMode === 'paid_only') {
      candidatesList = Object.entries(tickets)
        .filter(([_, t]) => t.status === 'paid')
        .map(([num, _]) => parseInt(num));
    } else if (drawMode === 'all_chosen') {
      candidatesList = Object.entries(tickets)
        .filter(([_, t]) => t.status === 'paid' || t.status === 'reserved')
        .map(([num, _]) => parseInt(num));
    } else {
      for (let i = 1; i <= numberOfTickets; i++) {
        candidatesList.push(i);
      }
    }

    // Exclude already drawn numbers
    candidatesList = candidatesList.filter(n => !drawnNumbers.includes(n));

    if (candidatesList.length === 0) {
      setIsDrawing(false);
      if (drawMode === 'paid_only') {
        setError('Nenhum número foi pago ainda para participar do sorteio.');
      } else if (drawMode === 'all_chosen') {
        setError('Nenhum número foi selecionado/reservado ainda.');
      } else {
        setError('Todos os números da rifa já foram sorteados.');
      }
      return;
    }

    // Fast spinner animation
    let spinningCounter = 0;
    const spinInterval = setInterval(() => {
      const tempWinnerIndex = Math.floor(Math.random() * candidatesList.length);
      setSpinnerNumber(candidatesList[tempWinnerIndex]);
      spinningCounter++;
    }, 80);

    try {
      const response = await fetch('/api/raffle/admin/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ drawMode })
      });

      const resData = await response.json();
      
      if (!response.ok) {
        clearInterval(spinInterval);
        setIsDrawing(false);
        setError(resData.error || 'Erro ao realizar sorteio.');
        return;
      }

      const verifiedWinningNum = resData.winningNumber as number;
      const verifiedAllDrawn = resData.drawnNumbers as number[];

      // Keep spinning for at least 30 counts (~2.4s)
      const remainingSpins = Math.max(0, 30 - spinningCounter);
      setTimeout(() => {
        clearInterval(spinInterval);
        setSpinnerNumber(verifiedWinningNum);
        setWinningNumberResult(verifiedWinningNum);
        
        // Lookup ticket holder details if any
        const holder = tickets[verifiedWinningNum];
        if (holder) {
          setWinnerTicket(holder);
        } else {
          setWinnerTicket(null);
        }

        setIsDrawing(false);
        onDrawSuccess(verifiedWinningNum, verifiedAllDrawn);
      }, remainingSpins * 80);

    } catch (err) {
      clearInterval(spinInterval);
      setIsDrawing(false);
      setError('Erro de rede ao conectar com o servidor.');
    }
  };

  const handleClearHistoryConfirm = async () => {
    if (!window.confirm("Você tem certeza de que deseja apagar todo o histórico de números já sorteados?")) {
      return;
    }
    try {
      const response = await fetch('/api/raffle/admin/clear-draw', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey
        }
      });
      if (response.ok) {
        onClearHistory();
        setWinnerTicket(null);
        setWinningNumberResult(null);
        setSpinnerNumber(null);
      }
    } catch {
      setError('Falha ao limpar histórico de sorteio.');
    }
  };

  // Helper count status of eligible tickets
  const totalPaid = Object.values(tickets).filter(t => t.status === 'paid').length;
  const totalChosen = Object.values(tickets).filter(t => t.status === 'paid' || t.status === 'reserved').length;

  return (
    <div id="sorteador-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div id="sorteador-container" className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
        
        {/* Header decoration */}
        <div className={`p-6 text-white text-center relative ${theme.id === 'astronaut' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : theme.id === 'floral' ? 'bg-rose-500' : theme.id === 'natural' ? 'bg-[#5A5A40]' : 'bg-emerald-700'}`}>
          <button 
            id="close-sorteador-btn"
            onClick={onClose} 
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/25 transition-all text-white cursor-pointer"
          >
            <X size={18} />
          </button>
          <Trophy className="mx-auto mb-2 text-yellow-300" size={36} />
          <h2 className="text-xl font-bold font-sans">Sorteador Real-time</h2>
          <p className="text-xs opacity-90 mt-1">Sorteie os prêmios do seu Chá Rifa na hora!</p>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div id="sorteador-error" className="p-3 text-xs bg-red-100 text-red-700 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Mode configuration */}
          <div className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/50 dark:border-stone-800 space-y-3">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Filtro dos Bilhetes Elegíveis:
            </label>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer">
                <input 
                  type="radio" 
                  name="drawMode" 
                  checked={drawMode === 'paid_only'} 
                  onChange={() => setDrawMode('paid_only')} 
                  disabled={isDrawing}
                  className="accent-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">Sorteio de Pagos (Recomendado)</span>
                  <span className="text-[10px] text-stone-500 block">Apenas bilhetes com pagamento Pix ou doação de fraldas confirmada ({totalPaid} disponíveis)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer">
                <input 
                  type="radio" 
                  name="drawMode" 
                  checked={drawMode === 'all_chosen'} 
                  onChange={() => setDrawMode('all_chosen')} 
                  disabled={isDrawing}
                  className="accent-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">Qualquer Escolhido</span>
                  <span className="text-[10px] text-stone-500 block">Qualquer participante com bilhete reservado ou pago ({totalChosen} disponíveis)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer">
                <input 
                  type="radio" 
                  name="drawMode" 
                  checked={drawMode === 'all'} 
                  onChange={() => setDrawMode('all')} 
                  disabled={isDrawing}
                  className="accent-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">Sorteio Aberto Geral</span>
                  <span className="text-[10px] text-stone-500 block">Qualquer número de 1 a {numberOfTickets} (mesmo os não reservados)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Active Prize Info Header */}
          {currentPrizeIndex < prizesList.length ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-1 animate-pulse mb-1">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-600 dark:text-yellow-400">
                ⭐ Sorteio Ativo: {prizesList[currentPrizeIndex].split(':')[0] || `Prêmio ${currentPrizeIndex + 1}`}
              </span>
              <p className="text-xs font-extrabold text-stone-800 dark:text-stone-100">
                {prizesList[currentPrizeIndex].includes(':') ? prizesList[currentPrizeIndex].split(':').slice(1).join(':').trim() : prizesList[currentPrizeIndex]}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-stone-100 dark:bg-stone-900 rounded-2xl text-center space-y-1 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                🎉 Todos os {prizesList.length} Prêmios Sorteados!
              </span>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Você pode continuar sorteando adicionais (Prêmio Extra) caso queira.
              </p>
            </div>
          )}

          {/* Virtual Roulette Display */}
          <div className="flex flex-col items-center justify-center py-6 bg-stone-50 dark:bg-stone-950 rounded-3xl border-2 border-dashed border-stone-300 dark:border-indigo-500/30">
            <div className="w-28 h-28 rounded-full flex items-center justify-center bg-stone-900 border-4 border-yellow-400 text-yellow-400 text-4xl font-extrabold font-mono shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-yellow-400/5 pulse-subtle" />
              {isDrawing ? (
                <span className="animate-bounce inline-block text-5xl">
                  {spinnerNumber !== null ? spinnerNumber : "..."}
                </span>
              ) : winningNumberResult !== null ? (
                <span className="scale-110 text-5xl transition-all font-sans">
                  {winningNumberResult}
                </span>
              ) : (
                <span className="text-stone-600 text-3xl">RIFA</span>
              )}
            </div>

            {/* Winner description banner */}
            {winningNumberResult !== null && !isDrawing && (
              <div className="mt-4 text-center max-w-sm px-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-105 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400 text-[10px] uppercase font-bold rounded-full mb-1">
                  <Award size={12} /> Bilhete Sorteado!
                </div>
                {winnerTicket ? (
                  <div id="sorteador-winner-card" className="space-y-1">
                    <p className="text-base font-bold text-stone-800 dark:text-stone-100">{winnerTicket.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-300">Contato: {winnerTicket.phone}</p>
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold pt-1">
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 rounded-md">
                        {winnerTicket.option === 'diaper' ? `Fralda ${winnerTicket.diaperSize}` : `Contribuiu via Pix`}
                      </span>
                      <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-md">
                        Nº {winnerTicket.number}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-stone-500">Número vago (Ninguém comprou este número ainda)</p>
                  </div>
                )}
              </div>
            )}

            {/* Standard trigger button */}
            <button
              id="sortear-btn-confirm"
              onClick={handleStartDraw}
              disabled={isDrawing}
              className={`mt-4 px-6 py-3 rounded-full flex items-center gap-2 text-white font-bold tracking-brand transition-all cursor-pointer ${
                isDrawing 
                ? 'bg-stone-500 cursor-not-allowed opacity-60' 
                : theme.id === 'astronaut' 
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' 
                  : theme.id === 'floral' 
                    ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20' 
                    : theme.id === 'natural'
                      ? 'bg-[#5A5A40] hover:bg-[#4d4d36] shadow-[#5A5A40]/30'
                      : 'bg-emerald-700 hover:bg-emerald-600 shadow-emerald-700/20'
              } shadow-lg`}
            >
              {isDrawing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sorteando...
                </>
              ) : (
                <>
                  <Play size={18} fill="white" />
                  {currentPrizeIndex < prizesList.length 
                    ? `Sortear ${prizesList[currentPrizeIndex].split(':')[0].trim() || 'Prêmio'}` 
                    : 'Sortear Prêmio Extra'
                  }
                </>
              )}
            </button>
          </div>

          {/* Detailed Prize Winners List */}
          <div className="space-y-3 bg-stone-100/50 dark:bg-stone-900/40 p-4 rounded-2xl border border-stone-200/55 dark:border-stone-850">
            <h3 className="text-xs font-black text-stone-700 dark:text-stone-350 flex items-center gap-1.5 uppercase tracking-wide">
              <Trophy size={14} className="text-amber-500 shrink-0" /> Vencedores por Prêmio
            </h3>
            <div className="space-y-2">
              {prizesList.map((prizeName, idx) => {
                const winningNum = drawnNumbers[idx];
                const holder = winningNum !== undefined ? tickets[winningNum] : null;
                
                return (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-stone-950 border border-stone-150 dark:border-stone-850 rounded-xl text-xs gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[10px] font-black shrink-0 text-amber-600 dark:text-yellow-450 uppercase font-sans">
                        🎁 {prizeName.split(':')[0] || `Prêmio ${idx+1}`}
                      </span>
                      <p className="truncate text-stone-605 text-stone-500 dark:text-stone-300 font-semibold">
                        {prizeName.includes(':') ? prizeName.split(':').slice(1).join(':').trim() : prizeName}
                      </p>
                    </div>
                    <div>
                      {winningNum !== undefined ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono bg-stone-900 text-yellow-400 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                            Nº {String(winningNum).padStart(2, '0')}
                          </span>
                          <span className="font-extrabold text-stone-800 dark:text-white max-w-[80px] truncate block leading-none">
                            {holder ? holder.name.split(' ')[0] : 'Ninguém (Vago)'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic shrink-0">Aguardando sorteio...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sorter history */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                Histórico de Sorteados ({drawnNumbers.length})
              </h3>
              {drawnNumbers.length > 0 && (
                <button
                  id="clear-draw-btn"
                  onClick={handleClearHistoryConfirm}
                  className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-650 cursor-pointer"
                >
                  <Trash2 size={12} />
                  Limpar Histórico
                </button>
              )}
            </div>

            {drawnNumbers.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-2">
                Nenhum número sorteado até o momento.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {drawnNumbers.map((num, i) => {
                  const holder = tickets[num];
                  return (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850"
                    >
                      <span className="w-6 h-6 flex items-center justify-center bg-stone-900 text-yellow-400 font-mono text-xs font-bold rounded-lg leading-none">
                        {num}
                      </span>
                      <div className="text-[10px]">
                        <p className="font-bold text-stone-800 dark:text-stone-200 truncate max-w-[80px]">
                          {holder ? holder.name : "Ninguém"}
                        </p>
                        <p className="text-[8px] text-stone-500">
                          {i + 1}º Sorteado
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
