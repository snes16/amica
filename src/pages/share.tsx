import { useRouter } from 'next/router';
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { IconButton } from '@/components/iconButton';
import { RadioBox } from '@/components/radioBox';
import { ConnectButton } from '@rainbow-me/rainbowkit';

import dynamic from 'next/dynamic';
import { vrmDataProvider } from '@/features/vrmStore/vrmDataProvider';

import { useState, useRef, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { config, updateConfig } from '@/utils/config';
import { FilePond, registerPlugin } from 'react-filepond';
import VrmDemo from "@/components/vrmDemo";
import { loadVRMAnimation } from "@/lib/VRMAnimation/loadVRMAnimation";
import { hashFile, blobToFile } from "@/utils/fileUtils";
import { vrmDetector, updateVrmAvatar } from '@/utils/vrmUtils';

import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
);

const ShareComponent = dynamic(() => import('@/components/sharePage'));
const MintingComponent = dynamic(() => import('@/components/mintPage'));

// Types for shared data
export interface CharacterData {
  description: string;
  name: string;
  systemPrompt: string;
  visionSystemPrompt: string;
  bgUrl: string;
  youtubeVideoId: string;
  vrmUrl: string;
  vrmHash: string;
  vrmSaveType: string;
  animationUrl: string;
  voiceUrl: string;
}

export interface VrmState {
  vrmLoaded: boolean;
  vrmLoadedFromIndexedDb: boolean;
  vrmLoadingFromIndexedDb: boolean;
  showUploadLocalVrmMessage: boolean;
}

export interface FileStates {
  bgFiles: any[];
  vrmFiles: any[];
  animationFiles: any[];
  voiceFiles: any[];
}

