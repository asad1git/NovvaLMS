import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { role } = await login(email, password);
      navigate(`/${role}`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-sm bg-white rounded-card border border-gray-200 px-8 py-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🎓</span>
          </div>
          <span className="text-xl font-medium text-gray-900">Novva LMS</span>
        </div>
        <p className="text-xs text-gray-500 text-center mb-7">
          AI-Powered Learning Management System
        </p>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-badge-red-bg rounded-md px-3 py-2 mb-4">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Institutional Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ucp.edu.pk"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-light"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full text-sm px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-light"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-md hover:bg-navy-light transition-colors disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <Link
          to="/forgot-password"
          className="block text-center text-xs text-navy-light mt-4 hover:underline"
        >
          Forgot password?
        </Link>

        <hr className="my-6 border-gray-200" />
        <p className="text-[11px] text-gray-400 text-center">
          University of Central Punjab — Faculty of IT &amp; CS
        </p>
      </div>
    </div>
  );
}
