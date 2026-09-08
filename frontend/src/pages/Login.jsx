import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconSchool,
  IconBrain,
  IconChartLine,
  IconRobot,
  IconShieldHalf,
  IconCertificate,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconLogin2,
} from "@tabler/icons-react";

const inputClass =
  "w-full pl-10 pr-10 py-[11px] text-sm border-[1.5px] border-line rounded-input bg-[#fafbfc] text-text-main " +
  "placeholder:text-[#bdc5cf] outline-none transition-[border-color,box-shadow,background] duration-150 " +
  "focus:border-navy-light focus:bg-white focus:ring-[3px] focus:ring-navy-light/[0.13]";

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
      setError(err.response?.data?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-bg-page">
      {/* Left branding panel */}
      <div className="hidden md:flex w-[44%] bg-navy flex-col justify-between px-11 pt-11 pb-9 relative overflow-hidden flex-shrink-0">
        <div
          className="absolute rounded-full border border-white/[0.055] pointer-events-none"
          style={{ width: 480, height: 480, top: -160, right: -140 }}
        />
        <div
          className="absolute rounded-full border border-white/[0.055] pointer-events-none"
          style={{ width: 320, height: 320, bottom: -100, left: -80 }}
        />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 bg-navy-light rounded-xl flex items-center justify-center flex-shrink-0">
            <IconSchool size={24} stroke={2} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">Novva LMS</div>
            <div className="text-[11px] text-white/45 uppercase tracking-wide mt-0.5">
              University of Central Punjab
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center relative z-10 py-12">
          <h2 className="text-[34px] font-bold text-white leading-tight mb-3.5">
            Learn Smarter,
            <br />
            Not Harder.
          </h2>
          <p className="text-sm text-white/[0.58] leading-[1.7] mb-10 max-w-[340px]">
            An AI-powered learning platform that personalises your experience with smart quizzes,
            instant feedback, and deep analytics.
          </p>

          <div className="flex flex-col gap-5">
            <Feature icon={IconBrain} title="RAG-Based AI Chatbot" desc="Ask questions sourced from your actual course materials" />
            <Feature icon={IconChartLine} title="Performance Analytics" desc="Visual charts, weak topic detection, and study tips" />
            <Feature icon={IconRobot} title="AI-Generated Quizzes" desc="Auto-graded MCQ & subjective assessments from lectures" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex gap-2 mb-3.5">
            <RolePill icon={IconShieldHalf} label="Admin" />
            <RolePill icon={IconSchool} label="Teacher" />
            <RolePill icon={IconCertificate} label="Student" />
          </div>
          <div className="text-[11px] text-white/[0.28]">
            © 2026 Novva LMS · BS Software Engineering Final Year Project
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-12 overflow-y-auto">
        <div className="w-full max-w-[380px]">
          <div className="mb-[30px]">
            <h1 className="text-[26px] font-bold text-text-main mb-1.5">Welcome back 👋</h1>
            <p className="text-sm text-text-muted">Sign in to your Novva LMS account to continue</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-badge-red-bg border border-[#f5c2c2] rounded-input px-3.5 py-2.5 text-[13px] text-badge-red-text mb-[18px] animate-[fadeIn_0.15s_ease-in]">
              <IconAlertCircle size={17} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-[18px]">
            <div>
              <label className="block text-[13px] font-medium text-text-main mb-[7px]">Email Address</label>
              <div className="relative">
                <IconMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0aec0] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ucp.edu.pk"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-main mb-[7px]">Password</label>
              <div className="relative">
                <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0aec0] pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a0aec0] p-1 rounded transition-colors duration-150 hover:text-navy"
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-2">
              <Link to="/forgot-password" className="text-xs font-medium text-navy-light hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-navy text-white rounded-input text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(31,56,100,0.25)] transition-[background,box-shadow,transform] duration-150 hover:bg-navy-dark hover:shadow-[0_4px_16px_rgba(31,56,100,0.3)] active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <IconLogin2 size={17} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <hr className="my-6 border-line" />
          <p className="text-[11px] text-[#9aa5b1] text-center">
            University of Central Punjab — Faculty of IT &amp; CS
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-[38px] h-[38px] flex-shrink-0 bg-navy-light/[0.22] rounded-[9px] flex items-center justify-center">
        <Icon size={18} stroke={1.9} className="text-[#7ab8e0]" />
      </div>
      <div>
        <strong className="block text-[13px] font-semibold text-white mb-0.5">{title}</strong>
        <span className="text-xs text-white/[0.48] leading-[1.5]">{desc}</span>
      </div>
    </div>
  );
}

function RolePill({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/55 bg-white/[0.07] border border-white/[0.11] rounded-full px-3.5 py-1">
      <Icon size={13} stroke={2} />
      {label}
    </span>
  );
}
