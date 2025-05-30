"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, PhoneOff, User } from "lucide-react";
import { useEffect, useState } from "react";

interface IncomingCallModalProps {
    isOpen: boolean;
    callerEmail: string;
    onAccept: () => void;
    onReject: () => void;
}

export default function IncomingCallModal({
    isOpen,
    callerEmail,
    onAccept,
    onReject,
}: IncomingCallModalProps) {
    const [isRinging, setIsRinging] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRinging(true);
            // Play ringtone sound (you can add actual audio file here)
            const interval = setInterval(() => {
                setIsRinging((prev) => !prev);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
            <Card className='w-full max-w-md mx-auto animate-in zoom-in-95 duration-300'>
                <CardContent className='p-8 text-center'>
                    {/* Caller Avatar */}
                    <div
                        className={`w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform duration-1000 ${
                            isRinging ? "scale-110" : "scale-100"
                        }`}
                    >
                        <User className='w-12 h-12 text-white' />
                    </div>

                    {/* Caller Info */}
                    <div className='mb-8'>
                        <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                            Chamada Recebida
                        </h2>
                        <p className='text-gray-600 break-all'>{callerEmail}</p>
                        <p className='text-sm text-gray-500 mt-2'>
                            está te ligando...
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex items-center justify-center gap-8'>
                        {/* Reject Button */}
                        <Button
                            variant='destructive'
                            size='lg'
                            className='w-16 h-16 rounded-full p-0 hover:scale-110 transition-transform'
                            onClick={onReject}
                        >
                            <PhoneOff className='w-6 h-6' />
                        </Button>

                        {/* Accept Button */}
                        <Button
                            variant='default'
                            size='lg'
                            className='w-16 h-16 rounded-full p-0 bg-green-600 hover:bg-green-700 hover:scale-110 transition-transform'
                            onClick={onAccept}
                        >
                            <Phone className='w-6 h-6' />
                        </Button>
                    </div>

                    {/* Instructions */}
                    <div className='mt-6 text-xs text-gray-500'>
                        <p>Toque em ✅ para atender ou ❌ para rejeitar</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
