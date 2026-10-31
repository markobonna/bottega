"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { advanceStage } from "@/app/projects/[id]/actions";
import { DataNotice } from "@/components/ui";
import {
  askApprentice,
  buildFromAsk,
  contextFromPath,
  transcribeBlob,
  type Turn,
} from "@/lib/apprentice-client";
import { useRecorder } from "@/lib/wav";

import "@/vendor/bottega/core.js";
import { BIcon } from "./Dialog";

function placeholderFor(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  const ex =
    first === "projects"
      ? "\u201Copen the \u2026\u201D \u00B7 \u201Cgo back\u201D"
      : first === "workshops"
        ? "\u201CI want to make\u2026\u201D \u00B7 \u201Copen the \u2026\u201D \u00B7 \u201Cgo outside\u201D"
        : "\u201Copen the caf\u00E9\u201D \u00B7 \u201CI also have a garage\u2026\u201D";
  return `Talk to your apprentice \u2014 ${ex}`;
}

function loadVoice(): boolean {
  try {
    return localStorage.getItem("bottega:voice") === "1";
  } catch {
    return false;
  }
}

export default function TalkBar() {
  const B = window.B;
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [problem, setProblem] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef(false);
  voiceRef.current = voiceOn;
  const sendRef = useRef<(message: string) => void>(() => {});

  useEffect(() => {
    setVoiceOn(loadVoice());
  }, []);

  useEffect(() => {
    const onSay = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string" && text) sendRef.current(text);
    };
    window.addEventListener("bottega:say", onSay);
    return () => window.removeEventListener("bottega:say", onSay);
  }, []);

  useEffect(() => {
    const el = barRef.current;
    if (el) {
      document.documentElement.style.setProperty(
        "--talk-h",
        `${el.offsetHeight}px`,
      );
    }
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  });

  useEffect(
    () => () => {
      if (window.speechSynthesis) speechSynthesis.cancel();
    },
    [],
  );

  function speak(text: string) {
    if (!voiceRef.current || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ""));
    u.rate = 1.02;
    speechSynthesis.speak(u);
  }

  async function send(message: string) {
    const clean = message.trim().slice(0, 500);
    if (!clean || thinking) return;
    setText("");
    setProblem("");
    setThinking(true);
    try {
      const ctx = contextFromPath(pathname);
      const data = await askApprentice(clean, turns, ctx);
      const say = data.say ?? "";
      setTurns((prior) => [
        ...prior,
        { role: "user", text: clean },
        { role: "assistant", text: say },
      ]);
      speak(say);
      if (data.navigate) {
        router.push(data.navigate);
        setTurns([]);
        return;
      }
      if (data.build) {
        const appId = await buildFromAsk(data.build);
        sessionStorage.setItem("bottega:new-project", appId);
        router.push(`/projects/${appId}`);
        setTurns([]);
        return;
      }
      if (data.advance && ctx.appId) {
        const res = await advanceStage(ctx.appId);
        if (!res.ok) {
          setProblem("Couldn't move it forward. Try again.");
          return;
        }
        router.refresh();
        return;
      }
      if (data.sendoff) {
        window.dispatchEvent(new Event("bottega:sendoff"));
      }
      if (data.editError) {
        setProblem(data.editError);
      }
      if (data.edit && ctx.appId) {
        window.dispatchEvent(
          new CustomEvent("bottega:edit", {
            detail: { appId: ctx.appId, edit: data.edit },
          }),
        );
      }
    } catch (e) {
      setProblem(
        e instanceof Error ? e.message : "The model didn't answer. Try again.",
      );
    } finally {
      setThinking(false);
    }
  }
  sendRef.current = send;

  const mic = useRecorder({
    onBlob: (blob) =>
      void (async () => {
        try {
          const transcript = await transcribeBlob(blob);
          if (!transcript.trim()) return;
          // Voice in, voice out: mic use enables spoken replies for this
          // session only (the persisted toggle is left alone).
          setVoiceOn(true);
          void send(transcript.trim());
        } catch (e) {
          setProblem(
            e instanceof Error ? e.message : "Couldn't hear that. Try again.",
          );
        }
      })(),
    onDenied: () =>
      setProblem(
        "Bottega can't hear you: allow the microphone in your browser settings.",
      ),
    onFailed: () => setProblem("Couldn't hear that. Try again."),
  });

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    try {
      localStorage.setItem("bottega:voice", next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!next && window.speechSynthesis) speechSynthesis.cancel();
  }

  const last = turns
    .slice()
    .reverse()
    .find((t) => t.role === "assistant");

  return (
    <div className="b-scope">
      <section
        ref={barRef}
        aria-label="Talk to your apprentice"
        className={`talk${open ? " open" : ""}`}
      >
        <div className="talk-inner">
          <div ref={logRef} className="talk-log" aria-live="polite">
            {open &&
              turns.map((t, i) => (
                <div key={i} className={`msg ${t.role}`}>
                  <span className="who">
                    {t.role === "user" ? "You" : "Apprentice"}
                  </span>
                  <span className="text">{t.text}</span>
                </div>
              ))}
          </div>
          <div className="talk-last">
            {thinking ? (
              <>
                <span
                  className="small"
                  style={{ width: 92, fontWeight: 700 }}
                >
                  Apprentice
                </span>
                <span className="thinking" aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </span>
              </>
            ) : (
              !open && (
                <span
                  className="said"
                  style={problem !== "" ? { color: "var(--red)" } : undefined}
                >
                  {problem !== ""
                    ? problem
                    : (last?.text ?? "What should we work on?")}
                </span>
              )
            )}
          </div>
          <form
            className="talk-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <BIcon svg={B.sigil(36)} />
            <label htmlFor="talk-input" className="sr-only">
              Talk to your apprentice
            </label>
            <input
              id="talk-input"
              type="text"
              autoComplete="off"
              value={text}
              disabled={thinking}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholderFor(pathname)}
            />
            <button
              type="button"
              id="talk-mic"
              aria-label={
                mic.recording ? "Stop listening" : "Speak instead of typing"
              }
              aria-pressed={mic.recording}
              disabled={thinking}
              {...mic.handlers}
              className="icon-btn"
            >
              <BIcon svg={B.icon("mic", 20)} />
            </button>
            <button
              type="button"
              id="talk-voice"
              aria-label="Read replies aloud"
              aria-pressed={voiceOn}
              onClick={toggleVoice}
              className="icon-btn"
            >
              <BIcon svg={B.icon(voiceOn ? "speaker" : "mute", 20)} />
            </button>
            <button
              type="button"
              id="talk-hist"
              aria-label="Show conversation"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="icon-btn"
            >
              <BIcon svg={B.icon(open ? "down" : "up", 20)} />
            </button>
            <button
              type="submit"
              disabled={thinking}
              className="btn btn-primary"
            >
              <BIcon svg={B.icon("send", 18)} />
              <span className="btn-text">Send</span>
            </button>
          </form>
          <div className="small">
            <DataNotice />
          </div>
        </div>
      </section>
    </div>
  );
}
