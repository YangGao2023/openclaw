import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../components/PageHeader";
import EmployeeList from "../components/EmployeeList";
import PayrollTab from "../components/PayrollTab";
import AttendanceTab from "../components/AttendanceTab";
import AttendanceCalendar from "../components/AttendanceCalendar";


export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Employee.list('-created_date', 200);
    setEmployees(data);
    setLoading(false);
  };

  useEffect(() => { 
    loadData();
    const unsubscribe = base44.entities.Employee.subscribe(loadData);
    return unsubscribe;
  }, []);

  return (
    <div>
      <PageHeader title="员工管理" subtitle="Employee Management" />
      <Tabs defaultValue="list">
        <TabsList className="sticky top-0 z-20 bg-background border-b-2 border-gray-200 rounded-none gap-2 p-0 h-auto">
          <TabsTrigger value="list" className="rounded-none border-b-4 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3 font-semibold text-gray-700 hover:text-blue-600">员工查询(List)</TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-none border-b-4 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent px-6 py-3 font-semibold text-gray-700 hover:text-green-600">📅 考勤日历(Calendar)</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-none border-b-4 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3 font-semibold text-gray-700 hover:text-blue-600">考勤管理(Attendance)</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-none border-b-4 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3 font-semibold text-gray-700 hover:text-blue-600">工资发放(Payroll)</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <EmployeeList employees={employees} loading={loading} onRefresh={loadData} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <AttendanceCalendar />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
         <AttendanceTab />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <PayrollTab employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  );
}