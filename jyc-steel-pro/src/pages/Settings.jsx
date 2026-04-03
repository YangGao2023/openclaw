import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TypeManagement from "../components/TypeManagement";
import HRSettings from "../components/HRSettings";
import InvoiceSettings from "../components/InvoiceSettings";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("types");

  return (
    <div>
      <PageHeader title="基础设置" subtitle="System Settings" />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="types">收支类型管理</TabsTrigger>
          <TabsTrigger value="hr">人力资源</TabsTrigger>
          <TabsTrigger value="invoice">发票设置</TabsTrigger>
          <TabsTrigger value="other">其他设置</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">📥 收入类型 Income Types</h3>
              <TypeManagement type="income" />
            </Card>

            <Card className="p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">📤 支出类型 Expense Types</h3>
              <TypeManagement type="expense" />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hr" className="space-y-6 mt-6">
          <Card className="p-6">
            <HRSettings />
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">发票与拿货单设置 Invoice / Picking Settings</h3>
            <InvoiceSettings />
          </Card>
        </TabsContent>

        <TabsContent value="other" className="space-y-6 mt-6">
          <div className="text-muted-foreground text-center py-8">其他设置功能开发中...</div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-muted text-sm text-muted-foreground">
        <p>系统版本: v1.0.0</p>
        <p className="mt-1">最后更新: 2026-03-29</p>
      </div>
    </div>
  );
}