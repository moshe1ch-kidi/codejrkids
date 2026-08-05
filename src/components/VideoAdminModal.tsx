import React, { useState, useEffect } from "react";
import { X, Lock, Save, Plus, Trash2, Edit3, Youtube, Check, RefreshCw, AlertCircle, Eye, Clock } from "lucide-react";
import { TutorialVideo, DEFAULT_TUTORIAL_VIDEOS } from "./VideoHelpModal";
import { saveTutorialVideosToFirestore, fetchTutorialVideosFromFirestore } from "../lib/firebase";

interface VideoAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideosUpdated: () => void;
}

export const ADMIN_PASSWORD = "codejr$100";

export function extractYoutubeId(urlOrId: string): string {
  if (!urlOrId) return "";
  const trimmed = urlOrId.trim();
  
  // Standard Youtube Watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

export const VideoAdminModal: React.FC<VideoAdminModalProps> = ({ isOpen, onClose, onVideosUpdated }) => {
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form editing state
  const [editingVideo, setEditingVideo] = useState<TutorialVideo | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<TutorialVideo["category"]>("starter");
  const [formDuration, setFormDuration] = useState("1:30");
  const [formComingSoon, setFormComingSoon] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVideos();
    } else {
      // Reset sensitive states on close
      setPasswordInput("");
      setPasswordError("");
      setIsFormOpen(false);
      setEditingVideo(null);
    }
  }, [isOpen]);

  const loadVideos = async () => {
    setIsLoading(true);
    const loaded = await fetchTutorialVideosFromFirestore(DEFAULT_TUTORIAL_VIDEOS);
    setVideos(loaded);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect admin password. Please try again.");
    }
  };

  const handleOpenAddForm = () => {
    setEditingVideo(null);
    setFormTitle("");
    setFormYoutubeUrl("");
    setFormDescription("");
    setFormCategory("starter");
    setFormDuration("1:30");
    setFormComingSoon(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (video: TutorialVideo) => {
    setEditingVideo(video);
    setFormTitle(video.titleEn);
    setFormYoutubeUrl(`https://www.youtube.com/watch?v=${video.youtubeId}`);
    setFormDescription(video.descriptionEn);
    setFormCategory(video.category);
    setFormDuration(video.duration);
    setFormComingSoon(!!video.comingSoon);
    setIsFormOpen(true);
  };

  const handleSaveVideoItem = (e: React.FormEvent) => {
    e.preventDefault();
    const ytId = extractYoutubeId(formYoutubeUrl);
    if (!ytId) {
      alert("Please enter a valid YouTube URL or 11-character Video ID.");
      return;
    }

    if (!formTitle.trim()) {
      alert("Please enter a video title.");
      return;
    }

    if (editingVideo) {
      // Update existing
      const updated = videos.map((v) =>
        v.id === editingVideo.id
          ? {
              ...v,
              titleEn: formTitle.trim(),
              youtubeId: ytId,
              descriptionEn: formDescription.trim(),
              category: formCategory,
              duration: formDuration.trim() || "1:30",
              comingSoon: formComingSoon,
            }
          : v
      );
      setVideos(updated);
    } else {
      // Create new video
      const newVideo: TutorialVideo = {
        id: `video-${Date.now()}`,
        youtubeId: ytId,
        titleEn: formTitle.trim(),
        descriptionEn: formDescription.trim(),
        category: formCategory,
        duration: formDuration.trim() || "1:30",
        comingSoon: formComingSoon,
      };
      setVideos([newVideo, ...videos]);
    }

    setIsFormOpen(false);
  };

  const handleDeleteVideo = (id: string) => {
    if (confirm("Are you sure you want to delete this video?")) {
      setVideos(videos.filter((v) => v.id !== id));
    }
  };

  const handleSaveAllToFirestore = async () => {
    setIsLoading(true);
    await saveTutorialVideosToFirestore(videos);
    setIsLoading(false);
    setSaveSuccess(true);
    onVideosUpdated();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToDefaults = async () => {
    if (confirm("Reset video tutorials list back to default set?")) {
      setVideos(DEFAULT_TUTORIAL_VIDEOS);
      await saveTutorialVideosToFirestore(DEFAULT_TUTORIAL_VIDEOS);
      onVideosUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-300">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-gray-900 via-amber-900 to-gray-900 px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Video Management Panel
                <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-extrabold">
                  ADMIN
                </span>
              </h2>
              <p className="text-xs text-amber-200/80">
                Manage YouTube links, titles, descriptions, and coming soon status
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Password Prompt view */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Admin Authentication Required</h3>
              <p className="text-xs text-gray-500 mt-1">
                Please enter the master admin password to edit tutorial videos.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Password..."
                  className="w-full px-4 py-3 text-sm text-center border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-mono tracking-wider"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-xs text-red-500 font-medium mt-2 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
              >
                Unlock Management
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Management Interface */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">

            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddForm}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add New Video
                </button>

                <button
                  onClick={handleResetToDefaults}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  title="Reset list to original defaults"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs text-green-600 font-bold flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200">
                    <Check className="w-4 h-4" /> Saved Successfully!
                  </span>
                )}

                <button
                  onClick={handleSaveAllToFirestore}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  {isLoading ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </div>

            {/* Edit / Add Video Form Drawer Modal */}
            {isFormOpen && (
              <div className="bg-white p-6 rounded-2xl border-2 border-amber-400 shadow-xl space-y-4 animate-slideDown">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" />
                    {editingVideo ? "Edit Video Tutorial" : "Add New Video Tutorial"}
                  </h4>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveVideoItem} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Video Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Deleting Characters & Pages"
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        YouTube URL or Video ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formYoutubeUrl}
                        onChange={(e) => setFormYoutubeUrl(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=3YJl715YEeY"
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                        required
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Extracted ID: <span className="font-mono font-bold text-gray-700">{extractYoutubeId(formYoutubeUrl) || "None"}</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Video Description</label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Brief description of what users will learn..."
                      className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none resize-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none bg-white"
                      >
                        <option value="starter">Starter (צעדים ראשונים)</option>
                        <option value="motion">Motion (תנועה)</option>
                        <option value="looks">Looks (מראה)</option>
                        <option value="sound">Sound (צלילים)</option>
                        <option value="events">Events (אירועים)</option>
                        <option value="projects">Projects (פרויקטים)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Duration</label>
                      <input
                        type="text"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        placeholder="e.g. 1:30"
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formComingSoon}
                          onChange={(e) => setFormComingSoon(e.target.checked)}
                          className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                        />
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Mark as "Coming Soon"
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md"
                    >
                      {editingVideo ? "Update Video" : "Add Video"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Video List Table/Cards */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-100/70 border-b border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Tutorial Videos List ({videos.length})</span>
                <span className="text-gray-400 font-normal">Click Edit to change details</span>
              </div>

              <div className="divide-y divide-gray-100">
                {videos.map((vid, idx) => (
                  <div
                    key={vid.id || idx}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Youtube Thumbnail */}
                      <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-gray-900 shrink-0 border border-gray-200">
                        <img
                          src={`https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`}
                          alt={vid.titleEn}
                          className="w-full h-full object-cover"
                        />
                        {vid.comingSoon && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] text-amber-300 font-extrabold uppercase tracking-wider">
                            Soon
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">{vid.titleEn}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                            {vid.category}
                          </span>
                          {vid.comingSoon ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Coming Soon
                            </span>
                          ) : (
                            <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-md">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-gray-500 line-clamp-1">{vid.descriptionEn}</p>

                        <div className="text-[10px] text-gray-400 font-mono">
                          ID: {vid.youtubeId} | Duration: {vid.duration}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <a
                        href={`https://www.youtube.com/watch?v=${vid.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                        title="Preview on YouTube"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleOpenEditForm(vid)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs rounded-lg border border-amber-200/80 flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteVideo(vid.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        title="Delete video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
