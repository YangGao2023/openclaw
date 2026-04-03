export default function TabThemeWrapper({ tabValue, children }) {
  const themeClass = {
    income: "bg-green-50 dark:bg-green-950",
    expense: "bg-red-50 dark:bg-red-950",
    cash: "bg-green-50 dark:bg-green-950",
    ledger: "bg-amber-50 dark:bg-amber-950",
  }[tabValue] || "";

  return <div className={`${themeClass} rounded-lg p-4`}>{children}</div>;
}