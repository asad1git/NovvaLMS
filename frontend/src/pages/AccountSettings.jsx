import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMe, updateProfile, changePassword } from "../api/account";

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
      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Profile</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Email</label>
            <input
              className="w-full border border-gray-200 rounded px-3 py-2 text-xs bg-gray-50 text-gray-500"
              value={email}
              disabled
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Name</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {profileError && <p className="text-xs text-badge-red-text">{profileError}</p>}
          {profileMsg && <p className="text-xs text-badge-green-text">{profileMsg}</p>}
          <button
            type="submit"
            disabled={savingProfile}
            className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
          >
            {savingProfile ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Current Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">New Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-[10px] text-gray-400 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {passwordError && <p className="text-xs text-badge-red-text">{passwordError}</p>}
          {passwordMsg && <p className="text-xs text-badge-green-text">{passwordMsg}</p>}
          <button
            type="submit"
            disabled={savingPassword}
            className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
          >
            {savingPassword ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
