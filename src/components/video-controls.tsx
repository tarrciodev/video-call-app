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

            {/* Screen Share - Now visible on all devices */}
            <Button
                variant={isScreenSharing ? "secondary" : "outline"}
                size='icon'
                onClick={onToggleScreenShare}
                className='w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform'
            >
                {isScreenSharing ? (
                    <MonitorOff className='w-6 h-6' />
                ) : (
                    <Monitor className='w-6 h-6' />
                )}
            </Button>

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
