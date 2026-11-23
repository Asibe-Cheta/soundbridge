'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import {
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  Q4_OPTIONS,
  Q5_OPTIONS,
  Q6_OPTIONS,
  getCurrentQuestionNumber,
  getEffectiveTotalQuestions,
  getQ7Options,
  getQ7Prompt,
  isQ4Visible,
  nextStep,
  previousStep,
  validateSurveyAnswers,
  type QuestionStep,
  type SurveyAnswers,
} from '@/src/lib/survey-notifications-schema';

const ANON_ID_KEY = 'survey_notifications_v1_anon_id';
const STATE_KEY = 'survey_notifications_v1_state';

type PersistedState = {
  step: QuestionStep;
  answers: SurveyAnswers;
  ref: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  completed: boolean;
};

function loadPersisted(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function getOrCreateAnonId(): string {
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(ANON_ID_KEY, created);
    return created;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const FADE_RISE = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const FADE_ONLY = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

function screenVariants(direction: 1 | -1, reduced: boolean) {
  if (reduced) return FADE_ONLY;
  return {
    initial: { opacity: 0, x: 16 * direction },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 * direction },
  };
}

function ProgressBar({ fraction }: { fraction: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border/60" role="presentation">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary-red to-accent-pink"
        animate={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

function OptionRow({
  type,
  name,
  label,
  checked,
  onChange,
  inputRef,
  onKeyDown,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLLabelElement>) => void;
}) {
  return (
    <label
      onKeyDown={onKeyDown}
      className={cn(
        'flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
        checked
          ? 'border-accent-pink/60 bg-accent-pink/10'
          : 'border-border bg-card hover:bg-accent/5',
      )}
    >
      <input
        ref={inputRef}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 shrink-0 accent-accent-pink"
      />
      <span className="text-sm font-medium leading-snug text-foreground">{label}</span>
    </label>
  );
}

function OtherInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      maxLength={120}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Tell us more (optional)'}
      className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent-pink"
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-primary-red to-accent-pink py-3.5 text-base font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function arrowKeyMove(
  e: React.KeyboardEvent<HTMLLabelElement>,
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  index: number,
) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const delta = e.key === 'ArrowDown' ? 1 : -1;
  const count = refs.current.length;
  const next = (index + delta + count) % count;
  refs.current[next]?.focus();
}

export function SurveyNotificationsClient() {
  const reducedMotionPref = useReducedMotion();
  const reduced = Boolean(reducedMotionPref);

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<QuestionStep>('intro');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [refParam, setRefParam] = useState<string | null>(null);
  const [utm, setUtm] = useState<{ source: string | null; medium: string | null; campaign: string | null }>({
    source: null,
    medium: null,
    campaign: null,
  });
  const anonIdRef = useRef<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    anonIdRef.current = getOrCreateAnonId();
    const persisted = loadPersisted();
    if (persisted) {
      setStep(persisted.step);
      setAnswers(persisted.answers);
      setRefParam(persisted.ref);
      setUtm({ source: persisted.utm_source, medium: persisted.utm_medium, campaign: persisted.utm_campaign });
    } else {
      try {
        const params = new URLSearchParams(window.location.search);
        setRefParam(params.get('ref'));
        setUtm({
          source: params.get('utm_source'),
          medium: params.get('utm_medium'),
          campaign: params.get('utm_campaign'),
        });
      } catch {
        /* ignore */
      }
    }
    setReady(true);
  }, []);

  const persist = useCallback(
    (nextStepValue: QuestionStep, nextAnswers: SurveyAnswers, completed: boolean) => {
      try {
        const state: PersistedState = {
          step: nextStepValue,
          answers: nextAnswers,
          ref: refParam,
          utm_source: utm.source,
          utm_medium: utm.medium,
          utm_campaign: utm.campaign,
          completed,
        };
        window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
      } catch {
        /* ignore */
      }
    },
    [refParam, utm],
  );

  const saveToServer = useCallback(
    async (nextAnswers: SurveyAnswers, completed: boolean) => {
      const validation = validateSurveyAnswers(nextAnswers);
      if (validation.ok === false) return;
      setSaving(true);
      try {
        await fetch('/api/survey/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anon_id: anonIdRef.current,
            answers: validation.cleaned,
            ref: refParam,
            utm_source: utm.source,
            utm_medium: utm.medium,
            utm_campaign: utm.campaign,
            completed,
            website: '', // honeypot, always empty from a real user
          }),
        });
      } catch {
        /* best-effort: localStorage already has the answer */
      } finally {
        setSaving(false);
      }
    },
    [refParam, utm],
  );

  const goNext = useCallback(
    (updatedAnswers: SurveyAnswers) => {
      const target = nextStep(step, updatedAnswers);
      setDirection(1);
      setAnswers(updatedAnswers);
      setStep(target);
      const completed = target === 'finish';
      persist(target, updatedAnswers, completed);
      void saveToServer(updatedAnswers, completed);
    },
    [step, persist, saveToServer],
  );

  const goBack = useCallback(() => {
    const target = previousStep(step, answers);
    setDirection(-1);
    setStep(target);
    persist(target, answers, false);
  }, [step, answers, persist]);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-[560px]">
        {step !== 'intro' && step !== 'finish' ? (
          <div className="mb-6">
            <ProgressBar fraction={getCurrentQuestionNumber(step, answers) / getEffectiveTotalQuestions(answers)} />
            <p className="mt-2 text-xs text-muted-foreground">
              {getCurrentQuestionNumber(step, answers)} of {getEffectiveTotalQuestions(answers)}
            </p>
          </div>
        ) : null}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            variants={screenVariants(direction, reduced)}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {step === 'intro' ? (
              <IntroScreen onStart={() => goNext(answers)} />
            ) : step === 'finish' ? (
              <FinishScreen />
            ) : (
              <QuestionRouter
                step={step}
                answers={answers}
                reduced={reduced}
                onNext={goNext}
                onBack={goBack}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <p className="sr-only" aria-live="polite">
          {saving ? 'Saving…' : ''}
        </p>
      </div>
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold leading-snug">Help shape SoundBridge</h1>
      <p className="mt-3 text-base text-muted-foreground">
        7 quick questions, about 2 minutes. Your answers are anonymous.
      </p>
      <div className="mt-8">
        <PrimaryButton onClick={onStart}>Start</PrimaryButton>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        No personal data is collected. We record your country from your connection, not your exact
        location.
      </p>
    </div>
  );
}

