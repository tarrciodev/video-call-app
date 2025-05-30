"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneOff, User } from "lucide-react";
import { useEffect, useState } from "react";

interface OutgoingCallModalProps {
    isOpen: boolean;
    callingEmail: string;
    onCancel: () => void;
}

export default function OutgoingCallModal({
    isOpen,
    callingEmail,
    onCancel,
}: OutgoingCallModalProps) {
    const [timeLeft, setTimeLeft] = useState(40);
    const [isPulsing, setIsPulsing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTimeLeft(40);
            return;
        }

        // Pulsing animation
        const pulseInterval = setInterval(() => {
            setIsPulsing((prev) => !prev);
        }, 1000);

        // Countdown timer
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    onCancel(); // Auto-cancel after 40 seconds
                    return 40;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(pulseInterval);
            clearInterval(timer);
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
            <Card className='w-full max-w-md mx-auto animate-in zoom-in-95 duration-300'>
                <CardContent className='p-8 text-center'>
                    {/* Avatar */}
                    <div
                        className={`w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform duration-1000 ${
                            isPulsing ? "scale-110" : "scale-100"
                        }`}
                    >
                        <User className='w-12 h-12 text-white' />
                    </div>

                    {/* Call Info */}
                    <div className='mb-6'>
                        <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                            Ligando para...
                        </h2>
                        <p className='text-gray-600 break-all'>
                            {callingEmail}
                        </p>
                        <p className='text-sm text-gray-500 mt-2'>
                            Aguardando resposta...
                        </p>
                    </div>

                    {/* Timer */}
                    <div className='mb-6'>
                        <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2'>
                            <span className='text-lg font-bold text-gray-700'>
                                {timeLeft}
                            </span>
                        </div>
                        <p className='text-xs text-gray-500'>
                            segundos restantes
                        </p>
                    </div>

                    {/* Cancel Button */}
                    <Button
                        variant='destructive'
                        size='lg'
                        className='w-16 h-16 rounded-full p-0 hover:scale-110 transition-transform'
                        onClick={onCancel}
                    >
                        <PhoneOff className='w-6 h-6' />
                    </Button>

                    <p className='text-xs text-gray-500 mt-4'>
                        Toque para cancelar a chamada
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
