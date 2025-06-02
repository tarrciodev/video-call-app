"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const useMediaStream = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPeerConnection, setCurrentPeerConnection] =
        useState<any>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const originalRemoteStreamRef = useRef<MediaStream | null>(null);

    const isRunningInIframe = useCallback(() => {
        try {
            return window !== window.top;
        } catch (e) {
            return true;
        }
    }, []);

    const isMobileDevice = useCallback(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }, []);

    const updateLocalVideo = useCallback((stream: MediaStream | null) => {
        console.log(
            "🔄 Updating local video element with stream:",
            stream ? "present" : "null"
        );

        if (localVideoRef.current) {
            const currentSrc = localVideoRef.current.srcObject;

            if (currentSrc !== stream) {
                console.log("🔄 Local video srcObject is changing");
                localVideoRef.current.srcObject = stream;
            }

            if (stream) {
                localVideoRef.current.muted = true;
                localVideoRef.current.autoplay = true;
                localVideoRef.current.playsInline = true;

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

                playVideo();
                setTimeout(playVideo, 100);
            }
        }
    }, []);

    const updateRemoteVideo = useCallback((stream: MediaStream | null) => {
        console.log(
            "🔄 Updating remote video element with stream:",
            stream ? "present" : "null"
        );

        if (remoteVideoRef.current) {
            const currentSrc = remoteVideoRef.current.srcObject;

            if (currentSrc !== stream) {
                console.log("🔄 Remote video srcObject is changing");
                remoteVideoRef.current.srcObject = stream;
            }

            if (stream) {
                remoteVideoRef.current.muted = false;
                remoteVideoRef.current.autoplay = true;
                remoteVideoRef.current.playsInline = true;
                remoteVideoRef.current.volume = 1.0;

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
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.muted = true;
                            try {
                                await remoteVideoRef.current.play();
                                console.log("▶️ Remote video playing (muted)");
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

                playVideo();
                setTimeout(playVideo, 100);
            }
        }
    }, []);

    useEffect(() => {
        updateLocalVideo(localStream);
    }, [localStream, updateLocalVideo]);

    useEffect(() => {
        updateRemoteVideo(remoteStream);
    }, [remoteStream, updateRemoteVideo]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (
                localStream &&
                localVideoRef.current &&
                !localVideoRef.current.srcObject
            ) {
                updateLocalVideo(localStream);
            }

            if (
                remoteStream &&
                remoteVideoRef.current &&
                !remoteVideoRef.current.srcObject
            ) {
                updateRemoteVideo(remoteStream);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [localStream, remoteStream, updateLocalVideo, updateRemoteVideo]);

    const getUserMedia = useCallback(
        async (video = true, audio = true): Promise<MediaStream> => {
            try {
                console.log("🎥 Requesting user media:", { video, audio });
                console.log("🔍 Environment:", {
                    mediaDevicesAvailable: !!navigator.mediaDevices,
                    isSecureContext: window.isSecureContext,
                    protocol: window.location.protocol,
                    hostname: window.location.hostname,
                    userAgent: navigator.userAgent,
                });

                // if (!navigator.mediaDevices) {
                //     throw new Error(
                //         "A API de mídia não é suportada neste navegador. Certifique-se de que está usando HTTPS ou localhost."
                //     );
                // }

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

                const stream = await navigator?.mediaDevices?.getUserMedia(
                    constraints
                );
                console.log("✅ Got user media stream:", stream);

                setLocalStream(stream);
                setIsVideoEnabled(video && stream?.getVideoTracks().length > 0);
                setIsAudioEnabled(audio && stream?.getAudioTracks().length > 0);
                setError(null);

                return stream;
            } catch (err) {
                console.error("❌ Error accessing media devices:", err);
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Erro ao acessar câmera/microfone. Verifique as permissões.";
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        },
        []
    );

    const setRemoteStreamAndVideo = useCallback(
        (stream: MediaStream, peerConnection?: any) => {
            console.log("🌐 Setting remote stream:", stream);

            if (!isScreenSharing) {
                originalRemoteStreamRef.current = stream;
            }

            setRemoteStream(stream);

            if (peerConnection) {
                setCurrentPeerConnection(peerConnection);
            }
        },
        [isScreenSharing]
    );

    const checkScreenShareSupport = useCallback(() => {
        const mediaDevicesAvailable = !!navigator.mediaDevices;
        const isSupported =
            mediaDevicesAvailable && !!navigator.mediaDevices.getDisplayMedia;
        const isSecure = window.isSecureContext;
        const isHttps = true;
        // window.location.protocol === "https:" ||
        // window.location.hostname === "localhost";
        const inIframe = isRunningInIframe();
        const isMobile = isMobileDevice();

        // Enhanced mobile support detection
        const mobileSupport =
            isMobile &&
            isSupported &&
            !/iPhone|iPad|iPod/i.test(navigator.userAgent);

        return {
            mediaDevicesAvailable,
            isSupported,
            isSecure,
            isHttps,
            inIframe,
            isMobile,
            mobileSupport,
            hasPermissionPolicy: inIframe,
            canUse:
                mediaDevicesAvailable &&
                isSupported &&
                isSecure &&
                !inIframe &&
                (mobileSupport || !isMobile),
        };
    }, [isRunningInIframe, isMobileDevice]);

    const getScreenShare = useCallback(async (): Promise<MediaStream> => {
        try {
            console.log(
                "🔔 Instrução: Para compartilhar o áudio do vídeo (como som de um vídeo ou música), certifique-se de selecionar uma aba ou janela e marque a opção 'Compartilhar áudio' (em navegadores como Chrome) ou escolha compartilhar a tela inteira (em navegadores como Firefox). Nota: No celular, o áudio do sistema não é suportado; apenas o vídeo será compartilhado, e o áudio pode ser capturado pelo microfone."
            );
            console.log("🖥️ Requesting screen share");
            console.log("🔍 Environment:", {
                mediaDevicesAvailable: !!navigator.mediaDevices,
                isSecureContext: window.isSecureContext,
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                userAgent: navigator.userAgent,
            });

            const support = checkScreenShareSupport();

            // if (!support.mediaDevicesAvailable) {
            //     throw new Error(
            //         "A API de mídia não está disponível neste navegador. Certifique-se de que está usando HTTPS ou localhost."
            //     );
            // }

            // if (!support.isSupported) {
            //     throw new Error(
            //         "Compartilhamento de tela não é suportado neste navegador."
            //     );
            // }

            // if (!support.isSecure) {
            //     throw new Error(
            //         "Compartilhamento de tela requer conexão segura (HTTPS)."
            //     );
            // }

            // if (support.inIframe) {
            //     throw new Error(
            //         "Compartilhamento de tela não funciona em previews ou iframes. Abra o aplicativo em uma nova aba."
            //     );
            // }

            // if (support.isMobile && !support.mobileSupport) {
            //     throw new Error(
            //         "Compartilhamento de tela não é suportado neste navegador móvel. Tente usar Chrome ou Firefox mais recente no Android."
            //     );
            // }

            const displayMediaOptions: DisplayMediaStreamOptions = {
                video: {
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    frameRate: { ideal: 30, max: 30 },
                },
                audio: !support.isMobile, // Disable audio request on mobile since system audio isn't supported
            };

            if (support.isMobile) {
                displayMediaOptions.video = {
                    width: { ideal: 1280, max: 1280 },
                    height: { ideal: 720, max: 720 },
                    frameRate: { ideal: 15, max: 30 },
                };
            }

            const screenStream = await navigator?.mediaDevices?.getDisplayMedia(
                displayMediaOptions
            );
            console.log("✅ Got screen share stream:", screenStream);
            console.log("📊 Screen share tracks:", {
                video: screenStream?.getVideoTracks().length,
                audio: screenStream?.getAudioTracks().length,
            });

            // Detailed debugging for audio tracks
            if (screenStream?.getAudioTracks().length === 0) {
                console.warn(
                    "⚠️ No audio tracks found in screen share stream. Ensure 'Share audio' is enabled in the browser prompt, or try sharing the entire screen. Browser: ",
                    navigator.userAgent
                );
                setError(
                    "Não foi possível capturar o áudio do sistema. Certifique-se de marcar 'Compartilhar áudio' no navegador (Chrome) ou tente compartilhar a tela inteira (Firefox)."
                );
            } else {
                screenStream?.getAudioTracks().forEach((track, index) => {
                    console.log(`🔊 Audio track ${index}:`, {
                        label: track.label,
                        kind: track.kind,
                        enabled: track.enabled,
                        settings: track.getSettings(),
                    });
                });
            }

            setRemoteStream(screenStream);

            if (localStream) {
                const newStream = new MediaStream();
                const screenVideoTrack = screenStream.getVideoTracks()[0];
                if (screenVideoTrack) {
                    newStream.addTrack(screenVideoTrack);
                    console.log("✅ Added screen video track to local stream");
                }

                const screenAudioTrack = screenStream.getAudioTracks()[0];
                if (screenAudioTrack) {
                    console.log("✅ Using screen audio (system audio)");
                    newStream.addTrack(screenAudioTrack);

                    const micAudioTrack = localStream.getAudioTracks()[0];
                    if (micAudioTrack) {
                        console.log(
                            "🔇 Stopping microphone audio in favor of system audio"
                        );
                        micAudioTrack.stop();
                    }
                } else {
                    console.log(
                        "⚠️ No system audio available, continuing with microphone audio"
                    );
                    const micAudioTrack = localStream.getAudioTracks()[0];
                    if (micAudioTrack) {
                        console.log(
                            "🎙️ Using microphone audio as fallback. Note: This may capture ambient sound instead of system audio."
                        );
                        newStream.addTrack(micAudioTrack);
                    } else {
                        console.log(
                            "⚠️ No audio available from screen or microphone"
                        );
                        setError(
                            "Nenhum áudio disponível. Verifique as permissões do microfone ou tente compartilhar o áudio do sistema novamente."
                        );
                    }
                }

                const oldVideoTrack = localStream.getVideoTracks()[0];
                if (oldVideoTrack) {
                    oldVideoTrack.stop();
                }

                setLocalStream(newStream);

                if (currentPeerConnection) {
                    console.log("🔄 Replacing tracks in peer connection");
                    try {
                        const senders = currentPeerConnection.getSenders();
                        const videoSender = senders.find(
                            (sender: RTCRtpSender) =>
                                sender.track && sender.track.kind === "video"
                        );
                        if (videoSender && screenVideoTrack) {
                            console.log("🔄 Replacing video track with screen");
                            await videoSender.replaceTrack(screenVideoTrack);
                            console.log("✅ Video track replaced successfully");
                        }

                        const audioSender = senders.find(
                            (sender: RTCRtpSender) =>
                                sender.track && sender.track.kind === "audio"
                        );
                        if (audioSender) {
                            const audioTrackToSend =
                                screenAudioTrack ||
                                newStream.getAudioTracks()[0];
                            if (audioTrackToSend) {
                                console.log(
                                    "🔄 Replacing audio track with",
                                    screenAudioTrack
                                        ? "system audio"
                                        : "microphone audio"
                                );
                                await audioSender.replaceTrack(
                                    audioTrackToSend
                                );
                                console.log(
                                    "✅ Audio track replaced successfully"
                                );
                            }
                        }
                    } catch (replaceError) {
                        console.error(
                            "❌ Error replacing track:",
                            replaceError
                        );
                        throw new Error(
                            "Erro ao enviar compartilhamento de tela para o outro participante"
                        );
                    }
                }

                screenVideoTrack.onended = () => {
                    console.log("🛑 Screen share ended by user");
                    stopScreenShare();
                };

                if (screenAudioTrack) {
                    screenAudioTrack.onended = () => {
                        console.log("🛑 Screen audio ended");
                        stopScreenShare();
                    };
                }
            }

            setIsScreenSharing(true);
            if (screenStream?.getAudioTracks().length > 0) {
                setError(null); // Clear error only if audio is successfully captured
            }
            return screenStream;
        } catch (err) {
            console.error("❌ Error sharing screen:", err);
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Erro ao compartilhar tela";
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [
        localStream,
        currentPeerConnection,
        checkScreenShareSupport,
        remoteStream,
    ]);

    const restoreOriginalRemoteStream = useCallback(() => {
        if (originalRemoteStreamRef.current) {
            console.log("🔄 Restoring original remote stream");
            setRemoteStream(originalRemoteStreamRef.current);
        }
    }, []);

    const stopScreenShare = useCallback(async () => {
        try {
            console.log("🛑 Stopping screen share");

            const newCameraStream = await navigator?.mediaDevices?.getUserMedia(
                {
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
                }
            );

            setLocalStream(newCameraStream);

            if (currentPeerConnection) {
                console.log(
                    "🔄 Replacing screen share tracks with camera tracks"
                );

                const senders = currentPeerConnection.getSenders();

                const videoSender = senders.find(
                    (sender: RTCRtpSender) =>
                        sender.track && sender.track.kind === "video"
                );
                if (videoSender && newCameraStream.getVideoTracks()[0]) {
                    console.log("🔄 Replacing video track with camera");
                    await videoSender.replaceTrack(
                        newCameraStream.getVideoTracks()[0]
                    );
                    console.log("✅ Video track replaced with camera");
                }

                const audioSender = senders.find(
                    (sender: RTCRtpSender) =>
                        sender.track && sender.track.kind === "audio"
                );
                if (audioSender && newCameraStream.getAudioTracks()[0]) {
                    console.log("🔄 Replacing audio track with microphone");
                    await audioSender.replaceTrack(
                        newCameraStream.getAudioTracks()[0]
                    );
                    console.log("✅ Audio track replaced with microphone");
                }
            }

            restoreOriginalRemoteStream();

            setIsScreenSharing(false);
            setError(null);
        } catch (err) {
            console.error("❌ Error stopping screen share:", err);
            setError("Erro ao parar compartilhamento de tela");
        }
    }, [currentPeerConnection, restoreOriginalRemoteStream]);

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

    const stopAllStreams = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                track.stop();
            });
            setLocalStream(null);
        }

        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => {
                track.stop();
            });
            setRemoteStream(null);
        }

        setCurrentPeerConnection(null);
        setIsScreenSharing(false);
        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
    }, [localStream, remoteStream]);

    const clearRemoteStream = useCallback(() => {
        if (remoteStream) {
            remoteStream.getTracks().forEach((track) => {
                track.stop();
            });
            setRemoteStream(null);
        }

        setCurrentPeerConnection(null);
    }, [remoteStream]);

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
        setCurrentPeerConnection,
        checkScreenShareSupport,
        restoreOriginalRemoteStream,
    };
};
