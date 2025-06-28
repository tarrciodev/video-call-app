"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMediaStream } from "@/hooks/use-media-stream";
import { usePeer } from "@/hooks/use-peer";
import type { CallState } from "@/types/call";
import {
    AlertCircle,
    Check,
    Copy,
    LogOut,
    Phone,
    RefreshCw,
} from "lucide-react";
import type Peer from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import IncomingCallModal from "./incoming-call-modal";
import OutgoingCallModal from "./outgoing-call-modal";
import VideoControls from "./video-controls";

function OpenInNewTabButton() {
    const handleOpenInNewTab = () => {
        const url = window.location.href;
        window.open(url, "_blank");
    };

    return (
        <Button
            onClick={handleOpenInNewTab}
            variant='outline'
            className='flex items-center gap-2 mx-auto mb-4'
        >
            <svg
                xmlns='http://www.w3.org/2000/svg'
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
            >
                <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'></path>
                <polyline points='15 3 21 3 21 9'></polyline>
                <line x1='10' y1='14' x2='21' y2='3'></line>
            </svg>
            Abrir em nova aba para compartilhar tela
        </Button>
    );
}

interface VideoCallProps {
    userEmail: string;
    peer: Peer;
    onLogout: () => void;
}

interface Position {
    x: number;
    y: number;
}

