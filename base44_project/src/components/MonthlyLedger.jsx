import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DataTable from "./DataTable";

const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const years = Array.from({ length: 10 }, (_, i) => String(2020 + i));

export default function MonthlyLedger() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [expenses, setExpenses] = useState([]);
  const [cashFlows, setCashFlows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily"); // 'daily' or 'monthly'

  const loadData = async () => {
    setLoading(true);
    const [exp, cf, pay] = await Promise.all([
      base44.entities.Expense.list('-created_date', 1000),
      base44.entities.CashFlow.list('-created_date', 1000),
      base44.entities.PaymentRecord.list('-created_date', 1000)
    ]);
    setExpenses(exp);
    setCashFlows(cf);
    setPayments(pay);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsubExpense = base44.entities.Expense.subscribe(() => loadData());
    const unsubCashFlow = base44.entities.CashFlow.subscribe(() => loadData());
    const unsubPayment = base44.entities.PaymentRecord.subscribe(() => loadData());
    return () => {
      unsubExpense();
      unsubCashFlow();
      unsubPayment();
    };
  }, []);

  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  
  // 月份视图日干数据
  const getMonthsData = () => {
    const monthsData = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, "0");
      const monthDays = new Date(Number(year), m, 0).getDate();
      
      let mIncome = 0, mExpense = 0;

      for (let d = 1; d <= monthDays; d++) {
        const dateStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
        const dayExpenses = expenses.filter(e => e.expense_date === dateStr && !e.is_office);
        const dayPayments = payments.filter(p => p.payment_date === dateStr && p.type === "收款" && !p.is_office);
        
        const dayIncome = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);
        const dayExpense = dayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        
        mIncome += dayIncome;
        mExpense += dayExpense;
      }
      
      monthsData.push({ month: m, income: mIncome, expense: mExpense, profit: mIncome - mExpense });
    }
    return monthsData;
  };
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const ledgerData = days.map(day => {
    const dateStr = `${year}-${month}-${String(day).padStart(2, "0")}`;
    const dayExpenses = expenses.filter(e => e.expense_date === dateStr && !e.is_office);
    const dayPayments = payments.filter(p => p.payment_date === dateStr && p.type === "收款" && !p.is_office);
    
    const income = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const expense = dayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const profit = income - expense;

    return { day, date: dateStr, income, expense, profit };
  });

  let runningBalance = 0;
  const ledgerWithBalance = ledgerData.map(d => {
    runningBalance += d.profit;
    return { ...d, balance: runningBalance };
  });

  const totalIncome = ledgerData.reduce((s, d) => s + d.income, 0);
  const totalExpense = ledgerData.reduce((s, d) => s + d.expense, 0);

  const monthlyColumns = [
    { key: "month", label: "月", width: "50px" },
    { key: "income", label: "总收入", width: "100px", render: (v) => `$${v.toFixed(2)}` },
    { key: "expense", label: "总支出", width: "100px", render: (v) => `$${v.toFixed(2)}` },
    { key: "profit", label: "本期利润", width: "100px", render: (v) => (
      <span className={v >= 0 ? "text-success" : "text-destructive"}>${v.toFixed(2)}</span>
    )},
  ];
  
  const dailyColumns = [
    { key: "day", label: "日期", width: "50px" },
    { key: "income", label: "总收入", width: "100px", render: (v) => `$${v.toFixed(2)}` },
    { key: "expense", label: "总支出", width: "100px", render: (v) => `$${v.toFixed(2)}` },
    { key: "profit", label: "本期利润", width: "100px", render: (v) => (
      <span className={v >= 0 ? "text-success" : "text-destructive"}>${v.toFixed(2)}</span>
    )},
    { key: "balance", label: "余额", width: "120px", render: (v) => `$${v.toFixed(2)}` },
  ];

  const monthsData = getMonthsData();
  const monthlyTotalIncome = monthsData.reduce((s, m) => s + m.income, 0);
  const monthlyTotalExpense = monthsData.reduce((s, m) => s + m.expense, 0);

  return (
    <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
      <div className="sticky top-0 z-10 bg-background border-b pb-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-sm">年</span>
          {viewMode === "daily" && (
            <>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-sm">月</span>
            </>
          )}
          
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm">显示:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={viewMode === "daily"} onCheckedChange={() => setViewMode("daily")} />
              <span className="text-sm">每日</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={viewMode === "monthly"} onCheckedChange={() => setViewMode("monthly")} />
              <span className="text-sm">月份</span>
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <DataTable columns={viewMode === "daily" ? dailyColumns : monthlyColumns} data={viewMode === "daily" ? ledgerWithBalance : monthsData} headerColor="bg-amber-600" />
        </div>
      )}

      <div className="flex items-center gap-6 mt-4 text-sm">
        {viewMode === "daily" ? (
          <>
            <span>总收入: <strong className="text-success">${totalIncome.toFixed(2)}</strong></span>
            <span>总支出: <strong className="text-destructive">${totalExpense.toFixed(2)}</strong></span>
          </>
        ) : (
          <>
            <span>全年收入: <strong className="text-success">${monthlyTotalIncome.toFixed(2)}</strong></span>
            <span>全年支出: <strong className="text-destructive">${monthlyTotalExpense.toFixed(2)}</strong></span>
          </>
        )}
      </div>
    </div>
  );
}