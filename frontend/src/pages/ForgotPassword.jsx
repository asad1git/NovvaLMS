import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      // Always show the same confirmation regardless of whether the email
      // was found — the backend never reveals account existence either.
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
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
        <p className="text-xs text-gray-500 text-center mb-7">Reset your password</p>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="text-xs text-badge-green-text bg-badge-green-bg rounded-md px-3 py-3">
              If an account exists for <b>{email}</b>, a password reset link has been sent.
              Check your inbox (and spam folder).
            </div>
            <Link to="/login" className="text-xs text-navy-light hover:underline">
              Back to login
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
              <label className="block text-xs text-gray-500 mb-1">Institutional Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ucp.edu.pk"
                required
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-light"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-navy text-white text-sm font-medium py-2.5 rounded-md hover:bg-navy-light transition-colors disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send Reset Link"}
            </button>
            <Link to="/login" className="block text-center text-xs text-navy-light hover:underline">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
