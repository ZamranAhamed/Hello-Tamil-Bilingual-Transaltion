import { useState, useRef, useCallback } from "react";
import type { NimoEmotion } from "../components/NimoAssistant";

interface UseNimoReturn {
  emotion: NimoEmotion;
  subtitle: string;
  visible: boolean;
  showHappyMessage: (messageSinhala: string, subtitleEnglish: string, duration?: number, muteSound?: boolean) => void;
  showSadMessage: (messageSinhala: string, subtitleEnglish: string, duration?: number, muteSound?: boolean) => void;
  hideNimo: () => void;
  muteSound?: boolean;
}

const useNimo = (): UseNimoReturn => {
  const [emotion, setEmotion] = useState<NimoEmotion>("happy");
  const [subtitle, setSubtitle] = useState("");
  const [visible, setVisible] = useState(false);
  const [muteSound, setMuteSound] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const showMessage = useCallback(
    (emote: NimoEmotion, messageSinhala: string, subtitleEnglish: string, duration: number = 3000, mute: boolean = false) => {
      clearTimer();

      setEmotion(emote);
      setSubtitle(messageSinhala);
      setMuteSound(mute);
      setVisible(true);

      // TODO: replace with pre-recorded audio playback

      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, duration);
    },
    []
  );

  const showHappyMessage = useCallback(
    (messageSinhala: string, subtitleEnglish: string, duration?: number, muteSound?: boolean) => {
      showMessage("happy", messageSinhala, subtitleEnglish, duration, muteSound);
    },
    [showMessage]
  );

  const showSadMessage = useCallback(
    (messageSinhala: string, subtitleEnglish: string, duration?: number, muteSound?: boolean) => {
      showMessage("sad", messageSinhala, subtitleEnglish, duration, muteSound);
    },
    [showMessage]
  );

  const hideNimo = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, []);

  return { emotion, subtitle, visible, muteSound, showHappyMessage, showSadMessage, hideNimo };
};

export default useNimo;
