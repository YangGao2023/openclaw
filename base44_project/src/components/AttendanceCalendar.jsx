import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

export default function AttendanceCalendar() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const tz = 'America/New_York';
  const todayStr = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
  const [year, setYear] = useState(parseInt(todayStr.slice(0, 4)));
  const [month, setMonth] = useState(parseInt(todayStr.slice(5, 7)));
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    (async () => {
      const [atts, emps] = await Promise.all([
        base44.entities.Attendance.list('-attendance_date', 2000),
        base44.entities.Employee.list()
      ]);
      setRecords(atts);
      setEmployees(emps);
      setLoading(false);
    })();
  }, []);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y-1); } else setMonth(m => m-1); setSelectedDate(null); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y+1); } else setMonth(m => m+1); setSelectedDate(null); };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthRecords = records.filter(r => (r.attendance_date || "").startsWith(monthStr));

  // Build day attendance map
  const dayMap = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const dayRecs = monthRecords.filter(r => r.attendance_date?.startsWith(dateStr));
    dayMap[d] = dayRecs;
  }

  const selectedRecs = selectedDate ? (dayMap[selectedDate] || []) : [];
  const totalActiveEmployees = employees.filter(e => e.status === "在职").length;

  if (loading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-bold w-32 text-center">{year}年 {month}月</h2>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        <div className="ml-4 text-sm text-muted-foreground">
          月出勤人次: <strong>{monthRecords.length}</strong> | 在职员工: <strong>{totalActiveEmployees}</strong>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"></span>全员出勤</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block"></span>部分出勤</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block"></span>无记录</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Calendar */}
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-primary text-white">
            {["日","一","二","三","四","五","六"].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} className="h-14 border-b border-r border-gray-100" />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
              const recs = dayMap[d] || [];
              const isToday = dateStr === todayStr;
              const isSelected = selectedDate === d;
              const count = recs.length;
              let bgColor = "bg-white";
              if (count > 0 && count >= totalActiveEmployees) bgColor = "bg-green-100";
              else if (count > 0) bgColor = "bg-yellow-50";

              return (
                <div key={d} onClick={() => setSelectedDate(isSelected ? null : d)}
                  className={`h-14 border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-blue-50 transition ${bgColor} ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
                >
                  <div className={`text-xs font-medium ${isToday ? "bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center" : ""}`}>{d}</div>
                  {count > 0 && (
                    <div className={`text-xs mt-0.5 font-medium ${count >= totalActiveEmployees ? "text-green-700" : "text-yellow-700"}`}>
                      {count}人
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="border rounded-lg">
          {selectedDate ? (
            <div>
              <div className="bg-primary text-white px-4 py-2.5 font-semibold text-sm">
                {monthStr}-{String(selectedDate).padStart(2,'0')} 出勤详情 ({selectedRecs.length}人)
              </div>
              {selectedRecs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">当日无出勤记录</div>
              ) : (
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-blue-50">
                      <th className="px-3 py-2 text-left">工号</th>
                      <th className="px-3 py-2 text-left">姓名</th>
                      <th className="px-3 py-2 text-center">工时</th>
                      <th className="px-3 py-2 text-center">请假</th>
                      <th className="px-3 py-2 text-center">加班</th>
                      <th className="px-3 py-2 text-center">饭补</th>
                    </tr></thead>
                    <tbody>
                      {selectedRecs.map((r, i) => (
                        <tr key={r.id} className={i%2===0?"":"bg-gray-50"}>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{r.employee_id}</td>
                          <td className="px-3 py-2 font-medium">{r.employee_name}</td>
                          <td className="px-3 py-2 text-center">{Math.max(0, 10 - (r.leave_hours||0) + (r.overtime_hours||0))}H</td>
                          <td className="px-3 py-2 text-center text-amber-600">{r.leave_hours > 0 ? `${r.leave_hours}H` : "-"}</td>
                          <td className="px-3 py-2 text-center text-blue-600">{r.overtime_hours > 0 ? `${r.overtime_hours}H` : "-"}</td>
                          <td className="px-3 py-2 text-center">{r.meal_subsidy ? "✓" : "✗"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Absent employees */}
              {(() => {
                const presentIds = new Set(selectedRecs.map(r => r.employee_id));
                const absent = employees.filter(e => e.status === "在职" && !presentIds.has(e.employee_id));
                if (absent.length === 0) return null;
                return (
                  <div className="border-t p-3">
                    <div className="text-xs font-semibold text-red-600 mb-2">缺勤员工 ({absent.length}人):</div>
                    <div className="flex flex-wrap gap-1">
                      {absent.map(e => (
                        <span key={e.id} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs border border-red-200">{e.name}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-20">
              点击日历中的日期查看出勤详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}