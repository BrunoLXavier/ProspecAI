/**
 * useMediaRecorder Hook
 *
 * Encapsulates all media recording logic:
 * - Microphone, camera, screen, and system audio recording
 * - Audio stream merging (system + microphone)
 * - Recording lifecycle (start, stop, cleanup)
 * - Recording time tracking
 *
 * Implements RF-08: Communications and collaboration
 */
import { useRef, useState, useCallback } from 'react';
import { RecordingType } from '@/components/features/communications/types';
import { type AttachmentPreview } from './AttachmentGrid';

interface UseMediaRecorderOptions {
  videoPreviewRef: React.RefObject<HTMLVideoElement>;
  onRecordingComplete: (attachment: AttachmentPreview) => void;
}

export default function useMediaRecorder({
  videoPreviewRef,
  onRecordingComplete,
}: UseMediaRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<RecordingType>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Merges multiple audio tracks into a single MediaStream using AudioContext
   */
  const mergeAudioTracks = (streams: MediaStream[]): MediaStream => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();

    streams.forEach(stream => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(destination);
      }
    });

    return destination.stream;
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
    }

    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      setMicrophoneStream(null);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setRecordingType(null);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, [recordingStream, microphoneStream, videoPreviewRef]);

  const startRecording = async (type: RecordingType) => {
    if (!type) return;

    try {
      let stream: MediaStream;
      let micStream: MediaStream | null = null;
      let mimeType: string;
      let attachmentType: 'audio' | 'video';

      switch (type) {
        case 'microphone':
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mimeType = 'audio/webm';
          attachmentType = 'audio';
          break;

        case 'camera':
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode: 'user', width: 1280, height: 720 }
          });
          mimeType = 'video/webm';
          attachmentType = 'video';
          break;

        case 'screen':
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });

          try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicrophoneStream(micStream);

            const audioStreams = [displayStream];
            if (displayStream.getAudioTracks().length > 0 || micStream.getAudioTracks().length > 0) {
              audioStreams.push(micStream);
            }
            const mergedAudio = mergeAudioTracks(audioStreams);

            stream = new MediaStream([
              ...displayStream.getVideoTracks(),
              ...mergedAudio.getAudioTracks()
            ]);
          } catch {
            stream = displayStream;
          }

          mimeType = 'video/webm';
          attachmentType = 'video';
          break;

        case 'systemAudio':
          const systemStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1, height: 1 },
            audio: true
          });

          const audioTracks = systemStream.getAudioTracks();
          if (audioTracks.length === 0) {
            throw new Error('No system audio track available');
          }

          systemStream.getVideoTracks().forEach(track => track.stop());

          stream = new MediaStream(audioTracks);
          mimeType = 'audio/webm';
          attachmentType = 'audio';
          break;

        default:
          return;
      }

      setRecordingStream(stream);

      if ((type === 'camera' || type === 'screen') && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        const fileName = `${type}-recording-${Date.now()}.webm`;
        const file = new File([blob], fileName, { type: mimeType });

        onRecordingComplete({
          file,
          type: attachmentType,
          previewUrl: attachmentType === 'video' ? URL.createObjectURL(blob) : undefined,
          originalBlob: blob,
        });

        stream.getTracks().forEach(track => track.stop());
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
        }
        setRecordingStream(null);
        setMicrophoneStream(null);

        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      // Handle screen share stop by user (clicking "Stop sharing" in browser)
      if (type === 'screen' || type === 'systemAudio') {
        stream.getVideoTracks().forEach(track => {
          track.onended = () => stopRecording();
        });
        stream.getAudioTracks().forEach(track => {
          track.onended = () => stopRecording();
        });
      }

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingType(type);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    recordingType,
    recordingTime,
    startRecording,
    stopRecording,
    formatRecordingTime,
  };
}
