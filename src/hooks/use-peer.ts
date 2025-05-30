"use client";

import Peer from "peerjs";
import { useEffect, useRef, useState } from "react";

interface UsePeerOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    path?: string;
    config?: RTCConfiguration;
}

interface UsePeerReturn {
    peer: Peer | null;
    peerId: string | null;
    isConnected: boolean;
    error: Error | null;
    initializePeer: (customId?: string) => Promise<void>;
    destroyPeer: () => void;
    emailToPeerId: (email: string) => string;
    peerIdToEmail: (peerId: string) => string;
    connectionStatus: string;
}

// Function to convert email to valid peer ID
const emailToPeerId = (email: string): string => {
    return email
        .toLowerCase()
        .replace(/@/g, "-at-")
        .replace(/\./g, "-dot-")
        .replace(/[^a-zA-Z0-9-]/g, "");
};

// Function to convert peer ID back to email
const peerIdToEmail = (peerId: string): string => {
    return peerId.replace(/-at-/g, "@").replace(/-dot-/g, ".");
};

// Multiple PeerJS server configurations for fallback
const PEER_SERVERS = [
    {
        host: "0.peerjs.com",
        port: 443,
        secure: true,
        path: "/",
        name: "PeerJS Official",
    },
    {
        host: "peerjs-server.herokuapp.com",
        port: 443,
        secure: true,
        path: "/",
        name: "Heroku Server",
    },
];

export const usePeer = (options: UsePeerOptions = {}): UsePeerReturn => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [peerId, setPeerId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [connectionStatus, setConnectionStatus] = useState("Desconectado");
    const peerRef = useRef<Peer | null>(null);
    const currentServerIndex = useRef(0);

    const createPeerWithServer = (
        serverConfig: any,
        customId?: string
    ): Peer => {
        const config = {
            ...serverConfig,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" },
                    { urls: "stun:stun2.l.google.com:19302" },
                    { urls: "stun:global.stun.twilio.com:3478" },
                ],
                ...options.config,
            },
        };

        return customId ? new Peer(customId, config) : new Peer(config);
    };

    const tryConnectWithServer = async (
        serverIndex: number,
        customId?: string
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (serverIndex >= PEER_SERVERS.length) {
                reject(
                    new Error(
                        "Todos os servidores falharam. Tente novamente em alguns minutos."
                    )
                );
                return;
            }

            const serverConfig = PEER_SERVERS[serverIndex];
            setConnectionStatus(`Conectando com ${serverConfig.name}...`);

            try {
                const sanitizedId = customId
                    ? emailToPeerId(customId)
                    : undefined;
                const newPeer = createPeerWithServer(serverConfig, sanitizedId);

                peerRef.current = newPeer;

                // Set timeout for connection attempt
                const connectionTimeout = setTimeout(() => {
                    newPeer.destroy();
                    setConnectionStatus(
                        `Falha em ${serverConfig.name}, tentando próximo servidor...`
                    );
                    tryConnectWithServer(serverIndex + 1, customId)
                        .then(resolve)
                        .catch(reject);
                }, 10000); // 10 second timeout

                newPeer.on("open", (id: string) => {
                    clearTimeout(connectionTimeout);
                    setPeer(newPeer);
                    setPeerId(id);
                    setIsConnected(true);
                    setError(null);
                    setConnectionStatus(`Conectado via ${serverConfig.name}`);
                    currentServerIndex.current = serverIndex;
                    resolve();
                });

                newPeer.on("error", (err: any) => {
                    clearTimeout(connectionTimeout);
                    console.error(
                        `Erro no servidor ${serverConfig.name}:`,
                        err
                    );

                    // Try next server for network errors
                    if (err.type === "network" || err.type === "server-error") {
                        setConnectionStatus(
                            `Falha em ${serverConfig.name}, tentando próximo servidor...`
                        );
                        tryConnectWithServer(serverIndex + 1, customId)
                            .then(resolve)
                            .catch(reject);
                        return;
                    }

                    // Handle specific error types that shouldn't trigger server fallback
                    setError(err);
                    setIsConnected(false);
                    setConnectionStatus("Erro de conexão");

                    if (err.type === "unavailable-id") {
                        reject(
                            new Error(
                                "Este email já está sendo usado. Tente outro email ou aguarde alguns minutos."
                            )
                        );
                    } else if (err.type === "peer-unavailable") {
                        reject(
                            new Error(
                                "Peer não encontrado. Verifique o email digitado."
                            )
                        );
                    } else {
                        reject(new Error("Erro ao conectar: " + err.message));
                    }
                });

                newPeer.on("disconnected", () => {
                    setIsConnected(false);
                    setConnectionStatus("Desconectado");

                    // Try to reconnect
                    setTimeout(() => {
                        if (peerRef.current && !peerRef.current.destroyed) {
                            setConnectionStatus("Tentando reconectar...");
                            peerRef.current.reconnect();
                        }
                    }, 3000);
                });

                newPeer.on("close", () => {
                    setIsConnected(false);
                    setPeer(null);
                    setPeerId(null);
                    setConnectionStatus("Conexão fechada");
                });
            } catch (err) {
                setConnectionStatus(
                    `Erro em ${serverConfig.name}, tentando próximo...`
                );
                tryConnectWithServer(serverIndex + 1, customId)
                    .then(resolve)
                    .catch(reject);
            }
        });
    };

    const initializePeer = async (customId?: string): Promise<void> => {
        // Destroy existing peer if any
        if (peerRef.current) {
            peerRef.current.destroy();
        }

        setConnectionStatus("Iniciando conexão...");
        return tryConnectWithServer(0, customId);
    };

    const destroyPeer = () => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        setPeer(null);
        setPeerId(null);
        setIsConnected(false);
        setError(null);
        setConnectionStatus("Desconectado");
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            destroyPeer();
        };
    }, []);

    return {
        peer,
        peerId,
        isConnected,
        error,
        initializePeer,
        destroyPeer,
        emailToPeerId,
        peerIdToEmail,
        connectionStatus,
    };
};
