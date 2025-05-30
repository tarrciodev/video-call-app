"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMediaStream } from "@/hooks/use-media-stream";
import { usePeer } from "@/hooks/use-peer";
import type { CallState } from "@/types/call";
import { Check, Copy, LogOut, Phone } from "lucide-react";
import type Peer from "peerjs";
import { useEffect, useState } from "react";
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
        isConnected: true,
        peerId: "",
    });

    const [remoteEmailInput, setRemoteEmailInput] = useState("");
    const [copied, setCopied] = useState(false);
    const [currentCall, setCurrentCall] = useState<any>(null);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [outgoingCall, setOutgoingCall] = useState<string | null>(null);

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

    const acceptIncomingCall = async () => {
        if (!incomingCall) return;

        try {
            console.log("✅ Accepting incoming call");

            // Ensure we have a fresh local stream
            const stream = localStream || (await getUserMedia(true, true));
            console.log("📤 Answering call with stream:", stream);

            incomingCall.answer(stream);
            setCurrentCall(incomingCall);

            incomingCall.on("stream", async (remoteStream: MediaStream) => {
                console.log("📥 Received remote stream:", remoteStream);
                await setRemoteStreamAndVideo(remoteStream);
                const callerEmail = peerIdToEmail(incomingCall.peer);

                setCallState((prev) => ({
                    ...prev,
                    isInCall: true,
                    remotePeerId: callerEmail,
                    error: null,
                }));
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
    };

    const rejectIncomingCall = () => {
        console.log("❌ Rejecting incoming call");
        if (incomingCall) {
            incomingCall.close();
            setIncomingCall(null);
        }
    };

    const startCall = async () => {
        if (!peer || !remoteEmailInput.trim()) return;

        try {
            console.log("📞 Starting call to:", remoteEmailInput);

            // Show outgoing call modal
            setOutgoingCall(remoteEmailInput.trim());

            // Ensure we have a fresh local stream
            const stream = localStream || (await getUserMedia(true, true));
            const remotePeerId = emailToPeerId(
                remoteEmailInput.trim().toLowerCase()
            );
            console.log(
                "📤 Calling peer ID:",
                remotePeerId,
                "with stream:",
                stream
            );

            const call = peer.call(remotePeerId, stream);
            setCurrentCall(call);

            // Set up call event handlers
            call.on("stream", async (remoteStream: MediaStream) => {
                console.log(
                    "📥 Received remote stream from outgoing call:",
                    remoteStream
                );
                await setRemoteStreamAndVideo(remoteStream);
                setOutgoingCall(null); // Hide outgoing call modal
                setCallState((prev) => ({
                    ...prev,
                    isInCall: true,
                    remotePeerId: remoteEmailInput.trim(),
                    error: null,
                }));
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
    };

    const cancelOutgoingCall = () => {
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
    };

    const handleToggleScreenShare = async () => {
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
    };

    const endCall = () => {
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
    };

    const copyEmail = async () => {
        await navigator.clipboard.writeText(userEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Layout when in call - Side by Side Videos
    if (callState.isInCall) {
        return (
            <div className='min-h-screen bg-gray-900 p-4'>
                <div className='max-w-7xl mx-auto'>
                    {/* Header */}
                    <div className='text-center mb-6'>
                        <h1 className='text-2xl font-bold text-white mb-2'>
                            Em chamada com {callState.remotePeerId}
                        </h1>
                        <p className='text-gray-300'>
                            {remoteStream ? "Conectado" : "Conectando..."}
                        </p>
                    </div>

                    {/* Side by Side Videos */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
                        {/* Local Video */}
                        <Card className='bg-black border-gray-700'>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-white text-center text-sm'>
                                    Você ({userEmail})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className='p-4'>
                                <div className='aspect-video bg-gray-800 rounded-lg overflow-hidden relative'>
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted={true}
                                        playsInline
                                        controls={false}
                                        className='w-full h-full object-cover'
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
                                    {!callState.isVideoEnabled && (
                                        <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                            <div className='text-white text-center'>
                                                <div className='w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                    <span className='text-2xl'>
                                                        👤
                                                    </span>
                                                </div>
                                                <p className='text-sm'>
                                                    Câmera desligada
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {!localStream && (
                                        <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                            <div className='text-white text-center'>
                                                <div className='w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                    <span className='text-2xl'>
                                                        ⚠️
                                                    </span>
                                                </div>
                                                <p className='text-sm'>
                                                    Carregando câmera...
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Remote Video */}
                        <Card className='bg-black border-gray-700'>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-white text-center text-sm'>
                                    {callState.remotePeerId}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className='p-4'>
                                <div className='aspect-video bg-gray-800 rounded-lg overflow-hidden relative'>
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        controls={false}
                                        muted={false}
                                        className='w-full h-full object-cover'
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
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Video Controls */}
                    <div className='flex justify-center mb-6'>
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

                    {/* Error Message */}
                    {callState.error && (
                        <div className='mb-6 p-4 bg-red-500/90 text-white rounded-lg text-center'>
                            {callState.error}
                        </div>
                    )}

                    {/* Debug Info (Development only) */}
                    {process.env.NODE_ENV === "development" && (
                        <Card className='bg-gray-800 border-gray-700'>
                            <CardContent className='p-4'>
                                <div className='text-white text-sm space-y-2'>
                                    <div className='font-medium'>
                                        Debug Information:
                                    </div>
                                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
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
                                    </div>
                                    {localStream && (
                                        <div>
                                            Local Tracks:{" "}
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
                                    {remoteStream && (
                                        <div>
                                            Remote Tracks:{" "}
                                            {remoteStream
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
                                        ref={localVideoRef}
                                        autoPlay
                                        muted={true}
                                        playsInline
                                        controls={false}
                                        className='w-full h-full object-cover'
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
                                    {!isVideoEnabled && (
                                        <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                            <div className='text-white text-center'>
                                                <div className='w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                    <span className='text-2xl'>
                                                        👤
                                                    </span>
                                                </div>
                                                <p className='text-sm'>
                                                    Câmera desligada
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {!localStream && (
                                        <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                            <div className='text-white text-center'>
                                                <div className='w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                    <span className='text-2xl'>
                                                        ⚠️
                                                    </span>
                                                </div>
                                                <p className='text-sm'>
                                                    Carregando câmera...
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
