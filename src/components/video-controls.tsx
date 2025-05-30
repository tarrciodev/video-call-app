"use client";

import { Button } from "@/components/ui/button";
import {
    Mic,
    MicOff,
    Monitor,
    MonitorOff,
    PhoneOff,
    Video,
    VideoOff,
} from "lucide-react";

interface VideoControlsProps {
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isScreenSharing: boolean;
    isInCall: boolean;
    onToggleVideo: () => void;
    onToggleAudio: () => void;
    onToggleScreenShare: () => void;
    onEndCall: () => void;
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
}: VideoControlsProps) {
    return (
        <div className='flex items-center justify-center gap-4 p-4 bg-black/50 rounded-lg'>
            <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size='icon'
                onClick={onToggleAudio}
                className='w-12 h-12 rounded-full'
            >
                {isAudioEnabled ? (
                    <Mic className='w-5 h-5' />
                ) : (
                    <MicOff className='w-5 h-5' />
                )}
            </Button>

            <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size='icon'
                onClick={onToggleVideo}
                className='w-12 h-12 rounded-full'
            >
                {isVideoEnabled ? (
                    <Video className='w-5 h-5' />
                ) : (
                    <VideoOff className='w-5 h-5' />
                )}
            </Button>

            <Button
                variant={isScreenSharing ? "secondary" : "outline"}
                size='icon'
                onClick={onToggleScreenShare}
                className='w-12 h-12 rounded-full'
            >
                {isScreenSharing ? (
                    <MonitorOff className='w-5 h-5' />
                ) : (
                    <Monitor className='w-5 h-5' />
                )}
            </Button>

            {isInCall && (
                <Button
                    variant='destructive'
                    size='icon'
                    onClick={onEndCall}
                    className='w-12 h-12 rounded-full'
                >
                    <PhoneOff className='w-5 h-5' />
                </Button>
            )}
        </div>
    );
}
