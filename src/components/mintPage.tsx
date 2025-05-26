import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { config, defaults } from '@/utils/config';
import { FilePond, registerPlugin } from 'react-filepond';
import { encodeAgentId, hashFile } from "@/utils/fileUtils";
import { TagsInput } from '@/components/tagsInput';
import { FormRow } from '@/components/settings/common';

import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { abi } from '@/utils/abi';
import { id } from 'ethers';

import type { CharacterData, VrmState } from '@/pages/share';

registerPlugin(
    FilePondPluginImagePreview,
    FilePondPluginFileValidateType,
);

export interface MintCharacterData {
    thumbUrl: string;
    tags: string[];
    agentCategory: string;
}

export interface MintFileStates {
    thumbFiles: File[];
}

const agentCategories = [
    { key: "all", label: "All Agents" },
    { key: "programmer", label: "Programmer" },
    { key: "researcher", label: "Researcher" },
    { key: "friend", label: "Friend" },
    { key: "security", label: "Security" },
    { key: "degenTrader", label: "Degen Trader" },
    { key: "crypto", label: "Crypto" },
    { key: "personalAssistant", label: "Personal Assistant" },
];

const filterKeys = [
    "tts_muted", "autosend_from_mic", "wake_word_enabled", "wake_word",
    "time_before_idle_sec", "debug_gfx", "language", "show_introduction",
    "show_add_to_homescreen", "animation_url", "voice_url",
    "bg_url", "vrm_url", "youtube_videoid", "system_prompt",
    "vision_system_prompt", "name"
];

const lateAssignKeys = [
    "name", "description", "image", "bg_url", "youtube_videoid",
    "vrm_url", "animation_url", "system_prompt",
    "vision_system_prompt", "tags", "agent_category"
];

interface MintingComponentProps {
    characterData: CharacterData;
    vrmState: VrmState;
    agentId: string;
    thumbData: File | null;
    isTransactionDisabled: boolean;
    setAgentId: (id: string) => void;
    setIsTransactionDisabled: (disabled: boolean) => void;
}

