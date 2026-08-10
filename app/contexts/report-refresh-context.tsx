import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ReportRefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const ReportRefreshContext = createContext<ReportRefreshContextType | undefined>(undefined);

export function ReportRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <ReportRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </ReportRefreshContext.Provider>
  );
}

export function useReportRefresh() {
  const context = useContext(ReportRefreshContext);
  if (context === undefined) {
    throw new Error('useReportRefresh must be used within a ReportRefreshProvider');
  }
  return context;
}
