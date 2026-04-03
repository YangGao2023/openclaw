import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, X } from 'lucide-react';

export default function DateRangeSelector({ onDateChange }) {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    onDateChange({ startDate, endDate });
  }, [startDate, endDate]);

  const handleReset = () => {
    setStartDate(today);
    setEndDate(today);
    onDateChange({ startDate: today, endDate: today });
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-border">
      <Calendar className="h-4 w-4 text-slate-500" />
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-8 text-sm w-40"
        />
        <span className="text-sm text-slate-500">至</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-8 text-sm w-40"
        />
      </div>
      <Button size="sm" variant="outline" onClick={handleReset} className="h-8 gap-1">
        <X className="h-3 w-3" /> 重置
      </Button>
    </div>
  );
}