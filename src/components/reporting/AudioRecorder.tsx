import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, AlertCircle } from 'lucide-react';
import { AudioNote } from '../../types';

interface AudioRecorderProps {
  audioNote: AudioNote | undefined;
  onChange: (note: AudioNote | undefined) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioNote, onChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone capture not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onChange({
          id: `audio-${Date.now()}`,
          url: audioUrl,
          durationSeconds: recordingSeconds || 3,
          createdAt: new Date().toISOString()
        });
        // Stop audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Microphone access denied';
      setPermissionError(`${errorMsg}. You can also attach a simulated test voice note below.`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleSimulatedAudio = () => {
    // Generate an audio note for simulation in sandboxed / no-mic environments
    onChange({
      id: `audio-sample-${Date.now()}`,
      url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
      durationSeconds: 6,
      createdAt: new Date().toISOString()
    });
    setPermissionError(null);
  };

  const togglePlayback = () => {
    if (!audioNote) return;

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioNote.url);
      audioElementRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };
      audioElementRef.current.ontimeupdate = () => {
        if (audioElementRef.current) {
          setPlaybackTime(Math.floor(audioElementRef.current.currentTime));
        }
      };
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const removeAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackTime(0);
    onChange(undefined);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div id="audio-attachment-panel" className="bg-stone-50 border border-stone-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-stone-700" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Audio Voice Note Attachment
          </span>
        </div>
        <span className="text-xs text-stone-500">
          {audioNote ? 'Audio attached' : 'Optional verbal notes'}
        </span>
      </div>

      {permissionError && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <p>{permissionError}</p>
            <button
              type="button"
              onClick={handleSimulatedAudio}
              className="mt-1.5 underline font-medium text-amber-900 hover:text-amber-950"
            >
              + Use Simulated Voice Memo
            </button>
          </div>
        </div>
      )}

      {!audioNote ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-stone-200">
          <div className="flex items-center space-x-3">
            {isRecording ? (
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                <Mic className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-stone-900">
                {isRecording ? 'Recording Live Audio...' : 'Record Voice Observation'}
              </div>
              <div className="text-xs text-stone-500">
                {isRecording ? `${formatSeconds(recordingSeconds)} elapsed (speak clearly)` : 'Record up to 60s note'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isRecording ? (
              <>
                <button
                  type="button"
                  id="btn-record-audio-start"
                  onClick={startRecording}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Mic</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulatedAudio}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Test Sample
                </button>
              </>
            ) : (
              <button
                type="button"
                id="btn-record-audio-stop"
                onClick={stopRecording}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Attach ({formatSeconds(recordingSeconds)})</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              id="btn-audio-playback-toggle"
              onClick={togglePlayback}
              className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div>
              <div className="text-sm font-semibold text-stone-900 flex items-center space-x-2">
                <span>Voice Note Attached</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                  Audio Ready
                </span>
              </div>
              <div className="text-xs text-stone-500 flex items-center space-x-2">
                <span>{isPlaying ? formatSeconds(playbackTime) : '0:00'}</span>
                <span>/</span>
                <span>{formatSeconds(audioNote.durationSeconds)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={removeAudio}
            title="Delete Audio Note"
            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
