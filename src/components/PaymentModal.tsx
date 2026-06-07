import React, { useState, useEffect } from 'react';
import { ThemeConfig } from '../themeHelper.js';
import { DiaperSize, PaymentOption, DiaperRange } from '../types.js';
import { ChevronRight, Copy, Check, QrCode, Smartphone, Info, Gift, Phone, User, Activity, AlertCircle, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  numbers: number[];
  onClose: () => void;
  onClearCart?: () => void;
  ticketPrice: number;
  allowDiaper: boolean;
  allowPix: boolean;
  diaperSizes: DiaperSize[];
  diaperRanges?: DiaperRange[];
  onReserveSuccess: (newStatus: 'reserved' | 'paid') => void;
  theme: ThemeConfig;
  pixKey?: string;
  pixKeyType?: string;
  pixQrCode?: string;
  whatsappNumber?: string;
  pixCopyAndPaste?: string;
  paymentDeadline?: string;
  diaperObservation?: string;
}

export default function PaymentModal({
  isOpen,
  numbers = [],
  onClose,
  onClearCart,
  ticketPrice,
  allowDiaper,
  allowPix,
  diaperSizes,
  diaperRanges = [],
  onReserveSuccess,
  theme,
  pixKey = "pix-chafarifa@bancocentral.com.br",
  pixKeyType = "Chave Aleatória",
  pixQrCode,
  whatsappNumber = "11999999999",
  pixCopyAndPaste = "",
  paymentDeadline = "",
  diaperObservation = ""
}: PaymentModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [option, setOption] = useState<PaymentOption>(allowPix ? 'pix' : 'diaper');
  
  // Custom sizes map for each selected ticket number in the shopping cart
  const [diaperSizesMap, setDiaperSizesMap] = useState<Record<number, DiaperSize>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Storage for generated reservation info
  const [txid, setTxid] = useState('');
  const [isSimulatingPix, setIsSimulatingPix] = useState(false);

  const [successDialog, setSuccessDialog] = useState<{
    title: string;
    message: React.ReactNode;
    redirectUrl?: string;
    onConfirm: () => void;
  } | null>(null);

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
    }
    return val;
  };

  // Detecção de tamanho fixado para este número de bilhete
  const getDiaperSizeForNumber = (num: number): DiaperSize | null => {
    if (!diaperRanges || diaperRanges.length === 0) return null;
    const found = diaperRanges.find(r => num >= r.from && num <= r.to);
    return found ? found.size : null;
  };

  // Pre-populate diaper sizes map for all items when modal opens
  useEffect(() => {
    if (isOpen && numbers.length > 0) {
      const initialMap: Record<number, DiaperSize> = {};
      numbers.forEach((num) => {
        const autoSize = getDiaperSizeForNumber(num);
        if (autoSize) {
          initialMap[num] = autoSize;
        } else if (diaperSizes.length > 0) {
          initialMap[num] = diaperSizes[0]; // fallback default is first allowed
        }
      });
      setDiaperSizesMap(initialMap);
    }
  }, [isOpen, numbers, diaperSizes]);

  if (!isOpen || numbers.length === 0) return null;

  const totalAmount = numbers.length * ticketPrice;

  // Simple Brazilian phone masking (99) 99999-9999
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    
    let formatted = val;
    if (val.length > 2) {
      formatted = `(${val.substring(0, 2)}) ` + val.substring(2);
    }
    if (val.length > 7) {
      formatted = `(${val.substring(0, 2)}) ${val.substring(2, 7)}-` + val.substring(7);
    }
    setPhone(formatted);
  };

  // Create registration reservation
  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setError("Por favor, informe seu nome completo (nome e sobrenome).");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Por favor, preencha um telefone válido com DDD.");
      return;
    }

    if (option === 'diaper') {
      // Validate that each chosen number has a size
      for (const num of numbers) {
        if (!diaperSizesMap[num]) {
          setError(`Selecione o tamanho para o número ${String(num).padStart(2, '0')}.`);
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/raffle/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numbers,
          name: fullName.trim(),
          phone: cleanPhone,
          option,
          diaperSizesMap: option === 'diaper' ? diaperSizesMap : undefined
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        setError(resData.error || "Ocorreu um erro ao reservar os números escolhidos.");
        return;
      }

      setIsLoading(false);
      
      if (option === 'pix') {
        setTxid(resData.pixTxid || resData.ticket?.pixTxid || "rifa_col");
        setStep(2);
      } else {
        const numsString = numbers.map(n => String(n).padStart(2, '0')).join(', ');
        setSuccessDialog({
          title: "CONFIRMAÇÃO DE RESERVA",
          message: (
            <span>
              Sucesso! Os números <strong className="font-extrabold text-amber-500">[{numsString}]</strong> foram reservados em nome de <span className="font-bold">{fullName}</span>. Lembre-se de providenciar as fraldas nos tamanhos correspondentes até o dia <strong className="font-extrabold text-amber-500">{paymentDeadline || ''}</strong>!
            </span>
          ),
          onConfirm: () => {
            onReserveSuccess('reserved');
            onClearCart?.();
            setStep(1);
            setSuccessDialog(null);
            onClose();
          }
        });
      }

    } catch (err) {
      setIsLoading(false);
      setError("Falha de rede ao conectar com o servidor.");
    }
  };

  // Pix code copy trigger
  const copyPixKey = () => {
    if (pixCopyAndPaste) {
      navigator.clipboard.writeText(pixCopyAndPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Instant simulation payment trigger (Simulates automatic bank instant Pix notification)
  const triggerPixSimulation = async () => {
    setIsSimulatingPix(true);
    setError(null);

    try {
      const response = await fetch('/api/raffle/pix-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });

      const resData = await response.json();

      if (!response.ok) {
        setError(resData.error || "Simulação de confirmação instantânea falhou.");
        setIsSimulatingPix(false);
        return;
      }

      setTimeout(() => {
        setIsSimulatingPix(false);
        const numsString = numbers.map(n => String(n).padStart(2, '0')).join(', ');
        
        setSuccessDialog({
          title: "CONFIRMAÇÃO DE RESERVA",
          message: (
            <span>
              ⚡ Pix Confirmado Instantaneamente! Os números <strong className="font-extrabold text-amber-500">[{numsString}]</strong> foram ativados como <strong className="text-emerald-500 font-extrabold">PAGOS</strong> com sucesso.
            </span>
          ),
          onConfirm: () => {
            onReserveSuccess('paid');
            onClearCart?.();
            setStep(1);
            setSuccessDialog(null);
            onClose();
          }
        });
      }, 1500);

    } catch (err) {
      setIsSimulatingPix(false);
      setError("Erro ao processar simulação de Pix.");
    }
  };

  const handleCancelClick = () => {
    setStep(1);
    setFullName('');
    setPhone('');
    onClose();
  };

  return (
    <div id="payment-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div id="payment-modal-container" className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
        
        {/* Decorative Top Banner */}
        <div className={`p-5 text-white ${theme.id === 'astronaut' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : theme.id === 'floral' ? 'bg-rose-500' : theme.id === 'natural' ? 'bg-[#5A5A40]' : 'bg-emerald-700'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{theme.bannerEmoji}</span>
            <div>
              <h3 className="text-base font-bold font-sans">Reservar Bilhetes</h3>
              <p className="text-[10px] opacity-80">Preencha os dados e apoie nossa chegada!</p>
            </div>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded-2xl text-center min-w-[70px]">
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">Qtd / Nºs</span>
            <span className="text-sm font-mono font-black">{numbers.length} {numbers.length === 1 ? 'bilhete' : 'bilhetes'}</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div id="modal-error-banner" className="flex items-start gap-2 p-3 text-xs text-red-700 bg-red-100 border border-red-200 rounded-xl mb-4">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleReserve} className="space-y-4">
              
              {/* Carrinho de Números List */}
              <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-850">
                <span className="block text-[9px] font-bold text-stone-400 uppercase mb-1.5">Números do Carrinho:</span>
                <div className="flex flex-wrap gap-1">
                  {numbers.map(num => (
                    <span key={num} className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-400 font-mono font-black text-xs px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/50">
                      Nº {String(num).padStart(2, '0')}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-stone-200/80 dark:border-stone-850">
                  <span className="text-[10px] text-stone-400 font-bold uppercase">Preço Total:</span>
                  <span className="text-sm font-black text-stone-800 dark:text-amber-400">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Form Input: Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                  <User size={14} className="opacity-70" /> Seu Nome Completo:
                </label>
                <input
                  id="participant-name-input"
                  type="text"
                  required
                  placeholder="Nome e sobrenome do participante"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 dark:bg-stone-950 text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white font-semibold"
                />
              </div>

              {/* Form Input: Contact Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                  <Phone size={14} className="opacity-70" /> Telefone para contato (WhatsApp):
                </label>
                <input
                  id="participant-phone-input"
                  type="text"
                  required
                  placeholder="(99) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 dark:bg-stone-950 text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white font-semibold"
                />
              </div>

              {/* Form Input: Option Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  Como deseja participar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {allowDiaper && (
                    <button
                      id="opt-diaper"
                      type="button"
                      onClick={() => setOption('diaper')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        option === 'diaper'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-stone-200 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <Gift size={20} className="mb-1.5" />
                      <span className="text-xs font-bold font-sans">Dar uma Fralda</span>
                      <span className="text-[9px] opacity-75 mt-0.5">Definir tamanho</span>
                    </button>
                  )}
                  {allowPix && (
                    <button
                      id="opt-pix"
                      type="button"
                      onClick={() => setOption('pix')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        option === 'pix'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-stone-200 dark:border-stone-850 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <Smartphone size={20} className="mb-1.5" />
                      <span className="text-xs font-bold font-sans">Pagar via Pix</span>
                      <span className="text-[10px] font-mono opacity-80 mt-0.5">R$ {totalAmount.toFixed(2)}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Diaper Sizes Subselector per number in shopping cart */}
              {option === 'diaper' && (
                <div className="space-y-2.5 p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200/50 dark:border-stone-850 animate-fadeIn">
                  <span className="block text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Selecione o tamanho para cada número:
                  </span>
                  
                  <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                    {numbers.map((num) => {
                      const autoSize = getDiaperSizeForNumber(num);
                      const currentSize = diaperSizesMap[num] || 'M';
                      
                      return (
                        <div key={num} className="flex items-center justify-between p-2.5 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-850 rounded-xl">
                          <span className="text-xs font-mono font-black text-amber-500">
                            Nº {String(num).padStart(2, '0')}
                          </span>
                          
                          {autoSize ? (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">
                              🎁 Fralda {autoSize}
                            </span>
                          ) : (
                            <select
                              value={currentSize}
                              onChange={(e) => {
                                const val = e.target.value as DiaperSize;
                                setDiaperSizesMap(prev => ({ ...prev, [num]: val }));
                              }}
                              className="p-1 px-2 text-xs font-black bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-800 dark:text-stone-200 cursor-pointer"
                            >
                              {diaperSizes.map(sz => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {diaperObservation && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 dark:bg-amber-950/45 border border-amber-500/20 dark:border-amber-900/40 rounded-xl mt-2 text-stone-800 dark:text-amber-100 animate-fadeIn shadow-xs">
                      <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[10.5px] leading-relaxed font-semibold">
                        <span className="block text-[8.5px] tracking-widest uppercase font-black text-amber-700 dark:text-amber-400 mb-0.5">Nota do Organizador sobre as Fraldas:</span>
                        {diaperObservation}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  id="cancel-reserve-btn"
                  type="button"
                  onClick={handleCancelClick}
                  className="w-1/2 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-850 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="submit-reserve-btn"
                  type="submit"
                  disabled={isLoading}
                  className={`w-1/2 py-2.5 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    theme.id === 'astronaut' 
                    ? 'bg-indigo-600 hover:bg-indigo-500' 
                    : theme.id === 'floral' 
                      ? 'bg-rose-500 hover:bg-rose-400' 
                      : theme.id === 'natural'
                        ? 'bg-[#5A5A40] hover:bg-[#4d4d36]'
                        : 'bg-emerald-700 hover:bg-emerald-600'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Carregando...
                    </>
                  ) : (
                    <>
                      Reservar Carrinho <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Pix payment screen with dynamic custom QR code support */
            <div className="space-y-5 text-center animate-fadeIn">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 mb-1">
                <QrCode size={24} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-stone-800 dark:text-stone-100">Pronto! Bilhetes Reservados.</h4>
                <p className="text-[11px] text-stone-400 mt-1">Efetue o pagamento de R$ {totalAmount.toFixed(2)} para confirmar sua participação.</p>
              </div>

              {/* Custom QR Code image OR simulated fallback vector */}
              <div className="p-4 bg-white border border-stone-200 rounded-3xl max-w-[200px] mx-auto shadow-sm flex items-center justify-center overflow-hidden">
                {pixQrCode ? (
                  <img 
                    src={pixQrCode} 
                    alt="Pix QR Code do Organizador" 
                    className="max-w-full max-h-[160px] object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <svg className="w-full h-auto aspect-square" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Decorative outer borders */}
                    <rect x="5" y="5" width="20" height="20" stroke="#059669" strokeWidth="4" />
                    <rect x="5" y="75" width="20" height="20" stroke="#059669" strokeWidth="4" />
                    <rect x="75" y="5" width="20" height="20" stroke="#059669" strokeWidth="4" />
                    
                    {/* simulated core qr blocks */}
                    <rect x="10" y="10" width="10" height="10" fill="#0f172a" />
                    <rect x="80" y="10" width="10" height="10" fill="#0f172a" />
                    <rect x="10" y="80" width="10" height="10" fill="#0f172a" />
                    
                    {/* Scatter tiny blocks */}
                    <rect x="35" y="10" width="6" height="6" fill="#0f172a" />
                    <rect x="50" y="15" width="8" height="4" fill="#0f172a" />
                    <rect x="60" y="5" width="4" height="8" fill="#0f172a" />
                    
                    <rect x="5" y="35" width="10" height="8" fill="#0f172a" />
                    <rect x="25" y="30" width="8" height="12" fill="#059669" />
                    <rect x="45" y="35" width="12" height="12" fill="#0f172a" />
                    <rect x="65" y="30" width="6" height="6" fill="#0f172a" />
                    
                    <rect x="35" y="55" width="8" height="8" fill="#0f172a" />
                    <rect x="50" y="60" width="16" height="8" fill="#059669" />
                    <rect x="20" y="60" width="6" height="10" fill="#0f172a" />

                    <rect x="35" y="80" width="12" height="10" fill="#0f172a" />
                    <rect x="55" y="75" width="10" height="15" fill="#0f172a" />
                    <rect x="75" y="75" width="6" height="6" fill="#059669" />

                    {/* Logo center */}
                    <rect x="42" y="42" width="16" height="16" rx="4" fill="#10b981" />
                    <path d="M47 50h6v1h-6zM50 47v6h1v-6z" fill="white" />
                  </svg>
                )}
              </div>

              {/* Copy key button */}
              <div className="space-y-3 max-w-xs mx-auto text-left">
                {/* Visual Direct key display with copy button */}
                <div className="p-3 bg-stone-50 dark:bg-stone-950/85 border border-stone-150 dark:border-stone-850 rounded-2xl flex flex-col gap-1.5">
                  <span className="text-[8px] font-black tracking-widest text-amber-600 dark:text-yellow-400 uppercase font-sans">Chave do Recebedor (Chá Rifa)</span>
                  <div className="flex items-center justify-between gap-1">
                    <div className="overflow-hidden">
                      <span className="text-[9px] font-bold text-stone-400 block leading-none mb-1">{pixKeyType}</span>
                      <p className="text-[12px] font-extrabold font-mono text-stone-800 dark:text-stone-200 truncate">{pixKey}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(pixKey);
                        alert(`Chave Pix (${pixKey}) copiada com sucesso!`);
                      }}
                      className="p-1.5 px-2 bg-yellow-500 hover:bg-yellow-400 text-stone-950 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-0.5 shrink-0 transition-all shadow-xs"
                    >
                      <Copy size={11} /> Copiar
                    </button>
                  </div>
                </div>

                {pixCopyAndPaste && (
                  <button
                    id="copy-pix-btn"
                    type="button"
                    onClick={copyPixKey}
                    className="w-full py-2.5 bg-stone-900 dark:bg-stone-850 border border-stone-800 dark:border-stone-750 hover:bg-stone-850 text-white flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-xl cursor-pointer transition-all active:scale-98 animate-pulse"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        Copiado! Código Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copiar Código Copia e Cola (Pix)
                      </>
                    )}
                  </button>
                )}
              </div>

              {paymentDeadline && (
                <div id="payment-deadline-badge" className="p-3 bg-red-400/5 dark:bg-red-400/10 border border-red-500/20 rounded-2xl max-w-sm mx-auto flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  <p className="text-xs font-black text-red-600 dark:text-red-400">
                    Prazo Limite para Envio/Pagamento: <span className="underline font-mono">{paymentDeadline}</span>
                  </p>
                </div>
              )}

              {/* MANUAL WHATSAPP CONFIRMATION AND RECEIPT WARNING */}
              <div id="payment-whatsapp-warning" className="p-4 bg-orange-500/5 dark:bg-orange-500/10 rounded-2xl border border-orange-500/20 text-left space-y-2.5 max-w-sm mx-auto">
                <div className="flex items-center gap-1.5 justify-center">
                  <AlertCircle size={15} className="text-orange-500 shrink-0" />
                  <p className="text-[10px] uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400">
                    Aviso Importante do Organizador
                  </p>
                </div>
                <p className="text-[9.5px] text-stone-600 dark:text-stone-300 leading-relaxed text-center">
                  O pagamento pelo Pix não possui integração bancária automática. Seus números já foram pré-reservados no sistema, mas você <strong>deve nos enviar o comprovante via WhatsApp</strong> para o número correspondente para que sua participação seja confirmada e validada!
                </p>
              </div>

              <div className="space-y-2 max-w-sm mx-auto">
                <button
                  id="send-proof-whatsapp-btn"
                  type="button"
                  onClick={() => {
                    const cleanPhone = whatsappNumber.replace(/\D/g, '');
                    const text = "Oi, vim confirmar o pagamento do valor da rifa.";
                    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
                    const numsString = numbers.map(n => String(n).padStart(2, '0')).join(', ');
                    
                    setSuccessDialog({
                      title: "CONFIRMAÇÃO DE RESERVA",
                      message: (
                        <span>
                          Sucesso! Os números <strong className="font-extrabold text-amber-500">[{numsString}]</strong> foram pré-reservados em nome de <span className="font-bold">"{fullName}"</span>. O pagamento ou comprovante deve ser enviado até o dia <strong className="font-extrabold text-amber-500">{paymentDeadline || ''}</strong>. Você será redirecionado para o WhatsApp ({formatPhone(whatsappNumber)}) para enviar o comprovante de pagamento.
                        </span>
                      ),
                      redirectUrl: url,
                      onConfirm: () => {
                        window.open(url, "_blank");
                        onReserveSuccess('reserved');
                        onClearCart?.();
                        setStep(1);
                        setSuccessDialog(null);
                        onClose();
                      }
                    });
                  }}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-stone-950 dark:text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg transition-all animate-pulse"
                >
                  <Phone size={13} /> Enviar Comprovante do Pix
                </button>

                <button
                  id="complete-reserve-btn"
                  type="button"
                  onClick={() => {
                    const numsString = numbers.map(n => String(n).padStart(2, '0')).join(', ');
                    setSuccessDialog({
                      title: "CONFIRMAÇÃO DE RESERVA",
                      message: (
                        <span>
                          Sucesso! Os números <strong className="font-extrabold text-amber-500">[{numsString}]</strong> foram reservados com sucesso. Lembre-se de transferir o Pix e encaminhar o comprovante até o dia <strong className="font-extrabold text-amber-500">{paymentDeadline || ''}</strong> para o WhatsApp do organizador: <span className="font-bold">{formatPhone(whatsappNumber)}</span>.
                        </span>
                      ),
                      onConfirm: () => {
                        onReserveSuccess('reserved');
                        onClearCart?.();
                        setStep(1);
                        setSuccessDialog(null);
                        onClose();
                      }
                    });
                  }}
                  className="w-full py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center cursor-pointer transition-all border border-stone-200 dark:border-stone-700"
                >
                  Apenas Concluir Reserva
                </button>
              </div>

              {/* Cancel reserve option */}
              <button
                id="cancel-payment-wizard-btn"
                type="button"
                onClick={handleCancelClick}
                className="text-[10px] font-semibold text-stone-400 hover:text-stone-600 cursor-pointer block mx-auto underline pt-1"
              >
                Voltar e Cancelar Reserva
              </button>
            </div>
          )}
        </div>

      </div>

      {successDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-3xl shadow-2xl relative overflow-hidden text-center space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/25 text-yellow-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold animate-bounce">
              🎉
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-wider">
                {successDialog.title}
              </h3>
              <div className="h-[2.5px] w-12 bg-yellow-400 mx-auto rounded-full" />
            </div>

            <div className="py-2 text-stone-700 dark:text-stone-300 font-medium leading-relaxed text-xs">
              {successDialog.message}
            </div>

            <button
              id="confirm-success-modal-btn"
              type="button"
              onClick={successDialog.onConfirm}
              className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 outline-none text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              {successDialog.redirectUrl ? "Ir para o WhatsApp e Concluir" : "Concluir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
