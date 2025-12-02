import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import clsx from 'clsx';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceInputButton = ({ onTranscript, onRecordingStateChange }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API não é suportada neste navegador.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false; // Retorna apenas o resultado final
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            onTranscript(transcript); // Envia o texto transcrito para o componente pai
        };

        recognition.onend = () => {
            setIsListening(false);
            onRecordingStateChange?.(false);
        };

        recognition.onerror = (event) => {
            console.error("Erro no reconhecimento de voz:", event.error);
            setIsListening(false);
            onRecordingStateChange?.(false);
        };

        recognitionRef.current = recognition;

    }, [onTranscript, onRecordingStateChange]);

    const handleToggleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
            onRecordingStateChange?.(true);
        }
    };

    if (!SpeechRecognition) {
        return (
            <button
                type="button"
                disabled
                className="p-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                title="O reconhecimento de voz não é suportado ou está desabilitado neste navegador."
            >
                <MicOff className="w-5 h-5" />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleToggleListen}
            className={clsx(                "p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                isListening 
                    ? "bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-500" 
                    : "bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-blue-600"
            )}
            title={isListening ? "Parar gravação" : "Gravar comando de voz"}
        >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
    );
};

export default VoiceInputButton;