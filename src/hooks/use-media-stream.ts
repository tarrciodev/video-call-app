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

    // Initialize media stream on component mount
    useEffect(() => {
        const initializeMedia = async () => {
            try {
                await getUserMedia(true, true);
            } catch (err) {
                console.error("Failed to initialize media:", err);
            }
        };

        initializeMedia();
    }, []);

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
                    }))
                );

                setLocalStream(stream);
                setIsVideoEnabled(video && stream.getVideoTracks().length > 0);
                setIsAudioEnabled(audio && stream.getAudioTracks().length > 0);

                // Set video element source immediately
                if (localVideoRef.current) {
                    console.log("🔗 Setting local video source");
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.muted = true;

                    // Force play
                    try {
                        await localVideoRef.current.play();
                        console.log("▶️ Local video playing");
                    } catch (playError) {
                        console.error("❌ Local video play error:", playError);
                    }
                }

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

    const setRemoteStreamAndVideo = useCallback(async (stream: MediaStream) => {
        console.log("🌐 Setting remote stream:", stream);
        console.log(
            "📊 Remote stream tracks:",
            stream.getTracks().map((t) => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState,
            }))
        );

        setRemoteStream(stream);

        if (remoteVideoRef.current) {
            console.log("🔗 Setting remote video source");
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.muted = false; // Important: Don't mute remote video for audio

            // Force play
            try {
                await remoteVideoRef.current.play();
                console.log("▶️ Remote video playing");
            } catch (playError) {
                console.error("❌ Remote video play error:", playError);
                // Try to play again after a short delay
                setTimeout(async () => {
                    try {
                        await remoteVideoRef.current?.play();
                        console.log("▶️ Remote video playing (retry)");
                    } catch (retryError) {
                        console.error(
                            "❌ Remote video retry error:",
                            retryError
                        );
                    }
                }, 1000);
            }
        }
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

                // Handle screen share end
                videoTrack.onended = () => {
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

            const newStream = await navigator.mediaDevices.getUserMedia({
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
            console.error("❌ Error stopping screen share:", err);
            setError("Erro ao parar compartilhamento de tela");
        }
    }, [localStream]);

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

    const clearRemoteStream = useCallback(() => {
        console.log("🧹 Clearing remote stream only");

        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => {
                track.stop();
                console.log("🛑 Stopped remote track:", track.kind);
            });
            setRemoteStream(null);
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    }, [remoteStream]);

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
    };
};
