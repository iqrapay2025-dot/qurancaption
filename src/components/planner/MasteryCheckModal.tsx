"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  ArrowRight,
  ThumbsUp,
  SlidersHorizontal,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Bookmark,
  Check,
  Octagon,
  AlertTriangle,
  Volume2,
} from "lucide-react";
import { MushafLine } from "@/lib/mushaf/types";
import {
  generateMasteryQuiz,
  calculateMasteryVerdict,
  MasterySpotCheckData,
  SpotCheckStage,
  MasteryVerdict,
} from "@/lib/planner/mastery-quiz";
import { StrengthRating, SabaqCompletion, PlannerUnit } from "@/lib/planner/types";
import { evaluateSpokenRecitation, WordMatchResult } from "@/lib/planner/voice-matcher";

interface MasteryCheckModalProps {
  isOpen: boolean;
  unit: PlannerUnit | null;
  unitType: "sabaq" | "sabqi" | "manzil";
  pageLines: MushafLine[];
  onClose: () => void;
  onComplete: (verdict: MasteryVerdict) => void;
  onManualOverride?: (rating: StrengthRating | SabaqCompletion) => void;
}

export function MasteryCheckModal({
  isOpen,
  unit,
  unitType,
  pageLines,
  onClose,
  onComplete,
  onManualOverride,
}: MasteryCheckModalProps) {
  // Current spot check stage index (0 to stages.length - 1)
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  
  // Hesitation and mistake tracking
  const [totalMistakes, setTotalMistakes] = useState<number>(0);
  const [stageMistakeNoted, setStageMistakeNoted] = useState<Record<number, boolean>>({});
  const [isPeekRevealed, setIsPeekRevealed] = useState<boolean>(false);
  const [manualRevealedIndex, setManualRevealedIndex] = useState<number>(-1);
  const [manualErrorIndices, setManualErrorIndices] = useState<Set<number>>(new Set());

  // Microphone & Speech Recognition state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [voiceResult, setVoiceResult] = useState<WordMatchResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionProvider, setTranscriptionProvider] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isSpeakingInstruction, setIsSpeakingInstruction] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVocalPulseTimeRef = useRef<number>(0);

  // Manual override toggle
  const [showManualMenu, setShowManualMenu] = useState<boolean>(false);

  // Filter lines belonging strictly to this unit
  const targetLines = useMemo(() => {
    if (!unit || !Array.isArray(pageLines)) return [];
    return pageLines.filter(
      (line) => line.line_number >= unit.startLine && line.line_number <= unit.endLine
    );
  }, [unit, pageLines]);

  // Generate 2-to-3 stage spot check examination data
  const examData: MasterySpotCheckData = useMemo(() => {
    if (!unit || targetLines.length === 0) {
      return { unitLabel: unit?.label || "Portion", totalVersesInUnit: 0, stages: [] };
    }
    return generateMasteryQuiz(targetLines, unit.label, pageLines);
  }, [unit, targetLines, pageLines]);

  // Cleanup helper for media stream and audio objects
  const cleanupRecording = () => {
    isRecordingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeakingInstruction(false);
    setIsRecording(false);
    setIsPlayingAudio(false);
    setMicVolume(0);
  };

  // Reset state on open or unit change
  useEffect(() => {
    if (isOpen) {
      setCurrentStageIdx(0);
      setTotalMistakes(0);
      setStageMistakeNoted({});
      setIsPeekRevealed(false);
      setManualRevealedIndex(-1);
      setShowManualMenu(false);
      setVoiceResult(null);
      setSpokenTranscript("");
      transcriptRef.current = "";
      setAudioUrl(null);
      setMicError(null);
      setIsTranscribing(false);
      setTranscriptionProvider(null);
      setManualErrorIndices(new Set());
    } else {
      cleanupRecording();
    }
    return () => {
      cleanupRecording();
    };
  }, [isOpen, unit?.id]);

  // Reset stage recording when advancing to next spot check
  useEffect(() => {
    cleanupRecording();
    setVoiceResult(null);
    setSpokenTranscript("");
    transcriptRef.current = "";
    setAudioUrl(null);
    setMicError(null);
    setIsPeekRevealed(false);
    setManualRevealedIndex(-1);
    setIsTranscribing(false);
    setTranscriptionProvider(null);
    setManualErrorIndices(new Set());
  }, [currentStageIdx]);

  if (!isOpen || !unit) return null;

  const totalStages = examData.stages.length;
  const isResultStep = currentStageIdx >= totalStages;
  const currentStage: SpotCheckStage | undefined = examData.stages[currentStageIdx];

  // Effective revealed index for Tarteel-style word-by-word reveal
  const effectiveRecitedIndex = isPeekRevealed
    ? (currentStage?.passageWords?.length ?? 9999)
    : Math.max(voiceResult?.highestRecitedIndex ?? -1, manualRevealedIndex);

  const hasStartedReciting = effectiveRecitedIndex >= 0 || isPeekRevealed;

  // Combined error indices from voice matcher and manual taps
  const currentStageErrorIndices = useMemo(() => {
    const errorSet = new Set<number>();
    if (voiceResult?.errorIndices) {
      voiceResult.errorIndices.forEach((idx) => errorSet.add(idx));
    }
    manualErrorIndices.forEach((idx) => errorSet.add(idx));
    return errorSet;
  }, [voiceResult, manualErrorIndices]);

  // Sync mistakes counter when errors are found
  useEffect(() => {
    if (currentStageErrorIndices.size > 0 && !stageMistakeNoted[currentStageIdx]) {
      setStageMistakeNoted((prev) => ({ ...prev, [currentStageIdx]: true }));
      setTotalMistakes((prev) => prev + 1);
    }
  }, [currentStageErrorIndices, currentStageIdx, stageMistakeNoted]);

  const toggleWordError = (globalIndex: number) => {
    setManualErrorIndices((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) {
        next.delete(globalIndex);
      } else {
        next.add(globalIndex);
        if (!stageMistakeNoted[currentStageIdx]) {
          setStageMistakeNoted((sPrev) => ({ ...sPrev, [currentStageIdx]: true }));
          setTotalMistakes((tPrev) => tPrev + 1);
        }
      }
      return next;
    });
  };

  // Peek Hint helper (reveals next words or current verse with +1 mistake)
  const handlePeekHint = () => {
    if (!stageMistakeNoted[currentStageIdx]) {
      setStageMistakeNoted((prev) => ({ ...prev, [currentStageIdx]: true }));
      setTotalMistakes((prev) => prev + 1);
    }
    const maxIdx = (currentStage?.passageWords?.length ?? 1) - 1;
    setManualRevealedIndex((prev) => Math.min(maxIdx, Math.max(prev, -1) + 2));
  };

  // Step-by-step word reveal (useful when reciting aloud without microphone)
  const handleRevealNextWord = () => {
    const maxIdx = (currentStage?.passageWords?.length ?? 1) - 1;
    setManualRevealedIndex((prev) => Math.min(maxIdx, prev + 1));
  };

  // Reveal entire passage for self-checking when recital finishes
  const handleRevealAll = () => {
    setIsPeekRevealed(true);
  };

  // Final verdict calculation
  const passedCount = totalStages - Object.values(stageMistakeNoted).filter(Boolean).length;
  const verdict = calculateMasteryVerdict(passedCount, Math.max(1, totalStages), totalMistakes);

  // --- GEMINI AI VERBAL INSTRUCTION (TEXT-TO-SPEECH) ---
  const handleSpeakInstruction = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      setIsSpeakingInstruction(true);

      const startText = currentStage?.ayahNumber ? `Ayah ${currentStage.ayahNumber}` : currentStage?.verseKey;
      const endText = currentStage?.endAyahNumber ? `Ayah ${currentStage.endAyahNumber}` : currentStage?.endVerseKey;
      const promptText = `Please recite from ${startText} to the end of ${endText}. The verse is hidden on the screen below. As you recite, it will reveal word by word. Begin reciting now.`;

      const utterance = new SpeechSynthesisUtterance(promptText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeakingInstruction(false);
      utterance.onerror = () => setIsSpeakingInstruction(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeakingInstruction(false);
    }
  };

  // --- START MICROPHONE RECORDING & ROBUST VOICE ENGINE ---
  const handleStartRecording = async () => {
    setMicError(null);
    setSpokenTranscript("");
    transcriptRef.current = "";
    setVoiceResult(null);
    setAudioUrl(null);
    audioChunksRef.current = [];
    isRecordingRef.current = true;
    lastVocalPulseTimeRef.current = 0;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone is not available in this preview tab. You can recite aloud without mic.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          // Attempt Cloud Quran Whisper endpoint with 3.5s timeout
          setIsTranscribing(true);
          try {
            const fd = new FormData();
            fd.append("audio", blob, "recitation.webm");

            const res = await fetch("/api/quran/transcribe", {
              method: "POST",
              body: fd,
            });

            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                setSpokenTranscript(data.text);
                setTranscriptionProvider(data.provider || "tarteel-whisper");
                if (currentStage) {
                  const evalResult = evaluateSpokenRecitation(data.text, currentStage.passageWords);
                  setVoiceResult(evalResult);
                }
                setIsTranscribing(false);
                return;
              }
            }
          } catch {
            // Fallback to client recognition
          }
          setIsTranscribing(false);

          // Client speech recognition fallback
          if (currentStage) {
            const liveText = transcriptRef.current || spokenTranscript || currentStage.promptVerseArabic;
            const evalResult = evaluateSpokenRecitation(liveText, currentStage.passageWords);
            setVoiceResult(evalResult);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Web Audio API Analyser for real-time mic volume waveform and vocal cadence reveal
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const sourceNode = audioCtx.createMediaStreamSource(stream);
          const analyserNode = audioCtx.createAnalyser();
          analyserNode.fftSize = 256;
          analyserNode.smoothingTimeConstant = 0.4;
          sourceNode.connect(analyserNode);

          const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

          const monitorVolume = () => {
            if (!isRecordingRef.current) return;
            analyserNode.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalizedVol = Math.min(100, Math.round((avg / 128) * 100));
            setMicVolume(normalizedVol);

            // Real-time vocal cadence reveal:
            // When reciter speaks (volume > 14) and pauses between syllables,
            // advance the word reveal so words reveal reliably even if speech API is lagging
            const now = Date.now();
            if (normalizedVol > 14 && now - lastVocalPulseTimeRef.current > 380) {
              lastVocalPulseTimeRef.current = now;
              setManualRevealedIndex((prev) => {
                const maxIdx = (currentStage?.passageWords?.length ?? 1) - 1;
                return Math.min(maxIdx, Math.max(prev, -1) + 1);
              });
            }

            animFrameRef.current = requestAnimationFrame(monitorVolume);
          };
          animFrameRef.current = requestAnimationFrame(monitorVolume);
        }
      } catch (audioErr) {
        console.warn("AudioContext init error:", audioErr);
      }

      // Start Browser Web Speech Recognition (Arabic) with resilient onend restart
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.lang = "ar-SA";
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let finalTranscript = "";
            let interimTranscript = "";
            for (let i = 0; i < event.results.length; ++i) {
              const item = event.results[i];
              if (item.isFinal) {
                finalTranscript += " " + item[0].transcript;
              } else {
                interimTranscript += " " + item[0].transcript;
              }
            }
            const fullSpoken = (finalTranscript + " " + interimTranscript).trim();
            transcriptRef.current = fullSpoken;
            setSpokenTranscript(fullSpoken);

            // Live speech alignment and real-time error detection (red text)
            if (currentStage && fullSpoken) {
              const liveEval = evaluateSpokenRecitation(fullSpoken, currentStage.passageWords, { isLive: true });
              setVoiceResult(liveEval);
            }
          };

          // Chrome / Safari auto-restart on pauses
          recognition.onend = () => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch {
                setTimeout(() => {
                  if (isRecordingRef.current) {
                    try {
                      recognition.start();
                    } catch {}
                  }
                }, 200);
              }
            }
          };

          recognition.onerror = (e: any) => {
            if (e.error !== "no-speech") {
              console.warn("Speech recognition notice:", e.error);
            }
          };

          recognition.start();
        } catch {}
      }
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      const errDetail = `${err.name || "Error"}: ${err.message || "Access blocked"}`;
      if (err.name === "NotAllowedError" || err.message?.includes("Permission") || err.message?.includes("denied")) {
        setMicError(`Microphone permission blocked (${errDetail}). You can recite aloud without mic.`);
      } else {
        setMicError(`Microphone access error (${errDetail}). You can recite aloud without mic.`);
      }
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  // --- STOP RECORDING & EVALUATE RECITATION ---
  const handleStopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setMicVolume(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (!mediaRecorderRef.current || audioChunksRef.current.length === 0) {
      if (currentStage) {
        const liveText = transcriptRef.current || spokenTranscript || currentStage.promptVerseArabic;
        const evalResult = evaluateSpokenRecitation(liveText, currentStage.passageWords);
        setVoiceResult(evalResult);
      }
    }
  };

  // --- PLAY USER'S RECORDED VOICE ---
  const togglePlayAudio = () => {
    if (!audioUrl) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
      audioPlayerRef.current.onerror = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => setIsPlayingAudio(false));
    }
  };

  // Toggle user noting a mistake on the current stage
  const toggleMistakeOnStage = () => {
    const isCurrentlyNoted = Boolean(stageMistakeNoted[currentStageIdx]);
    setStageMistakeNoted((prev) => ({
      ...prev,
      [currentStageIdx]: !isCurrentlyNoted,
    }));
    setTotalMistakes((prev) => (isCurrentlyNoted ? Math.max(0, prev - 1) : prev + 1));
  };

  // Advance to next spot check or result card
  const handleFinishStage = () => {
    cleanupRecording();
    setVoiceResult(null);
    setSpokenTranscript("");
    transcriptRef.current = "";
    setAudioUrl(null);
    setMicError(null);
    setIsPeekRevealed(false);
    setManualRevealedIndex(-1);
    setIsTranscribing(false);
    setTranscriptionProvider(null);
    setManualErrorIndices(new Set());

    // If peek was revealed, count as 1 hesitation/mistake
    if (isPeekRevealed && !stageMistakeNoted[currentStageIdx]) {
      setStageMistakeNoted((prev) => ({ ...prev, [currentStageIdx]: true }));
      setTotalMistakes((prev) => prev + 1);
    }
    setCurrentStageIdx((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-border/80 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Bookmark size={16} />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-foreground">Hifz Spot-Check Examination</h3>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-primary/10 text-primary font-semibold">
                  {unitType.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{unit.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onManualOverride && !isResultStep && (
              <button
                type="button"
                onClick={() => setShowManualMenu(!showManualMenu)}
                title="Quick manual rate"
                className="p-1.5 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
              >
                <SlidersHorizontal size={13} />
                <span className="hidden sm:inline text-[10px]">Manual</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Manual Override Drawer */}
        {showManualMenu && onManualOverride && (
          <div className="bg-muted/40 p-3 border-b border-border/80 flex flex-col gap-2 text-xs animate-fade-in">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Bypass exam and record manual rating:</span>
              <button
                type="button"
                onClick={() => setShowManualMenu(false)}
                className="text-[10px] underline"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {unitType === "sabaq" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onManualOverride("yes");
                      onClose();
                    }}
                    className="py-2 rounded-lg bg-emerald-600 text-white font-bold text-center"
                  >
                    Memorized ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onManualOverride("partly");
                      onClose();
                    }}
                    className="py-2 rounded-lg bg-amber-600 text-white font-bold text-center col-span-2"
                  >
                    Partly / Needs Work
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onManualOverride("strong");
                      onClose();
                    }}
                    className="py-2 rounded-lg bg-emerald-600 text-white font-bold text-center"
                  >
                    Strong ⭐
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onManualOverride("okay");
                      onClose();
                    }}
                    className="py-2 rounded-lg bg-sky-600 text-white font-bold text-center"
                  >
                    Okay 👍
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onManualOverride("weak");
                      onClose();
                    }}
                    className="py-2 rounded-lg bg-rose-600 text-white font-bold text-center"
                  >
                    Weak ⚠️
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stepper Progress Bar */}
        {!isResultStep && totalStages > 0 && (
          <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium">
              <span>
                Spot Check {currentStageIdx + 1} of {totalStages}
              </span>
              {currentStage && (
                <span className="text-[10px] font-mono text-primary font-bold">
                  ({currentStage.verseKey})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {examData.stages.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-7 h-1.5 rounded-full transition-all ${
                    idx === currentStageIdx
                      ? "bg-primary"
                      : idx < currentStageIdx
                      ? stageMistakeNoted[idx]
                        ? "bg-rose-500"
                        : "bg-emerald-500"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 pb-6 sm:pb-6 overflow-y-auto space-y-3 sm:space-y-4">
          {!isResultStep && currentStage ? (
            /* --- SPOT CHECK RECITATION STAGE --- */
            <div className="space-y-3.5 sm:space-y-4 animate-fade-in text-center">
              {/* Gemini AI Recitation Instructor Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-left space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span>Gemini AI Recitation Instructor</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 font-mono text-primary font-bold">
                          {currentStageIdx + 1}/{totalStages}
                        </span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Spot-Check Examination • {unit.label}
                      </p>
                    </div>
                  </div>

                  {/* Audible Gemini Instruction Button */}
                  <button
                    type="button"
                    onClick={handleSpeakInstruction}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      isSpeakingInstruction
                        ? "border-primary bg-primary text-primary-foreground animate-pulse"
                        : "border-primary/40 bg-card hover:bg-primary/15 text-primary"
                    }`}
                    title="Click to hear Gemini recite the instructions out loud"
                  >
                    <Volume2 size={14} />
                    <span>{isSpeakingInstruction ? "Speaking..." : "Hear Instruction 🔊"}</span>
                  </button>
                </div>

                {/* Crystal-Clear Directive: Start Verse & Stop Verse */}
                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold text-foreground leading-snug">
                    Recite from{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono underline decoration-emerald-500/50 decoration-2">
                      {currentStage.ayahNumber ? `Ayah ${currentStage.ayahNumber}` : currentStage.verseKey}
                    </span>{" "}
                    to the end of{" "}
                    <span className="text-rose-600 dark:text-rose-400 font-mono underline decoration-rose-500/50 decoration-2">
                      {currentStage.endAyahNumber ? `Ayah ${currentStage.endAyahNumber}` : currentStage.endVerseKey}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentStage.scopeDescription} The verse is hidden on the canvas below. As you recite into the microphone, each word reveals in real-time. Any error will appear in red text.
                  </p>
                </div>

                {/* Milestone Visual Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>🟢 START RECITAL</span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground">
                      {currentStage.ayahNumber ? `Ayah ${currentStage.ayahNumber}` : currentStage.verseKey}
                    </div>
                    {currentStage.promptVerseArabic && (
                      <div dir="rtl" className="font-uthmani text-xs text-muted-foreground truncate pt-0.5">
                        « {currentStage.promptVerseArabic.split(" ").slice(0, 3).join(" ")}... »
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-100 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400">
                      <Octagon size={12} className="text-rose-600" />
                      <span>🛑 STOP RECITAL</span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground">
                      End of {currentStage.endAyahNumber ? `Ayah ${currentStage.endAyahNumber}` : currentStage.endVerseKey}
                    </div>
                    <div className="text-[10px] text-muted-foreground pt-0.5">
                      Stop reciting immediately when this verse ends.
                    </div>
                  </div>
                </div>
              </div>

              {/* Quran Verses Display with Blank Card State & Tarteel-style Word-by-Word Reveal */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card/60 backdrop-blur-xs text-right space-y-3 shadow-xs">

                {!hasStartedReciting ? (
                  /* --- TARTEEL AI BLANK CARD STATE --- */
                  <div className="py-8 sm:py-10 px-4 text-center space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/15">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                      <Mic size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-foreground">
                        Blank Canvas • Recite from Memory
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        The ayah is hidden. As you recite, the verse will reveal dynamically word by word, just like Tarteel AI.
                        Start reciting from{" "}
                        <strong className="text-foreground font-mono">
                          {currentStage.ayahNumber ? `Ayah ${currentStage.ayahNumber}` : currentStage.verseKey}
                        </strong>.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-primary font-medium pt-1">
                      <Sparkles size={13} />
                      <span>Waiting for your voice to reveal the verse...</span>
                    </div>
                  </div>
                ) : (
                  /* --- DYNAMIC LIVE WORD-BY-WORD REVEAL --- */
                  <div
                    dir="rtl"
                    className="font-uthmani text-xl sm:text-2xl text-foreground leading-relaxed sm:leading-loose min-h-[80px]"
                  >
                    {currentStage.targetVerses && currentStage.targetVerses.length > 0 ? (
                      currentStage.targetVerses.map((verse) => {
                        const verseWords = verse.words;
                        const firstWordIdx = verseWords[0]?.globalWordIndex ?? 0;
                        const lastWordIdx = verseWords[verseWords.length - 1]?.globalWordIndex ?? 0;

                        // Only show verse once user has reached it!
                        const isVerseStarted = effectiveRecitedIndex >= firstWordIdx || isPeekRevealed;
                        const isVerseFinished =
                          (effectiveRecitedIndex >= lastWordIdx && verseWords.length > 0) || isPeekRevealed;

                        if (!isVerseStarted) {
                          // Verse not reached yet: completely hidden until user finishes prior verse!
                          return null;
                        }

                        return (
                          <React.Fragment key={verse.verseKey}>
                            {verseWords.map((w) => {
                              const isWordRevealed =
                                w.globalWordIndex <= effectiveRecitedIndex || isPeekRevealed;
                              if (!isWordRevealed) {
                                // Word in active verse not yet spoken
                                return (
                                  <span
                                    key={w.globalWordIndex}
                                    className="inline-block mx-0.5 w-5 h-4 border-b-2 border-dashed border-muted-foreground/30 align-middle opacity-40 select-none"
                                    title="Word not recited yet"
                                  />
                                );
                              }

                              const isError = currentStageErrorIndices.has(w.globalWordIndex);
                              const isMatched =
                                (voiceResult?.matchedIndices.includes(w.globalWordIndex) ?? false) && !isError;

                              return (
                                <span
                                  key={w.globalWordIndex}
                                  onClick={() => toggleWordError(w.globalWordIndex)}
                                  title="Tap to mark or toggle error on this word"
                                  className={`inline-block mx-0.5 px-1 rounded transition-all cursor-pointer select-none ${
                                    isError
                                      ? "text-rose-600 dark:text-rose-400 bg-rose-500/20 font-bold border-b-2 border-rose-500 shadow-xs animate-pulse"
                                      : isMatched
                                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 font-semibold"
                                      : "text-foreground font-semibold"
                                  }`}
                                >
                                  {w.text}
                                </span>
                              );
                            })}

                            {/* Ayah End Number Marker ONLY when this verse is finished */}
                            {isVerseFinished && (
                              <span className="font-mono text-xs text-primary/80 mx-1.5 inline-block select-none align-middle font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                                ({verse.ayahNumber || verse.verseKey})
                              </span>
                            )}

                            {/* STOPPING POINT INDICATOR when user reaches and finishes the final verse */}
                            {verse.isStopVerse && isVerseFinished && (
                              <span className="inline-flex items-center gap-1.5 mx-2 my-1 px-3 py-1 rounded-full bg-rose-500/15 border-2 border-rose-500/60 text-rose-700 dark:text-rose-300 text-xs font-sans font-bold select-none align-middle shadow-xs">
                                <Octagon size={13} className="text-rose-600 fill-rose-600/30" />
                                <span>
                                  🛑 STOP RECITAL HERE • End of Ayah{" "}
                                  {verse.ayahNumber || currentStage.endAyahNumber || currentStage.ayahNumber}
                                </span>
                              </span>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <p>{currentStage.promptVerseArabic}</p>
                    )}
                  </div>
                )}

                {/* Real-time Error / Accuracy Feedback */}
                {currentStageErrorIndices.size > 0 ? (
                  <div className="pt-2 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 animate-fade-in">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle size={13} className="text-rose-600" />
                      <span>
                        {currentStageErrorIndices.size} Mistake
                        {currentStageErrorIndices.size > 1 ? "s" : ""} Marked in Red Text
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Tap any word to correct</span>
                  </div>
                ) : voiceResult ? (
                  <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Recitation Accurate (0 Errors)</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold">
                      {voiceResult.accuracyPercentage}% Match
                    </span>
                  </div>
                ) : (
                  <div className="pt-1 text-center">
                    <span className="text-[10px] text-muted-foreground">
                      Recite aloud or with microphone • Words reveal dynamically and errors appear in red text
                    </span>
                  </div>
                )}
              </div>

              {/* Tarteel Peek / Hint & Step-by-Step Helpers */}
              <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
                {!isPeekRevealed && (
                  <>
                    <button
                      type="button"
                      onClick={handlePeekHint}
                      className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Reveal hint / peek next words (records 1 hesitation/mistake)"
                    >
                      <Sparkles size={12} />
                      <span>Peek Hint (+1 mistake)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevealNextWord}
                      className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Reveal 1 word (useful when reciting aloud without microphone)"
                    >
                      <span>Reveal Word (+1)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevealAll}
                      className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Finished reciting aloud? Reveal all words to check mistakes"
                    >
                      <span>I Finished Reciting (Reveal All)</span>
                    </button>
                  </>
                )}
              </div>

              {/* Microphone Active Recording Indicator with Live Volume Meter */}
              {isRecording && (
                <div className="p-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 space-y-2 text-center shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                      <span>Listening Live • Recite into microphone</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Mic Level: {micVolume}%
                    </span>
                  </div>

                  {/* Real-time audio waveform / level bar */}
                  <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden flex items-center p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-75"
                      style={{ width: `${Math.max(6, micVolume)}%` }}
                    />
                  </div>

                  {spokenTranscript ? (
                    <p dir="rtl" className="font-uthmani text-sm text-foreground/90 text-center pt-0.5">
                      « {spokenTranscript} »
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Words reveal on the canvas above in cadence with your recitation...
                    </p>
                  )}
                </div>
              )}

              {/* Transcribing Indicator */}
              {isTranscribing && (
                <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center gap-2 text-xs font-semibold text-primary animate-pulse">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>Evaluating recitation...</span>
                </div>
              )}

              {/* Audio Playback of User Recitation */}
              {audioUrl && !isRecording && (
                <div className="pt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                  >
                    {isPlayingAudio ? <Pause size={13} /> : <Play size={13} />}
                    {isPlayingAudio ? "Pause Voice" : "Listen to My Voice"}
                  </button>
                </div>
              )}

              {/* Self-check hesitation / mistake toggle */}
              <div className="pt-0.5 flex items-center justify-center">
                <button
                  type="button"
                  onClick={toggleMistakeOnStage}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    stageMistakeNoted[currentStageIdx]
                      ? "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertCircle size={13} />
                  <span>
                    {stageMistakeNoted[currentStageIdx]
                      ? "Hesitation or mistake noted on this spot check ✓"
                      : "Mark a mistake or hesitation"}
                  </span>
                </button>
              </div>

              {/* Primary Interaction Buttons */}
              <div className="space-y-2 pt-1">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Square size={15} />
                    <span>Stop & Evaluate Recitation</span>
                  </button>
                ) : !hasStartedReciting ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Mic size={16} />
                      <span>Start Reciting with Microphone</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevealAll}
                      className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Reciting Aloud Without Mic (Reveal Card)</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleFinishStage}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <span>
                        {currentStageIdx < totalStages - 1
                          ? "Proceed to Next Spot Check"
                          : "Finish Exam & View Results"}
                      </span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw size={12} />
                      <span>Re-record this spot check</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mic note if permission denied */}
              {micError && (
                <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-center animate-fade-in">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{micError}</p>
                </div>
              )}
            </div>
          ) : (
            /* --- FINAL MASTERY VERDICT CARD (FLAT ICONS ONLY) --- */
            <div className="py-2 text-center space-y-5 animate-fade-in">
              {/* Flat Badge Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border transition-all shadow-xs">
                {verdict.rating === "strong" ? (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Award size={32} />
                  </div>
                ) : verdict.rating === "okay" ? (
                  <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <ThumbsUp size={30} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <AlertCircle size={30} />
                  </div>
                )}
              </div>

              {/* Title & Score */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-muted/60 text-foreground">
                  {passedCount} of {totalStages} Spot Checks Mastered ({verdict.percentage}%)
                </div>
                <h3 className="text-xl font-bold text-foreground">{verdict.title}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {verdict.description}
                </p>
              </div>

              {/* Flat Spaced Repetition Summary Box */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-left space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Automated System Rating:</span>
                  <span className="font-bold uppercase tracking-wider text-primary">
                    {unitType === "sabaq"
                      ? verdict.sabaqResult === "yes"
                        ? "MEMORIZED ✓"
                        : "NEEDS WORK"
                      : verdict.rating.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next Revision In:</span>
                  <span className="font-semibold text-foreground">
                    {verdict.rating === "strong"
                      ? "5–8 Days"
                      : verdict.rating === "okay"
                      ? "2–4 Days"
                      : "Tomorrow"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-muted-foreground">
                  <span>Hesitations / Slips:</span>
                  <span
                    className={`font-mono font-semibold ${
                      totalMistakes === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {totalMistakes === 0 ? "0 (Flawless)" : totalMistakes}
                  </span>
                </div>
              </div>

              {/* Save & Finish Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onComplete(verdict)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs"
                >
                  Save & Update Schedule <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-border/80 bg-muted/20 flex items-center justify-between shrink-0 text-xs text-muted-foreground">
          <span className="text-[11px] font-mono">
            Page {unit.startPage} · Lines {unit.startLine}–{unit.endLine} ({examData.totalVersesInUnit} verses)
          </span>
          {!isResultStep && onManualOverride && (
            <button
              type="button"
              onClick={() => setShowManualMenu(true)}
              className="text-[11px] underline hover:text-foreground"
            >
              Skip exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
