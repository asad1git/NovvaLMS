import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMe, updateProfile, changePassword } from "../api/account";
import { Card, Button } from "../components/ui";

const inputClass =
  "w-full border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AccountSettings() {
  const { auth, updateName } = useAuth();

  const [email, setEmail] = useState("");
  const [name, setName] = useState(auth?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    getMe()
      .then((me) => {
        setEmail(me.email);
        setName(me.name);
      })
      .catch(() => {});
  }, []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError("");
    setProfileMsg("");
    setSavingProfile(true);
    try {
      const updated = await updateProfile(name.trim());
      updateName(updated.name);
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Card>
        <h2 className="text-sm font-medium text-text-main mb-3">Profile</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Email</label>
            <input className={`${inputClass} bg-bg-page text-text-muted`} value={email} disabled />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {profileError && <p className="text-xs text-badge-red-text animate-[fadeIn_0.15s_ease-in]">{profileError}</p>}
          {profileMsg && <p className="text-xs text-badge-green-text animate-[fadeIn_0.15s_ease-in]">{profileMsg}</p>}
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save Profile"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-text-main mb-3">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Current Password</label>
            <input
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">New Password</label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-[10px] text-text-muted mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Confirm New Password</label>
            <input
              type="password"
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {passwordError && <p className="text-xs text-badge-red-text animate-[fadeIn_0.15s_ease-in]">{passwordError}</p>}
          {passwordMsg && <p className="text-xs text-badge-green-text animate-[fadeIn_0.15s_ease-in]">{passwordMsg}</p>}
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
