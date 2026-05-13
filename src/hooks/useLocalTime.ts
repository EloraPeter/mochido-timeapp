// hooks/useLocalTime.ts

'use client';

import { useState, useEffect } from 'react';
import { toLocalDate, formatDueDateRelative, getHoursRemaining, isOverdue } from '@/lib/dateUtils';

export function useLocalTime(dueDate: string) {
  const [formatted, setFormatted] = useState('');
  const [shortFormatted, setShortFormatted] = useState('');
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [overdue, setOverdue] = useState(false);
  
  useEffect(() => {
    const update = () => {
      setFormatted(formatDueDateRelative(dueDate));
      // Format short date manually
      const localDue = toLocalDate(new Date(dueDate));
      setShortFormatted(localDue.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      setHoursRemaining(getHoursRemaining(dueDate));
      setOverdue(isOverdue(dueDate));
    };
    
    update();
    const interval = setInterval(update, 60000);
    
    return () => clearInterval(interval);
  }, [dueDate]);
  
  return { formatted, shortFormatted, hoursRemaining, overdue };
}