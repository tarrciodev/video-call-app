"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Shield, Users, Video, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

interface LoginScreenProps {
    onLogin: (email: string) => void;
    isConnecting: boolean;
    error: string | null;
    connectionStatus: string;
}

export default function LoginScreen({
    onLogin,
    isConnecting,
    error,
    connectionStatus,
}: LoginScreenProps) {
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setEmailError("Por favor, digite seu email");
            return;
        }

        if (!validateEmail(email)) {
            setEmailError("Por favor, digite um email válido");
            return;
        }

        setEmailError("");
        onLogin(email.toLowerCase().trim());
    };

    const getConnectionIcon = () => {
        if (isConnecting) {
            return <Wifi className='w-4 h-4 animate-pulse' />;
        }
        return connectionStatus.includes("Conectado") ? (
            <Wifi className='w-4 h-4' />
        ) : (
            <WifiOff className='w-4 h-4' />
        );
    };

    const getConnectionVariant = () => {
        if (isConnecting) return "secondary";
        return connectionStatus.includes("Conectado")
            ? "default"
            : "destructive";
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4'>
            <div className='w-full max-w-md'>
                {/* Header */}
                <div className='text-center mb-8'>
                    <div className='w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                        <Video className='w-10 h-10 text-white' />
                    </div>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                        Video Call App
                    </h1>
                    <p className='text-gray-600'>
                        Entre com seu email para começar
                    </p>
                </div>

                {/* Connection Status */}
                <div className='mb-4 flex items-center justify-center gap-2'>
                    <Badge
                        variant={getConnectionVariant()}
                        className='flex items-center gap-2'
                    >
                        {getConnectionIcon()}
                        {connectionStatus}
                    </Badge>
                </div>

                {/* Login Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <Mail className='w-5 h-5' />
                            Identificação
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className='space-y-4'>
                            <div className='space-y-2'>
                                <label
                                    htmlFor='email'
                                    className='text-sm font-medium'
                                >
                                    Seu Email
                                </label>
                                <Input
                                    id='email'
                                    type='email'
                                    placeholder='seu.email@exemplo.com'
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setEmailError("");
                                    }}
                                    className={
                                        emailError ? "border-red-500" : ""
                                    }
                                    disabled={isConnecting}
                                />
                                {emailError && (
                                    <p className='text-sm text-red-600'>
                                        {emailError}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className='p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm'>
                                    <div className='font-medium mb-1'>
                                        Erro de Conexão
                                    </div>
                                    <div>{error}</div>
                                    <div className='mt-2 text-xs'>
                                        💡 Dica: Verifique sua conexão com a
                                        internet e tente novamente
                                    </div>
                                </div>
                            )}

                            <Button
                                type='submit'
                                className='w-full'
                                disabled={isConnecting || !email.trim()}
                            >
                                {isConnecting
                                    ? "Conectando..."
                                    : "Entrar na Videochamada"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Features */}
                <div className='mt-8 grid grid-cols-1 gap-4'>
                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                        <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'>
                            <Users className='w-4 h-4 text-green-600' />
                        </div>
                        <span>
                            Conecte-se com outras pessoas usando seus emails
                        </span>
                    </div>

                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                        <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                            <Video className='w-4 h-4 text-blue-600' />
                        </div>
                        <span>Videochamadas de alta qualidade com WebRTC</span>
                    </div>

                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                        <div className='w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center'>
                            <Shield className='w-4 h-4 text-purple-600' />
                        </div>
                        <span>Conexão segura ponto a ponto</span>
                    </div>
                </div>

                {/* Instructions */}
                <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
                    <h3 className='font-medium text-blue-900 mb-2'>
                        Como usar:
                    </h3>
                    <ol className='text-sm text-blue-800 space-y-1'>
                        <li>1. Digite seu email para se identificar</li>
                        <li>2. Compartilhe seu email com quem quiser chamar</li>
                        <li>
                            3. Digite o email da pessoa para iniciar a chamada
                        </li>
                    </ol>
                </div>

                {/* Troubleshooting */}
                {error && (
                    <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                        <h4 className='font-medium text-yellow-800 mb-2'>
                            Problemas de Conexão?
                        </h4>
                        <ul className='text-sm text-yellow-700 space-y-1'>
                            <li>• Verifique sua conexão com a internet</li>
                            <li>• Tente desabilitar VPN se estiver usando</li>
                            <li>• Aguarde alguns segundos e tente novamente</li>
                            <li>
                                • Verifique se o firewall não está bloqueando
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
