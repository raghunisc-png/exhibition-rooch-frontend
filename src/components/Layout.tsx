import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SyncStatusBadge from "./SyncStatusBadge";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium ${
    isActive ? "text-brand-600" : "text-gray-500"
  }`;

export default function Layout() {
  const { agent, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{agent?.booth_name || "Exhibition Booth"}</p>
            <p className="text-xs text-gray-500">{agent?.full_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <button
              onClick={logout}
              className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 sm:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-white sm:hidden">
        <NavLink to="/" end className={navItemClass}>
          <span className="text-lg">+</span>
          New Invoice
        </NavLink>
        <NavLink to="/invoices" className={navItemClass}>
          <span className="text-lg">≡</span>
          Invoices
        </NavLink>
      </nav>

      <div className="hidden border-t bg-white sm:block">
        <div className="mx-auto flex max-w-3xl gap-6 px-4 py-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-medium ${isActive ? "text-brand-600" : "text-gray-500 hover:text-gray-800"}`
            }
          >
            New Invoice
          </NavLink>
          <NavLink
            to="/invoices"
            className={({ isActive }) =>
              `text-sm font-medium ${isActive ? "text-brand-600" : "text-gray-500 hover:text-gray-800"}`
            }
          >
            Invoices
          </NavLink>
        </div>
      </div>
    </div>
  );
}
