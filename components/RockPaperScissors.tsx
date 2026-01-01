import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X } from 'lucide-react';
import { socketService } from '../lib/socket';

interface RockPaperScissorsProps {
    currentUser: User;
    isBot: boolean;
    gameId?: string;
    onGameEnd: (winner: string, points: number) => void;
    onLeave: () => void;
}

type Choice = 'rock' | 'paper' | 'scissors' | null;

const CHOICES = {
    rock: { name: 'TAŞ', color: 'from-pink-500 to-red-600', border: 'border-red-500', icon: '/rps/icon-rock.svg' },
    paper: { name: 'KAĞIT', color: 'from-blue-400 to-blue-600', border: 'border-blue-500', icon: '/rps/icon-paper.svg' },
    scissors: { name: 'MAKAS', color: 'from-yellow-400 to-yellow-600', border: 'border-yellow-500', icon: '/rps/icon-scissors.svg' },
};

export const RockPaperScissors: React.FC<RockPaperScissorsProps> = ({ currentUser, isBot, gameId, onGameEnd, onLeave }) => {
    const [playerChoice, setPlayerChoice] = useState<Choice>(null);
    const [opponentChoice, setOpponentChoice] = useState<Choice>(null);
    const [playerScore, setPlayerScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [round, setRound] = useState(1);
    const [phase, setPhase] = useState<'waiting_for_opponent' | 'select' | 'waiting_reveal' | 'reveal'>('select');
    const [result, setResult] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [opponentName, setOpponentName] = useState(isBot ? 'BOT' : 'Rakip Bekleniyor...');
    const [opponentConnected, setOpponentConnected] = useState(isBot ? true : false);
    const [opponentMoved, setOpponentMoved] = useState(false);

    const MAX_ROUNDS = 5;
    const WIN_SCORE = 3;

    // --- SOCKET & GAME LOGIC ---
    useEffect(() => {
        if (isBot || !gameId) return;

        const socket = socketService.getSocket();
        socket.emit('rps_join', { gameId, username: currentUser.username });
        setPhase('waiting_for_opponent');

        const handleUpdatePlayers = (players: any[]) => {
            if (players.length === 2) {
                const opponent = players.find(p => p.username !== currentUser.username);
                if (opponent) {
                    setOpponentName(opponent.username);
                    setOpponentConnected(true);
                    if (phase === 'waiting_for_opponent') setPhase('select');
                }
            }
        };

        const handleOpponentMoved = () => setOpponentMoved(true);

        const handleRoundResult = (data: any) => {
            const myData = data.p1.id === socket.id ? data.p1 : data.p2;
            const oppData = data.p1.id === socket.id ? data.p2 : data.p1;

            setPlayerChoice(myData.move);
            setOpponentChoice(oppData.move);
            setPlayerScore(myData.score);
            setOpponentScore(oppData.score);
            setPhase('reveal');
            setResult(data.winner === 'draw' ? 'BERABERE' : data.winner === socket.id ? 'KAZANDIN' : 'KAYBETTİN');

            setTimeout(() => nextRound(myData.score, oppData.score, myData.score > oppData.score), 3000);
        };

        const handleDisconnect = () => {
            setOpponentConnected(false);
            setResult('Rakip Ayrıldı');
            setGameOver(true);
        };

        socket.on('rps_update_players', handleUpdatePlayers);
        socket.on('rps_opponent_moved', handleOpponentMoved);
        socket.on('rps_round_result', handleRoundResult);
        socket.on('rps_player_disconnected', handleDisconnect);

        return () => {
            socket.off('rps_update_players', handleUpdatePlayers);
            socket.off('rps_opponent_moved', handleOpponentMoved);
            socket.off('rps_round_result', handleRoundResult);
            socket.off('rps_player_disconnected', handleDisconnect);
        };
    }, [isBot, gameId]);

    const nextRound = (pScore: number, oScore: number, didWin?: boolean) => {
        if (pScore >= WIN_SCORE || oScore >= WIN_SCORE || round >= MAX_ROUNDS) {
            setGameOver(true);
            setTimeout(() => onGameEnd(didWin ? currentUser.username : opponentName, didWin ? 10 : 0), 2000);
        } else {
            setRound(r => r + 1);
            setPlayerChoice(null);
            setOpponentChoice(null);
            setOpponentMoved(false);
            setPhase('select');
            setResult('');
        }
    };

    const handleChoice = (choice: Choice) => {
        if (gameOver || phase !== 'select') return;

        if (isBot) {
            setPlayerChoice(choice);
            const botPick = (['rock', 'paper', 'scissors'] as const)[Math.floor(Math.random() * 3)];

            // Allow a small delay for "drama" even in bot mode
            setTimeout(() => {
                setOpponentChoice(botPick);
                setPhase('reveal');

                let win = false;
                if (choice === botPick) setResult('BERABERE');
                else if (
                    (choice === 'rock' && botPick === 'scissors') ||
                    (choice === 'paper' && botPick === 'rock') ||
                    (choice === 'scissors' && botPick === 'paper')
                ) {
                    setResult('KAZANDIN');
                    setPlayerScore(s => s + 1);
                    win = true;
                } else {
                    setResult('KAYBETTİN');
                    setOpponentScore(s => s + 1);
                }

                const newPScore = win ? playerScore + 1 : playerScore;
                const newOScore = !win && choice !== botPick ? opponentScore + 1 : opponentScore;

                setTimeout(() => nextRound(newPScore, newOScore, win), 2000);
            }, 500);

        } else {
            setPlayerChoice(choice);
            setPhase('waiting_reveal');
            socketService.emitMove(gameId!, choice);
        }
    };

    const ChoiceButton = ({ type, onClick, size = 'normal', winner = false }: { type: Choice, onClick?: () => void, size?: 'normal' | 'large', winner?: boolean }) => {
        if (!type) return null;
        const info = CHOICES[type];
        const sizeClasses = size === 'large' ? 'w-32 h-32 sm:w-48 sm:h-48 border-[16px] sm:border-[24px]' : 'w-28 h-28 sm:w-36 sm:h-36 border-[12px] sm:border-[16px]';

        return (
            <button
                onClick={onClick}
                disabled={!onClick}
                className={`${sizeClasses} rounded-full bg-white flex items-center justify-center relative shadow-xl transition-transform hover:scale-105 active:scale-95 ${info.border} ${winner ? 'shadow-[0_0_0_40px_rgba(255,255,255,0.05),0_0_0_80px_rgba(255,255,255,0.03),0_0_0_120px_rgba(255,255,255,0.01)] z-10' : ''}`}
                style={{ boxShadow: winner ? undefined : 'inset 0px 6px 0px rgba(0,0,0,0.2), 0px 6px 0px rgba(0,0,0,0.2)' }}
            >
                <div className="w-full h-full rounded-full flex items-center justify-center bg-gray-200 shadow-[inset_0_4px_4px_rgba(0,0,0,0.2)]">
                    <img src={info.icon} alt={info.name} className="w-1/2 h-1/2" />
                </div>
            </button>
        );
    };

    return (
        <div className="flex flex-col items-center w-full min-h-[600px] bg-[#1f3756] p-4 sm:p-8 rounded-xl relative overflow-hidden font-sans text-white">
            {/* Header Scoreboard */}
            <div className="w-full max-w-2xl border-2 border-gray-500 rounded-2xl p-4 flex justify-between items-center mb-12 bg-white/5">
                <div className="flex flex-col leading-none">
                    <span className="text-2xl font-bold">ROCK</span>
                    <span className="text-2xl font-bold">PAPER</span>
                    <span className="text-2xl font-bold">SCISSORS</span>
                </div>
                <div className="bg-white text-[#2a46c0] rounded-lg px-8 py-3 flex flex-col items-center">
                    <span className="text-xs font-bold tracking-widest text-[#2a46c0]">SKOR</span>
                    <span className="text-4xl font-bold leading-none text-[#3b4363]">{playerScore} - {opponentScore}</span>
                </div>
            </div>

            {/* Connection Status (Multiplayer Only) */}
            {!isBot && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/30 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${opponentConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                    {opponentConnected ? opponentName : 'Bağlantı Bekleniyor...'}
                </div>
            )}

            <button onClick={onLeave} className="absolute top-4 right-4 text-white/50 hover:text-white">
                <X />
            </button>

            {/* Game Phase : WAITING FOR OPPONENT */}
            {!isBot && phase === 'waiting_for_opponent' && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p className="tracking-widest animate-pulse">RAKİP BEKLENİYOR...</p>
                </div>
            )}

            {/* Game Phase : SELECTION */}
            {(phase === 'select' || (phase === 'waiting_for_opponent' && isBot)) && (
                <div className="relative w-full max-w-md aspect-square flex items-center justify-center mt-8">
                    {/* Background Triangle */}
                    <img src="/rps/bg-triangle.svg" className="absolute w-64 h-64 sm:w-80 sm:h-80" alt="bg" />

                    {/* Buttons positioned absolutely */}
                    <div className="absolute -top-12 -left-4 sm:-top-16 sm:left-0">
                        <ChoiceButton type="paper" onClick={() => handleChoice('paper')} />
                    </div>
                    <div className="absolute -top-12 -right-4 sm:-top-16 sm:right-0">
                        <ChoiceButton type="scissors" onClick={() => handleChoice('scissors')} />
                    </div>
                    <div className="absolute bottom-16 sm:bottom-0">
                        <ChoiceButton type="rock" onClick={() => handleChoice('rock')} />
                    </div>
                </div>
            )}

            {/* Game Phase : REVEAL / RESULT */}
            {(phase === 'waiting_reveal' || phase === 'reveal') && (
                <div className="w-full max-w-4xl grid grid-cols-2 gap-8 sm:gap-16 items-start justify-center mt-12 relative">

                    {/* Player Choice */}
                    <div className="flex flex-col items-center gap-8 order-1">
                        <span className="text-lg tracking-widest font-bold z-10">SEN SEÇTİN</span>
                        <div className={`relative ${result === 'KAZANDIN' ? 'z-0' : ''}`}>
                            <ChoiceButton type={playerChoice} size="large" winner={result === 'KAZANDIN'} />
                        </div>
                    </div>

                    {/* Result Message (Desktop: Center, Mobile: Bottom) */}
                    {phase === 'reveal' && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 whitespace-nowrap pointer-events-none sm:pointer-events-auto scale-75 sm:scale-100 mt-24 sm:mt-0">
                            <span className="text-5xl font-bold mb-4 drop-shadow-lg">{result}</span>
                            {gameOver ? (
                                <span className="text-sm bg-black/30 px-4 py-2 rounded-full">Yeni Oyun Başlıyor...</span>
                            ) : (
                                <button className="bg-white text-[#3b4363] px-8 py-3 rounded-lg tracking-widest hover:text-red-500 transition-colors pointer-events-auto">
                                    SONRAKİ TUR
                                </button>
                            )}
                        </div>
                    )}

                    {/* Opponent Choice */}
                    <div className="flex flex-col items-center gap-8 order-2">
                        <span className="text-lg tracking-widest font-bold z-10">
                            {isBot ? 'BOT' : opponentName.toUpperCase()} SEÇTİ
                        </span>
                        <div className="relative">
                            {phase === 'reveal' ? (
                                <ChoiceButton type={opponentChoice} size="large" winner={result === 'KAYBETTİN'} />
                            ) : (
                                // Placeholder / Waiting State
                                <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-black/20 flex items-center justify-center animate-pulse">
                                    {opponentMoved ? <span className="text-4xl">✅</span> : null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8">
                <button
                    className="border-2 border-white/50 rounded-lg px-6 py-2 tracking-widest hover:bg-white/10 transition-colors text-sm sm:text-base pop"
                >
                    KURALLAR
                </button>
            </div>
        </div>
    );
};
