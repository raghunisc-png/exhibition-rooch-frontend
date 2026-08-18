import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import NewInvoice from "./pages/NewInvoice";
import InvoiceList from "./pages/InvoiceList";
import InvoiceDetail from "./pages/InvoiceDetail";
import { startAutoSync } from "./sync/syncManager";

export default function App() {
  useEffect(() => {
    startAutoSync();
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<NewInvoice />}
        />

        <Route
          path="invoices"
          element={<InvoiceList />}
        />

        <Route
          path="invoices/:id"
          element={<InvoiceDetail />}
        />
      </Route>
    </Routes>
  );
}
