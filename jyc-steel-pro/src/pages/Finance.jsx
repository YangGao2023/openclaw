import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../components/PageHeader";
import ExpenseTab from "../components/ExpenseTab";
import CashFlowTab from "../components/CashFlowTab";
import IncomeTab from "../components/IncomeTab";
import MonthlyLedger from "../components/MonthlyLedger";
import TabThemeWrapper from "../components/TabThemeWrapper";
import FinanceChart from "../components/FinanceChart";
import ReceivablesTab from "../components/ReceivablesTab";

const TAB_STYLES = {
  income: "rounded-none border-b-4 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-700 px-6 py-3 font-semibold hover:text-green-600",
  expense: "rounded-none border-b-4 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-700 px-6 py-3 font-semibold hover:text-red-600",
  cash: "rounded-none border-b-4 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-700 px-6 py-3 font-semibold hover:text-green-600",
  ledger: "rounded-none border-b-4 border-transparent data-[state=active]:border-amber-600 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 px-6 py-3 font-semibold hover:text-amber-600",
  chart: "rounded-none border-b-4 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-700 px-6 py-3 font-semibold hover:text-blue-600",
  receivables: "rounded-none border-b-4 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-700 px-6 py-3 font-semibold hover:text-red-600"
};

export default function Finance() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  
  return (
    <div>
      <PageHeader title={`收支管理 - ${month}月${date}号`} subtitle="Finance Management" />
      <Tabs defaultValue="income">
        <TabsList className="sticky top-0 z-20 bg-background border-b-2 border-gray-200 rounded-none gap-2 p-0 h-auto flex-wrap">
          <TabsTrigger value="income" className={TAB_STYLES.income}>订单收入(Income)</TabsTrigger>
          <TabsTrigger value="expense" className={TAB_STYLES.expense}>支出清单(Expenses)</TabsTrigger>
          <TabsTrigger value="cash" className={TAB_STYLES.cash}>现金管理(Cash)</TabsTrigger>
          <TabsTrigger value="ledger" className={TAB_STYLES.ledger}>年月账单(Ledger)</TabsTrigger>
          <TabsTrigger value="chart" className={TAB_STYLES.chart}>📊 收支图表(Charts)</TabsTrigger>
          <TabsTrigger value="receivables" className={TAB_STYLES.receivables}>🔴 应收款(Receivables)</TabsTrigger>
        </TabsList>
        <TabsContent value="income" className="mt-4"><IncomeTab /></TabsContent>
        <TabsContent value="expense" className="mt-4"><TabThemeWrapper tabValue="expense"><ExpenseTab /></TabThemeWrapper></TabsContent>
        <TabsContent value="cash" className="mt-4"><TabThemeWrapper tabValue="cash"><CashFlowTab /></TabThemeWrapper></TabsContent>
        <TabsContent value="ledger" className="mt-4"><TabThemeWrapper tabValue="ledger"><MonthlyLedger /></TabThemeWrapper></TabsContent>
        <TabsContent value="chart" className="mt-4"><FinanceChart /></TabsContent>
        <TabsContent value="receivables" className="mt-4"><ReceivablesTab /></TabsContent>
      </Tabs>
    </div>
  );
}