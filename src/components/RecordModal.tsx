 import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Mic, Trash2, Play, Volume2, X } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (audioUrl: string) => void;
  recordings?: Record<number, string>;
  onDeleteRecording?: (id: number) => void;
}

export function RecordModal({ isOpen, onClose, onSave, recordings = {}, onDeleteRecording }: RecordModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playingSavedId, setPlayingSavedId] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bars for visualizer
  const bars = Array.from({ length: 15 });

  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setIsPlaying(false);
      setAudioUrl(null);
      setPlayingSavedId(null);
      audioChunksRef.current = [];
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPlaying(false);
      setPlayingSavedId(null);
      setAudioUrl(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Cannot access microphone.');
    }
  };

  const stopAction = () => {
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setPlayingSavedId(null);
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      setPlayingSavedId(null);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      } else {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play();
        setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
        };
      }
    }
  };

  const playSavedRecording = (id: number, url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingSavedId(id);
    setIsPlaying(true);
    audio.play();
    audio.onended = () => {
      setIsPlaying(false);
      setPlayingSavedId(null);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setPlayingSavedId(null);
    };
  };

  const handleSave = () => {
    if (audioUrl) {
      onSave(audioUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  const savedIds = Object.keys(recordings).map(n => parseInt(n));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#f4efe6] w-full max-w-[420px] rounded-[20px] shadow-2xl flex flex-col overflow-hidden border-2 border-[#5b87bd]"
      >
        {/* Header */}
        <div className="h-16 bg-[#5b87bd] px-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <Mic className="w-8 h-8" />
            {isRecording ? (
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 bg-red-500/30 px-3 py-1 rounded-full border border-red-400"
              >
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                <span className="text-[14px] font-bold">Recording...</span>
              </motion.div>
            ) : (
              <span className="text-lg font-bold">Sound Recorder</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!audioUrl || isRecording}
              className="w-11 h-11 rounded-full bg-white text-[#5b87bd] flex items-center justify-center hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
              title="Save Recording"
            >
              <Check className="w-7 h-7 stroke-[3]" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visualizer */}
        <div className="bg-white py-8 px-6 flex justify-center items-center gap-2 h-[130px] border-b border-[#e5dfd3]">
          {bars.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: isRecording || isPlaying ? [40, 20, 80, 30, 60, 40] : 35,
              }}
              transition={{
                repeat: Infinity,
                duration: 0.6,
                delay: i * 0.04,
                ease: "easeInOut",
              }}
              className={`w-3 rounded-full transition-colors duration-300 ${isRecording ? 'bg-[#91d34c]' : isPlaying ? 'bg-[#5b87bd]' : 'bg-gray-300'}`}
              style={{ height: '35px' }}
            />
          ))}
        </div>

        {/* Controls Bar */}
        <div className="bg-[#f4efe6] py-4 px-6 flex items-center justify-center gap-5 border-b border-[#e5dfd3]">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className={`w-[56px] h-[56px] rounded-full border-2 border-gray-300 bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer`}
            title="Record"
          >
            <div className={`w-5 h-5 bg-[#be1e2d] rounded-full ${isRecording ? 'animate-pulse' : ''}`} />
          </button>

          <button
            onClick={stopAction}
            disabled={!isRecording && !isPlaying}
            className={`w-[56px] h-[56px] rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-30 cursor-pointer`}
            title="Stop"
          >
            <div className="w-5 h-5 bg-gray-600 rounded-sm" />
          </button>

          <button
            onClick={playRecording}
            disabled={!audioUrl || isRecording || isPlaying}
            className="w-[56px] h-[56px] rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-30 cursor-pointer"
            title="Play current recording"
          >
            <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[18px] border-l-gray-600 mr-[-3px]" />
          </button>

          {audioUrl && (
            <button
              onClick={() => {
                stopAction();
                setAudioUrl(null);
              }}
              disabled={isRecording}
              className="w-[56px] h-[56px] rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-30 cursor-pointer"
              title="Discard current recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Existing Saved Recordings List */}
        {savedIds.length > 0 && (
          <div className="p-4 bg-white/70 max-h-[160px] overflow-y-auto">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Saved Recordings</span>
            </h4>
            <div className="space-y-1.5">
              {savedIds.map(id => {
                const isThisPlaying = playingSavedId === id && isPlaying;
                return (
                  <div 
                    key={id}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">
                        {id}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">Recording {id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playSavedRecording(id, recordings[id])}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isThisPlaying 
                            ? 'bg-blue-600 text-white border-blue-600 animate-pulse' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                        title="Play"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {onDeleteRecording && (
                        <button
                          onClick={() => {
                            if (playingSavedId === id) stopAction();
                            onDeleteRecording(id);
                          }}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
