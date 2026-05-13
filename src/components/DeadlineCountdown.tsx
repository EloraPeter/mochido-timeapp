'use client';

import { useEffect, useState } from 'react';
import { differenceInHours, differenceInMinutes, formatDistanceToNow } from 'date-fns';

interface DeadlineCountdownProps {
  dueDate: Date;
  title: string;
}

export default function DeadlineCountdown({ dueDate, title }: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const hoursLeft = differenceInHours(dueDate, now);
      const minutesLeft = differenceInMinutes(dueDate, now);
      
      if (hoursLeft < 2 && hoursLeft > 0) {
        setUrgent(true);
        setTimeLeft(`${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} left`);
      } else if (minutesLeft < 120 && minutesLeft > 0) {
        setUrgent(true);
        setTimeLeft(`${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} left`);
      } else if (dueDate < now) {
        setUrgent(true);
        setTimeLeft('OVERDUE!');
      } else {
        setTimeLeft(formatDistanceToNow(dueDate, { addSuffix: true }));
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [dueDate]);
  
  return (
    <div className={`rounded-xl p-4 ${urgent ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} text-white`}>
      <p className="text-sm uppercase tracking-wide font-semibold">Next Deadline</p>
      <p className="text-2xl font-bold mt-1">{title}</p>
      <p className="text-lg mt-2">{timeLeft}</p>
    </div>
  );
}