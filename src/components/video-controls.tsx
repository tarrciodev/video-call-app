"use client";

import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    Mic,
    MicOff,
    Monitor,
    MonitorOff,
    PhoneOff,
    Video,
    VideoOff,
} from "lucide-react";
import { useEffect, useState } from "react";

interface VideoControlsProps {
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isScreenSharing: boolean;
    isInCall: boolean;
    onToggleVideo: () => void;
    onToggleAudio: () => void;
    onToggleScreenShare: () => void;
    onEndCall: () => void;
    checkScreenShareSupport?: () => {
        isSupported: boolean;
        isSecure: boolean;
        canUse: boolean;
        inIframe?: boolean;
        hasPermissionPolicy?: boolean;
    };
}

export default function VideoControls({
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isInCall,
    onToggleVideo,
    onToggleAudio,
    onToggleScreenShare,
    onEndCall,
    checkScreenShareSupport,
}: VideoControlsProps) {
    const [screenShareSupport, setScreenShareSupport] = useState<any>({
        isSupported: true,
        isSecure: true,
        canUse: true,
    });

    useEffect(() => {
        if (checkScreenShareSupport) {
            setScreenShareSupport(checkScreenShareSupport());
        }
    }, [checkScreenShareSupport]);

    const handleScreenShareClick = () => {
        if (!screenShareSupport.canUse) {
            if (!screenShareSupport.isSupported) {
                alert(
                    "Compartilhamento de tela não é suportado neste navegador"
                );
            } else if (!screenShareSupport.isSecure) {
                alert("Compartilhamento de tela requer conexão segura (HTTPS)");
            } else if (
                screenShareSupport.inIframe ||
                screenShareSupport.hasPermissionPolicy
            ) {
                alert(
                    "Compartilhamento de tela não funciona em previews ou iframes. Por favor, abra o aplicativo em uma nova aba."
                );
            }
            return;
        }
        onToggleScreenShare();
    };

    return (
        <div className='flex items-center justify-center gap-4 p-4 bg-black/50 rounded-2xl backdrop-blur-sm'>
            <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size='icon'
                onClick={onToggleAudio}
                className='w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform'
            >
                {isAudioEnabled ? (
                    <Mic className='w-6 h-6' />
                ) : (
                    <MicOff className='w-6 h-6' />
                )}
            </Button>

            <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size='icon'
                onClick={onToggleVideo}
                className='w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform'
            >
                {isVideoEnabled ? (
                    <Video className='w-6 h-6' />
                ) : (
                    <VideoOff className='w-6 h-6' />
                )}
            </Button>

            {/* Screen Share - Now with better error handling */}
            <div className='relative'>
                <Button
                    variant={isScreenSharing ? "secondary" : "outline"}
                    size='icon'
                    onClick={handleScreenShareClick}
                    disabled={!screenShareSupport.canUse}
                    className={`w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform ${
                        !screenShareSupport.canUse
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                    }`}
                >
                    {isScreenSharing ? (
                        <MonitorOff className='w-6 h-6' />
                    ) : (
                        <Monitor className='w-6 h-6' />
                    )}
                </Button>

                {!screenShareSupport.canUse && screenShareSupport.inIframe && (
                    <div className='absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap'>
                        Abra em uma nova aba para compartilhar tela
                    </div>
                )}

                {!screenShareSupport.canUse && (
                    <div className='absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center'>
                        <AlertTriangle className='w-3 h-3 text-white' />
                    </div>
                )}
            </div>

            {isInCall && (
                <Button
                    variant='destructive'
                    size='icon'
                    onClick={onEndCall}
                    className='w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform bg-red-600 hover:bg-red-700'
                >
                    <PhoneOff className='w-6 h-6' />
                </Button>
            )}
        </div>
    );
}