function FinishScreen() {
  return (
    <div>
      <h1 className="text-2xl font-bold leading-snug">Thank you.</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Your answers help us build this properly.
      </p>
      <div className="mt-8">
        <Link
          href="https://soundbridge.live"
          className="text-sm font-medium text-accent-pink underline-offset-4 hover:underline"
        >
          Explore SoundBridge
        </Link>
      </div>
    </div>
  );
}

function optionStagger(reduced: boolean) {
  return {
    container: { animate: { transition: { staggerChildren: reduced ? 0 : 0.04, delayChildren: reduced ? 0 : 0.05 } } },
    item: reduced ? FADE_ONLY : FADE_RISE,
  };
}

function QuestionRouter({
  step,
  answers,
  reduced,
  onNext,
  onBack,
}: {
  step: QuestionStep;
  answers: SurveyAnswers;
  reduced: boolean;
  onNext: (a: SurveyAnswers) => void;
  onBack: () => void;
}) {
  switch (step) {
    case 'q1':
      return (
        <MultiSelectQuestion
          title="In a normal week, which of these do you actually open or reply to?"
          options={Q1_OPTIONS}
          selected={answers.q1 ?? []}
          reduced={reduced}
          onBack={onBack}
          onNext={(selected) => onNext({ ...answers, q1: selected })}
        />
      );
    case 'q2':
      return (
        <SingleSelectQuestion
          title="Overall, which do you respond to more?"
          options={Q2_OPTIONS}
          selected={answers.q2}
          reduced={reduced}
          onBack={onBack}
          onNext={(selected) => onNext({ ...answers, q2: selected })}
        />
      );
    case 'q3':
      return (
        <SingleSelectQuestion
          title="Have you ever turned off or blocked notifications for an app?"
          options={Q3_OPTIONS}
          selected={answers.q3}
          reduced={reduced}
          onBack={onBack}
          onNext={(selected) => {
            const updated: SurveyAnswers = { ...answers, q3: selected };
            if (selected !== 'Yes') {
              delete updated.q4;
              delete updated.q4_other;
            }
            onNext(updated);
          }}
        />
      );
    case 'q4':
      if (!isQ4Visible(answers)) {
        // Guards a direct/stale render; normal navigation never lands here unless q3 === 'Yes'.
        onBack();
        return null;
      }
      return (
        <MultiSelectQuestion
          title="Why?"
          options={Q4_OPTIONS}
          selected={answers.q4 ?? []}
          otherValue={answers.q4_other ?? ''}
          reduced={reduced}
          onBack={onBack}
          onNext={(selected, otherValue) => onNext({ ...answers, q4: selected, q4_other: otherValue })}
        />
      );
    case 'q5':
      return (
        <MultiSelectQuestion
          title="What would it take for you to turn on notifications for any app, and keep them on?"
          options={Q5_OPTIONS}
          selected={answers.q5 ?? []}
          otherValue={answers.q5_other ?? ''}
          reduced={reduced}
          onBack={onBack}
          onNext={(selected, otherValue) => onNext({ ...answers, q5: selected, q5_other: otherValue })}
        />
      );
    case 'q6':
      return (
        <Q6Question
          selected={answers.q6}
          reduced={reduced}
          onBack={onBack}
          onNext={(selected) => onNext({ ...answers, q6: selected })}
        />
      );
    case 'q7':
      return (
        <MultiOrSingleQ7
          answers={answers}
          reduced={reduced}
          onBack={onBack}
          onNext={(selected, otherValue) => onNext({ ...answers, q7: selected, q7_other: otherValue })}
        />
      );
    default:
      return null;
  }
}

