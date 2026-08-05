import React, { useState, useEffect } from "react";
import { X, Play, Video, Search, Sparkles, ExternalLink, ArrowRight, Film, BookOpen, Layers, Clock } from "lucide-react";
import { fetchTutorialVideosFromFirestore } from "../lib/firebase";

export interface TutorialVideo {
  id: string;
  youtubeId: string;
  titleEn: string;
  descriptionEn: string;
  category: "starter" | "motion" | "looks" | "sound" | "events" | "projects";
  duration: string;
  comingSoon?: boolean;
}

export const DEFAULT_TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    id: "delete-characters-pages",
    youtubeId: "3YJl715YEeY",
    titleEn: "Deleting Characters & Pages",
    descriptionEn: "Learn how to delete unwanted characters and pages from your project.",
    category: "starter",
    duration: "1:30",
    comingSoon: false
  },
  {
    id: "moving-characters",
    youtubeId: "u422iB2y4q0",
    titleEn: "Moving Characters & Repeat Loops",
    descriptionEn: "Discover how to make characters walk, jump, rotate, and repeat movements with repeat blocks.",
    category: "motion",
    duration: "1:50",
    comingSoon: true
  },
  {
    id: "bumping-events",
    youtubeId: "98W6tJzO1eA",
    titleEn: "Character Collisions & Bumping Events",
    descriptionEn: "What happens when characters touch? Learn how to trigger actions on bump and tap!",
    category: "events",
    duration: "2:05",
    comingSoon: true
  },
  {
    id: "changing-scenes",
    youtubeId: "K69_aNq7jZc",
    titleEn: "Switching Scenes & Backgrounds",
    descriptionEn: "Create multi-page interactive stories by switching scenes with page transition blocks.",
    category: "starter",
    duration: "2:30",
    comingSoon: true
  },
  {
    id: "sounds-voice",
    youtubeId: "P3JvA5u_kXk",
    titleEn: "Recording Voice & Sound Effects",
    descriptionEn: "Record custom audio clips or play fun pop sounds directly inside your character code.",
    category: "sound",
    duration: "1:40",
    comingSoon: true
  },
  {
    id: "color-messages",
    youtubeId: "0kK5fG4sZNE",
    titleEn: "Sending Secret Color Messages",
    descriptionEn: "Inter-character messaging! Send colored envelopes to synchronize multi-sprite actions.",
    category: "events",
    duration: "2:20",
    comingSoon: true
  },
  {
    id: "change-size-hide",
    youtubeId: "x7w3f9tQ5m8",
    titleEn: "Resizing, Hiding & Showing Sprites",
    descriptionEn: "Make characters grow, shrink, vanish magically, and reappear on screen.",
    category: "looks",
    duration: "1:35",
    comingSoon: true
  },
  {
    id: "simple-game",
    youtubeId: "bX9m71k2V3E",
    titleEn: "Building Your First Tag Game!",
    descriptionEn: "Combine movement, bumping, and sound to create an exciting interactive tag mini-game.",
    category: "projects",
    duration: "3:10",
    comingSoon: true
  }
];

const CATEGORIES = [
  { id: "all", labelEn: "All", icon: Sparkles },
  { id: "starter", labelEn: "Getting Started", icon: BookOpen },
  { id: "motion", labelEn: "Motion", icon: ArrowRight },
  { id: "looks", labelEn: "Looks", icon: Layers },
  { id: "sound", labelEn: "Sound", icon: Film },
  { id: "events", labelEn: "Events", icon: Video },
  { id: "projects", labelEn: "Projects", icon: Play }
];

interface VideoHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
  onOpenAdmin?: () => void;
}

