import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SyncStatusBadge from "./SyncStatusBadge";

const navItemClass = ({
  isActive,
}: {
  isActive: boolean;
}) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition ${
    isActive
      ? "text-blue-600"
      : "text-slate-500 hover:text-slate-900"
  }`;

export default function Layout() {
  const { agent, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">
              {agent?.booth_name ||
                "Exhibition Booth"}
            </p>

            <p className="truncate text-xs text-slate-500">
              {agent?.full_name}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SyncStatusBadge />

            <button
              type="button"
              onClick={logout}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pb-8 lg:pt-7">
        <Outlet />
      </main>

      {/* Mobile navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md">
          <NavLink
            to="/"
            end
            className={navItemClass}
          >
            <span className="text-xl leading-none">
              ＋
            </span>
            New Invoice
          </NavLink>

          <NavLink
            to="/invoices"
            className={navItemClass}
          >
            <span className="text-xl leading-none">
              ≡
            </span>
            Invoices
          </NavLink>
        </div>
      </nav>

      {/* Desktop navigation */}
      <div className="hidden border-t border-slate-200 bg-white sm:block">
        <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-3 sm:px-6">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-semibold transition ${
                isActive
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            New Invoice
          </NavLink>

          <NavLink
            to="/invoices"
            className={({ isActive }) =>
              `text-sm font-semibold transition ${
                isActive
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            Invoices
          </NavLink>
        </div>
      </div>
    </div>
  );
}