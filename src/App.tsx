 import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { AudioUploader } from './components/AudioUploader';
import { AudioRecorder } from './components/AudioRecorder';
import { ResultCard } from './components/ResultCard';
import { PromptModal } from './components/PromptModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { TranscriptionItem } from './types';
import {
  Upload,
  Mic,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Languages,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function App() {
  const [inputMode, setInputMode] = useState<'upload' | 'record'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<TranscriptionItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [history, setHistory] = useState<TranscriptionItem[]>([]);

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Check health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasApiKey === 'boolean') {
          setHasApiKey(data.hasApiKey);
        }
      })
      .catch((err) => console.error('Health check failed:', err));

    // Load history from localStorage
    try {
      const saved = localStorage.getItem('hebrew_transcriptions_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  // Save history helper
  const saveToHistory = (item: TranscriptionItem) => {
    const updated = [item, ...history.filter((h) => h.id !== item.id)].slice(0, 30);
    setHistory(updated);
    try {
      localStorage.setItem('hebrew_transcriptions_history', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('hebrew_transcriptions_history');
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setError(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    } else {
      setAudioUrl(null);
    }
  };

  const processAudioFile = async (fileToProcess: File) => {
    setIsProcessing(true);
    setError(null);
    setProcessingStage('מכין את קובץ האודיו לשליחה...');

    try {
      let data: any = null;
      const isDirectUpload = fileToProcess.size <= 45 * 1024 * 1024; // If <= 45MB, send in single direct request

      if (isDirectUpload) {
        setProcessingStage('שולח קובץ ל-Gemini AI לתמלול ותרגום...');
        
        // Single direct upload with retry
        let attempts = 0;
        let success = false;
        let lastError: any = null;

        while (attempts < 3 && !success) {
          attempts++;
          try {
            const formData = new FormData();
            formData.append('audio', fileToProcess);
            if (customInstructions.trim()) {
              formData.append('customInstructions', customInstructions.trim());
            }

            let response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
              }
              success = true;
            } else {
              const text = await response.text();
              if (text.includes('Cookie check') || text.includes('auth_flow') || text.includes('<!doctype html>')) {
                setProcessingStage('מרענן חיבור לרשת, מנסה שוב...');
                await new Promise((r) => setTimeout(r, 1200));
                continue;
              }
              throw new Error(`תגובת שרת לא תקינה (${response.status})`);
            }
          } catch (err: any) {
            lastError = err;
            if (attempts < 3) {
              setProcessingStage(`מתחבר מחדש לשרת (ניסיון ${attempts + 1}/3)...`);
              await new Promise((r) => setTimeout(r, 1000 * attempts));
            }
          }
        }

        if (!success || !data) {
          throw lastError || new Error('שגיאה בשליחת הקובץ לשרת.');
        }
      } else {
        // Chunked upload for larger files (>45MB) with 15MB chunks to optimize network overhead and reduce backend requests
        const CHUNK_SIZE = 15 * 1024 * 1024;
        const totalChunks = Math.ceil(fileToProcess.size / CHUNK_SIZE);
        const uploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);

        setProcessingStage(`מעלה קובץ בשרת... (0%)`);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileToProcess.size);
          const chunk = fileToProcess.slice(start, end);

          let chunkUploaded = false;
          let chunkAttempts = 0;

          while (chunkAttempts < 5 && !chunkUploaded) {
            chunkAttempts++;
            try {
              const chunkData = new FormData();
              chunkData.append('chunk', chunk);
              chunkData.append('uploadId', uploadId);
              chunkData.append('chunkIndex', i.toString());
              chunkData.append('totalChunks', totalChunks.toString());
              chunkData.append('mimeType', fileToProcess.type);
              if (customInstructions.trim()) {
                chunkData.append('customInstructions', customInstructions.trim());
              }

              const chunkRes = await fetch('/api/upload-chunk', {
                method: 'POST',
                body: chunkData,
              });

              if (chunkRes.ok) {
                chunkUploaded = true;
              } else {
                throw new Error(`Chunk ${i + 1} rejected with status ${chunkRes.status}`);
              }
            } catch (err) {
              if (chunkAttempts >= 5) {
                throw new Error(`שגיאת העלאת מקטע ${i + 1} מתוך ${totalChunks}. אנא נסה/י שוב.`);
              }
              await new Promise((r) => setTimeout(r, 1000 * chunkAttempts));
            }
          }

          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setProcessingStage(`מעלה קובץ בשרת... (${progress}%)`);
        }

        setProcessingStage('שולח ל-Gemini AI לתמלול בעברית ותרגום לאנגלית...');

        let attempts = 0;
        let success = false;
        let lastError: any = null;

        while (attempts < 3 && !success) {
          attempts++;
          try {
            let response = await fetch('/api/transcribe-chunked', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uploadId }),
            });

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
              }
              success = true;
            } else {
              const responseText = await response.text();
              if (responseText.includes('Cookie check') || responseText.includes('auth_flow') || responseText.includes('<!doctype html>')) {
                setProcessingStage('מרענן חיבור לרשת, מנסה שוב...');
                await new Promise((r) => setTimeout(r, 1200));
                continue;
              }
              throw new Error(`תגובת שרת לא תקינה (${response.status})`);
            }
          } catch (err: any) {
            lastError = err;
            if (attempts < 3) {
              setProcessingStage(`ממתין לתגובת AI (ניסיון ${attempts + 1}/3)...`);
              await new Promise((r) => setTimeout(r, 1500 * attempts));
            }
          }
        }

        if (!success || !data) {
          throw lastError || new Error('שגיאה בעיבוד התמלול בשרת.');
        }
      }

      const newItem: TranscriptionItem = {
        id: 'trans_' + Date.now(),
        fileName: fileToProcess.name,
        fileSize: fileToProcess.size,
        timestamp: data.timestamp || new Date().toISOString(),
        hebrewText: data.hebrewText,
        englishText: data.englishText,
        rawResponse: data.rawResponse,
        status: 'completed',
        audioUrl: audioUrl || URL.createObjectURL(fileToProcess),
        segments: data.segments || [],
      };

      setActiveItem(newItem);
      saveToHistory(newItem);
    } catch (err: any) {
      console.error('Transcription failed:', err);
      let msg = err.message || 'An unexpected error occurred during transcription.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        msg = 'שגיאת תקשורת עם השרת (Failed to fetch). אנא לחץ/י שוב על כפתור התמלול.';
      }
      setError(msg);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleTranscribeClick = () => {
    if (!selectedFile) return;
    processAudioFile(selectedFile);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col antialiased">
      {/* Navbar */}
      <Navbar
        hasApiKey={hasApiKey}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenPromptInfo={() => setIsPromptModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Banner header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden border border-stone-800"
        >
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
            <Languages className="w-64 h-64 text-amber-500" />
          </div>

          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Movie Dubbing & Hebrew Audio Processing Engine
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
              Movie Dubbing & Hebrew Audio Transcription
            </h2>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              <strong>Movie Dubbing</strong> is the go-to solution for video editors, film narrators, and content creators who need fast, high-quality translated audio tracks for movies, documentaries, or cinematic clips. Supports 20+ languages and genre-specific voice styles—from drama to sci-fi.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-400">
              <span className="flex items-center gap-1 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/80 text-stone-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Original Hebrew Text
              </span>
              <span className="flex items-center gap-1 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/80 text-stone-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                Natural English Translation & Movie Dubbing
              </span>
              <span className="flex items-center gap-1 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/80 font-mono text-[11px] text-amber-300/90">
                SRT Synchronized Timecodes
              </span>
            </div>
          </div>
        </motion.div>

        {/* API Key Missing Alert if applicable */}
        {!hasApiKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 shadow-2xs"
          >
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-sm">Gemini API Key Required</p>
              <p>
                To run audio transcriptions, please ensure your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> is set in your AI Studio secrets panel or environment variables.
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 shadow-2xs"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-sm">Processing Failed</p>
              <p>{error}</p>
            </div>
          </motion.div>
        )}

        {/* Audio Input Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Input controls */}
          <div className="lg:col-span-5 space-y-5">
            {/* Mode selection tabs */}
            <div className="flex bg-stone-200/70 p-1 rounded-2xl text-xs font-semibold">
              <button
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition relative ${
                  inputMode === 'upload'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Upload className="w-4 h-4 text-amber-600" />
                Upload File
              </button>
              <button
                onClick={() => setInputMode('record')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition relative ${
                  inputMode === 'record'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Mic className="w-4 h-4 text-amber-600" />
                Record Live Mic
              </button>
            </div>

            {/* Selected mode component */}
            <AnimatePresence mode="wait">
              {inputMode === 'upload' ? (
                <motion.div key="upload-mode" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <AudioUploader
                    selectedFile={selectedFile}
                    onFileSelect={handleFileChange}
                    onTranscribe={handleTranscribeClick}
                    isProcessing={isProcessing}
                  />
                </motion.div>
              ) : (
                <motion.div key="record-mode" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <AudioRecorder
                    onAudioReady={(recordedFile) => {
                      setSelectedFile(recordedFile);
                      const url = URL.createObjectURL(recordedFile);
                      setAudioUrl(url);
                      processAudioFile(recordedFile);
                    }}
                    isProcessing={isProcessing}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prompt Spec Quick Button */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Exact Prompt Format
                </span>
                <button
                  onClick={() => setIsPromptModalOpen(true)}
                  className="text-amber-700 hover:underline font-medium text-[11px]"
                >
                  View / Edit Context
                </button>
              </div>
              <p className="text-[11px] text-stone-500">
                Generates original Hebrew text followed by clear English translation using Gemini 2.5 Flash.
              </p>
            </motion.div>
          </div>

          {/* Right Panel: Output / Processing State */}
          <div className="lg:col-span-7 space-y-5">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/80 shadow-inner">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-stone-900">Transcribing & Translating...</h3>
                    <p className="text-xs text-stone-500 font-mono">{processingStage}</p>
                  </div>
                  <div className="w-full max-w-xs mx-auto bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-full w-1/2 rounded-full"
                    />
                  </div>
                </motion.div>
              ) : activeItem ? (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <ResultCard item={activeItem} audioUrl={audioUrl} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-3 shadow-2xs"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-600 border border-amber-200/50">
                    <Languages className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-700">Ready for Audio</h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                      Upload an audio file or start recording with your microphone to view the Hebrew transcription and English translation here.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modals & Drawers */}
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        customInstructions={customInstructions}
        onCustomInstructionsChange={setCustomInstructions}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectItem={(item) => setActiveItem(item)}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
}

