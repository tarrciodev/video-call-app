import Peer from "peerjs";

export class PeerService {
    private peer: Peer | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private currentCall: any = null;

    async initializePeer(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.peer = new Peer({
                host: "peerjs-server.herokuapp.com",
                port: 443,
                secure: true,
                path: "/",
                config: {
                    iceServers: [
                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:stun1.l.google.com:19302" },
                    ],
                },
            });

            this.peer.on("open", (id: string) => {
                resolve(id);
            });

            this.peer.on("error", (error: any) => {
                reject(error);
            });
        });
    }

    async getUserMedia(video = true, audio = true): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: video ? { width: 1280, height: 720 } : false,
                audio: audio,
            });
            return this.localStream;
        } catch (error) {
            throw new Error("Erro ao acessar câmera/microfone");
        }
    }

    async getScreenShare(): Promise<MediaStream> {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            return screenStream;
        } catch (error) {
            throw new Error("Erro ao compartilhar tela");
        }
    }

    makeCall(remotePeerId: string, stream: MediaStream): Promise<MediaStream> {
        return new Promise((resolve, reject) => {
            if (!this.peer) {
                reject(new Error("Peer não inicializado"));
                return;
            }

            this.currentCall = this.peer.call(remotePeerId, stream);

            this.currentCall.on("stream", (remoteStream: MediaStream) => {
                this.remoteStream = remoteStream;
                resolve(remoteStream);
            });

            this.currentCall.on("error", (error: any) => {
                reject(error);
            });
        });
    }

    answerCall(onCall: (stream: MediaStream) => void): void {
        if (!this.peer) return;

        this.peer.on("call", (call: any) => {
            this.getUserMedia().then((stream) => {
                this.currentCall = call;
                call.answer(stream);

                call.on("stream", (remoteStream: MediaStream) => {
                    this.remoteStream = remoteStream;
                    onCall(remoteStream);
                });
            });
        });
    }

    toggleVideoTrack(enabled: boolean): void {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = enabled;
            }
        }
    }

    toggleAudioTrack(enabled: boolean): void {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = enabled;
            }
        }
    }

    async replaceVideoTrack(screenShare: boolean): Promise<void> {
        if (!this.currentCall || !this.localStream) return;

        try {
            let newStream: MediaStream;

            if (screenShare) {
                newStream = await this.getScreenShare();
            } else {
                newStream = await this.getUserMedia(true, true);
            }

            const videoTrack = newStream.getVideoTracks()[0];
            const sender = this.currentCall.peerConnection
                .getSenders()
                .find((s: any) => s.track && s.track.kind === "video");

            if (sender && videoTrack) {
                await sender.replaceTrack(videoTrack);
            }

            // Atualizar stream local
            const oldVideoTrack = this.localStream.getVideoTracks()[0];
            if (oldVideoTrack) {
                this.localStream.removeTrack(oldVideoTrack);
                oldVideoTrack.stop();
            }

            this.localStream.addTrack(videoTrack);
        } catch (error) {
            console.error("Erro ao trocar track de vídeo:", error);
        }
    }

    endCall(): void {
        if (this.currentCall) {
            this.currentCall.close();
            this.currentCall = null;
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
            this.localStream = null;
        }

        this.remoteStream = null;
    }

    destroy(): void {
        this.endCall();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }

    getPeerId(): string | null {
        return this.peer?.id || null;
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }
}
