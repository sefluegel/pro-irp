import React from "react";
import { Users, FileText, ListChecks, Settings } from "lucide-react";

const links = [
  { icon: <Users />, label: "Clients", href: "/clients" },
  { icon: <FileText />, label: "Policies", href: "/policies" },
  { icon: <ListChecks />, label: "Tasks", href: "/tasks" },
  { icon: <Settings />, label: "Settings", href: "/settings" },
];

const SectionLinks = () => (
  <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#FFB800" }}>
    <div className="text-lg font-semibold text-[#172A3A] mb-4">Sections</div>
    <div className="grid grid-cols-2 gap-4">
      {links.map(l => (
        <a key={l.label} href={l.href} className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#F7FAFC] hover:bg-[#FFF7DF] transition">
          <div className="mb-2">{l.icon}</div>
          <span className="text-sm font-bold text-[#172A3A]">{l.label}</span>
        </a>
      ))}
    </div>
  </div>
);

export default SectionLinks;
