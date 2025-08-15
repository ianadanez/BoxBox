
import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string;
}

const Countdown: React.FC<CountdownProps> = ({ targetDate }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {
        días: 0,
        horas: 0,
        minutos: 0,
        segundos: 0,
    };

    if (difference > 0) {
      timeLeft = {
        días: Math.floor(difference / (1000 * 60 * 60 * 24)),
        horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((difference / 1000 / 60) % 60),
        segundos: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const timerComponents: React.ReactNode[] = [];

  Object.keys(timeLeft).forEach((interval) => {
    const value = timeLeft[interval as keyof typeof timeLeft];
    if (value > 0 || Object.keys(timerComponents).length > 0 || interval === 'segundos') {
      timerComponents.push(
        <div key={interval} className="flex flex-col items-center mx-2">
            <span className="text-3xl md:text-5xl font-semibold text-[var(--text-primary)] tabular-nums">{String(value).padStart(2, '0')}</span>
            <span className="text-xs uppercase text-[var(--text-secondary)] tracking-widest">{interval}</span>
        </div>
      );
    }
  });

  return (
    <div className="flex justify-center">
      {timerComponents.length ? timerComponents : <span className="text-2xl font-bold text-[var(--text-primary)]">¡El evento ha comenzado!</span>}
    </div>
  );
};

export default Countdown;