export default function MintingComponent({
    characterData,
    vrmState,
    agentId,
    thumbData,
    isTransactionDisabled,
    setAgentId,
    setIsTransactionDisabled
}: MintingComponentProps) {
    const { t } = useTranslation();

    // Transaction state management
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'error' | 'cancelled'>('idle');
    const [txError, setTxError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [txReceipt, setTxReceipt] = useState<any>(null);
    const [isMinting, setIsMinting] = useState(false);
    const [showConfigs, setShowConfigs] = useState(false);
    const [filteredDefault, setFilterDefault] = useState<Record<string, any>>({});

    // Contract configuration
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`;
    const wagmiContractConfig = {
        address: CONTRACT_ADDRESS,
        abi: [
            {
                type: 'function',
                name: 'tokenIdCounter',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ type: 'uint256' }],
            }
        ]
    } as const;

    const { isConnected } = useAccount();
    const { data: aid } = useReadContract({
        ...wagmiContractConfig,
        functionName: 'tokenIdCounter',
        args: [],
    });

    const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        error: confirmError,
        data: receipt
    } = useWaitForTransactionReceipt({
        hash
    });

    // Character Data State
    const [mintData, setMintData] = useState<MintCharacterData>({
        thumbUrl: "",
        tags: [],
        agentCategory: "",
    });
    const updateMintData = (updates: Partial<MintCharacterData>) => {
        setMintData(prev => ({ ...prev, ...updates }));
    };

    // File States
    const [mintFileStates, setMintFileStates] = useState<MintFileStates>({
        thumbFiles: [],
    });
    const updateMintFileStates = (updates: Partial<MintFileStates>) => {
        setMintFileStates(prev => ({ ...prev, ...updates }));
    };

    // Handle transaction disabled state
    useEffect(() => {
        const transactionDisabled = txStatus === 'pending' || isConfirming;
        setIsTransactionDisabled(transactionDisabled);
    }, [txStatus, isConfirming]);

    // Handle thumbnail upload
    useEffect(() => {
        if (thumbData) {
            setMintFileStates(prev => ({
                ...prev,
                thumbFiles: [thumbData],
            }));
        }
    }, [thumbData]);

    // Prevent navigation during active transactions
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (txStatus === 'pending' || isConfirming) {
                e.preventDefault();
                e.returnValue = 'You have a pending transaction. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [txStatus, isConfirming]);

    // Track transaction states
    useEffect(() => {
        if (hash) {
            setTxHash(hash);
        }

        if (writeError) {
            const isRejected = writeError.message?.toLowerCase().includes('user rejected');

            if (isRejected) {
                setTxStatus('idle');
                setIsMinting(false);
            } else {
                setTxStatus('error');
                setTxError(writeError.message);
                setIsMinting(false);
            }
        }

        if (confirmError) {
            setTxStatus('error');
            setTxError(confirmError.message);
            setIsMinting(false);
        }
    }, [hash, isPending, writeError, confirmError, txStatus]);

    // Handle transaction receipt
    useEffect(() => {
        const handleTokenId = async (tokenIdHex: string) => {
            const tokenId = parseInt(tokenIdHex, 16);
            const shortId = encodeAgentId(tokenId);
            setAgentId(shortId);
        };

        if (receipt) {
            setTxReceipt(receipt);
            setTxStatus('confirmed');
            setIsMinting(false);

            try {
                // Look for the ERC20Created event which is emitted during mint
                const erc20CreatedEvent = receipt.logs.find((log: any) => {
                    return log.topics && log.topics[0] === id('ERC20Created(uint256,address)').slice(0, 66);
                });

                if (erc20CreatedEvent && erc20CreatedEvent.topics.length >= 2) {
                    handleTokenId(erc20CreatedEvent.topics[1]!);
                } else {
                    // Fall back to Transfer event from ERC721 mint
                    const transferEvent = receipt.logs.find((log: any) => {
                        return log.topics &&
                            log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                            log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000';
                    });

                    if (transferEvent && transferEvent.topics.length >= 3) {
                        handleTokenId(transferEvent.topics[3]!);
                    } else {
                        aid != undefined ? setAgentId(encodeAgentId(Number(aid))) : null;
                    }
                }
            } catch (e) {
                console.error("Error parsing receipt:", e);
                aid != undefined ? setAgentId(encodeAgentId(Number(aid))) : null;
            }
        }
    }, [receipt, aid]);

    // Handle config toggle
    const handleConfigToggle = () => {
        const filteredDefaults = Object.entries(defaults)
            .filter(([key]) => !filterKeys.includes(key))
            .reduce((acc: Record<string, any>, [key, value]) => {
                acc[key] = config(key);
                return acc;
            }, {});
        setFilterDefault(filteredDefaults);
        setShowConfigs((prevState) => !prevState);
    };

    // Mint character function
    async function mintCharacter() {
        setIsMinting(true);
        setTxStatus('pending');
        setTxError(null);

        try {
            // Filter and prepare config-based defaults
            const filteredDefaults = Object.fromEntries(
                Object.entries(defaults)
                    .filter(([key]) => !filterKeys.includes(key))
                    .map(([key]) => [key, config(key)])
            );

            setFilterDefault(filteredDefaults);

            const configKeys = Object.keys(filteredDefaults);
            const configValues = Object.values(filteredDefaults);

            const lateAssignValues = [
                characterData.name,
                characterData.description,
                mintData.thumbUrl,
                characterData.bgUrl,
                characterData.youtubeVideoId,
                characterData.vrmUrl,
                characterData.animationUrl,
                characterData.systemPrompt,
                characterData.visionSystemPrompt,
                mintData.tags.join(','),
                mintData.agentCategory
            ];

            const keysList = [...configKeys, ...lateAssignKeys, "agent_id"];
            const valuesList = [...configValues, ...lateAssignValues, agentId];

            // Validate inputs before calling the contract
            if (keysList.length !== valuesList.length) {
                throw new Error("Mismatch between keys and values.");
            }

            // Call smart contract
            writeContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: 'mint',
                args: ["Amica NFT", "AINFT", keysList, valuesList],
            });

        } catch (error) {
            console.error("Minting failed:", error);
            setTxStatus('error');
            setTxError(error instanceof Error ? error.message : 'Unknown error');
            setIsMinting(false);
        }
    }

    const isFormDisabled = !!agentId;
    const isFormReadOnly = isFormDisabled || isTransactionDisabled;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Thumbnail URL Input */}
            <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                    {t("Thumbnail URL")}
                </label>
                <div className="mt-2">
                    <input
                        type="text"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        value={mintData.thumbUrl}
                        readOnly={isFormReadOnly}
                        onChange={(e) => updateMintData({ thumbUrl: e.target.value })}
                    />
                    <FilePond
                        files={mintFileStates.thumbFiles}
                        onupdatefiles={(files: any) => updateMintFileStates({ thumbFiles: files })}
                        server={`${process.env.NEXT_PUBLIC_AMICA_API_URL}/api/upload?type=bgimg`}
                        name="file"
                        labelIdle='.png & .jpg files only<br />click or drag & drop'
                        acceptedFileTypes={['image/png', 'image/jpeg']}
                        onremovefile={(err, file) => {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            updateMintData({ thumbUrl: '' });
                        }}
                        onprocessfile={(err, file) => {
                            if (err) {
                                console.error(err);
                                return;
                            }

                            async function handleFile(file: File) {
                                const hashValue = await hashFile(file);
                                updateMintData({
                                    thumbUrl: `${process.env.NEXT_PUBLIC_AMICA_STORAGE_URL}/${hashValue}`
                                });
                            }

                            handleFile(file.file as File);
                        }}
                        disabled={!!agentId}
                    />
                </div>
            </div>

            {/* Tags Input */}
            <TagsInput
                tags={mintData.tags}
                setTags={(tags) => updateMintData({ tags })}
                readOnly={isFormReadOnly}
            />

            {/* Category Selection */}
            <div className='mt-4'>
                <FormRow label={t("Agent Category")}>
                    <select
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        value={mintData.agentCategory}
                        disabled={isFormReadOnly}
                        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                            updateMintData({ agentCategory: event.target.value });
                        }}
                    >
                        {agentCategories.map((category) => (
                            <option key={category.key} value={category.key}>
                                {t(category.label)}
                            </option>
                        ))}
                    </select>
                </FormRow>
            </div>

            {/* Configs Toggle Button */}
            <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
                <button
                    type="button"
                    onClick={handleConfigToggle}
                    className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
                >
                    {showConfigs ? 'Hide Configs' : 'Show Configs'}
                </button>
            </div>


            {/* Configuration Display */}
            {showConfigs && (
                <div className="sm:col-span-3 max-w-md mt-4">
                    {Object.keys(filteredDefault).map((key) => {
                        return Object.keys(filteredDefault).length > 0 ? (
                            <div key={key}>
                                <div className="border-t border-gray-300 mb-4 mt-4"></div>
                                <div className="max-w-md rounded-xl mt-4">
                                    <label className="block text-sm font-medium leading-6 text-gray-900">
                                        {key}
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                            value={filteredDefault[key]}
                                            readOnly={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null;
                    })}
                </div>
            )}

            {/* Transaction Status Messages */}
            <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
                {txStatus === 'pending' && !isConfirming && (
                    <div className="p-4 bg-blue-50 text-blue-700 rounded-md">
                        <p className="font-medium">Transaction Pending</p>
                        <p className="text-sm">Please confirm the transaction in your wallet...</p>
                    </div>
                )}

                {txStatus === 'error' && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-md">
                        <p className="font-medium">Transaction Failed</p>
                        <p className="text-sm">{txError || 'An error occurred while processing your transaction'}</p>
                        <button
                            onClick={() => setTxStatus('idle')}
                            className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {isConfirming && txHash && (
                    <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
                        <p className="font-medium">Transaction Confirming</p>
                        <p className="text-sm">Waiting for blockchain confirmation...</p>
                        <a
                            href={`${process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL}/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline"
                        >
                            View on Block Explorer
                        </a>
                    </div>
                )}
            </div>

            {/* Mint Character Button */}
            {!agentId && (
                <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
                    <button
                        onClick={mintCharacter}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fuchsia-500 hover:bg-fuchsia-600 focus:outline-none disabled:opacity-50 disabled:hover:bg-fuchsia-500 disabled:cursor-not-allowed"
                        disabled={!vrmState.vrmLoaded || vrmState.showUploadLocalVrmMessage || vrmState.vrmLoadingFromIndexedDb || isTransactionDisabled || !isConnected}
                    >
                        {txStatus === 'pending' ? 'Waiting for Confirmation...' :
                            isConfirming ? 'Confirming Transaction...' :
                                t("Mint Agent")}
                    </button>
                </div>
            )}

            {/* Success Message */}
            {isConfirmed && agentId && (
                <div className="sm:col-span-3 max-w-md rounded-xl">
                    <p className="text-sm">{"Minted successfully : Views on Persona Village"}</p>
                    <a
                        href={`https://persona.arbius.ai/agent/${agentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center px-2 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-fuchsia-600 bg-fuchsia-100 hover:bg-fuchsia-200 focus:outline-transparent focus:border-transparent disabled:opacity-50 disabled:hover:bg-fuchsia-50 disabled:cursor-not-allowed"
                        style={{ userSelect: "none", pointerEvents: "auto" }}
                    >
                        {`https://persona.arbius.ai/agent/${agentId}`}
                    </a>

                    {txHash && (
                        <p className="mt-4 text-sm">
                            <a
                                href={`${process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL}/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                            >
                                View Transaction on Block Explorer
                            </a>
                        </p>
                    )}

                    <Link href="/">
                        <button
                            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none disabled:opacity-50 disabled:hover:bg-emerald-500 disabled:cursor-not-allowed"
                        >
                            {t("Return Home")}
                        </button>
                    </Link>
                </div>
            )}
            <div>
                {/* empty column */}
            </div>
        </div>
    );
}