export const VideoHelpModal: React.FC<VideoHelpModalProps> = ({ isOpen, onClose, refreshTrigger, onOpenAdmin }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<TutorialVideo | null>(null);
  const [videosList, setVideosList] = useState<TutorialVideo[]>(DEFAULT_TUTORIAL_VIDEOS);

  const [headerClickCount, setHeaderClickCount] = useState(0);

  const handleHeaderIconClick = () => {
    const nextCount = headerClickCount + 1;
    setHeaderClickCount(nextCount);
    if (nextCount >= 5) {
      setHeaderClickCount(0);
      onClose();
      if (onOpenAdmin) {
        onOpenAdmin();
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVideos();
      setHeaderClickCount(0);
    }
  }, [isOpen, refreshTrigger]);

  const loadVideos = async () => {
    const loaded = await fetchTutorialVideosFromFirestore(DEFAULT_TUTORIAL_VIDEOS);
    setVideosList(loaded);
  };

  if (!isOpen) return null;

  const filteredVideos = videosList.filter((video) => {
    const matchesCategory = selectedCategory === "all" || video.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      video.titleEn.toLowerCase().includes(query) ||
      video.descriptionEn.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-200/50">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleHeaderIconClick} title="Click 5 times for Admin Panel">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/30 hover:scale-105 transition-transform">
              <Video className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
                Video Tutorials & Help
              </h2>
              <p className="text-xs text-amber-100">
                Watch short video guides to master block programming in CodeJR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FDFBF7]">

          {/* Active Video Embedded Player */}
          {activeVideo && (
            <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-800 animate-slideDown">
              <div className="flex items-center justify-between bg-gray-800/90 px-4 py-3 text-white">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Play className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="font-semibold text-sm truncate">{activeVideo.titleEn}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/10 hover:bg-white/20 text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    Open in YouTube <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    title="Close Video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* YouTube Responsive iFrame Container */}
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                  title={activeVideo.titleEn}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              <div className="p-4 bg-gray-950 text-gray-300 text-xs flex justify-between items-center">
                <p>{activeVideo.descriptionEn}</p>
                <span className="bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0">
                  ⏱️ {activeVideo.duration}
                </span>
              </div>
            </div>
          )}

          {/* Search & Category Filter Section */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 rounded-2xl shadow-sm border border-amber-100">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{cat.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tutorials..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all bg-gray-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Video Matrix Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                Available Tutorials
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                  {filteredVideos.length}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Click any video card to watch directly
              </p>
            </div>

            {filteredVideos.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="font-bold text-gray-700 text-sm">No videos found</h4>
                <p className="text-xs text-gray-500 mt-1">Try searching for a different keyword or resetting filters.</p>
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredVideos.map((video) => {
                  const isPlayingThis = activeVideo?.id === video.id;
                  const isComingSoon = video.comingSoon;
                  return (
                    <div
                      key={video.id}
                      onClick={() => {
                        if (isComingSoon) {
                          alert("This video tutorial will be uploaded coming soon!");
                        } else {
                          setActiveVideo(video);
                        }
                      }}
                      className={`group bg-white rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col hover:shadow-xl hover:-translate-y-1 ${
                        isPlayingThis
                          ? "ring-2 ring-amber-500 border-amber-500 shadow-lg"
                          : isComingSoon
                          ? "border-gray-200/60 opacity-90 hover:opacity-100"
                          : "border-gray-200/80 hover:border-amber-300"
                      }`}
                    >
                      {/* Video Thumbnail */}
                      <div className="relative aspect-video bg-gray-100 overflow-hidden">
                        <img
                          src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                          alt={video.titleEn}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isComingSoon ? "grayscale-[40%] contrast-95" : "group-hover:scale-105"
                          }`}
                          loading="lazy"
                        />
                        
                        {/* Overlay & Action Icon */}
                        <div className={`absolute inset-0 transition-colors flex items-center justify-center ${
                          isComingSoon ? "bg-black/50" : "bg-black/30 group-hover:bg-black/20"
                        }`}>
                          {isComingSoon ? (
                            <div className="px-3.5 py-2 rounded-full bg-amber-500/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-white/20">
                              <Clock className="w-4 h-4 text-white animate-spin-slow" />
                              <span>Coming Soon</span>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-amber-500 transition-all">
                              <Play className="w-6 h-6 fill-white ml-1" />
                            </div>
                          )}
                        </div>

                        {/* Top-Left Coming Soon Badge */}
                        {isComingSoon && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md uppercase shadow-md flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Coming Soon
                          </div>
                        )}

                        {/* Duration Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          {video.duration}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                              {video.category}
                            </span>
                            {isComingSoon && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-900 text-xs leading-snug group-hover:text-amber-600 transition-colors">
                            {video.titleEn}
                          </h4>
                          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mt-1">
                            {video.descriptionEn}
                          </p>
                        </div>

                        <div className={`mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold ${
                          isComingSoon ? "text-amber-600/80" : "text-amber-600 group-hover:text-amber-700"
                        }`}>
                          <span>
                            {isPlayingThis
                              ? "Now Playing"
                              : isComingSoon
                              ? "Coming Soon"
                              : "Watch Tutorial"}
                          </span>
                          {isComingSoon ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer info */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>Need more help? Click the Contact Us button in the top bar.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
