"use client";

import { useCallback, useRef, useState } from "react";

export const useMediaStream = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const getUserMedia = useCallback(
        async (video = true, audio = true): Promise<MediaStream> => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: video ? { width: 1280, height: 720 } : false,
                    audio: audio,
                });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                setError(null);
                return stream;
            } catch (err) {
                const errorMessage = "Erro ao acessar câmera/microfone";
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        },
        []
    );

    const getScreenShare = useCallback(async (): Promise<MediaStream> => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            // Replace video track in local stream
            if (localStream) {
                const videoTrack = screenStream.getVideoTracks()[0];
                const oldVideoTrack = localStream.getVideoTracks()[0];

                if (oldVideoTrack) {
                    localStream.removeTrack(oldVideoTrack);
                    oldVideoTrack.stop();
                }

                localStream.addTrack(videoTrack);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream;
                }
            }

            setIsScreenSharing(true);
            setError(null);
            return screenStream;
        } catch (err) {
            const errorMessage = "Erro ao compartilhar tela";
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [localStream]);

    const stopScreenShare = useCallback(async () => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true,
            });

            if (localStream) {
                const videoTrack = newStream.getVideoTracks()[0];
                const oldVideoTrack = localStream.getVideoTracks()[0];

                if (oldVideoTrack) {
                    localStream.removeTrack(oldVideoTrack);
                    oldVideoTrack.stop();
                }

                localStream.addTrack(videoTrack);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream;
                }
            }

            setIsScreenSharing(false);
            setError(null);
        } catch (err) {
            setError("Erro ao parar compartilhamento de tela");
        }
    }, [localStream]);

    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    }, [localStream]);

    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    }, [localStream]);

    const setRemoteStreamAndVideo = useCallback((stream: MediaStream) => {
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
        }
    }, []);

    const stopAllStreams = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
            setLocalStream(null);
        }
        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => track.stop());
            setRemoteStream(null);
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        setIsScreenSharing(false);
        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
    }, [localStream, remoteStream]);

    return {
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
        error,
        localVideoRef,
        remoteVideoRef,
        getUserMedia,
        getScreenShare,
        stopScreenShare,
        toggleVideo,
        toggleAudio,
        setRemoteStreamAndVideo,
        stopAllStreams,
        setError,
    };
};
