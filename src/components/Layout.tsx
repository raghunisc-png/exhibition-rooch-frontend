import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SyncStatusBadge from "./SyncStatusBadge";

// ============================================================
// NAV ITEM CLASS
// ============================================================

const navItemClass = ({
  isActive,
}: {
  isActive: boolean;
}) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition ${
    isActive
      ? "text-[#b08a45]"
      : "text-slate-500 hover:text-slate-900"
  }`;

// ============================================================
// LAYOUT
// ============================================================

export default function Layout() {
  const {
    agent,
    logout,
  } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7f5f1] text-[#181715]">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-[#292929] bg-[#63082b]">

        <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">

          {/* ==================================================
              ROOCH BRAND
          ================================================== */}

          <div className="flex flex-col">

            <div className="font-serif text-[20px] font-bold tracking-[0.22em] text-white">
              ROOCH
            </div>

            <div className="mt-0.5 text-[7px] font-medium tracking-[0.22em] text-[#c9a35a]">
              THE RADIANT YOU
            </div>

          </div>


          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <div className="flex items-center gap-3 sm:gap-5">

            {/* ==================================================
                AGENT INFORMATION
            ================================================== */}

            <div className="hidden text-right sm:block">

              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                {agent?.booth_name || "Exhibition Booth"}
              </p>

              <p className="mt-1 text-[9px] text-[#9b9b9b]">
                {agent?.full_name || "Agent"}
              </p>

            </div>


            {/* ==================================================
                ONLINE / OFFLINE STATUS
            ================================================== */}

            <div className="flex items-center">
              <SyncStatusBadge />
            </div>


            {/* ==================================================
                LOGOUT
            ================================================== */}

            <button
              type="button"
              onClick={logout}
              className="
                rounded-md
                border
                border-[#3b3b3b]
                bg-transparent
                px-3
                py-2
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.08em]
                text-[#cfcfcf]
                transition
                hover:border-[#c9a35a]
                hover:bg-white
                hover:text-[#111111]
              "
            >
              Log out
            </button>

          </div>

        </div>

      </header>


      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 sm:pb-8 lg:px-10 lg:pt-8">

        <Outlet />

      </main>


      {/* ======================================================
          DESKTOP NAVIGATION
      ====================================================== */}

      <div className="hidden border-t border-[#e4dfd6] bg-white sm:block">

        <div className="mx-auto flex w-full max-w-[1440px] gap-10 px-6 sm:px-8 lg:px-12">

          {/* ==================================================
              NEW INVOICE
          ================================================== */}

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `
              relative
              flex
              h-12
              items-center
              text-[10px]
              font-bold
              uppercase
              tracking-[0.12em]
              transition
              ${
                isActive
                  ? "text-[#a47735]"
                  : "text-[#77736c] hover:text-[#181715]"
              }
              `
            }
          >
            {({ isActive }) => (
              <>
                New Invoice

                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#c9a35a]" />
                )}
              </>
            )}
          </NavLink>


          {/* ==================================================
              INVOICES
          ================================================== */}

          <NavLink
            to="/invoices"
            className={({ isActive }) =>
              `
              relative
              flex
              h-12
              items-center
              text-[10px]
              font-bold
              uppercase
              tracking-[0.12em]
              transition
              ${
                isActive
                  ? "text-[#a47735]"
                  : "text-[#77736c] hover:text-[#181715]"
              }
              `
            }
          >
            {({ isActive }) => (
              <>
                Invoices

                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#c9a35a]" />
                )}
              </>
            )}
          </NavLink>

        </div>

      </div>


      {/* ======================================================
          MOBILE NAVIGATION
      ====================================================== */}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#ddd8cf] bg-white/95 backdrop-blur sm:hidden">

        <div className="mx-auto flex max-w-md">

          {/* ==================================================
              NEW INVOICE
          ================================================== */}

          <NavLink
            to="/"
            end
            className={navItemClass}
          >

            <span className="text-[22px] leading-none">
              ＋
            </span>

            <span>
              New Invoice
            </span>

          </NavLink>


          {/* ==================================================
              INVOICES
          ================================================== */}

          <NavLink
            to="/invoices"
            className={navItemClass}
          >

            <span className="text-[22px] leading-none">
              ≡
            </span>

            <span>
              Invoices
            </span>

          </NavLink>

        </div>

      </nav>

    </div>
  );
}
