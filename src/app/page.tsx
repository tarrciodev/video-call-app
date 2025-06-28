"use client";

import LoginScreen from "@/components/login-screen";
import VideoCall from "@/components/video-call";
import { usePeer } from "@/hooks/use-peer";
import { useState } from "react";

export default function Home() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const { peer, initializePeer, destroyPeer, connectionStatus } = usePeer();

    const handleLogin = async (email: string) => {
        setIsConnecting(true);
        setLoginError(null);

        try {
            await initializePeer(email);
            setUserEmail(email);
        } catch (error) {
            setLoginError(
                error instanceof Error ? error.message : "Erro ao conectar"
            );
        } finally {
            setIsConnecting(false);
        }
    };

    const handleLogout = () => {
        destroyPeer();
        setUserEmail(null);
        setLoginError(null);
    };

    if (!userEmail || !peer) {
        return (
            <LoginScreen
                onLogin={handleLogin}
                isConnecting={isConnecting}
                error={loginError}
                connectionStatus={connectionStatus}
            />
        );
    }

    return (
        <VideoCall userEmail={userEmail} peer={peer} onLogout={handleLogout} />
    );
}
