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
        isConnected: false,
        peerId: null,
    });

    const [remoteEmailInput, setRemoteEmailInput] = useState("");
    const [copied, setCopied] = useState(false);
    const [currentCall, setCurrentCall] = useState<any>(null);

    const { peerIdToEmail, emailToPeerId } = usePeer(); // Moved usePeer hook to top level

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
            try {
                const stream = await getUserMedia(true, true);
                call.answer(stream);
                setCurrentCall(call);

                call.on("stream", (remoteStream: MediaStream) => {
                    setRemoteStreamAndVideo(remoteStream);
                    // Convert peer ID back to email for display
                    const callerEmail = peerIdToEmail(call.peer);

                    setCallState((prev) => ({
                        ...prev,
                        isInCall: true,
                        remotePeerId: callerEmail,
                    }));
                });

                call.on("close", () => {
                    endCall();
                });

                call.on("error", (err: any) => {
                    setCallState((prev) => ({
                        ...prev,
                        error: "Erro na chamada: " + err.message,
                    }));
                });
            } catch (err) {
                setMediaError("Erro ao responder chamada");
            }
        };

        peer.on("call", handleCall);

        return () => {
            peer.off("call", handleCall);
        };
    }, [
        peer,
        getUserMedia,
        setRemoteStreamAndVideo,
        setMediaError,
        peerIdToEmail,
    ]); // Added peerIdToEmail to dependency array

    const startCall = async () => {
        if (!peer || !remoteEmailInput.trim()) return;

        try {
            const stream = await getUserMedia(true, true);
            // Convert email to valid peer ID
            const remotePeerId = emailToPeerId(
                remoteEmailInput.trim().toLowerCase()
            );

            const call = peer.call(remotePeerId, stream);
            setCurrentCall(call);

            call.on("stream", (remoteStream: MediaStream) => {
                setRemoteStreamAndVideo(remoteStream);
                setCallState((prev) => ({
                    ...prev,
                    isInCall: true,
                    remotePeerId: remoteEmailInput.trim(),
                    error: null,
                }));
            });

            call.on("close", () => {
                endCall();
            });

            call.on("error", (err: any) => {
                setCallState((prev) => ({
                    ...prev,
                    error:
                        "Erro ao conectar com " +
                        remoteEmailInput +
                        ". Verifique se o email está correto e se a pessoa está online.",
                }));
            });
        } catch (err) {
            setCallState((prev) => ({
                ...prev,
                error: "Erro ao iniciar chamada. Verifique o email digitado.",
            }));
        }
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
        if (currentCall) {
            currentCall.close();
            setCurrentCall(null);
        }

        stopAllStreams();

        setCallState((prev) => ({
            ...prev,
            isInCall: false,
            isScreenSharing: false,
            remotePeerId: null,
            error: null,
        }));
    };

    const copyEmail = async () => {
        await navigator.clipboard.writeText(userEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                    {/* Painel de Controle */}
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
                                {/* Status da Conexão */}
                                <div className='flex items-center justify-between'>
                                    <span className='text-sm font-medium'>
                                        Status:
                                    </span>
                                    <Badge variant='default'>Conectado</Badge>
                                </div>

                                {/* Seu Email */}
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

                                {/* Iniciar Chamada */}
                                {!callState.isInCall && (
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
                                            />
                                            <Button
                                                onClick={startCall}
                                                disabled={
                                                    !remoteEmailInput.trim()
                                                }
                                            >
                                                <Phone className='w-4 h-4' />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Status da Chamada */}
                                {callState.isInCall && (
                                    <div className='space-y-2'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm font-medium'>
                                                Em chamada:
                                            </span>
                                            <Badge variant='default'>
                                                Ativo
                                            </Badge>
                                        </div>
                                        {callState.remotePeerId && (
                                            <div className='text-xs text-gray-600'>
                                                Conectado com:{" "}
                                                {callState.remotePeerId}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Área de Vídeo */}
                    <div className='lg:col-span-2'>
                        <Card>
                            <CardContent className='p-6'>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                                    {/* Vídeo Local */}
                                    <div className='relative'>
                                        <div className='aspect-video bg-gray-900 rounded-lg overflow-hidden'>
                                            <video
                                                ref={localVideoRef}
                                                autoPlay
                                                muted
                                                playsInline
                                                className='w-full h-full object-cover'
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
                                        </div>
                                        <div className='absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs'>
                                            Você{" "}
                                            {callState.isScreenSharing &&
                                                "(Compartilhando tela)"}
                                        </div>
                                    </div>

                                    {/* Vídeo Remoto */}
                                    <div className='relative'>
                                        <div className='aspect-video bg-gray-900 rounded-lg overflow-hidden'>
                                            <video
                                                ref={remoteVideoRef}
                                                autoPlay
                                                playsInline
                                                className='w-full h-full object-cover'
                                            />
                                            {!callState.isInCall && (
                                                <div className='absolute inset-0 bg-gray-800 flex items-center justify-center'>
                                                    <div className='text-white text-center'>
                                                        <div className='w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center'>
                                                            <Phone className='w-8 h-8' />
                                                        </div>
                                                        <p className='text-sm'>
                                                            Aguardando
                                                            conexão...
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className='absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs'>
                                            {callState.isInCall
                                                ? callState.remotePeerId
                                                : "Sem conexão"}
                                        </div>
                                    </div>
                                </div>

                                {/* Controles de Vídeo */}
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
                                        isInCall={callState.isInCall}
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
        </div>
    );
}
