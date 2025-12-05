// src/components/EmailComposer.jsx - Gmail-style email composer with signature & logo
import React, { useState, useRef, useEffect } from "react";
import { addComm } from "../api";
import {
  X, Send, Paperclip, Bold, Italic, Underline, Link2, List, ListOrdered,
  ChevronDown, Trash2, Minimize2, Maximize2, Image,
  MoreHorizontal, Clock, FileText, AlertCircle, Settings, Upload
} from "lucide-react";

const EmailComposer = ({ onClose, clientName, clientId, clientEmail, replyTo = null }) => {
  // Email fields
  const [to, setTo] = useState(clientEmail || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "");
  const [body, setBody] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // Signature state
  const [signatureData, setSignatureData] = useState({
    enabled: true,
    autoInclude: true,
    name: "",
    title: "",
    company: "Pro IRP",
    phone: "",
    email: "",
    website: "",
    logoUrl: "",
    customText: ""
  });
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const logoInputRef = useRef(null);

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates] = useState([
    { id: 1, name: "Policy Renewal Reminder", subject: "Your Policy Renewal is Coming Up", body: "Dear [Client Name],\n\nThis is a friendly reminder that your Medicare policy is coming up for renewal. Please contact us to review your options and ensure you have the best coverage for your needs.\n\nBest regards," },
    { id: 2, name: "Welcome New Client", subject: "Welcome to Pro IRP!", body: "Dear [Client Name],\n\nWelcome! We're delighted to have you as a client. Our team is here to help you navigate your Medicare options.\n\nPlease don't hesitate to reach out with any questions.\n\nWarm regards," },
    { id: 3, name: "Annual Review Request", subject: "Schedule Your Annual Medicare Review", body: "Dear [Client Name],\n\nIt's time for your annual Medicare review! This is an opportunity to ensure your current plan still meets your healthcare needs.\n\nPlease reply to this email or call us to schedule a convenient time.\n\nBest regards," },
    { id: 4, name: "Document Request", subject: "Documents Needed for Your Application", body: "Dear [Client Name],\n\nTo complete your application, we need the following documents:\n\n- [Document 1]\n- [Document 2]\n- [Document 3]\n\nPlease email these documents or bring them to your next appointment.\n\nThank you," }
  ]);

  // UI state
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [error, setError] = useState("");

  // Rich text state
  const editorRef = useRef(null);

  // Load signature from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("emailSignatureData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSignatureData(prev => ({ ...prev, ...parsed }));
      } catch {}
    }
  }, []);

  // Save signature to localStorage
  const saveSignature = () => {
    localStorage.setItem("emailSignatureData", JSON.stringify(signatureData));
    setShowSignatureEditor(false);
  };

  // Generate HTML signature
  const generateSignatureHtml = () => {
    if (!signatureData.enabled) return "";

    const { name, title, company, phone, email, website, logoUrl, customText } = signatureData;

    let html = '<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-family: Arial, sans-serif;">';

    if (logoUrl) {
      html += `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; max-height: 60px; margin-bottom: 10px;" /><br/>`;
    }

    if (name) {
      html += `<strong style="color: #172A3A; font-size: 14px;">${name}</strong><br/>`;
    }
    if (title) {
      html += `<span style="color: #6b7280; font-size: 13px;">${title}</span><br/>`;
    }
    if (company) {
      html += `<span style="color: #172A3A; font-size: 13px; font-weight: 500;">${company}</span><br/>`;
    }

    html += '<div style="margin-top: 8px; font-size: 12px; color: #6b7280;">';
    if (phone) {
      html += `<span>Phone: ${phone}</span><br/>`;
    }
    if (email) {
      html += `<span>Email: <a href="mailto:${email}" style="color: #2563eb;">${email}</a></span><br/>`;
    }
    if (website) {
      html += `<span>Web: <a href="${website}" style="color: #2563eb;">${website}</a></span><br/>`;
    }
    html += '</div>';

    if (customText) {
      html += `<div style="margin-top: 10px; font-size: 11px; color: #9ca3af; font-style: italic;">${customText}</div>`;
    }

    html += '</div>';
    return html;
  };

  // Generate plain text signature
  const generateSignatureText = () => {
    if (!signatureData.enabled) return "";

    const { name, title, company, phone, email, website, customText } = signatureData;
    let text = "\n\n--\n";

    if (name) text += `${name}\n`;
    if (title) text += `${title}\n`;
    if (company) text += `${company}\n`;
    if (phone) text += `Phone: ${phone}\n`;
    if (email) text += `Email: ${email}\n`;
    if (website) text += `Web: ${website}\n`;
    if (customText) text += `\n${customText}`;

    return text;
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for localStorage storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureData(prev => ({ ...prev, logoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Handle file attachment
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Apply template
  const applyTemplate = (template) => {
    setSubject(template.subject);
    setBody(template.body.replace(/\[Client Name\]/g, clientName || "Valued Client"));
    setShowTemplates(false);
  };

  // Rich text formatting
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  // Send email
  const handleSend = async () => {
    if (!to.trim()) {
      setError("Please enter a recipient email address");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }
    if (!body.trim()) {
      setError("Please enter a message");
      return;
    }

    setError("");
    setSending(true);

    try {
      // Get body content (with signature if enabled and autoInclude is on)
      const finalBody = (signatureData.enabled && signatureData.autoInclude)
        ? body + generateSignatureText()
        : body;

      // Create HTML version
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="white-space: pre-wrap;">${body.replace(/\n/g, '<br>')}</div>
          ${(signatureData.enabled && signatureData.autoInclude) ? generateSignatureHtml() : ''}
        </div>
      `;

      await addComm(clientId, {
        type: 'email',
        subject: subject,
        body: finalBody,
        html: htmlBody,
        direction: 'out',
        meta: {
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          attachmentCount: attachments.length,
          attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type }))
        }
      });

      alert("Email sent successfully!");
      onClose();
    } catch (err) {
      console.error("Send email error:", err);
      setError(`Failed to send email: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Minimized view
  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 w-72 bg-[#172A3A] text-white rounded-t-lg shadow-2xl z-50">
        <div
          className="flex items-center justify-between px-4 py-2 cursor-pointer"
          onClick={() => setMinimized(false)}
        >
          <span className="font-medium truncate">{subject || "New Message"}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${maximized ? 'inset-4' : 'bottom-0 right-4 w-[560px]'} bg-white rounded-t-lg shadow-2xl z-50 flex flex-col border border-slate-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#172A3A] text-white rounded-t-lg">
        <span className="font-medium">{replyTo ? "Reply" : "New Message"}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => setMaximized(!maximized)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title={maximized ? "Restore" : "Maximize"}
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Email Fields */}
      <div className="border-b border-slate-200">
        {/* To field */}
        <div className="flex items-center px-4 py-2 border-b border-slate-100">
          <label className="text-sm text-slate-500 w-12">To</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 outline-none text-sm"
            placeholder="recipient@email.com"
          />
          <button
            onClick={() => setShowCcBcc(!showCcBcc)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {showCcBcc ? "Hide" : "Cc Bcc"}
          </button>
        </div>

        {/* CC/BCC fields */}
        {showCcBcc && (
          <>
            <div className="flex items-center px-4 py-2 border-b border-slate-100">
              <label className="text-sm text-slate-500 w-12">Cc</label>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="flex-1 outline-none text-sm"
                placeholder="cc@email.com"
              />
            </div>
            <div className="flex items-center px-4 py-2 border-b border-slate-100">
              <label className="text-sm text-slate-500 w-12">Bcc</label>
              <input
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="flex-1 outline-none text-sm"
                placeholder="bcc@email.com"
              />
            </div>
          </>
        )}

        {/* Subject field */}
        <div className="flex items-center px-4 py-2">
          <label className="text-sm text-slate-500 w-12">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 outline-none text-sm"
            placeholder="Email subject"
          />
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => execCommand('bold')}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Bold"
        >
          <Bold size={16} className="text-slate-600" />
        </button>
        <button
          onClick={() => execCommand('italic')}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Italic"
        >
          <Italic size={16} className="text-slate-600" />
        </button>
        <button
          onClick={() => execCommand('underline')}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Underline"
        >
          <Underline size={16} className="text-slate-600" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Bullet List"
        >
          <List size={16} className="text-slate-600" />
        </button>
        <button
          onClick={() => execCommand('insertOrderedList')}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Numbered List"
        >
          <ListOrdered size={16} className="text-slate-600" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          onClick={insertLink}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Insert Link"
        >
          <Link2 size={16} className="text-slate-600" />
        </button>

        <div className="flex-1" />

        {/* Templates dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded transition-colors"
          >
            <FileText size={14} />
            Templates
            <ChevronDown size={12} />
          </button>

          {showTemplates && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-10">
              <div className="p-2 border-b border-slate-100">
                <span className="text-xs font-medium text-slate-500">Email Templates</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-700">{template.name}</div>
                    <div className="text-xs text-slate-500 truncate">{template.subject}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Body */}
      <div className={`flex-1 overflow-y-auto ${maximized ? 'min-h-[400px]' : 'min-h-[200px] max-h-[350px]'}`}>
        <textarea
          ref={editorRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-full p-4 outline-none resize-none text-sm"
          placeholder="Compose your email..."
        />
      </div>

      {/* Signature Preview */}
      {signatureData.enabled && signatureData.autoInclude && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Signature (auto-included)</span>
            <button
              onClick={() => setShowSignatureEditor(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit Signature
            </button>
          </div>
          <div className="text-xs text-slate-600 border-l-2 border-slate-300 pl-2">
            {signatureData.logoUrl && (
              <img src={signatureData.logoUrl} alt="Logo" className="max-w-[100px] max-h-[40px] mb-1" />
            )}
            {signatureData.name && <div className="font-semibold">{signatureData.name}</div>}
            {signatureData.title && <div className="text-slate-500">{signatureData.title}</div>}
            {signatureData.company && <div>{signatureData.company}</div>}
            {signatureData.phone && <div>Phone: {signatureData.phone}</div>}
            {signatureData.email && <div>Email: {signatureData.email}</div>}
          </div>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
              >
                <Paperclip size={14} className="text-slate-400" />
                <span className="text-slate-700 max-w-[150px] truncate">{att.name}</span>
                <span className="text-slate-400 text-xs">({formatFileSize(att.size)})</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {/* Footer / Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white rounded-b-lg">
        <div className="flex items-center gap-2">
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-[#172A3A] text-white font-medium rounded-lg hover:bg-[#1e3a4d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send"}
          </button>

          {/* Attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Attach files"
          >
            <Paperclip size={18} />
          </button>

          {/* Signature Settings */}
          <button
            onClick={() => setShowSignatureEditor(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Signature settings"
          >
            <Settings size={18} />
          </button>

          {/* More options */}
          <div className="relative">
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="More options"
            >
              <MoreHorizontal size={18} />
            </button>

            {showMoreOptions && (
              <div className="absolute left-0 bottom-full mb-2 w-52 bg-white rounded-lg shadow-xl border border-slate-200 z-10">
                <button
                  onClick={() => {
                    setSignatureData(prev => ({ ...prev, autoInclude: !prev.autoInclude }));
                    setShowMoreOptions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <input type="checkbox" checked={signatureData.autoInclude} readOnly className="rounded" />
                  Auto-include signature
                </button>
                <button
                  onClick={() => {
                    setShowSignatureEditor(true);
                    setShowMoreOptions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                >
                  Edit signature & logo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete draft */}
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Discard draft"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Signature Editor Modal */}
      {showSignatureEditor && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-900">Email Signature Settings</h3>
              <button
                onClick={() => setShowSignatureEditor(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Enable/Auto-include toggles */}
              <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatureData.enabled}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-medium">Enable Signature</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatureData.autoInclude}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, autoInclude: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-medium">Auto-include on all emails</span>
                </label>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
                <div className="flex items-center gap-4">
                  {signatureData.logoUrl ? (
                    <div className="relative">
                      <img
                        src={signatureData.logoUrl}
                        alt="Logo"
                        className="max-w-[150px] max-h-[60px] border border-slate-200 rounded p-1"
                      />
                      <button
                        onClick={() => setSignatureData(prev => ({ ...prev, logoUrl: "" }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-[150px] h-[60px] border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-xs">
                      No logo
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                  >
                    <Upload size={16} />
                    Upload Logo
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Recommended: PNG or JPG, max 150x60px</p>
              </div>

              {/* Name & Title */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={signatureData.name}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={signatureData.title}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    placeholder="Medicare Insurance Agent"
                  />
                </div>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={signatureData.company}
                  onChange={(e) => setSignatureData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  placeholder="Pro IRP"
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={signatureData.phone}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={signatureData.email}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    placeholder="john@proirp.com"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  value={signatureData.website}
                  onChange={(e) => setSignatureData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  placeholder="https://www.proirp.com"
                />
              </div>

              {/* Custom Text / Disclaimer */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Text / Disclaimer (optional)</label>
                <textarea
                  value={signatureData.customText}
                  onChange={(e) => setSignatureData(prev => ({ ...prev, customText: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                  rows={2}
                  placeholder="Licensed in all 50 states..."
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Preview</label>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  {signatureData.logoUrl && (
                    <img src={signatureData.logoUrl} alt="Logo" className="max-w-[150px] max-h-[60px] mb-2" />
                  )}
                  {signatureData.name && <div className="font-semibold text-slate-900">{signatureData.name}</div>}
                  {signatureData.title && <div className="text-sm text-slate-600">{signatureData.title}</div>}
                  {signatureData.company && <div className="text-sm font-medium text-slate-800">{signatureData.company}</div>}
                  <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                    {signatureData.phone && <div>Phone: {signatureData.phone}</div>}
                    {signatureData.email && <div>Email: <span className="text-blue-600">{signatureData.email}</span></div>}
                    {signatureData.website && <div>Web: <span className="text-blue-600">{signatureData.website}</span></div>}
                  </div>
                  {signatureData.customText && (
                    <div className="mt-2 text-xs text-slate-400 italic">{signatureData.customText}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl sticky bottom-0">
              <button
                onClick={() => setShowSignatureEditor(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="px-4 py-2 text-sm font-medium bg-[#172A3A] text-white rounded-lg hover:bg-[#1e3a4d] transition-colors"
              >
                Save Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailComposer;
