 import React, { useState, useEffect } from "react";
import { MessageSquarePlus, Send, X, CheckCircle, RefreshCw, Trash2, Mail, User, ShieldCheck, MessageSquare, Lock, KeyRound, LogOut, Settings } from "lucide-react";
import { sendContactMessage, fetchContactMessages, deleteContactMessage, ContactMessage } from "../lib/firebase";
import { getAssetUrl } from "../utils/assets";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"form" | "admin">("form");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("Feature Suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Hidden admin tab state & 5-click easter egg
  const [iconClicks, setIconClicks] = useState(0);
  const [showAdminTab, setShowAdminTab] = useState(false);

  // Admin password & lock state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [storedPassword, setStoredPassword] = useState(() => {
    return localStorage.getItem("codejr_admin_password") || "codejr$100";
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changePassSuccess, setChangePassSuccess] = useState("");

  const handleIconClick = () => {
    const next = iconClicks + 1;
    if (next >= 5) {
      setShowAdminTab(true);
      setActiveTab("admin");
      setIconClicks(0);
    } else {
      setIconClicks(next);
    }
  };

  const [messagesList, setMessagesList] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === "admin" && isAdminUnlocked) {
      loadMessages();
    }
  }, [isOpen, activeTab, isAdminUnlocked]);

  const loadMessages = async () => {
    setLoadingMessages(true);
    try {
      const data = await fetchContactMessages();
      setMessagesList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === storedPassword) {
      setIsAdminUnlocked(true);
      setPasswordError("");
      setInputPassword("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 4) {
      setPasswordError("Password must be at least 4 characters long.");
      return;
    }
    localStorage.setItem("codejr_admin_password", newPassword);
    setStoredPassword(newPassword);
    setNewPassword("");
    setIsChangingPassword(false);
    setChangePassSuccess("Password updated successfully!");
    setTimeout(() => setChangePassSuccess(""), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !message.trim()) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    setSending(true);
    setErrorMessage("");
    try {
      await sendContactMessage({
        name: name.trim(),
        contact: contact.trim(),
        subject,
        message: message.trim()
      });
      setSuccess(true);
      setName("");
      setContact("");
      setMessage("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage("An error occurred while sending. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this message?")) {
      await deleteContactMessage(id);
      loadMessages();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 dir-ltr">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleIconClick}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md p-1 overflow-hidden cursor-pointer select-none transition-transform active:scale-95 border-0 focus:outline-none"
              title="CodeJR Icon"
            >
              <img src={getAssetUrl('/UI/codejr_icon_1.png')} alt="CodeJR Icon" className="w-full h-full object-contain pointer-events-none" />
            </button>
            <div>
              <h2 className="text-xl font-bold">Contact Us - CodeJR</h2>
              <p className="text-xs text-blue-100">We'd love to hear your feedback, bug reports, or questions!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Admin tab is hidden until icon is clicked 5 times */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 px-4 pt-2">
          <button
            onClick={() => { setActiveTab("form"); setSuccess(false); }}
            className={`px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "form"
                ? "border-blue-600 text-blue-600 bg-white shadow-sm"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Contact Form</span>
          </button>
          
          {(showAdminTab || isAdminUnlocked || activeTab === "admin") && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === "admin"
                  ? "border-blue-600 text-blue-600 bg-white shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Messages</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "form" && (
            <div>
              {success ? (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Message Sent Successfully!</h3>
                  <p className="text-gray-600 text-sm mb-6 max-w-xs">
                    Thank you for reaching out. Your message has been saved in the database and we will get back to you soon.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                      {errorMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name..."
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email or Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="example@mail.com / 555-0199"
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="Feature Suggestion">Feature Suggestion</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="General Question">General Question</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                        required
                      ></textarea>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "admin" && (
            <div>
              {!isAdminUnlocked ? (
                /* Password Protection Screen */
                <div className="py-6 px-2 text-center flex flex-col items-center">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 border border-indigo-100 shadow-sm">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Admin Password Required</h3>
                  <p className="text-xs text-gray-500 mb-6 max-w-xs">
                    This area contains private feedback messages. Enter password to view.
                  </p>

                  <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs space-y-3">
                    {passwordError && (
                      <div className="p-2.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                        {passwordError}
                      </div>
                    )}
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        placeholder="Enter admin password..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Unlock Messages</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* Unlocked Messages View */
                <div className="space-y-4">
                  {changePassSuccess && (
                    <div className="p-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg">
                      {changePassSuccess}
                    </div>
                  )}

                  {isChangingPassword ? (
                    <form onSubmit={handleChangePassword} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-indigo-600" />
                        <span>Change Admin Password</span>
                      </h4>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 4 chars)..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white"
                        required
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsChangingPassword(false)}
                          className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                        >
                          Save New Password
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-xs text-gray-500 font-medium">
                        Total messages: <strong className="text-gray-800">{messagesList.length}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsChangingPassword(true)}
                          className="px-2.5 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          title="Change Admin Password"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Password</span>
                        </button>
                        <button
                          onClick={loadMessages}
                          disabled={loadingMessages}
                          className="px-2.5 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingMessages ? "animate-spin" : ""}`} />
                          <span>Refresh</span>
                        </button>
                        <button
                          onClick={() => setIsAdminUnlocked(false)}
                          className="px-2.5 py-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lock messages"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Lock</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {loadingMessages ? (
                    <div className="py-12 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span>Loading messages from Firebase...</span>
                    </div>
                  ) : messagesList.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <span>No messages submitted yet</span>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-3 pl-1">
                      {messagesList.map((msg) => (
                        <div key={msg.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all text-left relative group">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <span className="font-bold text-gray-900 text-sm">{msg.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({msg.contact})</span>
                            </div>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                              {msg.subject}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-700 mt-2 bg-white p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">
                            {msg.message}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                            <span>
                              {msg.createdAt?.seconds
                                ? new Date(msg.createdAt.seconds * 1000).toLocaleString("en-US")
                                : "Just now"}
                            </span>
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
