import React, { useState, useEffect, useContext } from 'react';
import {
    CheckCircleIcon,
    ArrowPathIcon,
    ArrowUpTrayIcon,
    Cog6ToothIcon,
    ArrowDownTrayIcon,
    CheckBadgeIcon
} from "@heroicons/react/24/outline";
import { ArbiusState } from '@/features/arbius/arbius';
import { useAccount } from 'wagmi';
import { BigNumberish, ethers } from 'ethers';
import erc20 from "@/features/arbius/abis/erc20.json"
import Image from 'next/image';
import arbiusBWlogo from '../../public/connect_logo.png';
import { AlertContext } from '@/features/alert/alertContext';
import { updateConfig } from '@/utils/config';

export const arbiusProcessSteps = [
    {
        icon: <ArrowUpTrayIcon className="h-5 w-5" />,
        title: "Submit Task",
        description: (arbiusState: ArbiusState) =>
            arbiusState.taskId ? (
                <a
                    href={`https://arbius.ai/task/${arbiusState.taskId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 underline hover:text-emerald-400"
                >
                    Task Status
                </a>
            ) : (
                "Submitting the task to Arbius engine..."
            ),
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/20"
    },
    {
        icon: <Cog6ToothIcon className="h-5 w-5" />,
        title: "Mining",
        description: "Miner is working on the task",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20"
    },
    {
        icon: <ArrowDownTrayIcon className="h-5 w-5" />,
        title: "Fetching Result",
        description: (arbiusState: ArbiusState) =>
            arbiusState.ipfs ? (
                <a
                    href={`${arbiusState.ipfs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 underline hover:text-amber-400"
                >
                    IPFS result
                </a>
            ) : (
                "Fetching results from IPFS..."
            ),
        color: "text-amber-400",
        bgColor: "bg-amber-500/20"
    },
    {
        icon: <CheckBadgeIcon className="h-5 w-5" />,
        title: "Complete",
        description: "Process successfully completed.",
        color: "text-orange-400",
        bgColor: "bg-orange-500/20"
    }
];


export default function ArbiusProcessIndicator({
    arbiusState,
    signer
}: {
    arbiusState: ArbiusState;
    signer: ethers.JsonRpcSigner | undefined;
}) {
    const [expanded, setExpanded] = useState(false);
    const { alert } = useContext(AlertContext);
    const MIN_REQUIRED_BALANCE = 0.05;

    // Get current step info
    const currentStepInfo = arbiusProcessSteps[arbiusState.currentStep];
    const isCompleted = arbiusState.currentStep === arbiusProcessSteps.length - 1 &&
        arbiusState.completedSteps.includes(arbiusProcessSteps.length - 1);

    const { isConnected, address } = useAccount();
    const [walletBalance, setWalletBalance] = useState(0);
    const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

    useEffect(() => {
        if (hasInsufficientBalance) {
            alert.error(`Insufficient AIUS tokens.`,`Minimum ${MIN_REQUIRED_BALANCE} required.`);
            updateConfig("insufficient_aius", "true");
        }
    }, [alert, hasInsufficientBalance]);

    useEffect(() => {
        async function walletBalance() {
            try {
                const aiusTokenAddress = process.env.NEXT_PUBLIC_AIUS_TOKEN_ADDRESS as `0x${string}`;
                console.log(aiusTokenAddress, "AIUS Token Address")
                const aiusTokenContract = new ethers.Contract(
                    aiusTokenAddress,
                    erc20.abi,
                    signer
                );
                const balance = await aiusTokenContract.balanceOf(address)
                const _walletBalance = Number(formatBalance(ethers.formatEther(balance as BigNumberish)));
                console.log("AIUS Token Balance", _walletBalance)
                setWalletBalance(_walletBalance)
                setHasInsufficientBalance(_walletBalance <= MIN_REQUIRED_BALANCE ? true : false);
            } catch (err) {
                console.log(err, "Error at AIUS wallet balance")
                setWalletBalance(0)
            }
        }

        if (address && signer) {
            walletBalance();
        }
    }, [signer]);

    function formatBalance(num: string) {
        if (Number.isInteger(num)) {
            return num.toString().split('.')[0];
        } else {
            const numStr = num.toString().split('.')[0];
            return numStr.length < 3 ? Number(num).toFixed(2) : numStr;
        }
    }

    return (
        <div className="fixed top-1 right-4 flex flex-col items-end lg:items-start lg:flex-row gap-4 w-full max-w-[400px] lg:max-w-none lg:w-auto">

            {/* AIUS Wallet Balance */}
            <div className="flex-shrink-0">
                <button
                    type="button"
                    className="group relative flex items-center gap-3 rounded-full bg-black-background px-4 py-2 transition-colors hover:bg-gray-800"
                >
                    <div className="absolute inset-0 rounded-full bg-buy-hover opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="lato-bold relative z-10 flex items-center gap-2 text-white">
                        <Image
                            className="h-4 w-auto filter invert"
                            src={arbiusBWlogo}
                            height={20}
                            alt="connected"
                        />
                        <span className="text-sm font-semibold">{walletBalance}</span>
                    </div>
                </button>
            </div>

            {/* Arbius Model Steps */}
            <div className="flex-1 bg-gray-900/80 text-white rounded overflow-hidden shadow-md">
                {expanded && (
                    <div className="mt-2 space-y-2 p-2">
                        {arbiusProcessSteps.map((step, index) => {
                            const isActive = index === arbiusState.currentStep;
                            const isDone = arbiusState.completedSteps.includes(index);

                            return (
                                <div
                                    key={index}
                                    className={`flex items-center justify-between ${isActive ? 'border-l-4 border-blue-500 bg-gray-800/50' : 'border-l-4 border-green-500 bg-gray-800/30'
                                        } p-2 rounded-r transition-all duration-300`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${step.bgColor}`}>
                                            {step.icon}
                                        </div>
                                        <div>
                                            <div className={`font-medium ${step.color}`}>
                                                {step.title}
                                            </div>
                                            <div className="text-xs text-gray-300 max-h-[300px] overflow-auto">
                                                {typeof step.description === 'function'
                                                    ? step.description(arbiusState)
                                                    : step.description}
                                            </div>
                                        </div>
                                    </div>
                                    {isActive && arbiusState.isProcessing ? (
                                        <ArrowPathIcon className="h-5 w-5 text-blue-400 animate-spin" />
                                    ) : (
                                        isDone && <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Progress bar and toggle */}
                <div>
                    <div className="h-1 bg-gray-800 w-full">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-orange-500 transition-all duration-500"
                            style={{ width: `${(arbiusState.currentStep / (arbiusProcessSteps.length - 1)) * 100}%` }}
                        />
                    </div>
                    <div
                        className="py-1 px-2 bg-gray-800/80 text-xs font-mono border-t border-gray-700 cursor-pointer"
                        onClick={() => setExpanded(prev => !prev)}
                    >
                        <span className={isCompleted ? "text-orange-500" : "text-blue-400"}>
                            Status: {isCompleted ? "Completed" : arbiusState.isProcessing ? "Processing..." : hasInsufficientBalance ? "Insufficient AIUS tokens" : "Ready"}
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
}