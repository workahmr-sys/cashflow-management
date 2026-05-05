import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import TransactionEntry from "./pages/TransactionEntry";
import TransactionList from "./pages/TransactionList";
import AuditLog from "./pages/AuditLog";
import UserManagement from "./pages/UserManagement";
import AllocationManager from "./pages/AllocationManager";
import CategoryManager from "./pages/CategoryManager";
import DailySummary from "./pages/DailySummary";
import Settings from "./pages/Settings";
import Layout from "./components/Layout";

function AppInner() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-ring" />
        <p>Loading system...</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const pages = {
    dashboard: <Dashboard navigate={setCurrentPage} />,
    "new-transaction": <TransactionEntry navigate={setCurrentPage} />,
    transactions: <TransactionList navigate={setCurrentPage} />,
    "audit-log": <AuditLog />,
    users: <UserManagement />,
    allocations: <AllocationManager />,
    categories: <CategoryManager />,
    "daily-summary": <DailySummary />,
    settings: <Settings />,
  };

  return (
    <Layout currentPage={currentPage} navigate={setCurrentPage}>
      {pages[currentPage] || <Dashboard navigate={setCurrentPage} />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppInner />
      </NotificationProvider>
    </AuthProvider>
  );
}
