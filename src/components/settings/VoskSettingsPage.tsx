import { useTranslation } from 'react-i18next';

import { BasicPage, FormRow, NotUsingAlert } from './common';
import { TextInput } from "@/components/textInput";
import { config, updateConfig } from "@/utils/config";

export function VoskSettingsPage({
  voskModelUrl,
  setVoskModelUrl,
  setSettingsUpdated,
}: {
  voskModelUrl: string;
  setVoskModelUrl: (url: string) => void;
  setSettingsUpdated: (updated: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <BasicPage
      title={t("Vosk") + " " + t("Settings")}
      description={t("Vosk_desc", "Configure Vosk speech recognition. Place a Vosk model zip (e.g. vosk-model-ru-0.22.zip) in public/vosk-models/ and set the URL below.")}
    >
      {config("stt_backend") !== "vosk" && (
        <NotUsingAlert>
          {t("not_using_alert", "You are not currently using {{name}} as your {{what}} backend. These settings will not be used.", { name: t("Vosk"), what: t("STT") })}
        </NotUsingAlert>
      )}
      <ul role="list" className="divide-y divide-gray-100 max-w-xs">
        <li className="py-4">
          <FormRow label={t("Model URL")}>
            <TextInput
              value={voskModelUrl}
              onChange={(event: React.ChangeEvent<any>) => {
                setVoskModelUrl(event.target.value);
                updateConfig("vosk_model_url", event.target.value);
                setSettingsUpdated(true);
              }}
            />
          </FormRow>
        </li>
      </ul>
    </BasicPage>
  );
}
