import React, { useState, useEffect } from 'react';
import { ThemeConfig } from '../themeHelper.js';

interface CountdownProps {
  targetDate: string;
  theme: ThemeConfig;
}

export default function Countdown({ targetDate, theme }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false
  });

  useEffect(() => {
    function calculateTime() {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isCompleted: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isCompleted: false
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const timeBlocks = [
    { label: 'Dias', value: timeLeft.days },
    { label: 'Horas', value: timeLeft.hours },
    { label: 'Minutos', value: timeLeft.minutes },
    { label: 'Segundos', value: timeLeft.seconds },
  ];

  if (timeLeft.isCompleted) {
    return (
      <div id="countdown-banner-completed" className="text-center py-4 px-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-pulse">
        <p className={`text-base font-medium text-amber-600 ${theme.fontClass}`}>
          🎉 Chegou o grande dia do sorteio! 🎉
        </p>
        <p className="text-xs text-stone-500 mt-1">
          O organizador já pode realizar o sorteio dos números premiados na central de controle.
        </p>
      </div>
    );
  }

  // Format date display (e.g. 15 de Julho às 18:00)
  const formatDateString = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${d.getDate()} de ${months[d.getMonth()]} às ${hours}:${minutes}h`;
    } catch {
      return "";
    }
  };

  let boxBgClass = "bg-white/90 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 shadow-xs";
  let digitColorClass = "text-stone-900 dark:text-white";
  let labelColorClass = "text-stone-500 dark:text-stone-400";
  let titleColorClass = "text-stone-800 dark:text-stone-100";

  if (theme.id === "astronaut") {
    boxBgClass = "bg-indigo-900/90 border border-indigo-500/40 shadow-lg shadow-indigo-950/50";
    digitColorClass = "text-cyan-400 font-mono font-extrabold text-shadow-sm";
    labelColorClass = "text-indigo-200 font-bold";
    titleColorClass = "text-indigo-100 font-bold";
  } else if (theme.id === "safari") {
    boxBgClass = "bg-emerald-50 border border-emerald-850/20 shadow-xs";
    digitColorClass = "text-emerald-900 font-extrabold";
    labelColorClass = "text-emerald-700 font-semibold";
    titleColorClass = "text-emerald-950 font-bold";
  } else if (theme.id === "floral") {
    boxBgClass = "bg-rose-50/90 border border-rose-200/80 shadow-xs";
    digitColorClass = "text-rose-950 font-extrabold";
    labelColorClass = "text-rose-600 font-semibold";
    titleColorClass = "text-rose-950 font-bold";
  } else if (theme.id === "natural") {
    boxBgClass = "bg-stone-50 border border-[#E5DCC3] shadow-xs";
    digitColorClass = "text-[#5A5A40] font-extrabold";
    labelColorClass = "text-[#6B645E] font-semibold";
    titleColorClass = "text-[#433D3C] font-bold";
  }

  return (
    <div id="countdown-card" className="flex flex-col items-center">
      <div className="text-center mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${titleColorClass}`}>
          Tempo restante para o Sorteio
        </p>
        <span className={`text-xs font-medium opacity-80 ${labelColorClass}`}>
          ({formatDateString(targetDate)})
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
        {timeBlocks.map((block, i) => (
          <div
            id={`countdown-block-${block.label.toLowerCase()}`}
            key={i}
            className={`flex flex-col items-center justify-center p-3 rounded-xl ${boxBgClass}`}
          >
            <span className={`text-2xl font-bold tracking-tight md:text-3xl ${digitColorClass}`}>
              {String(block.value).padStart(2, '0')}
            </span>
            <span className={`text-[10px] font-medium uppercase mt-1 ${labelColorClass}`}>
              {block.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
