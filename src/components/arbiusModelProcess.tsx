import React, { useState, useEffect } from 'react';
import {
    CheckCircleIcon,
    BoltIcon,
    DocumentIcon,
    CpuChipIcon,
    ArrowPathIcon,
    BeakerIcon
} from "@heroicons/react/24/outline";
import { ArbiusState } from '@/features/arbius/arbius';

export const arbiusProcessSteps = [
    {
        icon: <DocumentIcon className="h-5 w-5" />,
        title: "Submit Task",
        description: "Submit the task to arbius engine",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/20"
    },
    {
        icon: <CpuChipIcon className="h-5 w-5" />,
        title: "Mining",
        description: "Miner is mining the task",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20"
    },
    {
        icon: <DocumentIcon className="h-5 w-5" />,
        title: "Fetching Result",
        description: "Fethcing results from IPFS",
        color: "text-amber-400",
        bgColor: "bg-amber-500/20"
    },
    {
        icon: <CheckCircleIcon className="h-5 w-5" />,
        title: "Complete",
        description: "Process successfully completed",
        color: "text-orange-400",
        bgColor: "bg-orange-500/20"
    }
];



export default function ArbiusProcessIndicator({
    arbiusState
  }: {
    arbiusState: ArbiusState;
  }) {
    const [expanded, setExpanded] = useState(false);

    // Get current step info
    const currentStepInfo = arbiusProcessSteps[arbiusState.currentStep];
    const isCompleted = arbiusState.currentStep === arbiusProcessSteps.length - 1 && 
                      arbiusState.completedSteps.includes(arbiusProcessSteps.length - 1);

    return (
        <div className="fixed top-1 right-4 w-[200px] h-[150px]">
            <div className="grid grid-flow-row grid-rows-[min-content_1fr_min-content] gap-x-[8px] bg-gray-900/80 text-white rounded overflow-hidden">

                {/* Status display - Collapsed view that expands on click */}
                {/* Expandable section */}
                {expanded && (
                    <div className="mt-2 space-y-2">
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
                                            <div className="text-xs text-gray-300">
                                                {step.description}
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



                {/* Progress bar and toggle status */}
                <div className="w-full">
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
                            Status: {isCompleted ? "Completed" : arbiusState.isProcessing ? "Processing..." : "Ready"}
                        </span>
                    </div>
                </div>

            </div>

        </div>
    );
}