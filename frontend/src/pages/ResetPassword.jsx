import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-sm bg-white rounded-card border border-gray-200 px-8 py-10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🎓</span>
          </div>
          <span className="text-xl font-medium text-gray-900">Novva LMS</span>
        </div>
        <p className="text-xs text-gray-500 text-center mb-7">Choose a new password</p>

        {done ? (
          <div className="text-center space-y-4">
            <div className="text-xs text-badge-green-text bg-badge-green-bg rounded-md px-3 py-3">
              Password reset. Redirecting you to login…
            </div>
            <Link to="/login" className="text-xs text-navy-light hover:underline">
              Go to login now
            </Link>
          </div>
        ) : !token ? (
          <div className="text-center space-y-4">
            <div className="flex items-center gap-2 text-xs text-red-700 bg-badge-red-bg rounded-md px-3 py-2">
              <span>⚠</span>
              <span>This link is missing its reset token. Request a new one.</span>
            </div>
            <Link to="/forgot-password" className="text-xs text-navy-light hover:underline">
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-badge-red-bg rounded-md px-3 py-2">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-light"
              />
              <p className="text-[10px] text-gray-400 mt-1">At least 8 characters.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-light"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-md hover:bg-navy-light transition-colors disabled:opacity-60"
            >
              {submitting ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
