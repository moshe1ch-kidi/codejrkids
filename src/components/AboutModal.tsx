 import React, { useEffect } from "react";
import { X, ExternalLink, Heart, Sparkles, ShieldCheck, GraduationCap, Building2 } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative bg-gradient-to-b from-[#FFFDF9] to-[#FFF7ED] rounded-3xl shadow-2xl border-4 border-amber-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleUp">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/90 shadow-xs flex items-center justify-center text-amber-600">
              <GraduationCap className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide drop-shadow-xs">
                About & ScratchJr Attribution
              </h2>
              <p className="text-xs font-bold text-amber-100">
                Inspiration, Community & Academic Attribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-gray-800 text-left kid-scrollbar">
          
          {/* Official Attribution Statement */}
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-xs relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Official Statement
              </span>
            </div>
            <blockquote className="text-sm sm:text-base leading-relaxed text-gray-800 font-medium italic border-l-4 border-amber-500 pl-4 py-1">
              "This technology is inspired by the ScratchJr programming environment, but is not affiliated with the official ScratchJr. ScratchJr, a visual programming environment for young children, was designed by the DevTech Research Group at Tufts, now at Boston College and Lifelong Kindergarten Group at MIT. ScratchJr is now run by the DevTech Research Group and the Scratch Foundation. ScratchJr’s creators aim to make early programming accessible to every child by maintaining free, open access to the platform."
            </blockquote>
          </div>

          {/* Educational Purpose Note */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-left">
            <h3 className="text-sm font-extrabold text-amber-950 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Creative Coding for Every Child
            </h3>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-normal">
              CodeJr is built with profound appreciation for the pioneer research behind ScratchJr. By offering visual, block-based storytelling and interactive animations, our mission aligns with making foundational programming accessible, intuitive, and engaging for learners everywhere.
            </p>
          </div>

          {/* Official Academic & Project Links */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              Official Organizations & Research Groups
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="https://www.scratchjr.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-orange-50 border border-amber-200 transition-all hover:scale-[1.02] shadow-2xs group"
              >
                <div>
                  <div className="font-extrabold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                    ScratchJr Official
                  </div>
                  <div className="text-[11px] text-gray-500">scratchjr.org</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </a>

              <a
                href="https://www.scratchfoundation.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-orange-50 border border-amber-200 transition-all hover:scale-[1.02] shadow-2xs group"
              >
                <div>
                  <div className="font-extrabold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                    Scratch Foundation
                  </div>
                  <div className="text-[11px] text-gray-500">scratchfoundation.org</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </a>

              <a
                href="https://devtech.bc.edu/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-orange-50 border border-amber-200 transition-all hover:scale-[1.02] shadow-2xs group"
              >
                <div>
                  <div className="font-extrabold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                    DevTech Research Group
                  </div>
                  <div className="text-[11px] text-gray-500">Boston College / Tufts</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </a>

              <a
                href="https://www.media.mit.edu/groups/lifelong-kindergarten/overview/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-orange-50 border border-amber-200 transition-all hover:scale-[1.02] shadow-2xs group"
              >
                <div>
                  <div className="font-extrabold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                    Lifelong Kindergarten Group
                  </div>
                  <div className="text-[11px] text-gray-500">MIT Media Lab</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Dedicated to creative coding for kids everywhere</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            OK
          </button>
        </div>

      </div>
    </div>
  );
};