export default function Share() {
  const { t } = useTranslation();
  const { viewer } = useContext(ViewerContext);
  const router = useRouter();
  
  const [characterCreatorType, setCharacterCreatorType] = useState<"Sharing" | "Minting">("Sharing");
  const [thumbData, setThumbData] = useState<File | null>(null);
  const [isTransactionDisabled, setIsTransactionDisabled] = useState(false);

  const vrmUploadFilePond = useRef<FilePond | null>(null);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Character Data State
  const [characterData, setCharacterData] = useState<CharacterData>({
    description: '',
    name: '',
    systemPrompt: '',
    visionSystemPrompt: '',
    bgUrl: '',
    youtubeVideoId: '',
    vrmUrl: '',
    vrmHash: '',
    vrmSaveType: '',
    animationUrl: '',
    voiceUrl: '',
  });
  const updateCharacterData = (updates: Partial<CharacterData>) => {
    setCharacterData(prev => ({ ...prev, ...updates }));
  };
  
  // VRM State
  const [vrmState, setVrmState] = useState<VrmState>({
    vrmLoaded: false,
    vrmLoadedFromIndexedDb: false,
    vrmLoadingFromIndexedDb: false,
    showUploadLocalVrmMessage: false,
  });
  const updateVrmState = (updates: Partial<VrmState>) => {
    setVrmState(prev => ({ ...prev, ...updates }));
  };

  // File States
  const [fileStates, setFileStates] = useState<FileStates>({
    bgFiles: [],
    vrmFiles: [],
    animationFiles: [],
    voiceFiles: [],
  });
  const updateFileStates = (updates: Partial<FileStates>) => {
    setFileStates(prev => ({ ...prev, ...updates }));
  };

  // Result States
  const [sqid, setSqid] = useState('');
  const [agentId, setAgentId] = useState('');

  // Set background
  useEffect(() => {
    document.body.style.backgroundImage = `url(/liquid-metaballs.jpg)`;
    document.body.style.backgroundSize = `cover`;
    document.body.style.backgroundRepeat = `no-repeat`;
    document.body.style.backgroundPosition = `bottom right`;
  }, []);

  const isFormDisabled = !!sqid || !!agentId;

  const isFormReadOnly = isFormDisabled || isTransactionDisabled;

  // Handle VRM loading from IndexedDB
  useEffect(() => {
    if (vrmState.vrmLoadedFromIndexedDb) {
      vrmDataProvider.addItemUrl(characterData.vrmHash, characterData.vrmUrl);
      updateConfig('vrm_url', characterData.vrmUrl);
      updateConfig('vrm_save_type', 'web');
      updateCharacterData({ vrmSaveType: 'web' });
    }
  }, [vrmState.vrmLoadedFromIndexedDb, characterData.vrmHash, characterData.vrmUrl]);


  // Initialize character data from config
  useEffect(() => {
    setCharacterData(prev => ({
      ...prev,
      name: config('name'),
      systemPrompt: config('system_prompt'),
      visionSystemPrompt: config('vision_system_prompt'),
      bgUrl: !config('bg_url').startsWith('data') ? config('bg_url') : '',
      youtubeVideoId: config('youtube_videoid'),
      vrmUrl: config('vrm_url'),
      vrmHash: config('vrm_hash'),
      vrmSaveType: config('vrm_save_type'),
      animationUrl: config('animation_url'),
      voiceUrl: config('voice_url'),
    }));
  }, []);

  // Update VRM state based on conditions
  useEffect(() => {
    setVrmState(prev => ({
      ...prev,
      showUploadLocalVrmMessage: characterData.vrmSaveType === 'local' &&
        !prev.vrmLoadedFromIndexedDb &&
        !prev.vrmLoadingFromIndexedDb,
    }));
  }, [characterData.vrmSaveType, vrmState.vrmLoadedFromIndexedDb, vrmState.vrmLoadingFromIndexedDb]);


  const handleCloseIcon = () => {
    router.push('/');
  };

  const handleVrmLoad = () => {
    updateVrmState({ vrmLoaded: true });
    (async () => {
      try {
        const animation = await loadVRMAnimation("/animations/idle_loop.vrma");
        if (!animation) {
          console.error('loading animation failed');
          return;
        }
        viewer.model!.loadAnimation(animation!);
        requestAnimationFrame(() => {
          viewer.resetCamera()
        });
      } catch (e) {
        console.error('loading animation failed', e);
      }
    })();
  };

  const handleVrmScreenShot = async (blob: Blob | null) => {
    if (blob) {
      setThumbData(blobToFile(blob!, "thumb.jpg"));
    }
  };

  async function uploadVrmFromIndexedDb() {
    const blob = await vrmDataProvider.getItemAsBlob(characterData.vrmHash);
    if (vrmUploadFilePond.current && blob) {
      vrmUploadFilePond.current.addFile(blob).then(() => {
        updateVrmState({ vrmLoadingFromIndexedDb: true });
      });
    } else {
      console.log("FilePond not loaded, retry in 0.5 sec");
      delay(500).then(uploadVrmFromIndexedDb);
    }
  }

  return (
    <div className="p-10 md:p-20">
      <style jsx global>
        {`
          body {
            background-image: url('/liquid-metaballs.jpg');
            background-size: cover;
            background-repeat: no-repeat;
            background-position: bottom right;
          }
        `}
      </style>

      {/* Header */}
      <div className="fixed top-0 left-0 w-full max-h-full text-black text-xs text-left z-20">
        <div className="p-2 bg-white flex justify-between items-center">
          <IconButton
            iconName="24/Close"
            isProcessing={false}
            className="bg-secondary hover:bg-secondary-hover active:bg-secondary-active"
            onClick={handleCloseIcon}
          />
          <ConnectButton />
        </div>
      </div>

      {/* Character Creator Type Selector */}
      <div className="col-span-3 max-w-md rounded-xl mt-4">
        <RadioBox
          options={[
            { label: "Minting", value: "Minting" },
            { label: "Sharing", value: "Sharing" },
          ]}
          selectedValue={characterCreatorType}
          onChange={(value: string) => setCharacterCreatorType(value as "Sharing" | "Minting")}
          disabled={isFormReadOnly}
        />
      </div>

      {/* Title */}
      <div className="col-span-3 max-w-md rounded-xl mt-4">
        <h1 className="text-lg">{t(`Character Creator for ${characterCreatorType}`)}</h1>
      </div>

      {/* Name Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {t("Name")}
        </label>
        <div className="mt-2">
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.name}
            readOnly={isFormReadOnly}
            onChange={(e) => updateCharacterData({ name: e.target.value })}
          />
        </div>
      </div>

      {/* Description Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {t("Description")}
        </label>
        <div className="mt-2">
          <textarea
            rows={4}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.description}
            readOnly={isFormReadOnly}
            placeholder={t("Provide a description of the character")}
            onChange={(e) => updateCharacterData({ description: e.target.value })}
          />
        </div>
      </div>

      {/* System Prompt Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {t("System Prompt")}
        </label>
        <div className="mt-2">
          <textarea
            rows={4}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.systemPrompt}
            readOnly={isFormReadOnly}
            onChange={(e) => updateCharacterData({ systemPrompt: e.target.value })}
          />
        </div>
      </div>

      {/* Vision System Prompt Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {t("Vision System Prompt")}
        </label>
        <div className="mt-2">
          <textarea
            rows={4}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.visionSystemPrompt}
            readOnly={isFormReadOnly}
            onChange={(e) => updateCharacterData({ visionSystemPrompt: e.target.value })}
          />
        </div>
      </div>

      {/* Background URL Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {t("Background URL")}
        </label>
        <div className="mt-2">
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.bgUrl}
            readOnly={isFormReadOnly}
            onChange={(e) => updateCharacterData({ bgUrl: e.target.value })}
          />
          <FilePond
            files={fileStates.bgFiles}
            onupdatefiles={(files: any) => updateFileStates({ bgFiles: files })}
            server={`${process.env.NEXT_PUBLIC_AMICA_API_URL}/api/upload?type=bgimg`}
            name="file"
            labelIdle='.png & .jpg files only<br />click or drag & drop'
            acceptedFileTypes={['image/png', 'image/jpeg']}
            onremovefile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }
              updateCharacterData({ bgUrl: '' });
            }}
            onprocessfile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }

              async function handleFile(file: File) {
                const hashValue = await hashFile(file);
                updateCharacterData({
                  bgUrl: `${process.env.NEXT_PUBLIC_AMICA_STORAGE_URL}/${hashValue}`
                });
              }

              handleFile(file.file as File);
            }}
            disabled={!!agentId}
          />
        </div>
      </div>

      {/* YouTube Video ID Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {t("YouTube Video ID")}
        </label>
        <div className="mt-2">
          <p className="text-xs text-slate-500">
            {t("Example")}: https://www.youtube.com/watch?v=<span className="text-red-500">dQw4w9WgXcQ</span>
          </p>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.youtubeVideoId}
            readOnly={isFormReadOnly}
            onChange={(e) => updateCharacterData({ youtubeVideoId: e.target.value })}
          />
          {characterData.youtubeVideoId && (
            <img width="100%" src={`https://img.youtube.com/vi/${characterData.youtubeVideoId}/0.jpg`} />
          )}
        </div>
      </div>

      {/* VRM Upload Message */}
      {vrmState.showUploadLocalVrmMessage && (
        <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
          <label className="block text-sm font-medium leading-6 text-gray-900">
            {t("Upload VRM")}
          </label>
          <div className="mt-2 text-sm leading-6 text-gray-900">
            <p>{t("VRM upload message")}</p>
            <p>{t("VRM local share message")}</p>
            <div className="sm:col-span-3 max-w-md rounded-xl mt-2">
              <button
                onClick={uploadVrmFromIndexedDb}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fuchsia-500 hover:bg-fuchsia-600 focus:outline-none disabled:opacity-50 disabled:hover:bg-fuchsia-500 disabled:cursor-not-allowed"
              >
                {t("Upload Vrm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VRM URL Input */}
      <div className={"sm:col-span-3 max-w-md rounded-xl mt-4" + (!vrmState.showUploadLocalVrmMessage ? "" : " hidden")}>
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {t("VRM Url")}
        </label>
        <div className="mt-2">
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.vrmUrl}
            readOnly={isFormReadOnly}
            onChange={(e) => {
              updateCharacterData({ vrmUrl: e.target.value });
              updateVrmAvatar(viewer, e.target.value);
              updateVrmState({ vrmLoaded: false });
            }}
          />
          <FilePond
            ref={vrmUploadFilePond}
            files={fileStates.vrmFiles}
            onupdatefiles={(files: any) => updateFileStates({ vrmFiles: files })}
            server={`${process.env.NEXT_PUBLIC_AMICA_API_URL}/api/upload?type=vrm`}
            name="file"
            labelIdle='.vrm files only<br />click or drag & drop'
            acceptedFileTypes={['model/gltf-binary']}
            fileValidateTypeDetectType={vrmDetector}
            onaddfilestart={(file) => {
              updateCharacterData({ vrmUrl: '' });
              updateVrmState({ vrmLoaded: false });
            }}
            onremovefile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }
              updateCharacterData({ vrmUrl: '' });
              updateVrmState({ vrmLoaded: false });
            }}
            onprocessfile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }

              async function handleFile(file: File) {
                const hashValue = await hashFile(file);
                const url = `${process.env.NEXT_PUBLIC_AMICA_STORAGE_URL}/${hashValue}`;
                updateCharacterData({ vrmUrl: url });
                updateVrmAvatar(viewer, url);
                if (characterData.vrmSaveType === 'local') {
                  updateVrmState({
                    vrmLoadingFromIndexedDb: false,
                    vrmLoadedFromIndexedDb: true
                  });
                }
                updateVrmState({ vrmLoaded: false });
              }

              handleFile(file.file as File);
            }}
            disabled={!!agentId}
          />

          {/* VRM Demo */}
          <div className="sm:col-span-3 max-w-md rounded-xl mt-4 bg-gray-100">
            {characterData.vrmUrl && (
              <VrmDemo
                vrmUrl={characterData.vrmUrl}
                onLoaded={handleVrmLoad}
                onScreenShot={handleVrmScreenShot}
              />
            )}
          </div>
        </div>
      </div>

      {/* Animation URL Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          Animation Url
        </label>
        <div className="mt-2">
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.animationUrl}
            readOnly={isFormReadOnly}
            onChange={(e) => updateCharacterData({ animationUrl: e.target.value })}
          />
          <FilePond
            files={fileStates.animationFiles}
            onupdatefiles={(files: any) => updateFileStates({ animationFiles: files })}
            server={`${process.env.NEXT_PUBLIC_AMICA_API_URL}/api/upload?type=anim`}
            name="file"
            labelIdle='.vrm files only<br />click or drag & drop'
            acceptedFileTypes={['model/gltf-binary']}
            fileValidateTypeDetectType={vrmDetector}
            onremovefile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }
              updateCharacterData({ animationUrl: '' });
            }}
            onprocessfile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }

              async function handleFile(file: File) {
                const hashValue = await hashFile(file);
                updateCharacterData({
                  animationUrl: `${process.env.NEXT_PUBLIC_AMICA_STORAGE_URL}/${hashValue}`
                });
              }

              handleFile(file.file as File);
            }}
            disabled={!!agentId}
          />
        </div>
      </div>

      {/* Voice URL Input */}
      <div className="sm:col-span-3 max-w-md rounded-xl mt-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          Voice Url
        </label>
        <div className="mt-2">
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={characterData.voiceUrl}
            readOnly={isFormReadOnly}
            onChange={(e) => updateCharacterData({ voiceUrl: e.target.value })}
          />
          <FilePond
            files={fileStates.voiceFiles}
            onupdatefiles={(files: any) => updateFileStates({ voiceFiles: files })}
            server={`${process.env.NEXT_PUBLIC_AMICA_API_URL}/api/upload?type=voice`}
            name="file"
            labelIdle='.wav & .mp3 files only<br />click or drag & drop'
            acceptedFileTypes={['audio/wav', 'audio/mpeg']}
            onremovefile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }
              updateCharacterData({ voiceUrl: '' });
            }}
            onprocessfile={(err, file) => {
              if (err) {
                console.error(err);
                return;
              }

              async function handleFile(file: File) {
                const hashValue = await hashFile(file);
                updateCharacterData({
                  voiceUrl: `${process.env.NEXT_PUBLIC_AMICA_STORAGE_URL}/${hashValue}`
                });
              }

              handleFile(file.file as File);
            }}
            disabled={isFormReadOnly}
          />
        </div>
      </div>

      {/* Render rest of the component based on type */}
      {characterCreatorType === "Sharing" ? (
        <ShareComponent
          characterData={characterData}
          vrmState={vrmState}
          sqid={sqid}
          setSqid={setSqid}
        />
      ) : (
        <MintingComponent
          characterData={characterData}
          vrmState={vrmState}
          agentId={agentId}
          thumbData={thumbData}
          isTransactionDisabled={isTransactionDisabled}
          setAgentId={setAgentId}
          setIsTransactionDisabled={setIsTransactionDisabled}
        />
      )}
    </div>
  );
}