// /frontend/src/pages/Settings.jsx
import React, { useState } from "react";
import {
  User2,
  Lock,
  Bell,
  Database,
  Palette,
  ShieldCheck,
  CalendarClock,
  Users,
  Code,
  ClipboardList,
  Trash2,
  ChevronRight
} from "lucide-react";

const sidebarOptions = [
  { key: "profile", label: "Profile & Login", icon: <User2 size={18} /> },
  { key: "security", label: "Security", icon: <Lock size={18} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
  { key: "calendar", label: "Calendar Integration", icon: <CalendarClock size={18} /> },
  { key: "branding", label: "Branding & Theme", icon: <Palette size={18} /> },
  { key: "users", label: "User Management", icon: <Users size={18} /> },
  { key: "audit", label: "Audit Logs", icon: <ClipboardList size={18} /> },
  { key: "api", label: "API Access", icon: <Code size={18} /> },
  { key: "data", label: "Data Export / Import", icon: <Database size={18} /> },
  { key: "compliance", label: "Compliance & Privacy", icon: <ShieldCheck size={18} /> },
  { key: "danger", label: "Danger Zone", icon: <Trash2 size={18} /> },
];

const Settings = () => {
  const [section, setSection] = useState("profile");
  // Demo state for editable profile data
  const [profile, setProfile] = useState({
    name: "Scott Fluegel",
    email: "scott@example.com",
    phone: "(555) 555-1234",
    password: "••••••••",
  });
  const [theme, setTheme] = useState("light");

  return (
    <div className="flex flex-col md:flex-row max-w-6xl mx-auto bg-[#f6f7fb] min-h-[80vh] rounded-2xl shadow-lg border">
      {/* Sidebar */}
      <div className="min-w-[230px] border-r bg-white rounded-l-2xl flex flex-col py-6 px-3">
        <div className="text-2xl font-extrabold text-[#172A3A] px-2 pb-6 tracking-tight">
          Settings
        </div>
        <ul className="flex-1">
          {sidebarOptions.map(opt => (
            <li key={opt.key}>
              <button
                className={`flex items-center w-full gap-2 px-4 py-3 rounded-lg mb-1 font-medium text-left transition ${
                  section === opt.key
                    ? "bg-[#FFB800]/20 text-[#172A3A] font-bold"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => setSection(opt.key)}
              >
                {opt.icon}
                <span>{opt.label}</span>
                {section === opt.key && (
                  <ChevronRight size={18} className="ml-auto text-[#FFB800]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 bg-[#f6f7fb] rounded-r-2xl min-h-[700px]">
        {/* Profile Section */}
        {section === "profile" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Profile & Login</div>
            <div className="mb-2 text-gray-700">Update your basic profile info.</div>
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">Name</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  type="email"
                />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">Phone</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg mt-6 transition">
              Save Changes
            </button>
          </div>
        )}

        {/* Security */}
        {section === "security" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Security</div>
            <div className="mb-2 text-gray-700">
              Update your password and set up Two-Factor Authentication (2FA).
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">Current Password</label>
                <input className="w-full px-3 py-2 border rounded-lg" type="password" placeholder="••••••••" />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">New Password</label>
                <input className="w-full px-3 py-2 border rounded-lg" type="password" />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">Two-Factor Authentication</label>
                <div className="flex gap-4 mt-2">
                  <button className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded transition">
                    Enable 2FA
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded transition">
                    Manage Devices
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {section === "notifications" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Notifications</div>
            <div className="mb-2 text-gray-700">
              Choose which notifications you want to receive.
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="sms" className="accent-[#FFB800]" />
                <label htmlFor="sms" className="font-semibold">SMS Reminders</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="email" className="accent-[#FFB800]" />
                <label htmlFor="email" className="font-semibold">Email Notifications</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="inapp" className="accent-[#FFB800]" />
                <label htmlFor="inapp" className="font-semibold">In-App Alerts</label>
              </div>
            </div>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg mt-6 transition">
              Save Notification Settings
            </button>
          </div>
        )}

        {/* Calendar Integration */}
        {section === "calendar" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Calendar Integration</div>
            <div className="mb-2 text-gray-700">
              Connect your calendar to sync appointments, reminders, and tasks.
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded shadow transition">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Google_Calendar_icon_%282020%29.svg" className="w-6 h-6" alt="Google Calendar" />
                Google Calendar
              </button>
              <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded shadow transition">
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Microsoft_Office_Outlook_%282018–present%29.svg" className="w-6 h-6" alt="Outlook Calendar" />
                Outlook
              </button>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              * After connecting, all scheduled reviews and tasks will sync automatically with your calendar.<br />
              * Coming soon: iCal/Apple Calendar support.
            </div>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg mt-2">
              Manage Calendar Connections
            </button>
          </div>
        )}

        {/* Branding & Theme */}
        {section === "branding" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Branding & Theme</div>
            <div className="mb-4 text-gray-700">
              Customize the look and feel of your account.
            </div>
            <div className="flex items-center gap-6 mb-6">
              <div>
                <div className="mb-2 font-semibold text-[#172A3A]">Theme</div>
                <select
                  className="px-4 py-2 border rounded-lg"
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              <div>
                <div className="mb-2 font-semibold text-[#172A3A]">Logo</div>
                <input type="file" className="block w-full text-sm" />
              </div>
            </div>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg">
              Save Branding
            </button>
          </div>
        )}

        {/* User Management */}
        {section === "users" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-2xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">User Management</div>
            <div className="mb-4 text-gray-700">
              Add or remove users, set permissions and assign roles (for agencies or FMOs).
            </div>
            <table className="w-full text-left mb-6">
              <thead>
                <tr className="text-[#172A3A]">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  <td className="py-2">Scott Fluegel</td>
                  <td className="py-2">scott@example.com</td>
                  <td className="py-2">Admin</td>
                  <td className="py-2"><button className="text-blue-600 hover:underline">Edit</button></td>
                </tr>
                <tr>
                  <td className="py-2">Spencer Fluegel</td>
                  <td className="py-2">spencer@example.com</td>
                  <td className="py-2">Agent</td>
                  <td className="py-2"><button className="text-red-600 hover:underline">Remove</button></td>
                </tr>
              </tbody>
            </table>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg">
              Add New User
            </button>
          </div>
        )}

        {/* Audit Logs */}
        {section === "audit" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-2xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Audit Logs</div>
            <div className="mb-4 text-gray-700">
              See every key action performed in your account for compliance & transparency.
            </div>
            <ul className="divide-y">
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-07</span>{" "}
                <span className="text-gray-700">— Logged in</span>
              </li>
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-07</span>{" "}
                <span className="text-gray-700">— Updated client: Jane Doe</span>
              </li>
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-06</span>{" "}
                <span className="text-gray-700">— Exported client data</span>
              </li>
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-05</span>{" "}
                <span className="text-gray-700">— Changed password</span>
              </li>
            </ul>
          </div>
        )}

        {/* API Access */}
        {section === "api" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">API Access</div>
            <div className="mb-2 text-gray-700">
              Generate API tokens for third-party integrations.
            </div>
            <div className="mb-4">
              <input
                className="w-full px-3 py-2 border rounded-lg mb-2"
                value="pk_test_abc1234567890"
                readOnly
              />
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded">
                Regenerate Token
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Use API tokens to connect CRMs, dialers, or lead sources.
            </div>
          </div>
        )}

        {/* Data Export / Import */}
        {section === "data" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Data Export / Import</div>
            <div className="mb-2 text-gray-700">Export or import your client and policy data.</div>
            <div className="flex gap-4 mb-4">
              <button className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded shadow transition">
                Export Data
              </button>
              <button className="bg-green-100 hover:bg-green-200 text-green-800 font-bold px-4 py-2 rounded shadow transition">
                Import Data
              </button>
            </div>
            <div className="text-xs text-gray-500">
              All exports are encrypted and can only be imported by an admin.
            </div>
          </div>
        )}

        {/* Compliance & Privacy */}
        {section === "compliance" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">Compliance & Privacy</div>
            <div className="mb-2 text-gray-700">
              Review your compliance settings and privacy controls.
            </div>
            <ul className="space-y-2">
              <li>HIPAA Compliance: <span className="font-bold text-green-700">Enabled</span></li>
              <li>Data Encryption: <span className="font-bold text-green-700">Active</span></li>
              <li>
                <button className="text-blue-700 hover:underline">View Privacy Policy</button>
              </li>
            </ul>
          </div>
        )}

        {/* Danger Zone */}
        {section === "danger" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl border border-red-300">
            <div className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
              <Trash2 size={24} /> Danger Zone
            </div>
            <div className="mb-4 text-gray-700">
              Delete your account or reset all data. <b>This action is irreversible.</b>
            </div>
            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-bold rounded-lg">
              Delete Account
            </button>
            <button className="ml-4 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 font-bold rounded-lg">
              Reset All Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
