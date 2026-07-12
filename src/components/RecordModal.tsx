import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Mic } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (audioUrl: string) => void;
}

export function RecordModal({ isOpen, onClose, onSave }: RecordModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
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
      audioChunksRef.current = [];
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
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
      setAudioUrl(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('לא ניתן לגשת למיקרופון.');
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
    }
  };

  const playRecording = () => {
    if (audioUrl) {
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

  const handleSave = () => {
    if (audioUrl) {
      onSave(audioUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#f4efe6] w-full max-w-[400px] rounded-[16px] shadow-2xl flex flex-col overflow-hidden border border-[#5b87bd]"
        dir="rtl"
      >
        {/* Header */}
        <div className="h-16 bg-[#5b87bd] px-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <Mic className="w-8 h-8" />
            {isRecording && (
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 bg-red-500/30 px-3 py-1 rounded-full border border-red-400"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-[14px] font-bold">הקלטה...</span>
              </motion.div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!audioUrl || isRecording}
            className="w-12 h-12 rounded-full bg-white text-[#5b87bd] flex items-center justify-center hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            <Check className="w-8 h-8 stroke-[3]" />
          </button>
        </div>

        {/* Visualizer */}
        <div className="flex-1 bg-white py-12 px-6 flex justify-center items-center gap-2 h-[160px]">
          {bars.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: isRecording || isPlaying ? [40, 20, 80, 30, 60, 40] : 40,
              }}
              transition={{
                repeat: Infinity,
                duration: 0.6,
                delay: i * 0.04,
                ease: "easeInOut",
              }}
              className={`w-3 rounded-full transition-colors duration-300 ${isRecording ? 'bg-[#91d34c]' : isPlaying ? 'bg-[#5b87bd]' : 'bg-gray-300'}`}
              style={{ height: '40px' }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="bg-[#f4efe6] h-24 flex items-center justify-center gap-6 border-t border-[#e5dfd3]">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className={`w-[60px] h-[60px] rounded-full border-2 border-gray-300 bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50`}
            title="הקלט"
          >
            <div className={`w-6 h-6 bg-[#be1e2d] rounded-full ${isRecording ? 'animate-pulse' : ''}`} />
          </button>

          <button
            onClick={stopAction}
            disabled={!isRecording && !isPlaying}
            className={`w-[60px] h-[60px] rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30`}
            title="עצור"
          >
            <div className="w-6 h-6 bg-gray-600 rounded-sm" />
          </button>

          <button
            onClick={playRecording}
            disabled={!audioUrl || isRecording || isPlaying}
            className="w-[60px] h-[60px] rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30"
            title="נגן"
          >
            <div className="w-0 h-0 border-y-[12px] border-y-transparent border-l-[20px] border-l-gray-600 mr-[-4px]" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
