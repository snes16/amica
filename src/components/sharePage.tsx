import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isTauri } from '@/utils/isTauri';
import { registerPlugin } from 'react-filepond';

import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import type { CharacterData, VrmState } from '@/pages/share';

registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
);

interface ShareComponentProps {
  characterData: CharacterData;
  vrmState: VrmState;
  sqid: string;
  setSqid: (sqid: string) => void; 
}

export default function ShareComponent({
  characterData,
  vrmState,
  sqid,
  setSqid,
}: ShareComponentProps) {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [shouldRegister, setShouldRegister] = useState(false);

  useEffect(() => {
    if (shouldRegister) {
      registerCharacter();
      setShouldRegister(false);
    }
  }, [shouldRegister]);

  async function registerCharacter() {
    setIsRegistering(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AMICA_API_URL}/api/add_character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: characterData.description,
          name: characterData.name,
          system_prompt: characterData.systemPrompt,
          vision_system_prompt: characterData.visionSystemPrompt,
          bg_url: characterData.bgUrl,
          youtube_videoid: characterData.youtubeVideoId,
          vrm_url: characterData.vrmUrl,
          animation_url: characterData.animationUrl,
          voice_url: characterData.voiceUrl,
        }),
      });

      const data = await res.json();
      console.log('response', data);
      setSqid(data.sqid);
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>

        {/* Save Character Button */}
        {!sqid && (
          <div className="sm:col-span-3 max-w-md rounded-xl mt-8">
            <button
              onClick={() => setShouldRegister(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fuchsia-500 hover:bg-fuchsia-600 focus:outline-none disabled:opacity-50 disabled:hover:bg-fuchsia-500 disabled:cursor-not-allowed"
              disabled={!vrmState.vrmLoaded || vrmState.showUploadLocalVrmMessage || vrmState.vrmLoadingFromIndexedDb || isRegistering}
            >
              {t("Save Character")}
            </button>
          </div>
        )}

        {/* Success Message */}
        {sqid && (
          <div className="sm:col-span-3 max-w-md rounded-xl mt-8">
            <p className="text-sm">{t("Share this code (click to copy):")}</p>
            <input
              type="text"
              className="inline-flex items-center px-2 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-fuchsia-600 bg-fuchsia-100 hover:bg-fuchsia-200 focus:outline-transparent focus:border-transparent disabled:opacity-50 disabled:hover:bg-fuchsia-50 disabled:cursor-not-allowed hover:cursor-copy"
              defaultValue={sqid}
              readOnly
              onClick={(e) => {
                // @ts-ignore
                navigator.clipboard.writeText(e.target.value);
              }}
            />
            <p className="mt-6 text-sm">
              {t("Or, you can share this direct link:")}
              {' '}
              <Link
                href={`https://amica.arbius.ai/import/${sqid}`}
                target={isTauri() ? "_blank" : ''}
                className="text-cyan-600 hover:text-cyan-700"
              >
                https://amica.arbius.ai/import/{sqid}
              </Link>
            </p>

            <Link href="/">
              <button
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none disabled:opacity-50 disabled:hover:bg-emerald-500 disabled:cursor-not-allowed"
              >
                {t("Return Home")}
              </button>
            </Link>
          </div>
        )}
      </div>
      <div>
        {/* empty column */}
      </div>
    </div>
  );
}