export default function VideoCall({
    userEmail,
    peer,
    onLogout,
}: VideoCallProps) {
    const [callState, setCallState] = useState<CallState>({
        isInCall: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
        isScreenSharing: false,
        remotePeerId: null,
        error: null,
        peerId: null,
        isConnected: false,
    });

    const [remoteEmailInput, setRemoteEmailInput] = useState("");
    const [copied, setCopied] = useState(false);
    const [currentCall, setCurrentCall] = useState<any>(null);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [outgoingCall, setOutgoingCall] = useState<string | null>(null);
    const [localVideoKey, setLocalVideoKey] = useState(Date.now());
    const [showControls, setShowControls] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Estados para drag and drop do vídeo local
    const [localVideoPosition, setLocalVideoPosition] = useState<Position>({
        x: 0,
        y: 0,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
    const [isPositioned, setIsPositioned] = useState(false);

    const isInCallRef = useRef(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);
    const localVideoContainerRef = useRef<HTMLDivElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const { peerIdToEmail, emailToPeerId } = usePeer();

    const {
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
        error: mediaError,
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
        setError: setMediaError,
        updateLocalVideo,
        updateRemoteVideo,
        setCurrentPeerConnection,
        checkScreenShareSupport,
    } = useMediaStream();

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (callState.isInCall && !isPositioned) {
            const setInitialPosition = () => {
                if (videoContainerRef.current) {
                    const container =
                        videoContainerRef.current.getBoundingClientRect();
                    const videoWidth = isMobile ? 96 : 192; // w-24 = 96px, w-48 = 192px
                    const videoHeight = isMobile ? 128 : 144; // h-32 = 128px, h-36 = 144px

                    setLocalVideoPosition({
                        x: container.width - videoWidth - (isMobile ? 16 : 16), // 16px de margem
                        y: container.height - videoHeight - (isMobile ? 4 : 16), // bottom-1 no mobile, 16px no desktop
                    });
                    setIsPositioned(true);
                }
            };

            setTimeout(setInitialPosition, 100);
        }
    }, [callState.isInCall, isMobile, isPositioned]);

    useEffect(() => {
        if (!callState.isInCall) {
            setIsPositioned(false);
            setLocalVideoPosition({ x: 0, y: 0 });
        }
    }, [callState.isInCall]);

    useEffect(() => {
        if (isMobile && callState.isInCall) {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }

            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);

            return () => {
                if (controlsTimeoutRef.current) {
                    clearTimeout(controlsTimeoutRef.current);
                }
            };
        } else {
            setShowControls(true);
        }
    }, [isMobile, callState.isInCall]);

    const handleVideoClick = (e: React.MouseEvent) => {
        if (localVideoContainerRef.current?.contains(e.target as Node)) {
            return;
        }

        if (isMobile && callState.isInCall) {
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!localVideoContainerRef.current || !videoContainerRef.current)
            return;

        const rect = localVideoContainerRef.current.getBoundingClientRect();
        const containerRect = videoContainerRef.current.getBoundingClientRect();

        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setIsDragging(true);
        e.preventDefault();
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!localVideoContainerRef.current || !videoContainerRef.current)
            return;

        const touch = e.touches[0];
        const rect = localVideoContainerRef.current.getBoundingClientRect();

        setDragOffset({
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        });
        setIsDragging(true);
        e.preventDefault();
    };

    const constrainPosition = useCallback(
        (x: number, y: number) => {
            if (!videoContainerRef.current) return { x, y };

            const container = videoContainerRef.current.getBoundingClientRect();
            const videoWidth = isMobile ? 96 : 192;
            const videoHeight = isMobile ? 128 : 144;

            const minVisible = 20;

            const constrainedX = Math.max(
                -(videoWidth - minVisible),
                Math.min(x, container.width - minVisible)
            );

            const constrainedY = Math.max(
                -(videoHeight - minVisible), // Pode sair por cima, mas deixa 20px visível
                Math.min(y, container.height - minVisible) // Pode sair por baixo, mas deixa 20px visível
            );

            return { x: constrainedX, y: constrainedY };
        },
        [isMobile]
    );

    const snapToCorner = useCallback(
        (x: number, y: number) => {
            if (!videoContainerRef.current) return { x, y };

            const container = videoContainerRef.current.getBoundingClientRect();
            const videoWidth = isMobile ? 96 : 192;
            const videoHeight = isMobile ? 128 : 144;
            const snapDistance = 50;
            const margin = 16;

            // Definir posições dos cantos
            const corners = [
                { x: margin, y: margin }, // Top-left
                { x: container.width - videoWidth - margin, y: margin }, // Top-right
                { x: margin, y: container.height - videoHeight - margin }, // Bottom-left
                {
                    x: container.width - videoWidth - margin,
                    y: container.height - videoHeight - margin,
                }, // Bottom-right
            ];

            // Encontrar o canto mais próximo
            let closestCorner = { x, y };
            let minDistance = Number.POSITIVE_INFINITY;

            corners.forEach((corner) => {
                const distance = Math.sqrt(
                    Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2)
                );
                if (distance < minDistance && distance < snapDistance) {
                    minDistance = distance;
                    closestCorner = corner;
                }
            });

            return closestCorner;
        },
        [isMobile]
    );

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !videoContainerRef.current) return;

            const containerRect =
                videoContainerRef.current.getBoundingClientRect();
            const newX = e.clientX - containerRect.left - dragOffset.x;
            const newY = e.clientY - containerRect.top - dragOffset.y;

            const constrainedPos = constrainPosition(newX, newY);
            setLocalVideoPosition(constrainedPos);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging || !videoContainerRef.current) return;

            const touch = e.touches[0];
            const containerRect =
                videoContainerRef.current.getBoundingClientRect();
            const newX = touch.clientX - containerRect.left - dragOffset.x;
            const newY = touch.clientY - containerRect.top - dragOffset.y;

            const constrainedPos = constrainPosition(newX, newY);
            setLocalVideoPosition(constrainedPos);
            e.preventDefault();
        };

        const handleMouseUp = () => {
            if (isDragging) {
                // Snap to corner se estiver próximo
                const snappedPos = snapToCorner(
                    localVideoPosition.x,
                    localVideoPosition.y
                );
                setLocalVideoPosition(snappedPos);
                setIsDragging(false);
            }
        };

        const handleTouchEnd = () => {
            if (isDragging) {
                const snappedPos = snapToCorner(
                    localVideoPosition.x,
                    localVideoPosition.y
                );
                setLocalVideoPosition(snappedPos);
                setIsDragging(false);
            }
        };

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.addEventListener("touchmove", handleTouchMove, {
                passive: false,
            });
            document.addEventListener("touchend", handleTouchEnd);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
        };
    }, [
        isDragging,
        dragOffset,
        localVideoPosition,
        constrainPosition,
        snapToCorner,
    ]);

    useEffect(() => {
        setCallState((prev) => ({
            ...prev,
            isVideoEnabled,
            isAudioEnabled,
            isScreenSharing,
            error: mediaError,
        }));
    }, [isVideoEnabled, isAudioEnabled, isScreenSharing, mediaError]);

    useEffect(() => {
        isInCallRef.current = callState.isInCall;
    }, [callState.isInCall]);

    useEffect(() => {
        if (!peer) return;

        const handleCall = async (call: any) => {
            console.log("📞 Incoming call from:", call.peer);
            setIncomingCall(call);
        };

        peer.on("call", handleCall);

        return () => {
            peer.off("call", handleCall);
        };
    }, [peer]);

    useEffect(() => {
        if (callState.isInCall && localStream) {
            setLocalVideoKey(Date.now());
            setTimeout(() => {
                updateLocalVideo(localStream);
            }, 100);
        }
    }, [callState.isInCall, localStream, updateLocalVideo]);

    const refreshLocalVideo = useCallback(() => {
        if (localStream) {
            setLocalVideoKey(Date.now());
            setTimeout(() => {
                updateLocalVideo(localStream);
            }, 100);
        }
    }, [localStream, updateLocalVideo]);

    const acceptIncomingCall = useCallback(async () => {
        if (!incomingCall) return;

        try {
            let stream = localStream;
            if (!stream) {
                stream = await getUserMedia(true, true);
            }

            incomingCall.answer(stream);
            setCurrentCall(incomingCall);

            if (incomingCall.peerConnection) {
                setCurrentPeerConnection(incomingCall.peerConnection);
            }

            incomingCall.on("stream", (remoteStream: MediaStream) => {
                setRemoteStreamAndVideo(
                    remoteStream,
                    incomingCall.peerConnection
                );
                const callerEmail = peerIdToEmail(incomingCall.peer);

                setCallState((prev) => ({
                    ...prev,
                    isInCall: true,
                    remotePeerId: callerEmail,
                    error: null,
                }));

                setTimeout(() => {
                    refreshLocalVideo();
                }, 500);
            });

            incomingCall.on("close", () => {
                endCall();
            });

            incomingCall.on("error", (err: any) => {
                setCallState((prev) => ({
                    ...prev,
                    error: "Erro na chamada: " + err.message,
                }));
            });

            setIncomingCall(null);
        } catch (err) {
            setMediaError("Erro ao responder chamada");
            setIncomingCall(null);
        }
    }, [
        incomingCall,
        localStream,
        getUserMedia,
        setRemoteStreamAndVideo,
        peerIdToEmail,
        setMediaError,
        refreshLocalVideo,
        setCurrentPeerConnection,
    ]);

    const rejectIncomingCall = useCallback(() => {
        if (incomingCall) {
            incomingCall.close();
            setIncomingCall(null);
        }
    }, [incomingCall]);

    const startCall = useCallback(async () => {
        if (!peer || !remoteEmailInput.trim()) return;

        try {
            setOutgoingCall(remoteEmailInput.trim());

            let stream = localStream;
            if (!stream) {
                stream = await getUserMedia(true, true);
            }

            const remotePeerId = emailToPeerId(
                remoteEmailInput.trim().toLowerCase()
            );
            const call = peer.call(remotePeerId, stream);
            setCurrentCall(call);

            if (call.peerConnection) {
                setCurrentPeerConnection(call.peerConnection);
            }

            call.on("stream", (remoteStream: MediaStream) => {
                setRemoteStreamAndVideo(remoteStream, call.peerConnection);
                setOutgoingCall(null);
                setCallState((prev) => ({
                    ...prev,
                    isInCall: true,
                    remotePeerId: remoteEmailInput.trim(),
                    error: null,
                }));

                setTimeout(() => {
                    refreshLocalVideo();
                }, 500);
            });

            call.on("close", () => {
                setOutgoingCall(null);
                endCall();
            });

            call.on("error", (err: any) => {
                setOutgoingCall(null);
                setCallState((prev) => ({
                    ...prev,
                    error:
                        "Erro ao conectar com " +
                        remoteEmailInput +
                        ". Verifique se o email está correto e se a pessoa está online.",
                }));
            });
        } catch (err) {
            setOutgoingCall(null);
            setCallState((prev) => ({
                ...prev,
                error: "Erro ao iniciar chamada. Verifique o email digitado.",
            }));
        }
    }, [
        peer,
        remoteEmailInput,
        localStream,
        getUserMedia,
        emailToPeerId,
        setRemoteStreamAndVideo,
        refreshLocalVideo,
        setCurrentPeerConnection,
    ]);

    const cancelOutgoingCall = useCallback(() => {
        if (currentCall) {
            currentCall.close();
            setCurrentCall(null);
        }
        setOutgoingCall(null);
        setCallState((prev) => ({
            ...prev,
            error: null,
        }));
    }, [currentCall]);

    const handleToggleScreenShare = useCallback(async () => {
        try {
            if (isScreenSharing) {
                await stopScreenShare();
            } else {
                await getScreenShare();
            }
        } catch (err) {
            setCallState((prev) => ({
                ...prev,
                error: "Erro ao compartilhar tela",
            }));
        }
    }, [isScreenSharing, stopScreenShare, getScreenShare]);

    const endCall = useCallback(() => {
        if (currentCall) {
            currentCall.close();
            setCurrentCall(null);
        }

        clearRemoteStream();

        setCallState((prev) => ({
            ...prev,
            isInCall: false,
            isScreenSharing: false,
            remotePeerId: null,
            error: null,
        }));

        setOutgoingCall(null);
        setShowControls(true);

        setTimeout(() => {
            refreshLocalVideo();
        }, 500);
    }, [currentCall, clearRemoteStream, refreshLocalVideo]);

    const copyEmail = async () => {
        await navigator.clipboard.writeText(userEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Layout quando em chamada
    if (callState.isInCall) {
        return (
            <div
                className={`${isMobile ? "h-screen" : "h-screen"} bg-gray-900 ${
                    isMobile ? "p-0" : "p-2"
                } relative overflow-hidden`}
                onClick={handleVideoClick}
            >
                <div
                    className={`${
                        isMobile ? "h-full" : "h-full flex flex-col"
                    }`}
                >
                    {/* Header - apenas no desktop */}
                    {!isMobile && (
                        <div className='text-center py-2 flex-shrink-0'>
                            <h1 className='text-lg font-bold text-white'>
                                Em chamada com {callState.remotePeerId}
                            </h1>
                            <p className='text-gray-300 text-xs'>
                                {remoteStream ? "Conectado" : "Conectando..."}
                            </p>
                        </div>
                    )}

                    {/* Container principal do vídeo */}
                    <div
                        className={`relative ${
                            isMobile
                                ? "h-full"
                                : "flex-1 min-h-0 flex items-center justify-center"
                        }`}
                    >
                        <div
                            className={`${
                                isMobile ? "w-full h-full" : "w-full max-w-4xl"
                            }`}
                        >
                            <Card
                                className={`bg-black border-gray-700 ${
                                    isMobile
                                        ? "h-full border-0 rounded-none"
                                        : ""
                                }`}
                            >
                                <CardContent
                                    className={`${
                                        isMobile ? "p-0 h-full" : "p-2"
                                    }`}
                                >
                                    <div
                                        ref={videoContainerRef}
                                        className={`${
                                            isMobile ? "h-full" : "aspect-video"
                                        } bg-gray-800 ${
                                            isMobile ? "" : "rounded-lg"
                                        } overflow-hidden relative`}
                                    >
                                        {/* Vídeo remoto - tela cheia */}
                                        <video
                                            ref={remoteVideoRef}
                                            autoPlay
                                            playsInline
                                            controls={false}
                                            muted={false}
                                            className='w-full h-full object-cover bg-gray-800'
                                            onLoadedMetadata={() => {
                                                if (
                                                    remoteVideoRef.current &&
                                                    remoteVideoRef.current
                                                        .paused
                                                ) {
                                                    remoteVideoRef.current
                                                        .play()
                                                        .catch((e) =>
                                                            console.error(
                                                                "Play error:",
                                                                e
                                                            )
                                                        );
                                                }
                                            }}
                                        />

                                        {!remoteStream && (
                                            <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                                <div className='text-white text-center'>
                                                    <div className='w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                        <Phone className='w-8 h-8' />
                                                    </div>
                                                    <p className='text-sm'>
                                                        Aguardando vídeo...
                                                    </p>
                                                    <p className='text-xs text-gray-400 mt-1'>
                                                        {callState.remotePeerId}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Vídeo local - posicionável - esconder durante compartilhamento de tela */}
                                        {!callState.isScreenSharing && (
                                            <div
                                                ref={localVideoContainerRef}
                                                className={`absolute ${
                                                    isMobile
                                                        ? "w-24 h-32 bottom-10"
                                                        : "w-48 h-36"
                                                } bg-black rounded-lg overflow-hidden border-2 border-white/30 shadow-2xl z-20 cursor-move select-none ${
                                                    isDragging
                                                        ? "scale-105 shadow-3xl"
                                                        : "hover:scale-105"
                                                } transition-transform duration-200`}
                                                style={{
                                                    left: `${localVideoPosition.x}px`,
                                                    top: `${localVideoPosition.y}px`,
                                                    transform: isDragging
                                                        ? "scale(1.05)"
                                                        : "scale(1)",
                                                }}
                                                onMouseDown={handleMouseDown}
                                                onTouchStart={handleTouchStart}
                                            >
                                                <video
                                                    key={localVideoKey}
                                                    ref={localVideoRef}
                                                    autoPlay
                                                    muted={true}
                                                    playsInline
                                                    controls={false}
                                                    className='w-full h-full object-cover bg-gray-800 pointer-events-none'
                                                    onLoadedMetadata={() => {
                                                        if (
                                                            localVideoRef.current &&
                                                            localVideoRef
                                                                .current.paused
                                                        ) {
                                                            localVideoRef.current
                                                                .play()
                                                                .catch((e) =>
                                                                    console.error(
                                                                        "Play error:",
                                                                        e
                                                                    )
                                                                );
                                                        }
                                                    }}
                                                />
                                                {(!localStream ||
                                                    !callState.isVideoEnabled) && (
                                                    <div className='absolute inset-0 bg-gray-800 flex items-center justify-center pointer-events-none'>
                                                        <div className='text-white text-center'>
                                                            <div
                                                                className={`${
                                                                    isMobile
                                                                        ? "w-6 h-6"
                                                                        : "w-8 h-8"
                                                                } bg-gray-600 rounded-full mx-auto mb-1 flex items-center justify-center`}
                                                            >
                                                                <span
                                                                    className={`${
                                                                        isMobile
                                                                            ? "text-xs"
                                                                            : "text-sm"
                                                                    }`}
                                                                >
                                                                    👤
                                                                </span>
                                                            </div>
                                                            <p
                                                                className={`${
                                                                    isMobile
                                                                        ? "text-xs"
                                                                        : "text-xs"
                                                                }`}
                                                            >
                                                                {!localStream
                                                                    ? "Carregando..."
                                                                    : "Câmera off"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Label do vídeo local */}
                                                <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 pointer-events-none'>
                                                    <div className='flex items-center justify-between'>
                                                        <p
                                                            className={`text-white ${
                                                                isMobile
                                                                    ? "text-xs"
                                                                    : "text-xs"
                                                            } font-medium truncate`}
                                                        >
                                                            Você
                                                        </p>
                                                        {!isMobile &&
                                                            !isDragging && (
                                                                <Button
                                                                    variant='ghost'
                                                                    size='icon'
                                                                    className='h-6 w-6 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto'
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        refreshLocalVideo();
                                                                    }}
                                                                >
                                                                    <RefreshCw className='h-3 w-3' />
                                                                </Button>
                                                            )}
                                                    </div>
                                                </div>

                                                {/* Indicador de drag */}
                                                {isDragging && (
                                                    <div className='absolute inset-0 bg-blue-500/20 border-2 border-blue-400 rounded-lg pointer-events-none'>
                                                        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs bg-blue-600 px-2 py-1 rounded'>
                                                            Arraste para
                                                            posicionar
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Label do vídeo remoto - apenas no desktop */}
                                        {!isMobile && (
                                            <div className='absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 z-10'>
                                                <p className='text-white text-sm font-medium'>
                                                    {callState.isScreenSharing
                                                        ? `${callState.remotePeerId} - Compartilhando Tela`
                                                        : callState.remotePeerId}
                                                </p>
                                                <p className='text-gray-300 text-xs'>
                                                    {remoteStream
                                                        ? "Conectado"
                                                        : "Conectando..."}
                                                </p>
                                            </div>
                                        )}

                                        {/* Controles de vídeo */}
                                        <div
                                            className={`absolute ${
                                                isMobile
                                                    ? "bottom-4 left-1/2 transform -translate-x-1/2"
                                                    : "bottom-4 left-1/2 transform -translate-x-1/2"
                                            } transition-opacity duration-300 z-10 ${
                                                showControls
                                                    ? "opacity-100"
                                                    : "opacity-0 pointer-events-none"
                                            }`}
                                        >
                                            <VideoControls
                                                isVideoEnabled={
                                                    callState.isVideoEnabled
                                                }
                                                isAudioEnabled={
                                                    callState.isAudioEnabled
                                                }
                                                isScreenSharing={
                                                    callState.isScreenSharing
                                                }
                                                isInCall={callState.isInCall}
                                                onToggleVideo={toggleVideo}
                                                onToggleAudio={toggleAudio}
                                                onToggleScreenShare={
                                                    handleToggleScreenShare
                                                }
                                                onEndCall={endCall}
                                                checkScreenShareSupport={
                                                    checkScreenShareSupport
                                                }
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Mensagem de erro - apenas no desktop e compacta */}
                    {!isMobile && callState.error && (
                        <div className='absolute top-16 left-4 right-4 p-2 bg-red-500/90 text-white rounded-lg text-center text-sm z-30'>
                            {callState.error}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Layout quando não está em chamada - ajustado para caber na tela
    return (
        <div className='h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-y-auto'>
            <div className='h-full max-w-6xl mx-auto flex flex-col'>
                <div className='text-center mb-4 flex-shrink-0'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                        Video Call App
                    </h1>
                    <p className='text-gray-600'>
                        Conectado como:{" "}
                        <span className='font-medium'>{userEmail}</span>
                    </p>
                </div>

                {checkScreenShareSupport &&
                    checkScreenShareSupport().inIframe && (
                        <div className='mb-4 p-3 bg-blue-100 border border-blue-300 text-blue-800 rounded-lg flex-shrink-0'>
                            <div className='flex items-center gap-2 mb-2'>
                                <AlertCircle className='w-4 h-4' />
                                <span className='font-medium text-sm'>
                                    Compartilhamento de tela indisponível no
                                    preview
                                </span>
                            </div>
                            <p className='text-xs mb-3'>
                                O compartilhamento de tela não funciona em
                                ambientes de preview. Abra o aplicativo em uma
                                nova aba.
                            </p>
                            <OpenInNewTabButton />
                        </div>
                    )}

                {callState.error && (
                    <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm flex-shrink-0'>
                        {callState.error}
                    </div>
                )}

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0'>
                    <div className='lg:col-span-1'>
                        <Card className='h-full flex flex-col'>
                            <CardHeader className='flex-shrink-0 pb-3'>
                                <CardTitle className='flex items-center justify-between text-lg'>
                                    <div className='flex items-center gap-2'>
                                        <Phone className='w-4 h-4' />
                                        Controles
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={onLogout}
                                    >
                                        <LogOut className='w-3 h-3 mr-2' />
                                        Sair
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-3 flex-1'>
                                <div className='flex items-center justify-between'>
                                    <span className='text-sm font-medium'>
                                        Status:
                                    </span>
                                    <Badge variant='default'>Conectado</Badge>
                                </div>

                                <div className='space-y-2'>
                                    <label className='text-sm font-medium'>
                                        Seu Email:
                                    </label>
                                    <div className='flex gap-2'>
                                        <Input
                                            value={userEmail}
                                            readOnly
                                            className='text-xs'
                                        />
                                        <Button
                                            size='icon'
                                            variant='outline'
                                            onClick={copyEmail}
                                        >
                                            {copied ? (
                                                <Check className='w-3 h-3' />
                                            ) : (
                                                <Copy className='w-3 h-3' />
                                            )}
                                        </Button>
                                    </div>
                                    <p className='text-xs text-gray-500'>
                                        Compartilhe este email para receber
                                        chamadas
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    <label className='text-sm font-medium'>
                                        Email para chamar:
                                    </label>
                                    <div className='flex gap-2'>
                                        <Input
                                            type='email'
                                            placeholder='email@exemplo.com'
                                            value={remoteEmailInput}
                                            onChange={(e) =>
                                                setRemoteEmailInput(
                                                    e.target.value
                                                )
                                            }
                                            disabled={!!outgoingCall}
                                            className='text-sm'
                                        />
                                        <Button
                                            onClick={startCall}
                                            disabled={
                                                !remoteEmailInput.trim() ||
                                                !!outgoingCall
                                            }
                                        >
                                            <Phone className='w-3 h-3' />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className='lg:col-span-2'>
                        <Card className='h-full flex flex-col'>
                            <CardContent className='p-4 flex-1 flex flex-col'>
                                <div className='aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3 relative flex-1'>
                                    <video
                                        key={localVideoKey}
                                        ref={localVideoRef}
                                        autoPlay
                                        muted={true}
                                        playsInline
                                        controls={false}
                                        className='w-full h-full object-cover bg-gray-800'
                                        onLoadedMetadata={() => {
                                            if (
                                                localVideoRef.current &&
                                                localVideoRef.current.paused
                                            ) {
                                                localVideoRef.current
                                                    .play()
                                                    .catch((e) =>
                                                        console.error(
                                                            "Play error:",
                                                            e
                                                        )
                                                    );
                                            }
                                        }}
                                    />
                                    {(!localStream || !isVideoEnabled) && (
                                        <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                            <div className='text-white text-center'>
                                                <div className='w-12 h-12 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                    <span className='text-lg'>
                                                        👤
                                                    </span>
                                                </div>
                                                <p className='text-sm'>
                                                    {!localStream
                                                        ? "Carregando câmera..."
                                                        : "Câmera desligada"}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className='flex justify-center flex-shrink-0'>
                                    <VideoControls
                                        isVideoEnabled={
                                            callState.isVideoEnabled
                                        }
                                        isAudioEnabled={
                                            callState.isAudioEnabled
                                        }
                                        isScreenSharing={
                                            callState.isScreenSharing
                                        }
                                        isInCall={false}
                                        onToggleVideo={toggleVideo}
                                        onToggleAudio={toggleAudio}
                                        onToggleScreenShare={
                                            handleToggleScreenShare
                                        }
                                        onEndCall={endCall}
                                        checkScreenShareSupport={
                                            checkScreenShareSupport
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <IncomingCallModal
                isOpen={!!incomingCall}
                callerEmail={
                    incomingCall ? peerIdToEmail(incomingCall.peer) : ""
                }
                onAccept={acceptIncomingCall}
                onReject={rejectIncomingCall}
            />

            <OutgoingCallModal
                isOpen={!!outgoingCall}
                callingEmail={outgoingCall ?? ""}
                onCancel={cancelOutgoingCall}
            />
        </div>
    );
}
