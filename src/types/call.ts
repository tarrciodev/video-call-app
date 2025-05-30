export interface CallState {
    isConnected: boolean;
    isInCall: boolean;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isScreenSharing: boolean;
    peerId: string | null;
    remotePeerId: string | null;
    error: any;
}

export interface MediaControls {
    toggleVideo: () => void;
    toggleAudio: () => void;
    toggleScreenShare: () => void;
    endCall: () => void;
}

export interface PeerConnection {
    peer: any;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    call: any;
}
