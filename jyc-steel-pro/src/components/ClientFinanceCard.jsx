import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";

export default function ClientFinanceCard({ clientId, client }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    amountPaid: 0,
    amountDue: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadStats();
    }
  }, [clientId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const orders = await base44.entities.Order.filter(
        { client_id: clientId },
        '-created_date',
        500
      );

      let totalAmount = 0;
      let amountPaid = 0;
      let amountDue = 0;
      let completedOrders = 0;

      orders.forEach(order => {
        const orderTotal = order.total_after_tax || order.total_price || 0;
        totalAmount += orderTotal;
        amountPaid += order.amount_paid || 0;
        amountDue += order.balance || 0;
        if (order.status === "结清") completedOrders++;
      });

      setStats({
        totalOrders: orders.length,
        totalAmount,
        amountPaid,
        amountDue,
        completedOrders
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const paymentRate = stats.totalAmount > 0 ? Math.round((stats.amountPaid / stats.totalAmount) * 100) : 0;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">客户财务概览</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 订单总数 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">订单总数</p>
              <p className="text-2xl font-bold text-blue-700">{stats.totalOrders}</p>
              <p className="text-xs text-blue-600 mt-1">{stats.completedOrders} 已完成</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-300" />
          </div>
        </div>

        {/* 订单总额 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">订单总额</p>
              <p className="text-2xl font-bold text-purple-700">${stats.totalAmount.toFixed(0)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-300" />
          </div>
        </div>

        {/* 已收款 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">已收款</p>
              <p className="text-2xl font-bold text-green-700">${stats.amountPaid.toFixed(0)}</p>
              <p className="text-xs text-green-600 mt-1">{paymentRate}% 已付</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-300" />
          </div>
        </div>

        {/* 应收款 */}
        <div className={`border rounded-lg p-4 ${stats.amountDue > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">应收款</p>
              <p className={`text-2xl font-bold ${stats.amountDue > 0 ? "text-red-700" : "text-gray-700"}`}>
                ${stats.amountDue.toFixed(0)}
              </p>
              {stats.amountDue > 0 && (
                <p className="text-xs text-red-600 mt-1">待收</p>
              )}
            </div>
            <AlertCircle className={`h-8 w-8 ${stats.amountDue > 0 ? "text-red-300" : "text-gray-300"}`} />
          </div>
        </div>

        {/* 收款率 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">收款进度</p>
              <p className="text-2xl font-bold text-amber-700">{paymentRate}%</p>
              <div className="w-full bg-amber-200 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-amber-600 h-1.5 rounded-full transition-all" 
                  style={{ width: `${paymentRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}