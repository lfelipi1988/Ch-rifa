import { ThemeType } from "./types.js";

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  fontClass: string;
  bgClass: string;
  cardClass: string;
  textClass: string;
  textMutedClass: string;
  primaryBtnClass: string;
  secondaryBtnClass: string;
  accentBorderClass: string;
  accentTextClass: string;
  accentBgClass: string;
  gridStatusClasses: {
    available: string;
    reserved: string;
    paid: string;
  };
  emojis: string[];
  bannerEmoji: string;
  illustrationClass: string;
}

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  astronaut: {
    id: "astronaut",
    name: "Espaço Astronauta",
    fontClass: "font-astronaut tracking-wider",
    bgClass: "bg-gradient-astronaut text-white pattern-stars min-h-screen font-sans",
    cardClass: "bg-indigo-950/40 backdrop-blur-md border border-indigo-500/30 shadow-2xl rounded-3xl p-6 text-white",
    textClass: "text-indigo-100",
    textMutedClass: "text-indigo-300 text-sm",
    primaryBtnClass: "bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all font-astronaut text-sm text-center cursor-pointer",
    secondaryBtnClass: "bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/50 font-medium px-4 py-2.5 rounded-2xl transition-all text-sm text-center cursor-pointer",
    accentBorderClass: "border-cyan-500/50",
    accentTextClass: "text-cyan-400 font-bold",
    accentBgClass: "bg-cyan-550/20",
    gridStatusClasses: {
      available: "bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-900/60 hover:scale-105 cursor-pointer",
      reserved: "bg-yellow-650/30 border border-yellow-500/60 text-yellow-300 pulse-subtle hover:bg-yellow-600/40 hover:scale-105 cursor-pointer",
      paid: "bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-400/20 cursor-not-allowed"
    },
    emojis: ["🚀", "👨‍🚀", "🛸", "🪐", "⭐", "🛰️", "👽", "🌙"],
    bannerEmoji: "🚀",
    illustrationClass: "border-indigo-500/20 bg-indigo-950/20"
  },
  safari: {
    id: "safari",
    name: "Aventura Safari",
    fontClass: "font-safari tracking-wide",
    bgClass: "bg-gradient-safari text-emerald-950 pattern-dots min-h-screen font-sans",
    cardClass: "bg-white/80 backdrop-blur-md border border-emerald-800/10 shadow-xl rounded-3xl p-6 text-emerald-950",
    textClass: "text-emerald-900",
    textMutedClass: "text-emerald-700/80 text-sm",
    primaryBtnClass: "bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-700/20 transition-all font-safari text-sm text-center cursor-pointer",
    secondaryBtnClass: "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-250 font-semibold px-4 py-2.5 rounded-2xl transition-all text-sm text-center cursor-pointer",
    accentBorderClass: "border-amber-600/40",
    accentTextClass: "text-amber-700 font-bold",
    accentBgClass: "bg-amber-50",
    gridStatusClasses: {
      available: "bg-stone-50 border border-emerald-800/10 text-emerald-850 hover:bg-emerald-50 hover:scale-105 cursor-pointer",
      reserved: "bg-amber-200/50 border border-orange-400/60 text-amber-800 pulse-subtle hover:bg-amber-250 hover:scale-105 cursor-pointer",
      paid: "bg-emerald-800 text-emerald-50 border border-emerald-600 shadow-sm shadow-emerald-800/10 cursor-not-allowed"
    },
    emojis: ["🦁", "🦒", "🦓", "🐘", "🐵", "🌴", "🐯", "🐆"],
    bannerEmoji: "🦒",
    illustrationClass: "border-emerald-800/15 bg-emerald-50"
  },
  floral: {
    id: "floral",
    name: "Jardim Floral",
    fontClass: "font-floral italic font-semibold",
    bgClass: "bg-gradient-floral text-rose-950 pattern-dots min-h-screen font-sans",
    cardClass: "bg-white/90 backdrop-blur-sm border border-rose-200 shadow-xl rounded-3xl p-6 text-rose-950",
    textClass: "text-rose-900",
    textMutedClass: "text-rose-700/80 text-sm",
    primaryBtnClass: "bg-rose-500 hover:bg-rose-400 text-white font-medium px-4 py-2.5 rounded-2xl shadow-md shadow-rose-500/20 transition-all font-floral text-sm text-center cursor-pointer",
    secondaryBtnClass: "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-medium px-4 py-2.5 rounded-2xl transition-all text-sm text-center cursor-pointer",
    accentBorderClass: "border-rose-400/40",
    accentTextClass: "text-rose-600 font-semibold",
    accentBgClass: "bg-rose-50/50",
    gridStatusClasses: {
      available: "bg-pink-50/40 border border-rose-100 text-rose-900 hover:bg-rose-50 hover:scale-105 cursor-pointer",
      reserved: "bg-amber-100 border border-amber-300 text-amber-800 pulse-subtle hover:bg-amber-150 hover:scale-105 cursor-pointer",
      paid: "bg-rose-450 bg-rose-400 text-white border border-rose-300 shadow-sm shadow-rose-400/10 cursor-not-allowed"
    },
    emojis: ["🌸", "🌹", "🦋", "🌼", "🌿", "🌷", "🌺", "🐝"],
    bannerEmoji: "🌸",
    illustrationClass: "border-rose-200 bg-rose-50/50"
  },
  natural: {
    id: "natural",
    name: "Tons Naturais (Sálvia & Areia)",
    fontClass: "font-serif tracking-normal",
    bgClass: "bg-[#F7F3E9] text-[#433D3C] pattern-dots min-h-screen font-sans",
    cardClass: "bg-white border border-[#E5DCC3] shadow-sm rounded-[32px] p-6 text-[#433D3C]",
    textClass: "text-[#433D3C]",
    textMutedClass: "text-[#6B645E] text-sm",
    primaryBtnClass: "bg-[#5A5A40] hover:bg-[#4d4d36] text-white font-semibold px-5 py-2.5 rounded-full shadow-sm transition-all text-sm text-center cursor-pointer",
    secondaryBtnClass: "bg-[#E5DCC3] hover:bg-[#d5caa7] text-[#5A5A40] border border-[#E5DCC3] font-semibold px-5 py-2.5 rounded-full transition-all text-sm text-center cursor-pointer",
    accentBorderClass: "border-[#E5DCC3]",
    accentTextClass: "text-[#5A5A40] font-bold",
    accentBgClass: "bg-[#F9F7F2]",
    gridStatusClasses: {
      available: "bg-[#E5DCC3] text-[#5A5A40] border border-[#E5DCC3]/10 hover:bg-[#5A5A40] hover:text-white hover:scale-105 transition-all duration-200 cursor-pointer",
      reserved: "bg-orange-300 text-white border border-teal-500/10 pulse-subtle hover:bg-orange-400 hover:scale-105 transition-all duration-200 cursor-pointer",
      paid: "bg-[#5A5A40] text-emerald-50 border border-[#5A5A40]/10 cursor-not-allowed"
    },
    emojis: ["🦁", "🦒", "🐘", "🦓", "🐒", "🌴", "🥑", "🌿"],
    bannerEmoji: "🌿",
    illustrationClass: "border-[#E5DCC3] bg-[#F9F7F2]"
  }
};
