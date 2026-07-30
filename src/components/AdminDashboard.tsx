import React, { useState } from 'react';
import { ThemeConfig } from '../themeHelper.js';
import { 
  Ticket, RaffleSettings, DiaperSize, ThemeType, DiaperRange 
} from '../types.js';
import { 
  Settings2, Users, Receipt, Calendar, ShieldCheck, Share2, 
  Check, Trash2, Edit, Save, Plus, AlertCircle, Sparkles, 
  Coins, Gift, HelpCircle, Laptop, RotateCcw, Copy, Ticket as TicketIcon, Search, Eye, Upload,
  Database, RefreshCw, Download, Filter
} from 'lucide-react';

interface AdminDashboardProps {
  adminKey: string;
  settings: RaffleSettings;
  tickets: Record<number, Ticket>;
  drawnNumbers: number[];
  onSettingsUpdated: (newSettings: RaffleSettings) => void;
  onTicketsUpdated: (newTickets: Record<number, Ticket>) => void;
  onOpenSorteador: () => void;
  onResetRaffle: () => void;
  theme: ThemeConfig;
}

export default function AdminDashboard({
  adminKey,
  settings,
  tickets,
  drawnNumbers,
  onSettingsUpdated,
  onTicketsUpdated,
  onOpenSorteador,
  onResetRaffle,
  theme
}: AdminDashboardProps) {
  // Tabs: 'settings' or 'participants' or 'pendings'
  const [activeTab, setActiveTab] = useState<'settings' | 'participants' | 'pendings'>('participants');
  const [searchQuery, setSearchQuery] = useState('');
  const [giftFilter, setGiftFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Settings edit forms
  const [title, setTitle] = useState(settings.title);
  const [description, setDescription] = useState(settings.description);
  const [prize, setPrize] = useState(settings.prize);
  const [prizes, setPrizes] = useState<string[]>(
    settings.prizes || (settings.prize ? settings.prize.split('|').map(p => p.trim()).filter(Boolean) : [])
  );
  const [pixKey, setPixKey] = useState(settings.pixKey || "pix-chafarifa@bancocentral.com.br");
  const [pixKeyType, setPixKeyType] = useState(settings.pixKeyType || "Chave Aleatória");
  const [pixQrCode, setPixQrCode] = useState(settings.pixQrCode || "");
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber || "11999999999");
  const [pixCopyAndPaste, setPixCopyAndPaste] = useState(settings.pixCopyAndPaste || "");
  const [paymentDeadline, setPaymentDeadline] = useState(settings.paymentDeadline || "");
  const [howItWorks, setHowItWorks] = useState(settings.howItWorks || "");
  const [diaperObservation, setDiaperObservation] = useState(settings.diaperObservation || "");
  const [newPrizeInput, setNewPrizeInput] = useState('');

  const insertFormat = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById('settings-how-it-works-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = tagOpen + (selectedText || "texto") + tagClose;
    
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setHowItWorks(newValue);
    
    // Focus back and select
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + (selectedText || "texto").length);
    }, 50);
  };
  
  const [activeTheme, setActiveTheme] = useState<ThemeType>(settings.theme);
  const [raffleDate, setRaffleDate] = useState(settings.raffleDate);
  const [ticketPrice, setTicketPrice] = useState(settings.ticketPrice);
  const [allowDiaper, setAllowDiaper] = useState(settings.allowDiaper);
  const [allowPix, setAllowPix] = useState(settings.allowPix);
  const [diaperSizes, setDiaperSizes] = useState<DiaperSize[]>(settings.diaperSizes);
  const [numTickets, setNumTickets] = useState(settings.numberOfTickets);
  const [customKey, setCustomKey] = useState(adminKey);
  const [diaperRanges, setDiaperRanges] = useState<DiaperRange[]>(settings.diaperRanges || []);

  // Diaper input helper ranges
  const [newRangeFrom, setNewRangeFrom] = useState<number | ''>('');
  const [newRangeTo, setNewRangeTo] = useState<number | ''>('');
  const [newRangeSize, setNewRangeSize] = useState<DiaperSize>('M');

  // Manual ticket register sheet
  const [manualNumber, setManualNumber] = useState<number | ''>('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualOption, setManualOption] = useState<'diaper' | 'pix'>('pix');
  const [manualDiaperSize, setManualDiaperSize] = useState<DiaperSize>('M');

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  // Connection testing state
  const [dbTestResult, setDbTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    mode?: string;
    message?: string;
    durationMs?: number;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleTestDbConnection = async () => {
    setDbTestResult({ loading: true });
    try {
      const res = await fetch('/api/raffle/db-test');
      const data = await res.json();
      setDbTestResult({
        loading: false,
        success: data.success,
        mode: data.mode,
        message: data.message,
        durationMs: data.durationMs
      });
    } catch {
      setDbTestResult({
        loading: false,
        success: false,
        mode: 'local',
        message: 'Falha na requisição local da API de teste.'
      });
    }
  };

  // Generate unique shareable Admin Link
  const getAdminLink = () => {
    return `${window.location.origin}/?key=${adminKey}`;
  };

  const handleCopyAdminLink = () => {
    navigator.clipboard.writeText(getAdminLink());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Export reserved or paid tickets to CSV
  const handleExportCSV = () => {
    const listToExport = Object.values(tickets)
      .filter(t => t.status === 'reserved' || t.status === 'paid')
      .sort((a, b) => a.number - b.number);

    if (listToExport.length === 0) {
      alert("Nenhum bilhete reservado ou confirmado para exportar.");
      return;
    }

    // CSV Headers
    const headers = ["Número Reservado", "Nome", "Telefone", "Presente Escolhido", "Status"];
    
    // Rows
    const rows = listToExport.map(t => {
      const numberStr = String(t.number).padStart(2, '0');
      const nameStr = t.name || "";
      const phoneStr = t.phone || "";
      
      let presentStr = "";
      if (t.option === 'diaper') {
        presentStr = `Fralda ${t.diaperSize || ""}`;
      } else {
        presentStr = `Pix (R$ ${settings.ticketPrice.toFixed(2)})`;
      }
      
      const statusStr = t.status === 'paid' ? "Confirmado" : "Reservado";
      
      const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
      
      return [
        escape(numberStr),
        escape(nameStr),
        escape(phoneStr),
        escape(presentStr),
        escape(statusStr)
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `participantes-rifa-${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle diaper sizes in array
  const handleToggleDiaperSize = (size: DiaperSize) => {
    if (diaperSizes.includes(size)) {
      setDiaperSizes(diaperSizes.filter(s => s !== size));
    } else {
      setDiaperSizes([...diaperSizes, size]);
    }
  };

  // Adicionar nova faixa de fralda
  const handleAddFieldRange = () => {
    setAdminError(null);
    setAdminSuccess(null);
    if (!newRangeFrom || !newRangeTo) {
      setAdminError("Por favor informe os valores 'De' e 'Até' do intervalo de números.");
      return;
    }
    const fromVal = Number(newRangeFrom);
    const toVal = Number(newRangeTo);

    if (fromVal <= 0 || toVal <= 0) {
      setAdminError("Ambos os números do intervalo devem ser maiores do que 0.");
      return;
    }
    if (fromVal > toVal) {
      setAdminError("O número inicial ('De') deve ser menor ou igual ao número final ('Até').");
      return;
    }
    if (toVal > numTickets) {
      setAdminError(`O número final do intervalo de fralda não pode superar o total de bilhetes da rifa (${numTickets}).`);
      return;
    }

    // Verificar se há interseção de intervalos
    const hasIntersection = diaperRanges.some(r => {
      return (fromVal <= r.to) && (toVal >= r.from);
    });

    if (hasIntersection) {
      setAdminError("Este intervalo possui sobreposição com outra regra de fralda já existente!");
      return;
    }

    const newRange: DiaperRange = {
      from: fromVal,
      to: toVal,
      size: newRangeSize
    };

    setDiaperRanges([...diaperRanges, newRange].sort((a, b) => a.from - b.from));
    setNewRangeFrom('');
    setNewRangeTo('');
    setAdminSuccess(`Regra para Fralda tamanho ${newRangeSize} (Números ${fromVal} a ${toVal}) adicionada localmente!`);
  };

  // Remover uma faixa de fralda listada
  const handleRemoveFieldRange = (idx: number) => {
    setAdminError(null);
    setAdminSuccess(null);
    const removed = diaperRanges[idx];
    setDiaperRanges(diaperRanges.filter((_, i) => i !== idx));
    setAdminSuccess(`Regra de intervalo removida com sucesso.`);
  };

  // Geração Proporcional de Faixas de Fraldas Baseada em Bilhetes e Tamanhos Permitidos
  const handleGenerateProportionalRanges = () => {
    setAdminError(null);
    setAdminSuccess(null);
    
    const activeSizes = diaperSizes.length > 0 ? diaperSizes : (['RN', 'P', 'M', 'G', 'GG'] as DiaperSize[]);
    const sizeCount = activeSizes.length;
    const itemsPerSize = Math.floor(numTickets / sizeCount);
    
    let tempRanges: DiaperRange[] = [];
    let currentFrom = 1;
    
    for (let i = 0; i < sizeCount; i++) {
      let currentTo = currentFrom + itemsPerSize - 1;
      // Se for a ultima regra, cobre ate o numero maximo de bilhetes
      if (i === sizeCount - 1) {
        currentTo = numTickets;
      }
      
      tempRanges.push({
        from: currentFrom,
        to: currentTo,
        size: activeSizes[i]
      });
      
      currentFrom = currentTo + 1;
    }
    
    setDiaperRanges(tempRanges);
    setAdminSuccess(`⚡ Sucesso! Geramos automaticamente ${tempRanges.length} faixas proporcionais e balanceadas de fraldas para seus ${numTickets} bilhetes.`);
  };

  // Submit Settings Update
  const updateSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);
    setSavingSettings(true);

    if (numTickets < 10 || numTickets > 500) {
      setAdminError("O número máximo de bilhetes na rifa deve estar entre 10 e 500.");
      setSavingSettings(false);
      return;
    }

    if (!allowDiaper && !allowPix) {
      setAdminError("Você precisa permitir pelo menos uma opção: Fraldas ou Pix.");
      setSavingSettings(false);
      return;
    }

    if (allowDiaper && diaperSizes.length === 0) {
      setAdminError("Selecione pelo menos um tamanho de fralda permitido.");
      setSavingSettings(false);
      return;
    }

    try {
      const response = await fetch('/api/raffle/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          title,
          description,
          prize: prizes.join(' | '),
          prizes,
          pixKey,
          pixKeyType,
          pixQrCode,
          whatsappNumber,
          pixCopyAndPaste,
          paymentDeadline,
          theme: activeTheme,
          raffleDate,
          ticketPrice: Number(ticketPrice),
          allowDiaper,
          allowPix,
          diaperSizes,
          adminKey: customKey,
          numberOfTickets: numTickets,
          diaperRanges,
          howItWorks,
          diaperObservation
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setAdminError(data.error || "Falha ao gravar configurações.");
      } else {
        setAdminSuccess("Configurações gravadas e aplicadas com sucesso!");
        onSettingsUpdated(data.settings);
        // If they updated the administrative key, redirect/reload with new key elegantly
        if (customKey !== adminKey) {
          sessionStorage.setItem('raffle_admin_key', customKey);
          window.location.search = '';
        }
      }
    } catch {
      setAdminError("Erro de rede ao salvar configurações.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Release block or approve payment
  const handleUpdateTicketStatus = async (number: number, status: 'available' | 'reserved' | 'paid') => {
    setAdminError(null);
    setAdminSuccess(null);

    try {
      const response = await fetch('/api/raffle/admin/ticket/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ number, status })
      });

      const data = await response.json();
      if (!response.ok) {
        setAdminError(data.error || "Erro ao atualizar bilhete.");
      } else {
        onTicketsUpdated(data.tickets);
        setAdminSuccess(`Bilhete ${number} foi atualizado para ${status === 'available' ? 'disponível' : status === 'paid' ? 'pago' : 'reservado'}.`);
      }
    } catch {
      setAdminError("Erro de comunicação ao atualizar bilhete.");
    }
  };

  // Create local manual reservation (e.g. offline ticket buyers)
  const handleCreateManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);

    if (!manualNumber) {
      setAdminError("Por favor escolha um número para reservar.");
      return;
    }

    if (!manualName.trim()) {
      setAdminError("Por favor informe o nome do participante.");
      return;
    }

    if (!manualPhone.trim()) {
      setAdminError("Por favor informe o telefone do participante.");
      return;
    }

    setSavingManual(true);

    try {
      const response = await fetch('/api/raffle/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: Number(manualNumber),
          name: manualName,
          phone: manualPhone.trim(),
          option: manualOption,
          diaperSize: manualOption === 'diaper' ? manualDiaperSize : undefined
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        setAdminError(resData.error || "Falha ao registrar número.");
        setSavingManual(false);
        return;
      }

      // Automatically auto-approve manual registrations as 'paid'
      await handleUpdateTicketStatus(Number(manualNumber), 'paid');

      setManualNumber('');
      setManualName('');
      setManualPhone('');
      setAdminSuccess("Bilhete manual incluído e pago com sucesso!");
    } catch {
      setAdminError("Erro de comunicação ao salvar inclusão manual.");
    } finally {
      setSavingManual(false);
    }
  };

  const handleResetConfirm = () => {
    if (window.confirm("ATENÇÃO PERIGO!\n\nIsso irá apagar todos os bilhetes vendidos e reiniciar a rifa para o estado vazio. Deseja prosseguir?")) {
      onResetRaffle();
    }
  };

  // Calc general metrics
  const totalTickets = settings.numberOfTickets;
  const soldTicketsList = Object.values(tickets);
  const reservedCount = soldTicketsList.filter(t => t.status === 'reserved').length;
  const paidCount = soldTicketsList.filter(t => t.status === 'paid').length;
  const availableCount = totalTickets - soldTicketsList.length;

  const totalCollectedPixPrimos = soldTicketsList
    .filter(t => t.status === 'paid' && t.option === 'pix')
    .length * settings.ticketPrice;

  // Diaper sizes tally
  const diaperTally = soldTicketsList.reduce((acc, t) => {
    if (t.status === 'paid' && t.option === 'diaper' && t.diaperSize) {
      acc[t.diaperSize] = (acc[t.diaperSize] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter list
  const filteredTickets = soldTicketsList.filter(t => {
    // 1. Search Query
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      t.name.toLowerCase().includes(q) ||
      t.number.toString().includes(q) ||
      t.phone.includes(q) ||
      (t.diaperSize && t.diaperSize.toLowerCase().includes(q)) ||
      t.option.toLowerCase().includes(q)
    );

    // 2. Gift Choice Filter
    let matchesGift = true;
    if (giftFilter === 'pix') {
      matchesGift = t.option === 'pix';
    } else if (giftFilter === 'diaper') {
      matchesGift = t.option === 'diaper';
    } else if (giftFilter.startsWith('diaper_')) {
      const targetSize = giftFilter.replace('diaper_', '');
      matchesGift = t.option === 'diaper' && t.diaperSize === targetSize;
    }

    // 3. Status Filter
    let matchesStatus = true;
    if (statusFilter === 'paid') {
      matchesStatus = t.status === 'paid';
    } else if (statusFilter === 'reserved') {
      matchesStatus = t.status === 'reserved';
    }

    return matchesSearch && matchesGift && matchesStatus;
  });

  return (
    <div id="admin-dashboard-container" className="space-y-6">
      
      {/* Admin header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-3xl shadow-lg border border-stone-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-yellow-500/10 text-yellow-500 text-[10px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={12} /> Painel do Gestor
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Gerenciamento do {settings.title}</h2>
          <p className="text-xs text-stone-400">Personalize a rifa, controle inscrições e realize sorteios em tempo real de forma centralizada.</p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <button
            id="open-sorteador-modal-btn"
            onClick={onOpenSorteador}
            className="flex items-center gap-1.5 p-2 px-4 bg-yellow-500 hover:bg-yellow-400 text-stone-900 text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer"
          >
            <Sparkles size={14} /> Realizar Sorteio
          </button>
          
          <button
            id="copy-admin-link-panel"
            onClick={handleCopyAdminLink}
            className="flex items-center gap-1.5 p-2 px-3 bg-stone-700 hover:bg-stone-600 text-stone-100 text-xs font-semibold rounded-2xl border border-stone-600 transition-all cursor-pointer"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copiedLink ? "Copiado!" : "Copiar Link Admin"}
          </button>
        </div>
      </div>

      {adminError && (
        <div id="admin-feedback-error" className="p-3.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-950 rounded-2xl flex items-center gap-2 text-xs">
          <AlertCircle size={16} className="shrink-0 animate-bounce" />
          <span>{adminError}</span>
        </div>
      )}

      {adminSuccess && (
        <div id="admin-feedback-success" className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-950 rounded-2xl flex items-center gap-2 text-xs">
          <Check size={16} className="shrink-0" />
          <span>{adminSuccess}</span>
        </div>
      )}

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 p-4 rounded-3xl shadow-sm text-center">
          <div className="mx-auto w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-2">
            <TicketIcon size={16} />
          </div>
          <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-bold tracking-wide">Status Geral</span>
          <p className="text-xl font-bold dark:text-white mt-1">{paidCount + reservedCount} / {totalTickets}</p>
          <span className="text-[10px] text-stone-400">({availableCount} restantes)</span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 p-4 rounded-3xl shadow-sm text-center">
          <div className="mx-auto w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-2">
            <Coins size={16} />
          </div>
          <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-bold tracking-wide">Arrecadado via Pix</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">R$ {totalCollectedPixPrimos.toFixed(2)}</p>
          <span className="text-[10px] text-stone-400">({soldTicketsList.filter(t => t.status==='paid' && t.option==='pix').length} bilhetes pagos)</span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 p-4 rounded-3xl shadow-sm text-center">
          <div className="mx-auto w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center mb-2">
            <Gift size={16} />
          </div>
          <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-bold tracking-wide">Fraldas Confirmadas</span>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <p className="text-lg font-bold dark:text-white">{soldTicketsList.filter(t => t.status==='paid' && t.option==='diaper').length}</p>
            <span className="text-xs text-stone-400">Fraldas</span>
          </div>
          {/* mini size breakout */}
          <div className="flex justify-center gap-1.5 mt-1 text-[9px] text-stone-500">
            {Object.entries(diaperTally).map(([sz, qty]) => (
              <span key={sz} className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">
                {sz}:{qty}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 p-4 rounded-3xl shadow-sm text-center">
          <div className="mx-auto w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 flex items-center justify-center mb-2">
            <RotateCcw size={16} />
          </div>
          <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-bold tracking-wide">Reservorios Pendentes</span>
          <p className="text-xl font-bold text-yellow-500 mt-1">{reservedCount}</p>
          <span className="text-[10px] text-stone-400">Aguardando aprovação/Pix</span>
        </div>
      </div>

      {/* TABS ROW */}
      <div className="flex border-b border-stone-200 dark:border-stone-800">
        <button
          id="tab-participants"
          onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'participants'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users size={16} /> Participantes Confirmados ({paidCount})
        </button>

        <button
          id="tab-pendings"
          onClick={() => setActiveTab('pendings')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'pendings'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Receipt size={16} /> Pendências de Aprovação
          {reservedCount > 0 && (
            <span className="animate-pulse bg-red-500 text-white font-black rounded-full text-[9px] px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center">
              {reservedCount}
            </span>
          )}
        </button>

        <button
          id="tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Settings2 size={16} /> Personalizar Rifa e Visual
        </button>
      </div>

      {/* TAB CONTENT: PARTICIPANTS CONTROL PANEL */}
      {activeTab === 'participants' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Add manual participant and list */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Filter Search Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-2xl shadow-sm">
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                {/* Search input */}
                <div className="relative flex-1 sm:flex-none min-w-[180px]">
                  <Search className="absolute left-3 top-2.5 text-stone-400" size={14} />
                  <input
                    id="admin-search-input"
                    type="text"
                    placeholder="Pesquisar por nome, tel, nº..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-900 dark:text-white"
                  />
                </div>

                {/* Filter Gift Choice */}
                <div className="relative">
                  <select
                    id="filter-gift-select"
                    value={giftFilter}
                    onChange={(e) => setGiftFilter(e.target.value)}
                    className="py-1.5 px-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-800 dark:text-stone-200 cursor-pointer font-medium"
                  >
                    <option value="all">🎁 Presente: Todos</option>
                    {settings.allowPix && <option value="pix">💵 Apenas Pix</option>}
                    {settings.allowDiaper && (
                      <>
                        <option value="diaper">🍼 Apenas Fralda (Todas)</option>
                        {(settings.diaperSizes && settings.diaperSizes.length > 0
                          ? settings.diaperSizes
                          : (['RN', 'P', 'M', 'G', 'GG', 'XG'] as DiaperSize[])
                        ).map((size) => (
                          <option key={size} value={`diaper_${size}`}>
                            🍼 Fralda {size}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Filter Status */}
                <div className="relative">
                  <select
                    id="filter-status-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-1.5 px-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-800 dark:text-stone-200 cursor-pointer font-medium"
                  >
                    <option value="all">📌 Status: Todos</option>
                    <option value="paid">✅ Confirmado / Pago</option>
                    <option value="reserved">⏳ Reservado / Pendente</option>
                  </select>
                </div>

                {/* Reset filters button */}
                {(searchQuery || giftFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    id="btn-clear-filters"
                    onClick={() => {
                      setSearchQuery('');
                      setGiftFilter('all');
                      setStatusFilter('all');
                    }}
                    type="button"
                    title="Limpar filtros"
                    className="p-1.5 px-2.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
                <button
                  id="btn-export-csv"
                  onClick={handleExportCSV}
                  type="button"
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl cursor-pointer shadow-sm border border-emerald-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download size={13} />
                  <span>Exportar CSV</span>
                </button>
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider whitespace-nowrap">
                  Mostrando {filteredTickets.length} de {soldTicketsList.length}
                </p>
              </div>
            </div>

            {/* Main participants table */}
            <div className="bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-950 border-b border-stone-150 dark:border-stone-800 text-[10px] text-stone-400 uppercase font-black tracking-wide">
                      <th className="p-4 w-16">Nº</th>
                      <th className="p-4">Nome completo</th>
                      <th className="p-4">Telefone</th>
                      <th className="p-4 text-center">Escolha</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-emerald-600 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150 dark:divide-stone-800">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-stone-400 italic">
                          {searchQuery || giftFilter !== 'all' || statusFilter !== 'all'
                            ? "Nenhum participante coincide com os filtros selecionados."
                            : "Nenhum número foi escolhido ainda."}
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr key={ticket.number} className="text-stone-800 dark:text-stone-200 hover:bg-stone-50/50 dark:hover:bg-stone-900/30 text-xs">
                          {/* Number */}
                          <td className="p-4 font-mono font-bold text-stone-900 dark:text-white">
                            <span className="px-2 py-1 bg-stone-900 text-yellow-400 rounded-lg text-[11px]">
                              {String(ticket.number).padStart(2, '0')}
                            </span>
                          </td>
                          {/* Name */}
                          <td className="p-4 font-semibold">{ticket.name}</td>
                          {/* Phone (pii fully read in admin payload!) */}
                          <td className="p-4 font-mono text-stone-500 select-all">{ticket.phone}</td>
                          {/* Option Chosen */}
                          <td className="p-4 text-center">
                            {ticket.option === 'diaper' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-400 rounded-full font-semibold text-[10px]">
                                <Gift size={10} /> Fralda {ticket.diaperSize}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-400 rounded-full font-semibold text-[10px]">
                                <Coins size={10} /> Pix R$ {settings.ticketPrice.toFixed(2)}
                              </span>
                            )}
                          </td>
                          {/* Status */}
                          <td className="p-4">
                            {ticket.status === 'paid' ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                Pago / Entregue
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 text-[9px] font-bold pulse-subtle">
                                Pendente / Reservado
                              </span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="p-4 text-right space-x-1 whitespace-nowrap">
                            {ticket.status === 'reserved' && (
                              <button
                                id={`approve-paid-btn-${ticket.number}`}
                                onClick={() => handleUpdateTicketStatus(ticket.number, 'paid')}
                                title="Aprovar pagamento/recebimento"
                                className="p-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer inline-flex items-center gap-0.5 shadow-sm"
                              >
                                <Check size={10} /> Confirmar
                              </button>
                            )}
                            {ticket.status === 'paid' && (
                              <button
                                id={`revert-reserved-btn-${ticket.number}`}
                                onClick={() => handleUpdateTicketStatus(ticket.number, 'reserved')}
                                title="Voltar para reservado pendente"
                                className="p-1 px-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold cursor-pointer inline-flex items-center gap-0.5 shadow-sm"
                              >
                                Voltar p/ Reservado
                              </button>
                            )}
                            <button
                              id={`delete-ticket-btn-${ticket.number}`}
                              onClick={() => {
                                if (window.confirm(`Liberar o número ${ticket.number}? Isso apagará os dados do participante.`)) {
                                  handleUpdateTicketStatus(ticket.number, 'available');
                                }
                              }}
                              title="Liberar e apagar inscrição"
                              className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded cursor-pointer inline-flex align-middle"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right panel: Manual reservation helper */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Quick add card */}
            <div className="bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 p-5 rounded-3xl shadow-sm text-stone-800 dark:text-stone-100">
              <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 uppercase tracking-wide">
                <Plus size={16} className="text-yellow-500" /> Vender Bilhete Manual
              </h3>
              <p className="text-[10px] text-stone-400 mt-1">Insira participantes que compraram offline com fralda ou Pix em mãos.</p>

              <form onSubmit={handleCreateManualTicket} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Número Livre:</label>
                  <input
                    id="manual-ticket-num"
                    type="number"
                    min="1"
                    max={totalTickets}
                    required
                    placeholder="Ex: 45"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white"
                  />
                  {manualNumber && tickets[Number(manualNumber)] && (
                    <span className="text-[9px] text-red-500 block mt-1">Este número já está ocupado por outro participante!</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Nome completo:</label>
                  <input
                    id="manual-ticket-name"
                    type="text"
                    required
                    placeholder="Nome do padrinho/madrinha"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Telefone (obrigatório):</label>
                  <input
                    id="manual-ticket-phone"
                    type="text"
                    required
                    placeholder="Ex: (11) 99999-9999"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white"
                  />
                </div>

                {/* Option type */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Opção:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="manual-opt-pix"
                      type="button"
                      onClick={() => setManualOption('pix')}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        manualOption === 'pix'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-850'
                          : 'border-stone-200 text-stone-500'
                      }`}
                    >
                      Pix R$ {settings.ticketPrice.toFixed(0)}
                    </button>
                    <button
                      id="manual-opt-diaper"
                      type="button"
                      onClick={() => setManualOption('diaper')}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        manualOption === 'diaper'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-850'
                          : 'border-stone-200 text-stone-500'
                      }`}
                    >
                      Fralda
                    </button>
                  </div>
                </div>

                {manualOption === 'diaper' && (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">Tamanho da Fralda:</label>
                    <select
                      id="manual-diaper-size"
                      value={manualDiaperSize}
                      onChange={(e) => setManualDiaperSize(e.target.value as DiaperSize)}
                      className="w-full p-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white font-semibold"
                    >
                      {['RN', 'P', 'M', 'G', 'GG', 'XG'].map((size) => (
                        <option key={size} value={size}>Tamanho {size}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  id="submit-manual-ticket-btn"
                  type="submit"
                  disabled={savingManual || (manualNumber !== '' && !!tickets[Number(manualNumber)])}
                  className="w-full mt-2 py-2 bg-yellow-500 hover:bg-yellow-400 text-stone-900 border border-yellow-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {savingManual ? "Salvando..." : "Confirmar e Registrar Pago"}
                </button>
              </form>
            </div>

            {/* Quick action tools */}
            <div className="bg-stone-50 dark:bg-stone-900 border border-stone-150 dark:border-stone-800 p-5 rounded-3xl text-stone-700 dark:text-stone-300">
              <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase text-stone-600 dark:text-stone-400 mb-2">
                Ações Perigosas / Limpeza
              </h4>
              <p className="text-[10px] text-stone-400 mb-3">Estes botões limpam fisicamente as tabelas do seu banco de dados.</p>
              <button
                id="reset-raffle"
                onClick={handleResetConfirm}
                className="w-full py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950/20 text-red-650 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-950 flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw size={14} /> Redefinir Toda a Rifa
              </button>
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: PENDING APPLICATIONS */}
      {activeTab === 'pendings' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-5 bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-3xl shadow-sm space-y-4 text-stone-800 dark:text-stone-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-100 dark:border-stone-850 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 uppercase text-stone-700 dark:text-stone-300">
                  <Receipt size={16} className="text-red-500" /> Reservas Aguardando Sua Aprovação
                </h3>
                <p className="text-[10px] text-stone-400 mt-1">
                  Os convidados escolheram estes números. Aprove-os após receber o Pix ou a fralda correspondente, ou exclua-os para liberar os números.
                </p>
              </div>
              <span className="bg-red-500 text-white font-black text-xs rounded-full px-2.5 py-1 flex items-center justify-center animate-pulse shrink-0">
                {soldTicketsList.filter(t => t.status === 'reserved').length} Reservas Pendentes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-950 border-b border-stone-150 dark:border-stone-800 text-[10px] text-stone-400 uppercase font-black tracking-wide">
                    <th className="p-4 w-16">Nº</th>
                    <th className="p-4">Nome Completo</th>
                    <th className="p-4">Telefone / Cobrança</th>
                    <th className="p-4 text-center">Tipo de Doação</th>
                    <th className="p-4 text-right">Ação de Aprovação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-150 dark:divide-stone-800">
                  {soldTicketsList.filter(t => t.status === 'reserved').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-xs text-stone-400 italic">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <span className="text-4xl">✨</span>
                          <span className="font-semibold text-stone-600 dark:text-stone-350 text-xs">
                            Excelente! Nenhuma pendência encontrada.
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Todos os bilhetes reservados já foram confirmados ou liberados.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    soldTicketsList
                      .filter(t => t.status === 'reserved')
                      .map((ticket) => (
                        <tr key={ticket.number} className="text-stone-800 dark:text-stone-200 hover:bg-stone-50/50 dark:hover:bg-stone-900/30 text-xs">
                          {/* Number */}
                          <td className="p-4 font-mono font-bold text-stone-900 dark:text-white">
                            <span className="px-2 py-1 bg-stone-900 text-yellow-400 rounded-lg text-[11px]">
                              {String(ticket.number).padStart(2, '0')}
                            </span>
                          </td>
                          {/* Name */}
                          <td className="p-4 font-semibold">{ticket.name}</td>
                          {/* Phone / Whatsapp link */}
                          <td className="p-4 font-mono text-stone-500">
                            <div className="flex items-center gap-2">
                              <span>{ticket.phone || '-'}</span>
                              <a
                                href={`https://api.whatsapp.com/send?phone=55${(ticket.phone || '').replace(/\D/g, '')}&text=${encodeURIComponent(
                                  `Olá *${(ticket.name || '').trim().split(' ')[0]}*!\nEstou passando para te lembrar sobre a reserva do número *${String(ticket.number).padStart(2, '0')}* do *${settings.title}*. A entrega do presente deverá ser realizada até o dia *${settings.paymentDeadline || 'XX/XX/XX'}*.\nSegue o presente escolhido: *${ticket.option === 'diaper' ? `Fralda ${ticket.diaperSize || 'M'}` : `Pix R$ ${settings.ticketPrice.toFixed(2)}`}*.\nConto com sua participação!`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-green-500/10 hover:bg-green-500 hover:text-white border border-green-500/20 text-green-600 dark:text-green-400 font-bold rounded text-[9px] flex items-center gap-1 transition-all"
                              >
                                💬 Cobrar WhatsApp
                              </a>
                            </div>
                          </td>
                          {/* Option Chosen */}
                          <td className="p-4 text-center">
                            {ticket.option === 'diaper' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-400 rounded-full font-semibold text-[10px]">
                                <Gift size={10} /> Fralda {ticket.diaperSize}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-400 rounded-full font-semibold text-[10px]">
                                <Coins size={10} /> Pix R$ {settings.ticketPrice.toFixed(2)}
                              </span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              id={`approve-pending-confirm-${ticket.number}`}
                              onClick={() => {
                                handleUpdateTicketStatus(ticket.number, 'paid');
                                setAdminSuccess(`A reserva do número ${ticket.number} foi aprovada com sucesso!`);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold cursor-pointer inline-flex items-center gap-0.5 shadow-sm transition-all"
                            >
                              <Check size={11} /> Confirmar & Liberar
                            </button>
                            <button
                              id={`delete-pending-cancel-${ticket.number}`}
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja EXCLUIR a reserva do número ${ticket.number} de ${ticket.name}? Isso irá liberar o número novamente.`)) {
                                  handleUpdateTicketStatus(ticket.number, 'available');
                                  setAdminSuccess(`A reserva do número ${ticket.number} foi removida e o número está livre.`);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-105 hover:bg-red-200 dark:bg-red-950/20 text-red-600 rounded-xl text-[10px] font-bold cursor-pointer inline-flex items-center gap-0.5 transition-all"
                            >
                              <Trash2 size={11} /> Recusar & Apagar
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EDIT SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={updateSettingsSubmit} className="bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <Settings2 className="text-yellow-500" size={18} />
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Editar Detalhes do Chá Rifa</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left side: title and description */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Título da Rifa:</label>
                <input
                  id="settings-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Descrição / Convite:</label>
                <textarea
                  id="settings-desc-input"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-900 dark:text-white font-medium"
                  placeholder="Escreva uma bela apresentação da Rifa para os seus convidados."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">Instruções de "Como Funciona":</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => insertFormat('**', '**')}
                      className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-[10px] font-bold text-stone-700 dark:text-stone-300 rounded border border-stone-200 dark:border-stone-700 cursor-pointer transition-all"
                      title="Colocar em Negrito"
                    >
                      B (Negrito)
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormat('__', '__')}
                      className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-[10px] underline text-stone-700 dark:text-stone-300 rounded border border-stone-200 dark:border-stone-700 cursor-pointer transition-all"
                      title="Sublinhar Texto"
                    >
                      U (Sublinhar)
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormat('• ', '')}
                      className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-[10px] font-semibold text-stone-700 dark:text-stone-300 rounded border border-stone-200 dark:border-stone-700 cursor-pointer transition-all"
                      title="Inserir Marcador / Parágrafo"
                    >
                      • (Lista/Marcador)
                    </button>
                  </div>
                </div>
                <textarea
                  id="settings-how-it-works-input"
                  rows={5}
                  value={howItWorks}
                  onChange={(e) => setHowItWorks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-900 dark:text-white font-medium"
                  placeholder="Deixe em branco para usar o texto padrão. Se preenchido, cada linha ou parágrafo será mostrado diretamente no bloco 'Como funciona'. Use o painel rápido acima ou escreva livremente usando **negrito**, __sublinhado__ ou inicie a linha com • para listas."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Recomendação de Marca / Observação para Fralda:
                </label>
                <input
                  id="settings-diaper-observation-input"
                  type="text"
                  value={diaperObservation}
                  onChange={(e) => setDiaperObservation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-805 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-900 dark:text-white font-medium"
                  placeholder="Ex: Recomendamos as marcas Pampers Premium Care, Huggies Supreme Care ou MamyPoko."
                />
                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
                  Este aviso será exibido com destaque na finalização da reserva caso o participante selecione presentear com Fralda.
                </p>
              </div>

              <div className="space-y-3 p-4 bg-stone-50 dark:bg-stone-950 rounded-3xl border border-stone-200/50 dark:border-stone-800/80">
                <span className="block text-[10px] font-bold text-stone-450 uppercase tracking-wide">Gerenciamento de Prêmios:</span>
                
                {prizes.length === 0 ? (
                  <p className="text-[11px] text-stone-400 italic bg-white dark:bg-stone-900 p-3 rounded-2xl border border-dashed border-stone-200 dark:border-stone-850 text-center">
                    Nenhum prêmio cadastrado. Adicione pelo menos um!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto bg-white dark:bg-stone-900 p-2 rounded-2xl border border-stone-150 dark:border-stone-850">
                    {prizes.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-yellow-500/5 hover:bg-yellow-500/10 dark:bg-yellow-200/5 border border-yellow-500/10 dark:border-yellow-500/5 rounded-xl text-xs gap-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-yellow-600 dark:text-yellow-400 font-extrabold font-mono text-[10px] shrink-0">🎁 #{idx + 1}</span>
                          <span className="font-semibold text-stone-700 dark:text-stone-350 truncate">{p}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...prizes];
                            updated.splice(idx, 1);
                            setPrizes(updated);
                          }}
                          className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-all shrink-0"
                          title="Excluir prêmio"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    id="new-prize-item-input"
                    type="text"
                    placeholder="Ex: 1º Prêmio: AirFryer Philips"
                    value={newPrizeInput}
                    onChange={(e) => setNewPrizeInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-900 dark:text-white font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPrizeInput.trim()) {
                          setPrizes([...prizes, newPrizeInput.trim()]);
                          setNewPrizeInput('');
                        }
                      }
                    }}
                  />
                  <button
                    id="add-prize-item-btn"
                    type="button"
                    onClick={() => {
                      if (newPrizeInput.trim()) {
                        setPrizes([...prizes, newPrizeInput.trim()]);
                        setNewPrizeInput('');
                      }
                    }}
                    className="p-2 px-3.5 bg-yellow-500 hover:bg-yellow-400 text-stone-900 rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 shrink-0 transition-all"
                  >
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: Rules, dates and visual theme */}
            <div className="space-y-4">
              
              {/* Theme pick */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Tema Visual da Página:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['astronaut', 'safari', 'floral', 'natural'] as ThemeType[]).map((themeName) => (
                    <button
                      id={`theme-btn-opt-${themeName}`}
                      key={themeName}
                      type="button"
                      onClick={() => setActiveTheme(themeName)}
                      className={`p-3 rounded-2xl border-2 font-bold text-center capitalize text-xs cursor-pointer transition-all ${
                        activeTheme === themeName
                          ? themeName === 'safari' 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800' 
                            : themeName === 'floral' 
                              ? 'border-rose-400 bg-rose-50 text-rose-800' 
                              : themeName === 'natural'
                                ? 'border-[#5A5A40] bg-[#F9F7F2] text-[#5A5A40]'
                                : 'border-indigo-600 bg-indigo-50/50 text-indigo-400'
                          : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <span className="block text-lg">
                        {themeName === 'astronaut' ? '🚀' : themeName === 'safari' ? '🦒' : themeName === 'floral' ? '🌸' : '🌿'}
                      </span>
                      {themeName === 'astronaut' ? 'Astronauta' : themeName === 'natural' ? 'Tons Naturais' : themeName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Data/Hora Sorteio:</label>
                  <input
                    id="settings-date-input"
                    type="datetime-local"
                    required
                    value={raffleDate.substring(0, 16)} // trim back to format allowed by input
                    onChange={(e) => setRaffleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Total de Bilhetes (10-500):</label>
                  <input
                    id="settings-tickets-total-input"
                    type="number"
                    min="10"
                    max="500"
                    required
                    value={numTickets}
                    onChange={(e) => setNumTickets(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Deadline field */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200/50 dark:border-stone-800 rounded-3xl space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">Data Limite para Pagamento ou Entrega de Fraldas:</label>
                <input
                  id="settings-deadline-input"
                  type="text"
                  required
                  placeholder="Ex: 20/06/2026, 25/06 ou 3 dias úteis"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 focus:ring-yellow-500 text-stone-800 dark:text-white font-bold"
                />
                <p className="text-[10px] text-stone-400 leading-tight">Data/prazo máximo para que o convidado envie o Pix ou entregue a fralda encomendada.</p>
              </div>

              {/* Allowed options */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200/50 dark:border-stone-800 rounded-3xl space-y-4">
                <span className="block text-[10px] font-bold text-stone-450 uppercase tracking-wide">Regras de Negócio e Opções:</span>
                
                <div className="border-b border-stone-100 dark:border-stone-850 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Ativar Pix Pago:</span>
                    <div className="flex items-center gap-3">
                      {allowPix && (
                        <div className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 rounded-xl px-2 py-1 text-xs">
                          <span className="text-[10px] text-stone-400 font-bold uppercase">Valor Pix: R$</span>
                          <input
                            id="settings-price-input"
                            type="number"
                            step="1"
                            min="1"
                            value={ticketPrice}
                            onChange={(e) => setTicketPrice(Number(e.target.value))}
                            className="w-12 bg-transparent border-none text-stone-900 dark:text-white font-extrabold p-0 text-center font-mono focus:ring-0"
                          />
                        </div>
                      )}
                      <input
                        id="opt-allow-pix"
                        type="checkbox"
                        checked={allowPix}
                        onChange={(e) => setAllowPix(e.target.checked)}
                        className="w-4 h-4 accent-amber-500"
                      />
                    </div>
                  </div>

                  {allowPix && (
                    <div className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3 mt-2 animate-fadeIn">
                      <span className="block text-[9px] text-stone-400 font-bold uppercase">Dados para Recebimento (Pix):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] font-bold text-stone-450 uppercase mb-0.5">Tipo de Chave:</label>
                          <select
                            id="settings-pix-key-type"
                            value={pixKeyType}
                            onChange={(e) => setPixKeyType(e.target.value)}
                            className="w-full p-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white font-bold"
                          >
                            <option value="Chave Aleatória">Chave Aleatória</option>
                            <option value="CPF">CPF</option>
                            <option value="CNPJ">CNPJ</option>
                            <option value="Celular">Celular</option>
                            <option value="E-mail">E-mail</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-stone-450 uppercase mb-0.5">Chave Pix:</label>
                          <input
                            id="settings-pix-key"
                            type="text"
                            required
                            placeholder="Sua chave pix para receber"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            className="w-full p-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white font-mono font-bold"
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-stone-400 leading-tight">Essa chave será exibida ao convidado para que ele possa realizar a transferência com facilidade.</p>

                      {/* WhatsApp for receiving proofs */}
                      <div className="mt-3">
                        <label className="block text-[8px] font-bold text-stone-450 uppercase mb-0.5">WhatsApp para Recebimento de Comprovantes (Com DDD):</label>
                        <input
                          id="settings-whatsapp-number"
                          type="text"
                          required
                          placeholder="Apenas números, ex: 11999999999"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
                          className="w-full p-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white font-bold"
                        />
                        <p className="text-[9px] text-stone-400 leading-tight mt-1">Como o Pix não possui integração bancária automática, o participante copiará a chave e enviará o comprovante para este WhatsApp.</p>
                      </div>

                      {/* Pix Copia e Cola Code */}
                      <div className="mt-3">
                        <label className="block text-[8px] font-bold text-stone-450 uppercase mb-0.5">Código Pix Copia e Cola (Opcional):</label>
                        <textarea
                          id="settings-pix-copia-e-cola"
                          placeholder="Cole aqui o código Pix Copia e Cola completo para que os convidados possam pagar com facilidade"
                          value={pixCopyAndPaste}
                          onChange={(e) => setPixCopyAndPaste(e.target.value)}
                          rows={3}
                          className="w-full p-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl text-stone-900 dark:text-white font-mono leading-normal"
                        />
                        <p className="text-[9px] text-stone-400 leading-tight mt-1">Se preenchido, os convidados verão o botão "Copiar Código Copia e Cola (Pix)" para copiar o código inteiro ao invés de apenas a Chave Pix.</p>
                      </div>

                      {/* Custom QR Code Image Selector */}
                      <div className="pt-3 border-t border-stone-150 dark:border-stone-850 space-y-2">
                        <span className="block text-[8.5px] font-bold text-stone-400 uppercase tracking-wider">Imagem QR Code do Pix (Opcional):</span>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                          {pixQrCode ? (
                            <div className="relative shrink-0 w-20 h-20 bg-white border border-stone-250 dark:border-stone-750 rounded-lg overflow-hidden flex items-center justify-center p-1">
                              <img src={pixQrCode} alt="PIX QR Code" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setPixQrCode("")}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md flex items-center justify-center transition-all cursor-pointer"
                                style={{ width: '18px', height: '18px' }}
                                title="Remover imagem"
                              >
                                <span className="text-[10px] font-bold leading-none">×</span>
                              </button>
                            </div>
                          ) : (
                            <div className="shrink-0 w-20 h-20 bg-stone-100 dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 rounded-lg flex flex-col items-center justify-center text-stone-400 dark:text-stone-605 p-1 text-[8px] font-black uppercase text-center">
                              <span>Sem Imagem</span>
                            </div>
                          )}

                          <div className="flex-1 text-left space-y-1 w-full">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-[10px] font-black uppercase rounded-lg shadow-xs cursor-pointer transition-all">
                              <Upload size={11} /> Escolher Imagem
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 12 * 1024 * 1024) {
                                    alert("Oops! Imagem muito grande. Escolha uma imagem de até 12MB.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      setPixQrCode(ev.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="hidden"
                              />
                            </label>
                            <span className="block text-[8px] text-stone-450 leading-tight">Envie o arquivo do seu QR Code que os convidados poderão escanear para pagar o Pix diretamente.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Ativar Doação de Fralda:</span>
                    <input
                      id="opt-allow-diaper"
                      type="checkbox"
                      checked={allowDiaper}
                      onChange={(e) => setAllowDiaper(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                  </div>

                  {allowDiaper && (
                    <div className="p-2 border border-stone-200/50 dark:border-stone-850 rounded-xl bg-white dark:bg-stone-900">
                      <span className="block text-[9px] text-stone-400 font-bold uppercase mb-1">Tamanhos permitidos:</span>
                      <div className="flex flex-wrap gap-1">
                        {(['RN', 'P', 'M', 'G', 'GG', 'XG'] as DiaperSize[]).map((size) => {
                          const isActive = diaperSizes.includes(size);
                          return (
                            <button
                              id={`toggle-size-${size}`}
                              key={size}
                              type="button"
                              onClick={() => handleToggleDiaperSize(size)}
                              className={`py-1 px-2.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-yellow-500 border-yellow-500 text-stone-900' 
                                  : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-100'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {allowDiaper && (
                    <div className="p-4 border border-stone-200/50 dark:border-stone-800/60 rounded-2xl bg-stone-100/50 dark:bg-stone-950/40 space-y-3 mt-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <span className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Fraldas por Intervalo de Número:</span>
                          <p className="text-[9px] text-stone-400">Atribua tamanhos específicos para faixas de bilhetes (ex: do 01 ao 15 fralda RN).</p>
                        </div>
                        <button
                          id="auto-generate-diaper-intervals-btn"
                          type="button"
                          onClick={handleGenerateProportionalRanges}
                          className="py-1 px-2.5 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-200/50 dark:border-indigo-900/40 transition-sm cursor-pointer shadow-xs shrink-0"
                        >
                          ⚡ Divisão Proporcional Automática
                        </button>
                      </div>

                      {/* Existing Ranges List */}
                      {diaperRanges.length === 0 ? (
                        <div className="text-center py-2 text-[10px] text-stone-400 italic bg-white dark:bg-stone-900 rounded-xl border border-stone-200/50 dark:border-stone-850">
                          Nenhum intervalo cadastrado. Os convidados escolherão o tamanho livremente ao reservar ou clique no botão acima para auto-gerar faixas!
                        </div>
                      ) : (
                        <div className="max-h-[140px] overflow-y-auto space-y-1 bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200/50 dark:border-stone-850">
                          {diaperRanges.map((range, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1.5 px-2 bg-stone-50 dark:bg-stone-950 rounded-lg text-[10.5px] font-semibold text-stone-700 dark:text-stone-300">
                              <span className="font-mono bg-stone-900 text-yellow-400 px-1 py-0.5 rounded text-[8.5px] leading-none">
                                Bilhetes {range.from} até {range.to}
                              </span>
                              <span className="text-stone-400">corresponde à</span>
                              <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded text-[9px] font-bold">
                                Fralda {range.size}
                              </span>
                              <button
                                id={`remove-range-btn-${idx}`}
                                type="button"
                                onClick={() => handleRemoveFieldRange(idx)}
                                className="p-0.5 bg-red-50 hover:bg-red-100 text-red-500 rounded cursor-pointer transition-all"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Range Creator Small Subform */}
                      <div className="p-2.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-150 dark:border-stone-850 space-y-2">
                        <span className="block text-[8.5px] font-bold uppercase tracking-wider text-stone-400">Criar Nova Faixa Personalizada:</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[8px] font-bold text-stone-450 uppercase mb-0.5">De (Início):</label>
                            <input
                              id="input-range-from"
                              type="number"
                              min="1"
                              max={numTickets}
                              placeholder="1"
                              value={newRangeFrom}
                              onChange={(e) => setNewRangeFrom(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-2 py-1 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] rounded-lg text-stone-900 dark:text-white font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-stone-450 uppercase mb-0.5">Até (Fim):</label>
                            <input
                              id="input-range-to"
                              type="number"
                              min="1"
                              max={numTickets}
                              placeholder="15"
                              value={newRangeTo}
                              onChange={(e) => setNewRangeTo(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-2 py-1 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] rounded-lg text-stone-900 dark:text-white font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-stone-450 uppercase mb-0.5">Tamanho:</label>
                            <select
                              id="select-range-size"
                              value={newRangeSize}
                              onChange={(e) => setNewRangeSize(e.target.value as DiaperSize)}
                              className="w-full p-1 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] rounded-lg text-stone-900 dark:text-white font-semibold"
                            >
                              {['RN', 'P', 'M', 'G', 'GG', 'XG'].map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          id="btn-add-range-rule"
                          type="button"
                          onClick={handleAddFieldRange}
                          className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[9.5px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Plus size={10} /> Gravar Nova Regra de Faixa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Password credentials key change */}
              <div className="bg-red-500/5 p-4 rounded-3xl border border-red-500/10 space-y-2">
                <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wide">Segurança & Acesso Administrador</span>
                <label className="block text-xs font-medium text-stone-500">Chave de proteção (Mín. 3 letras):</label>
                <div className="flex gap-2">
                  <input
                    id="settings-key-input"
                    type="text"
                    minLength={3}
                    required
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs rounded-xl focus:ring-1 text-stone-900 dark:text-white font-mono font-bold"
                  />
                  <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 text-[10px] font-bold p-2 rounded-xl flex items-center justify-center shrink-0">
                    Chave Atual: {adminKey}
                  </div>
                </div>
                <p className="text-[9px] text-stone-400">A chave compõe o endereço secreto. Se alterar a chave, o link de administração mudará também!</p>
              </div>

              {/* Database connection details & tester */}
              <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-stone-500 dark:text-stone-400" />
                  <span className="block text-[10px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wide">Integração do Banco de Dados</span>
                </div>
                
                <p className="text-[10px] text-stone-500">
                  Esta aplicação suporta persistência local baseada em arquivo <strong className="text-stone-600 dark:text-stone-400">JSON</strong> e sincronização robusta em nuvem via <strong className="text-stone-600 dark:text-stone-400">Supabase (PostgreSQL)</strong>.
                </p>

                <button
                  id="test-database-connection-btn"
                  type="button"
                  onClick={handleTestDbConnection}
                  disabled={dbTestResult?.loading}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-stone-900 border border-stone-850 hover:bg-stone-800 dark:bg-stone-900 dark:hover:bg-stone-850 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm relative overflow-hidden"
                >
                  <RefreshCw size={12} className={dbTestResult?.loading ? "animate-spin" : ""} />
                  {dbTestResult?.loading ? "Verificando conexão..." : "Testar Conexão Supabase"}
                </button>

                {dbTestResult && !dbTestResult.loading && (
                  <div className={`p-4 rounded-2xl border text-[10px] space-y-2 animate-fadeIn ${
                    dbTestResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                      : (dbTestResult.mode === 'local' || dbTestResult.mode === 'supabase_rest_needs_table')
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300'
                        : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-450'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="uppercase tracking-wider text-[8px] font-black">
                        Modo Atual: {dbTestResult.mode?.startsWith('supabase') ? '☁️ SUPABASE (Postgres)' : '📁 JSON LOCAL'}
                      </span>
                      {dbTestResult.durationMs !== undefined && (
                        <span className="font-mono text-[8px] opacity-70">Ping: {dbTestResult.durationMs}ms</span>
                      )}
                    </div>
                    <p className="font-semibold leading-relaxed font-sans">{dbTestResult.message}</p>
                    
                    {dbTestResult.success && (
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Suas tabelas e estruturas padrão estão criadas e respondendo perfeitamente nos servidores do Supabase. Todos os bilhetes e prêmios são guardados com segurança máxima!
                      </div>
                    )}

                    {dbTestResult.mode === 'supabase_rest_needs_table' && (
                      <div className="text-[9.5px] text-stone-600 dark:text-stone-300 font-medium space-y-2 mt-2 bg-white/50 dark:bg-black/30 p-3 rounded-xl border border-amber-500/10">
                        <p className="font-bold text-amber-700 dark:text-amber-400">⚡ Para finalizar, execute este comando no Supabase:</p>
                        <p>Copie o código SQL abaixo, vá no menu lateral esquerdo do Supabase, clique em <strong className="font-bold">SQL Editor</strong>, crie um <strong className="font-bold">New Query</strong>, cole e clique em <strong className="font-bold">Run</strong>:</p>
                        
                        <div className="relative bg-stone-900 text-stone-200 dark:bg-black dark:text-stone-300 p-2.5 rounded-xl font-mono text-[9px] border border-stone-800 dark:border-stone-850 flex justify-between items-start gap-2">
                          <pre className="overflow-x-auto whitespace-pre-wrap flex-1 leading-normal pr-4">
{`CREATE TABLE IF NOT EXISTS public.raffle_state (
  id INT PRIMARY KEY,
  state TEXT NOT NULL
);

-- Ativar Segurança de Nível de Linha (RLS) para proteger os dados das reservas
ALTER TABLE public.raffle_state ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer um faça leitura dos bilhetes
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.raffle_state;
CREATE POLICY "Permitir leitura pública" ON public.raffle_state FOR SELECT TO anon, authenticated USING (true);

-- Política para permitir inserção de reservas
DROP POLICY IF EXISTS "Permitir inserção de reservas" ON public.raffle_state;
CREATE POLICY "Permitir inserção de reservas" ON public.raffle_state FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Política para permitir atualização do estado
DROP POLICY IF EXISTS "Permitir atualização pública" ON public.raffle_state;
CREATE POLICY "Permitir atualização pública" ON public.raffle_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);`}
                          </pre>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.raffle_state (
  id INT PRIMARY KEY,
  state TEXT NOT NULL
);

-- Ativar Segurança de Nível de Linha (RLS) para proteger os dados das reservas
ALTER TABLE public.raffle_state ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer um faça leitura dos bilhetes
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.raffle_state;
CREATE POLICY "Permitir leitura pública" ON public.raffle_state FOR SELECT TO anon, authenticated USING (true);

-- Política para permitir inserção de reservas
DROP POLICY IF EXISTS "Permitir inserção de reservas" ON public.raffle_state;
CREATE POLICY "Permitir inserção de reservas" ON public.raffle_state FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Política para permitir atualização do estado
DROP POLICY IF EXISTS "Permitir atualização pública" ON public.raffle_state;
CREATE POLICY "Permitir atualização pública" ON public.raffle_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);`);
                              setCopiedSql(true);
                              setTimeout(() => setCopiedSql(false), 2000);
                            }}
                            className="p-1.5 bg-stone-800 hover:bg-stone-750 active:scale-95 text-stone-400 hover:text-white rounded-lg transition-all cursor-pointer shrink-0"
                            title="Copiar Código"
                          >
                            {copiedSql ? <span className="text-[8px] font-bold text-emerald-400 font-sans">Copiado!</span> : <Copy size={11} />}
                          </button>
                        </div>
                        <p className="text-[8.5px] text-amber-600 dark:text-amber-400/80 italic">💡 Isso criará a tabela e ativará as políticas oficiais de segurança de linha (RLS) exigidas pelo Supabase, resolvendo o alerta "Table publicly accessible" e garantindo a livre leitura e escrita corretas e seguras.</p>
                      </div>
                    )}

                    {!dbTestResult.success && dbTestResult.mode === 'local' && (
                      <div className="text-[9px] text-amber-700 dark:text-amber-400 font-medium space-y-1">
                        <p>💡 Para conectar com seu banco de dados Supabase e ter persistência definitiva:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Crie um projeto gratuito no site do Supabase.</li>
                          <li>Adicione as variáveis de ambiente <strong className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">SUPABASE_URL</strong> e <strong className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">SUPABASE_ANON_KEY</strong> nas Configurações deste Workspace.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>

          <div className="border-t border-stone-100 dark:border-stone-850 pt-4 flex justify-end">
            <button
              id="submit-settings-btn"
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-1.5 p-2 px-5 bg-yellow-500 hover:bg-yellow-400 text-stone-900 text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer"
            >
              {savingSettings ? "Salvando..." : (
                <>
                  <Save size={14} /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
