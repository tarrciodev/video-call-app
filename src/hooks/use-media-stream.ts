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

    // Adicione estas variáveis no início do hook
    const originalRemoteStreamRef = useRef<MediaStream | null>(null);

    const isRunningInIframe = useCallback(() => {
        try {
            return window !== window.top;
        } catch (e) {
            return true;
        }
    }, []);

    // Force video element update when stream changes
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

    // Modifique a função setRemoteStreamAndVideo para salvar o stream original
    const setRemoteStreamAndVideo = useCallback(
        (stream: MediaStream, peerConnection?: any) => {
            console.log("🌐 Setting remote stream:", stream);

            // Salvar o stream remoto original se não estivermos compartilhando tela
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
        const isSupported = !!(
            navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia
        );
        const isSecure = window.isSecureContext;
        const isHttps =
            window.location.protocol === "https:" ||
            window.location.hostname === "localhost";
        const inIframe = isRunningInIframe();
        const hasPermissionPolicy = inIframe;

        return {
            isSupported,
            isSecure,
            isHttps,
            inIframe,
            hasPermissionPolicy,
            canUse: isSupported && isSecure && !hasPermissionPolicy,
        };
    }, [isRunningInIframe]);

    const getScreenShare = useCallback(async (): Promise<MediaStream> => {
        try {
            console.log("🖥️ Requesting screen share");

            const support = checkScreenShareSupport();

            if (!support.isSupported) {
                throw new Error(
                    "Compartilhamento de tela não é suportado neste navegador"
                );
            }

            if (!support.isSecure) {
                throw new Error(
                    "Compartilhamento de tela requer conexão segura (HTTPS)"
                );
            }

            if (support.inIframe) {
                throw new Error(
                    "Compartilhamento de tela não funciona em previews ou iframes. Abra o aplicativo em uma nova aba."
                );
            }

            let screenStream: MediaStream;

            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 },
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });
            } catch (permissionError: any) {
                console.error(
                    "❌ Screen share permission error:",
                    permissionError
                );

                if (permissionError.name === "NotAllowedError") {
                    throw new Error(
                        "Permissão negada para compartilhar tela. Clique em 'Permitir' quando solicitado."
                    );
                } else if (permissionError.name === "NotSupportedError") {
                    throw new Error(
                        "Compartilhamento de tela não é suportado neste dispositivo"
                    );
                } else if (
                    permissionError.message?.includes("permissions policy")
                ) {
                    throw new Error(
                        "Compartilhamento de tela bloqueado pelas políticas de segurança. Abra o aplicativo em uma nova aba."
                    );
                } else if (
                    permissionError.message?.includes("display-capture")
                ) {
                    throw new Error(
                        "Funcionalidade de captura de tela não disponível neste ambiente. Abra o aplicativo em uma nova aba."
                    );
                } else {
                    throw new Error(
                        "Erro ao acessar compartilhamento de tela: " +
                            permissionError.message
                    );
                }
            }

            console.log("✅ Got screen share stream:", screenStream);

            // Salvar o stream remoto original antes de substituir
            const originalRemoteStream = remoteStream;

            // Substituir o vídeo remoto pela tela compartilhada para visualização local
            setRemoteStream(screenStream);

            if (localStream) {
                const newStream = new MediaStream();

                // Adicionar track de vídeo da tela
                const screenVideoTrack = screenStream.getVideoTracks()[0];
                if (screenVideoTrack) {
                    newStream.addTrack(screenVideoTrack);
                }

                // Adicionar áudio da tela se disponível, senão usar áudio do microfone
                const screenAudioTrack = screenStream.getAudioTracks()[0];
                if (screenAudioTrack) {
                    console.log("✅ Using screen audio");
                    newStream.addTrack(screenAudioTrack);
                } else {
                    // Se não há áudio da tela, manter o áudio do microfone
                    const micAudioTrack = localStream.getAudioTracks()[0];
                    if (micAudioTrack) {
                        console.log("✅ Using microphone audio");
                        newStream.addTrack(micAudioTrack);
                    }
                }

                // Parar track de vídeo antigo
                const oldVideoTrack = localStream.getVideoTracks()[0];
                if (oldVideoTrack) {
                    oldVideoTrack.stop();
                }

                // Parar track de áudio antigo apenas se temos áudio da tela
                if (screenAudioTrack) {
                    const oldAudioTrack = localStream.getAudioTracks()[0];
                    if (oldAudioTrack) {
                        oldAudioTrack.stop();
                    }
                }

                setLocalStream(newStream);

                // Substituir tracks na conexão peer
                if (currentPeerConnection) {
                    console.log("🔄 Replacing tracks in peer connection");

                    try {
                        const senders = currentPeerConnection.getSenders();

                        // Substituir track de vídeo
                        const videoSender = senders.find(
                            (sender: RTCRtpSender) =>
                                sender.track && sender.track.kind === "video"
                        );
                        if (videoSender && screenVideoTrack) {
                            console.log("🔄 Replacing video track");
                            await videoSender.replaceTrack(screenVideoTrack);
                            console.log("✅ Video track replaced successfully");
                        }

                        // Substituir track de áudio se temos áudio da tela
                        if (screenAudioTrack) {
                            const audioSender = senders.find(
                                (sender: RTCRtpSender) =>
                                    sender.track &&
                                    sender.track.kind === "audio"
                            );
                            if (audioSender) {
                                console.log(
                                    "🔄 Replacing audio track with screen audio"
                                );
                                await audioSender.replaceTrack(
                                    screenAudioTrack
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

                // Lidar com fim do compartilhamento
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
            setError(null);
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

            if (currentPeerConnection) {
                console.log(
                    "🔄 Replacing screen share tracks with camera tracks"
                );

                const senders = currentPeerConnection.getSenders();

                // Substituir track de vídeo
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

                // Substituir track de áudio
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

            // Restaurar o stream remoto original
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
