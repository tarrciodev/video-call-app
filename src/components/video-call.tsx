"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMediaStream } from "@/hooks/use-media-stream";
import { usePeer } from "@/hooks/use-peer";
import type { CallState } from "@/types/call";
import { Check, Copy, LogOut, Phone, RefreshCw } from "lucide-react";
import type Peer from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import IncomingCallModal from "./incoming-call-modal";
import OutgoingCallModal from "./outgoing-call-modal";
import VideoControls from "./video-controls";

interface VideoCallProps {
    userEmail: string;
    peer: Peer;
    onLogout: () => void;
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

    // Ref to track if we're in a call
    const isInCallRef = useRef(false);

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
    } = useMediaStream();

    // Update call state when media controls change
    useEffect(() => {
        setCallState((prev) => ({
            ...prev,
            isVideoEnabled,
            isAudioEnabled,
            isScreenSharing,
            error: mediaError,
        }));
    }, [isVideoEnabled, isAudioEnabled, isScreenSharing, mediaError]);

    // Update isInCallRef when callState.isInCall changes
    useEffect(() => {
        isInCallRef.current = callState.isInCall;
    }, [callState.isInCall]);

    // Setup incoming call handler
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

    // Force refresh local video when entering/exiting call
    useEffect(() => {
        if (callState.isInCall && localStream) {
            console.log("📱 In call, ensuring local video is displayed");
            // Force video element refresh by changing key
            setLocalVideoKey(Date.now());
            // Ensure local video is updated
            setTimeout(() => {
                updateLocalVideo(localStream);
            }, 100);
        }
    }, [callState.isInCall, localStream, updateLocalVideo]);

    const refreshLocalVideo = useCallback(() => {
        console.log("🔄 Manually refreshing local video");
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
            console.log("✅ Accepting incoming call");

            // Ensure we have a fresh local stream
            let stream = localStream;
            if (!stream) {
                console.log("📱 Getting fresh stream for incoming call");
                stream = await getUserMedia(true, true);
            }

            console.log("📤 Answering call with stream:", stream);
            console.log(
                "📤 Stream tracks:",
                stream
                    ?.getTracks()
                    .map((t) => ({ kind: t.kind, enabled: t.enabled }))
            );

            incomingCall.answer(stream);
            setCurrentCall(incomingCall);

            incomingCall.on("stream", (remoteStream: MediaStream) => {
                console.log("📥 Received remote stream:", remoteStream);
                console.log(
                    "📥 Remote stream tracks:",
                    remoteStream
                        .getTracks()
                        .map((t) => ({ kind: t.kind, enabled: t.enabled }))
                );

                setRemoteStreamAndVideo(remoteStream);
                const callerEmail = peerIdToEmail(incomingCall.peer);

                setCallState((prev) => ({
                    ...prev,
                    isInCall: true,
                    remotePeerId: callerEmail,
                    error: null,
                }));

                // Force refresh local video
                setTimeout(() => {
                    refreshLocalVideo();
                }, 500);
            });

            incomingCall.on("close", () => {
                console.log("📞 Incoming call closed");
                endCall();
            });

            incomingCall.on("error", (err: any) => {
                console.error("❌ Incoming call error:", err);
                setCallState((prev) => ({
                    ...prev,
                    error: "Erro na chamada: " + err.message,
                }));
            });

            setIncomingCall(null);
        } catch (err) {
            console.error("❌ Error accepting call:", err);
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
    ]);

    const rejectIncomingCall = useCallback(() => {
        console.log("❌ Rejecting incoming call");
        if (incomingCall) {
            incomingCall.close();
            setIncomingCall(null);
        }
    }, [incomingCall]);

    const startCall = useCallback(async () => {
        if (!peer || !remoteEmailInput.trim()) return;

        try {
            console.log("📞 Starting call to:", remoteEmailInput);

            // Show outgoing call modal
            setOutgoingCall(remoteEmailInput.trim());

            // Ensure we have a fresh local stream
            let stream = localStream;
            if (!stream) {
                console.log("📱 Getting fresh stream for outgoing call");
                stream = await getUserMedia(true, true);
            }

            const remotePeerId = emailToPeerId(
                remoteEmailInput.trim().toLowerCase()
            );
            console.log(
                "📤 Calling peer ID:",
                remotePeerId,
                "with stream:",
                stream
            );
            console.log(
                "📤 Stream tracks:",
                stream
                    ?.getTracks()
                    .map((t) => ({ kind: t.kind, enabled: t.enabled }))
            );

            const call = peer.call(remotePeerId, stream);
            setCurrentCall(call);

            // Set up call event handlers
            call.on("stream", (remoteStream: MediaStream) => {
                console.log(
                    "📥 Received remote stream from outgoing call:",
                    remoteStream
                );
                console.log(
                    "📥 Remote stream tracks:",
                    remoteStream
                        .getTracks()
                        .map((t) => ({ kind: t.kind, enabled: t.enabled }))
                );

                setRemoteStreamAndVideo(remoteStream);
                setOutgoingCall(null); // Hide outgoing call modal
                setCallState((prev) => ({
                    ...prev,
                    isInCall: true,
                    remotePeerId: remoteEmailInput.trim(),
                    error: null,
                }));

                // Force refresh local video
                setTimeout(() => {
                    refreshLocalVideo();
                }, 500);
            });

            call.on("close", () => {
                console.log("📞 Outgoing call closed");
                setOutgoingCall(null);
                endCall();
            });

            call.on("error", (err: any) => {
                console.error("❌ Outgoing call error:", err);
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
            console.error("❌ Error starting call:", err);
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
    ]);

    const cancelOutgoingCall = useCallback(() => {
        console.log("❌ Canceling outgoing call");
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
        console.log("📞 Ending call");

        if (currentCall) {
            currentCall.close();
            setCurrentCall(null);
        }

        // Clear only remote stream, keep local stream for next call
        clearRemoteStream();

        setCallState((prev) => ({
            ...prev,
            isInCall: false,
            isScreenSharing: false,
            remotePeerId: null,
            error: null,
        }));

        setOutgoingCall(null);

        // Force refresh local video after ending call
        setTimeout(() => {
            refreshLocalVideo();
        }, 500);
    }, [currentCall, clearRemoteStream, refreshLocalVideo]);

    const copyEmail = async () => {
        await navigator.clipboard.writeText(userEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Layout when in call - Otimizado para tela cheia sem rolagem
    if (callState.isInCall) {
        return (
            <div className='h-screen bg-gray-900 p-2 md:p-4 flex flex-col overflow-hidden'>
                <div className='flex-1 flex flex-col max-h-full'>
                    {/* Header - Compacto */}
                    <div className='text-center mb-2 flex-shrink-0'>
                        <p className='text-gray-300 text-sm'>
                            {remoteStream ? "Conectado" : "Conectando..."}
                        </p>
                    </div>

                    {/* Main Video Layout - Guest takes full space, local video as overlay */}
                    <div className='relative flex-1 min-h-0 mb-2 flex justify-center'>
                        {/* Remote Video - Full Screen */}
                        <Card className='bg-black border-gray-700 h-full flex justify-center'>
                            <CardContent className='p-2 md:p-4 h-full'>
                                <div className='sm:aspect-video h-full bg-gray-800 rounded-lg overflow-hidden relative flex justify-center'>
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        controls={false}
                                        muted={false}
                                        className='w-full h-full object-cover bg-gray-800'
                                        onLoadedMetadata={() => {
                                            console.log(
                                                "📺 Remote video metadata loaded"
                                            );
                                            if (
                                                remoteVideoRef.current &&
                                                remoteVideoRef.current.paused
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
                                        onCanPlay={() => {
                                            console.log(
                                                "📺 Remote video can play"
                                            );
                                        }}
                                        onPlaying={() => {
                                            console.log(
                                                "▶️ Remote video is playing"
                                            );
                                        }}
                                        onError={(e) => {
                                            console.error(
                                                "❌ Remote video error:",
                                                e
                                            );
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

                                    {/* Local Video Overlay - Picture in Picture - MOVIDO PARA BAIXO */}
                                    <div className='absolute bottom-1 right-2 md:right-4 w-24 h-18 md:w-40 md:h-30 lg:w-48 lg:h-36 bg-black rounded-lg overflow-hidden border-2 border-white/30 shadow-2xl z-10 group hover:scale-105 transition-transform duration-200'>
                                        <video
                                            key={localVideoKey}
                                            ref={localVideoRef}
                                            autoPlay
                                            muted={true}
                                            playsInline
                                            controls={false}
                                            className='w-full h-full object-cover bg-gray-800'
                                            onLoadedMetadata={() => {
                                                console.log(
                                                    "📺 Local video metadata loaded"
                                                );
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
                                            onCanPlay={() => {
                                                console.log(
                                                    "📺 Local video can play"
                                                );
                                            }}
                                            onPlaying={() => {
                                                console.log(
                                                    "▶️ Local video is playing"
                                                );
                                            }}
                                            onError={(e) => {
                                                console.error(
                                                    "❌ Local video error:",
                                                    e
                                                );
                                            }}
                                        />
                                        {(!localStream ||
                                            !callState.isVideoEnabled) && (
                                            <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                                <div className='text-white text-center'>
                                                    <div className='w-6 h-6 md:w-8 md:h-8 bg-gray-600 rounded-full mx-auto mb-1 flex items-center justify-center'>
                                                        <span className='text-xs md:text-sm'>
                                                            👤
                                                        </span>
                                                    </div>
                                                    <p className='text-xs'>
                                                        {!localStream
                                                            ? "Carregando..."
                                                            : "Câmera off"}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Local Video Label - Reduzido para mobile */}
                                        <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 md:p-2'>
                                            <div className='flex items-center justify-between'>
                                                <p className='text-white text-xs font-medium truncate'>
                                                    Você
                                                </p>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    className='h-4 w-4 md:h-6 md:w-6 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity'
                                                    onClick={refreshLocalVideo}
                                                >
                                                    <RefreshCw className='h-2 w-2 md:h-3 md:w-3' />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remote Video Label */}
                                    <div className='absolute top-2 left-2 md:top-4 md:left-4 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 md:px-3 md:py-2'>
                                        <p className='text-white text-xs md:text-sm font-medium'>
                                            {callState.remotePeerId}
                                        </p>
                                        <p className='text-gray-300 text-xs'>
                                            {remoteStream
                                                ? "Conectado"
                                                : "Conectando..."}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Video Controls - Flex-shrink-0 para não diminuir */}
                    <div className='flex justify-center flex-shrink-0 mb-2'>
                        <VideoControls
                            isVideoEnabled={callState.isVideoEnabled}
                            isAudioEnabled={callState.isAudioEnabled}
                            isScreenSharing={callState.isScreenSharing}
                            isInCall={callState.isInCall}
                            onToggleVideo={toggleVideo}
                            onToggleAudio={toggleAudio}
                            onToggleScreenShare={handleToggleScreenShare}
                            onEndCall={endCall}
                        />
                    </div>

                    {/* Error Message - Compacto */}
                    {callState.error && (
                        <div className='flex-shrink-0 p-2 md:p-4 bg-red-500/90 text-white rounded-lg text-center text-sm'>
                            {callState.error}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Desktop layout when not in call
    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
            <div className='max-w-6xl mx-auto'>
                <div className='text-center mb-8'>
                    <h1 className='text-4xl font-bold text-gray-900 mb-2'>
                        Video Call App
                    </h1>
                    <p className='text-gray-600'>
                        Conectado como:{" "}
                        <span className='font-medium'>{userEmail}</span>
                    </p>
                </div>

                {callState.error && (
                    <div className='mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg'>
                        {callState.error}
                    </div>
                )}

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                    <div className='lg:col-span-1'>
                        <Card>
                            <CardHeader>
                                <CardTitle className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <Phone className='w-5 h-5' />
                                        Controles
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={onLogout}
                                    >
                                        <LogOut className='w-4 h-4 mr-2' />
                                        Sair
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-4'>
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
                                                <Check className='w-4 h-4' />
                                            ) : (
                                                <Copy className='w-4 h-4' />
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
                                        />
                                        <Button
                                            onClick={startCall}
                                            disabled={
                                                !remoteEmailInput.trim() ||
                                                !!outgoingCall
                                            }
                                        >
                                            <Phone className='w-4 h-4' />
                                        </Button>
                                    </div>
                                </div>

                                {/* Debug Info */}
                                <div className='text-xs text-gray-500 space-y-1 p-2 bg-gray-50 rounded'>
                                    <div className='font-medium'>
                                        Status dos Streams:
                                    </div>
                                    <div>
                                        Local Stream:{" "}
                                        {localStream
                                            ? "✅ Ativo"
                                            : "❌ Inativo"}
                                    </div>
                                    <div>
                                        Remote Stream:{" "}
                                        {remoteStream
                                            ? "✅ Ativo"
                                            : "❌ Inativo"}
                                    </div>
                                    <div>
                                        Vídeo Local:{" "}
                                        {isVideoEnabled
                                            ? "✅ Ligado"
                                            : "❌ Desligado"}
                                    </div>
                                    <div>
                                        Áudio Local:{" "}
                                        {isAudioEnabled
                                            ? "✅ Ligado"
                                            : "❌ Desligado"}
                                    </div>
                                    {localStream && (
                                        <div>
                                            Tracks:{" "}
                                            {localStream
                                                .getTracks()
                                                .map(
                                                    (t) =>
                                                        `${t.kind}(${
                                                            t.enabled
                                                                ? "on"
                                                                : "off"
                                                        })`
                                                )
                                                .join(", ")}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className='lg:col-span-2'>
                        <Card>
                            <CardContent className='p-6'>
                                <div className='aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4 relative'>
                                    <video
                                        key={localVideoKey}
                                        ref={localVideoRef}
                                        autoPlay
                                        muted={true}
                                        playsInline
                                        controls={false}
                                        className='w-full h-full object-cover bg-gray-800'
                                        onLoadedMetadata={() => {
                                            console.log(
                                                "📺 Preview video metadata loaded"
                                            );
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
                                        onCanPlay={() => {
                                            console.log(
                                                "📺 Preview video can play"
                                            );
                                        }}
                                        onPlaying={() => {
                                            console.log(
                                                "▶️ Preview video is playing"
                                            );
                                        }}
                                        onError={(e) => {
                                            console.error(
                                                "❌ Preview video error:",
                                                e
                                            );
                                        }}
                                    />
                                    {(!localStream || !isVideoEnabled) && (
                                        <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                            <div className='text-white text-center'>
                                                <div className='w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                    <span className='text-2xl'>
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

                                <div className='flex justify-center'>
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
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Incoming Call Modal */}
            <IncomingCallModal
                isOpen={!!incomingCall}
                callerEmail={
                    incomingCall ? peerIdToEmail(incomingCall.peer) : ""
                }
                onAccept={acceptIncomingCall}
                onReject={rejectIncomingCall}
            />

            {/* Outgoing Call Modal */}
            <OutgoingCallModal
                isOpen={!!outgoingCall}
                callingEmail={outgoingCall || ""}
                onCancel={cancelOutgoingCall}
            />
        </div>
    );
}