function QuestionShell({
  title,
  subtitle,
  reduced,
  children,
  canAdvance,
  onBack,
  onNext,
}: {
  title: string;
  subtitle?: React.ReactNode;
  reduced: boolean;
  children: React.ReactNode;
  canAdvance: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <motion.fieldset
      variants={reduced ? FADE_ONLY : FADE_RISE}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="border-0 p-0"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && canAdvance) {
          e.preventDefault();
          onNext();
        }
      }}
    >
      {subtitle}
      <legend className="text-xl font-semibold leading-snug text-foreground">{title}</legend>
      <div className="mt-5 space-y-2.5">{children}</div>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] rounded-xl border border-border px-5 text-sm font-medium text-muted-foreground hover:bg-accent/5"
        >
          Back
        </button>
        <div className="flex-1">
          <PrimaryButton onClick={onNext} disabled={!canAdvance}>
            Next
          </PrimaryButton>
        </div>
      </div>
    </motion.fieldset>
  );
}

function SingleSelectQuestion({
  title,
  options,
  selected,
  reduced,
  onBack,
  onNext,
}: {
  title: string;
  options: readonly string[];
  selected: string | undefined;
  reduced: boolean;
  onBack: () => void;
  onNext: (selected: string) => void;
}) {
  const [value, setValue] = useState<string | undefined>(selected);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const stagger = optionStagger(reduced);

  return (
    <QuestionShell
      title={title}
      reduced={reduced}
      canAdvance={Boolean(value)}
      onBack={onBack}
      onNext={() => value && onNext(value)}
    >
      <motion.div variants={stagger.container} initial="initial" animate="animate" className="space-y-2.5">
        {options.map((opt, i) => (
          <motion.div key={opt} variants={stagger.item}>
            <OptionRow
              type="radio"
              name={title}
              label={opt}
              checked={value === opt}
              onChange={() => setValue(opt)}
              inputRef={(el) => (refs.current[i] = el)}
              onKeyDown={(e) => arrowKeyMove(e, refs, i)}
            />
          </motion.div>
        ))}
      </motion.div>
    </QuestionShell>
  );
}

