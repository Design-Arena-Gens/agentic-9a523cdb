"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BokehSeed = {
  left: string;
  bottom: string;
  delay: string;
  duration: string;
  scale: number;
};

type AmbientState = {
  context: AudioContext;
  masterGain: GainNode;
  oscillators: OscillatorNode[];
  chordTimer?: number;
};

const narrationText = `तेरी मेहनत रात की खामोशी को लहजा देती है। लोगों की फुसफुसाहट बस धुंध है—धक्के मत खाना। ध्यान तेरे काम पर है। एक हल्की साँस ले, और रोशनी को अपने अंदर आने दे। कल सुबह जब शहर जागेगा, तेरी कोशिश उनके सवालों का जवाब बन चुकी होगी।`;

const chords = [
  { root: 220, third: 261.63, fifth: 329.63 }, // A minor
  { root: 196, third: 246.94, fifth: 311.13 }, // G sus2
  { root: 174.61, third: 220, fifth: 293.66 }, // F major
  { root: 207.65, third: 261.63, fifth: 311.13 }, // A sus4 resolve
];

const createAmbientState = (context: AudioContext): AmbientState => {
  const masterGain = context.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.9;
  filter.connect(masterGain);

  const oscillators = ["sine", "triangle", "sine"].map((type, index) => {
    const osc = context.createOscillator();
    osc.type = type as OscillatorType;
    const gain = context.createGain();
    gain.gain.value = index === 0 ? 0.18 : index === 1 ? 0.1 : 0.08;
    osc.connect(gain).connect(filter);
    osc.start();
    return osc;
  });

  return {
    context,
    masterGain,
    oscillators,
  };
};

export default function HomePage() {
  const [started, setStarted] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const ambientRef = useRef<AmbientState | null>(null);
  const narrationRef = useRef<SpeechSynthesisUtterance | null>(null);

  const bokehSeeds = useMemo<BokehSeed[]>(
    () =>
      Array.from({ length: 20 }).map(() => ({
        left: `${Math.random() * 100}%`,
        bottom: `${Math.random() * 70}%`,
        delay: `${Math.random() * -20}s`,
        duration: `${14 + Math.random() * 12}s`,
        scale: 0.6 + Math.random() * 0.9,
      })),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    const assignVoice = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;
      const hindiVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("hi"));
      const maleHindi = hindiVoices.find((v) => /male|पुरुष|man/i.test(v.name));
      const selected = maleHindi ?? hindiVoices[0] ?? voices.find((v) => v.lang.toLowerCase().includes("hi")) ?? null;
      setVoice(selected ?? null);
    };

    assignVoice();
    synth.onvoiceschanged = assignVoice;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
      if (ambientRef.current) {
        const { oscillators, masterGain, context, chordTimer } = ambientRef.current;
        masterGain.gain.cancelScheduledValues(context.currentTime);
        masterGain.gain.setTargetAtTime(0, context.currentTime, 0.8);
        oscillators.forEach((osc) => {
          try {
            osc.stop(context.currentTime + 1.2);
          } catch (error) {
            console.error(error);
          }
        });
        if (chordTimer) {
          window.clearInterval(chordTimer);
        }
      }
    };
  }, []);

  const handleStart = async () => {
    if (started) return;
    setStarted(true);

    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(narrationText);
      utterance.lang = "hi-IN";
      utterance.rate = 0.9;
      utterance.pitch = 0.85;
      if (voice) {
        utterance.voice = voice;
      }
      narrationRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    if (typeof window !== "undefined" && !ambientRef.current) {
      const context = new AudioContext();
      await context.resume();
      const ambientState = createAmbientState(context);

      const setChord = (index: number) => {
        const chord = chords[index % chords.length];
        const now = context.currentTime;
        const freqTargets = [chord.root, chord.third, chord.fifth];
        ambientState.oscillators.forEach((osc, idx) => {
          const target = freqTargets[idx] ?? chord.root;
          osc.frequency.cancelScheduledValues(now);
          osc.frequency.setTargetAtTime(target, now, 1.6);
        });
      };

      setChord(0);
      ambientState.masterGain.gain.setTargetAtTime(0.14, context.currentTime, 3.2);

      let chordIndex = 1;
      const timer = window.setInterval(() => {
        setChord(chordIndex);
        chordIndex = (chordIndex + 1) % chords.length;
      }, 9000);

      ambientRef.current = {
        ...ambientState,
        chordTimer: timer,
      };
    }
  };

  return (
    <main className="scene-shell" role="presentation">
      <div className="scene-sky" />
      <div className="streetlight-cone" />
      <div className="bokeh">
        {bokehSeeds.map((seed, index) => (
          <span
            key={`bokeh-${index}`}
            style={{
              left: seed.left,
              bottom: seed.bottom,
              animationDelay: seed.delay,
              animationDuration: seed.duration,
              transform: `scale(${seed.scale})`,
            }}
          />
        ))}
      </div>

      <div className="subtitle-box">परछाइयों के बीच मेहनत की रोशनी</div>

      <div className="background-figures">
        <div className="figure" />
        <div className="figure" />
        <div className="figure" />
      </div>

      <div className="wise-man">
        <div className="staff" />
        <div className="robe" />
        <div className="beard" />
      </div>

      <div className="lamp">
        <div className="lamp-head" />
      </div>

      <div className="boy">
        <div className="lamp-glow" />
        <div className="head">
          <div className="hair" />
          <div className="eyes" />
        </div>
        <div className="torso" />
      </div>

      <div className="desk">
        <div className="notebook" />
      </div>

      <div className="street" />

      <div className={`overlay${started ? " hidden" : ""}`}>
        <h1>अनुभव शुरू करें</h1>
        <p>एक भावनात्मक 9:16 दृश्य जिसमें उम्मीद की रोशनी और बुद्धिमत्ता की आवाज़ एक साथ आती है।</p>
        <button onClick={handleStart}>Play</button>
      </div>

      <div className="text-overlay">
        जब दुनिया सवाल करती रही, तुमने सपने गढ़े। हर कदम पर दृढ़ रहो — यही रोशनी कल की सुबह बनेगी।
      </div>

      <div className="credit">रात्रि प्रेरणा</div>
    </main>
  );
}
