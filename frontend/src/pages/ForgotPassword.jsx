import { useState } from "react";
import { Link } from "react-router-dom";
import { IconSchool, IconAlertCircle } from "@tabler/icons-react";
import { forgotPassword } from "../api/auth";
import { Button } from "../components/ui";

const inputClass =
  "w-full text-sm px-3 py-2 border-[1.5px] border-line rounded-input transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-2 focus:ring-navy-light/25";

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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(31,56,100,0.06), transparent 45%), " +
          "radial-gradient(circle at 80% 80%, rgba(46,117,182,0.06), transparent 45%), " +
          "#F4F6F9",
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-card border border-line shadow-card-hover px-8 py-10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-9 h-9 bg-navy-light rounded-lg flex items-center justify-center shadow-md">
            <IconSchool size={18} className="text-white" />
          </div>
          <span className="text-xl font-medium text-text-main tracking-tight">Novva LMS</span>
        </div>
        <p className="text-xs text-text-muted text-center mb-7">Reset your password</p>

        {submitted ? (
          <div className="text-center space-y-4 animate-[fadeIn_0.15s_ease-in]">
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
              <div className="flex items-center gap-2 text-xs text-badge-red-text bg-badge-red-bg rounded-md px-3 py-2 animate-[fadeIn_0.15s_ease-in]">
                <IconAlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs text-text-muted mb-1">Institutional Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ucp.edu.pk"
                required
                className={inputClass}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full justify-center shadow-[0_2px_8px_rgba(31,56,100,0.25)] hover:shadow-[0_4px_16px_rgba(31,56,100,0.3)]"
            >
              {submitting ? "Sending…" : "Send Reset Link"}
            </Button>
            <Link to="/login" className="block text-center text-xs text-navy-light hover:underline">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