function Q6Question({
  selected,
  reduced,
  onBack,
  onNext,
}: {
  selected: string | undefined;
  reduced: boolean;
  onBack: () => void;
  onNext: (selected: string) => void;
}) {
  const [value, setValue] = useState<string | undefined>(selected);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const stagger = optionStagger(reduced);

  return (
    <QuestionShell
      title="Would you turn on notifications for an app like SoundBridge?"
      reduced={reduced}
      canAdvance={Boolean(value)}
      onBack={onBack}
      onNext={() => value && onNext(value)}
      subtitle={
        <div className="mb-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          SoundBridge is an app for music creators and fans. It tells you in real time about concerts
          and events you&apos;ve chosen to follow, anywhere in the world, and nothing random.
        </div>
      }
    >
      <motion.div variants={stagger.container} initial="initial" animate="animate" className="space-y-2.5">
        {Q6_OPTIONS.map((opt, i) => (
          <motion.div key={opt} variants={stagger.item}>
            <OptionRow
              type="radio"
              name="q6"
              label={opt}
              checked={value === opt}
              onChange={() => setValue(opt)}
              inputRef={(el) => (refs.current[i] = el)}
              onKeyDown={(e) => arrowKeyMove(e, refs, i)}
            />
          </motion.div>
        ))}
      </motion.div>
    </QuestionShell>
  );
}

function MultiSelectQuestion({
  title,
  options,
  selected,
  otherValue,
  reduced,
  onBack,
  onNext,
}: {
  title: string;
  options: readonly string[];
  selected: string[];
  otherValue?: string;
  reduced: boolean;
  onBack: () => void;
  onNext: (selected: string[], otherValue: string) => void;
}) {
  const [value, setValue] = useState<string[]>(selected);
  const [other, setOther] = useState<string>(otherValue ?? '');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const stagger = optionStagger(reduced);
  const hasOther = options.includes('Other');

  const toggle = (opt: string) => {
    setValue((prev) => (prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]));
  };

  return (
    <QuestionShell
      title={title}
      reduced={reduced}
      canAdvance={value.length > 0}
      onBack={onBack}
      onNext={() => onNext(value, other)}
    >
      <motion.div variants={stagger.container} initial="initial" animate="animate" className="space-y-2.5">
        {options.map((opt, i) => (
          <motion.div key={opt} variants={stagger.item}>
            <OptionRow
              type="checkbox"
              name={title}
              label={opt}
              checked={value.includes(opt)}
              onChange={() => toggle(opt)}
              inputRef={(el) => (refs.current[i] = el)}
              onKeyDown={(e) => arrowKeyMove(e, refs, i)}
            />
          </motion.div>
        ))}
      </motion.div>
      {hasOther && value.includes('Other') ? (
        <OtherInput value={other} onChange={setOther} />
      ) : null}
    </QuestionShell>
  );
}

function MultiOrSingleQ7({
  answers,
  reduced,
  onBack,
  onNext,
}: {
  answers: SurveyAnswers;
  reduced: boolean;
  onBack: () => void;
  onNext: (selected: string, otherValue: string) => void;
}) {
  const options = getQ7Options(answers);
  const title = getQ7Prompt(answers);
  const [value, setValue] = useState<string | undefined>(answers.q7);
  const [other, setOther] = useState<string>(answers.q7_other ?? '');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const stagger = optionStagger(reduced);
  const hasOther = options.includes('Other');

  return (
    <QuestionShell
      title={title}
      reduced={reduced}
      canAdvance={Boolean(value)}
      onBack={onBack}
      onNext={() => value && onNext(value, other)}
    >
      <motion.div variants={stagger.container} initial="initial" animate="animate" className="space-y-2.5">
        {options.map((opt, i) => (
          <motion.div key={opt} variants={stagger.item}>
            <OptionRow
              type="radio"
              name="q7"
              label={opt}
              checked={value === opt}
              onChange={() => setValue(opt)}
              inputRef={(el) => (refs.current[i] = el)}
              onKeyDown={(e) => arrowKeyMove(e, refs, i)}
            />
          </motion.div>
        ))}
      </motion.div>
      {hasOther && value === 'Other' ? <OtherInput value={other} onChange={setOther} /> : null}
    </QuestionShell>
  );
}
