import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DataTable({ columns, data, onRowClick, selectedId, selectedIds, emptyText = "暂无数据", headerColor = "bg-primary" }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card flex flex-col">
      {/* Frozen Header */}
      <div className="sticky top-0 z-10">
        <Table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow className={`${headerColor} hover:${headerColor}`}>
              {columns.map((col) => (
                <TableHead 
                  key={col.key} 
                  className="text-white font-semibold text-xs whitespace-nowrap py-2 px-2 text-center"
                  style={{
                    width: col.width || '80px',
                    minWidth: col.width || '80px',
                    flex: col.width ? '0 0 auto' : '1'
                  }}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
      </div>
      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '480px' }}>
        <Table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-16 text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => {
                const isHighlighted = selectedId === row.id || (selectedIds && selectedIds.includes(row.id));
                return (
                  <TableRow 
                    key={row.id || idx} 
                    className={`cursor-pointer transition-colors text-xs ${isHighlighted ? "bg-red-100 hover:bg-red-200" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <TableCell 
                        key={col.key} 
                        className="py-2 px-2 whitespace-nowrap text-xs text-center border-b"
                        style={{
                          width: col.width || '80px',
                          minWidth: col.width || '80px',
                          flex: col.width ? '0 0 auto' : '1'
                        }}
                      >
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}