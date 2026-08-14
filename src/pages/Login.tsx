import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { agent, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (agent) {
    const from = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!navigator.onLine) {
      setError(
        "You're offline. Connect to the internet at least once to sign in on this device."
      );
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, #faf8f5 0%, #f7f4ef 50%, #f3eee9 100%)",
      }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lg"
        style={{
          border: "1px solid #eadfe3",
          boxShadow:
            "0 15px 45px rgba(129, 11, 56, 0.10)",
        }}
      >
        {/* =====================================================
            LOGIN CARD TOP BRAND AREA
            ===================================================== */}
        <div
          className="px-6 pb-5 pt-7"
          style={{
            borderBottom: "1px solid #eee5e8",
          }}
        >
          <div className="text-center">
            {/* Rooch Logo */}
            <div className="mx-auto mb-5 flex justify-center">
              <img
                src="/rooch-login-logo.png"
                alt="ROOCH"
                className="h-auto w-auto object-contain"
                style={{
                  width: "145px",
                  maxWidth: "100%",
                }}
              />
            </div>

            {/* Application Title */}
            <h1
              className="text-xl font-semibold"
              style={{
                color: "#810B38",
                letterSpacing: "-0.01em",
              }}
            >
              Rooch Exhibition Invoicing
            </h1>

            <p
              className="mt-1 text-sm"
              style={{
                color: "#77736f",
              }}
            >
              Sign in to start capturing sales
            </p>
          </div>
        </div>

        {/* =====================================================
            LOGIN FORM
            ===================================================== */}
        <div className="px-6 pb-6 pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* =================================================
                EMAIL
                ================================================= */}
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{
                  color: "#3f393b",
                }}
              >
                Email
              </label>

              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-base outline-none transition-all"
                style={{
                  color: "#272124",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d9cfd3",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#810B38";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(129, 11, 56, 0.10)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d9cfd3";
                  e.currentTarget.style.boxShadow = "none";
                }}
                placeholder="agent@company.com"
              />
            </div>

            {/* =================================================
                PASSWORD
                ================================================= */}
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{
                  color: "#3f393b",
                }}
              >
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg py-2.5 pl-3 pr-11 text-base outline-none transition-all"
                  style={{
                    color: "#272124",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d9cfd3",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#810B38";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(129, 11, 56, 0.10)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d9cfd3";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="••••••••"
                />

                {/* Password Visibility Button */}
                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-lg transition-colors"
                  style={{
                    color: "#810B38",
                  }}
                >
                  {showPassword ? (
                    /* Eye Off */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                      <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.5c5.5 0 9.5 7.5 9.5 7.5a17.33 17.33 0 0 1-3.02 3.75" />
                      <path d="M6.61 6.61C3.91 8.45 2.5 12 2.5 12s3.5 7.5 9.5 7.5a9.84 9.84 0 0 0 4.09-.91" />
                    </svg>
                  ) : (
                    /* Eye */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 12s3.5-7.5 9.5-7.5 9.5 7.5 9.5 7.5-3.5 7.5-9.5 7.5S2.5 12 2.5 12Z" />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* =================================================
                ERROR MESSAGE
                ================================================= */}
            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{
                  color: "#9d3b3b",
                  backgroundColor: "#fff4f4",
                  border: "1px solid #f0d4d4",
                }}
              >
                {error}
              </div>
            )}

            {/* =================================================
                SIGN IN BUTTON
                ================================================= */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: "#810B38",
                boxShadow:
                  "0 5px 14px rgba(129, 11, 56, 0.18)",
                opacity: submitting ? 0.65 : 1,
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor =
                    "#69082E";
                  e.currentTarget.style.boxShadow =
                    "0 7px 18px rgba(129, 11, 56, 0.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor =
                    "#810B38";
                  e.currentTarget.style.boxShadow =
                    "0 5px 14px rgba(129, 11, 56, 0.18)";
                }
              }}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
