"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const useMediaStream = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Force video element update when stream changes
    const updateLocalVideo = useCallback((stream: MediaStream | null) => {
        console.log(
            "🔄 Updating local video element with stream:",
            stream ? "present" : "null"
        );

        if (localVideoRef.current) {
            // Store current srcObject to check if it changed
            const currentSrc = localVideoRef.current.srcObject;

            // Only update if the stream is different
            if (currentSrc !== stream) {
                console.log("🔄 Local video srcObject is changing");
                localVideoRef.current.srcObject = stream;
            }

            if (stream) {
                localVideoRef.current.muted = true;
                localVideoRef.current.autoplay = true;
                localVideoRef.current.playsInline = true;

                // Force play
                const playVideo = async () => {
                    try {
                        if (
                            localVideoRef.current &&
                            localVideoRef.current.paused
                        ) {
                            await localVideoRef.current.play();
                            console.log("▶️ Local video playing");
                        }
                    } catch (error) {
                        console.error("❌ Local video play error:", error);
                    }
                };

                // Try to play immediately and after a short delay
                playVideo();
                setTimeout(playVideo, 100);
            }
        } else {
            console.warn("⚠️ Local video ref is null");
        }
    }, []);

    const updateRemoteVideo = useCallback((stream: MediaStream | null) => {
        console.log(
            "🔄 Updating remote video element with stream:",
            stream ? "present" : "null"
        );

        if (remoteVideoRef.current) {
            // Store current srcObject to check if it changed
            const currentSrc = remoteVideoRef.current.srcObject;

            // Only update if the stream is different
            if (currentSrc !== stream) {
                console.log("🔄 Remote video srcObject is changing");
                remoteVideoRef.current.srcObject = stream;
            }

            if (stream) {
                remoteVideoRef.current.muted = false;
                remoteVideoRef.current.autoplay = true;
                remoteVideoRef.current.playsInline = true;
                remoteVideoRef.current.volume = 1.0;

                // Force play
                const playVideo = async () => {
                    try {
                        if (
                            remoteVideoRef.current &&
                            remoteVideoRef.current.paused
                        ) {
                            await remoteVideoRef.current.play();
                            console.log("▶️ Remote video playing");
                        }
                    } catch (error) {
                        console.error("❌ Remote video play error:", error);
                        // Try muted first if autoplay fails
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.muted = true;
                            try {
                                await remoteVideoRef.current.play();
                                console.log("▶️ Remote video playing (muted)");
                                // Unmute after playing
                                setTimeout(() => {
                                    if (remoteVideoRef.current) {
                                        remoteVideoRef.current.muted = false;
                                    }
                                }, 1000);
                            } catch (retryError) {
                                console.error(
                                    "❌ Remote video retry error:",
                                    retryError
                                );
                            }
                        }
                    }
                };

                // Try to play immediately and after a short delay
                playVideo();
                setTimeout(playVideo, 100);
            }
        } else {
            console.warn("⚠️ Remote video ref is null");
        }
    }, []);

    // Update video elements when streams change
    useEffect(() => {
        console.log("🔄 Local stream changed, updating video element");
        updateLocalVideo(localStream);
    }, [localStream, updateLocalVideo]);

    useEffect(() => {
        console.log("🔄 Remote stream changed, updating video element");
        updateRemoteVideo(remoteStream);
    }, [remoteStream, updateRemoteVideo]);

    // Periodically check if video elements are correctly set
    useEffect(() => {
        const interval = setInterval(() => {
            // Check if local video needs updating
            if (
                localStream &&
                localVideoRef.current &&
                !localVideoRef.current.srcObject
            ) {
                console.log("🔄 Local video srcObject missing, restoring");
                updateLocalVideo(localStream);
            }

            // Check if remote video needs updating
            if (
                remoteStream &&
                remoteVideoRef.current &&
                !remoteVideoRef.current.srcObject
            ) {
                console.log("🔄 Remote video srcObject missing, restoring");
                updateRemoteVideo(remoteStream);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [localStream, remoteStream, updateLocalVideo, updateRemoteVideo]);

    const getUserMedia = useCallback(
        async (video = true, audio = true): Promise<MediaStream> => {
            try {
                console.log("🎥 Requesting user media:", { video, audio });

                const constraints = {
                    video: video
                        ? {
                              width: { ideal: 1280, min: 640 },
                              height: { ideal: 720, min: 480 },
                              facingMode: "user",
                              frameRate: { ideal: 30 },
                          }
                        : false,
                    audio: audio
                        ? {
                              echoCancellation: true,
                              noiseSuppression: true,
                              autoGainControl: true,
                              sampleRate: 44100,
                          }
                        : false,
                };

                const stream = await navigator.mediaDevices.getUserMedia(
                    constraints
                );
                console.log("✅ Got user media stream:", stream);
                console.log(
                    "📊 Stream tracks:",
                    stream.getTracks().map((t) => ({
                        kind: t.kind,
                        enabled: t.enabled,
                        readyState: t.readyState,
                        id: t.id,
                    }))
                );

                setLocalStream(stream);
                setIsVideoEnabled(video && stream.getVideoTracks().length > 0);
                setIsAudioEnabled(audio && stream.getAudioTracks().length > 0);
                setError(null);

                return stream;
            } catch (err) {
                console.error("❌ Error accessing media devices:", err);
                const errorMessage =
                    "Erro ao acessar câmera/microfone. Verifique as permissões.";
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        },
        []
    );

    const setRemoteStreamAndVideo = useCallback((stream: MediaStream) => {
        console.log("🌐 Setting remote stream:", stream);
        console.log(
            "📊 Remote stream tracks:",
            stream.getTracks().map((t) => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState,
                id: t.id,
            }))
        );

        setRemoteStream(stream);
    }, []);

    const getScreenShare = useCallback(async (): Promise<MediaStream> => {
        try {
            console.log("🖥️ Requesting screen share");

            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: true,
            });

            console.log("✅ Got screen share stream:", screenStream);

            // Create new stream with screen video and existing audio
            if (localStream) {
                const newStream = new MediaStream();

                // Add screen video track
                const screenVideoTrack = screenStream.getVideoTracks()[0];
                newStream.addTrack(screenVideoTrack);

                // Keep existing audio track
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                    newStream.addTrack(audioTrack);
                }

                // Stop old video track
                const oldVideoTrack = localStream.getVideoTracks()[0];
                if (oldVideoTrack) {
                    oldVideoTrack.stop();
                }

                setLocalStream(newStream);

                // Handle screen share end
                screenVideoTrack.onended = () => {
                    stopScreenShare();
                };
            }

            setIsScreenSharing(true);
            setError(null);
            return screenStream;
        } catch (err) {
            console.error("❌ Error sharing screen:", err);
            const errorMessage = "Erro ao compartilhar tela";
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [localStream]);

    const stopScreenShare = useCallback(async () => {
        try {
            console.log("🛑 Stopping screen share");

            // Get new camera stream
            const newCameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user",
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            setLocalStream(newCameraStream);
            setIsScreenSharing(false);
            setError(null);
        } catch (err) {
            console.error("❌ Error stopping screen share:", err);
            setError("Erro ao parar compartilhamento de tela");
        }
    }, []);

    const toggleVideo = useCallback(() => {
        console.log("🎥 Toggling video, current state:", isVideoEnabled);

        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
                console.log("✅ Video toggled to:", videoTrack.enabled);
            } else {
                console.warn("⚠️ No video track found");
            }
        } else {
            console.warn("⚠️ No local stream found");
        }
    }, [localStream, isVideoEnabled]);

    const toggleAudio = useCallback(() => {
        console.log("🎤 Toggling audio, current state:", isAudioEnabled);

        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
                console.log("✅ Audio toggled to:", audioTrack.enabled);
            } else {
                console.warn("⚠️ No audio track found");
            }
        } else {
            console.warn("⚠️ No local stream found");
        }
    }, [localStream, isAudioEnabled]);

    const stopAllStreams = useCallback(() => {
        console.log("🛑 Stopping all streams");

        if (localStream) {
            localStream.getTracks().forEach((track) => {
                track.stop();
                console.log("🛑 Stopped local track:", track.kind);
            });
            setLocalStream(null);
        }

        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => {
                track.stop();
                console.log("🛑 Stopped remote track:", track.kind);
            });
            setRemoteStream(null);
        }

        setIsScreenSharing(false);
        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
    }, [localStream, remoteStream]);

    const clearRemoteStream = useCallback(() => {
        console.log("🧹 Clearing remote stream only");

        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => {
                track.stop();
                console.log("🛑 Stopped remote track:", track.kind);
            });
            setRemoteStream(null);
        }
    }, [remoteStream]);

    // Initialize media on mount
    useEffect(() => {
        const initializeMedia = async () => {
            try {
                await getUserMedia(true, true);
            } catch (err) {
                console.error("Failed to initialize media:", err);
            }
        };

        initializeMedia();
    }, [getUserMedia]);

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
        clearRemoteStream,
        setError,
        updateLocalVideo,
        updateRemoteVideo,
    };
};
