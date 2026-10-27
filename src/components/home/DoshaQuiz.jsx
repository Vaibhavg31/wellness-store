import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, Flame, Leaf, Mountain, RotateCcw, Wind } from 'lucide-react';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import Reveal from '@/components/ui/Reveal';
import { DOSHAS, GOAL_QUESTION, QUESTIONS, loadSavedResult, recommendProducts, saveResult, scoreDosha, shopPathFor } from '@/data/doshaQuiz';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const STEPS = [...QUESTIONS, GOAL_QUESTION];
const DOSHA_ICONS = { vata: Wind, pitta: Flame, kapha: Mountain };

function Question({ question, step, selected, onPick }) {
    return (
        <fieldset>
            <legend className="font-display text-h3 text-ink">{question.title}</legend>
            <div className="mt-6 grid gap-3">
                {question.options.map((option, i) => (
                    <label
                        key={option.label}
                        className={cn(
                            'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-small text-ink transition-colors',
                            'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                            selected === i ? 'border-primary bg-primary-tint' : 'border-line hover:border-primary hover:bg-primary-soft',
                        )}
                    >
                        <input
                            type="radio"
                            name={`prakriti-${step}`}
                            checked={selected === i}
                            onChange={() => onPick(i)}
                            className="size-4 shrink-0 accent-primary"
                        />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

function Result({ result, products, loading, onRetake }) {
    const dosha = DOSHAS[result.dosha];
    const Icon = DOSHA_ICONS[result.dosha];
    const picks = useMemo(() => recommendProducts(products, result.dosha, result.goal), [products, result.dosha, result.goal]);

    return (
        <div>
            <div className="flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-tint text-primary"><Icon size={26} strokeWidth={1.75} aria-hidden="true" /></span>
                <div>
                    <p className="eyebrow">Your Prakriti</p>
                    <h3 className="font-display text-h2 leading-tight text-ink">{dosha.label} <span className="text-muted">· {dosha.element}</span></h3>
                    <p className="mt-1 text-small font-medium text-primary-deep">{dosha.tagline}</p>
                </div>
            </div>
            <p className="mt-4 text-small text-muted">{dosha.summary}</p>

            <ul className="mt-5 grid gap-2.5">
                {dosha.rituals.map((ritual) => (
                    <li key={ritual} className="flex items-start gap-2.5 text-small text-ink">
                        <Leaf size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                        {ritual}
                    </li>
                ))}
            </ul>

            {(loading || picks.length > 0) && (
                <div className="mt-7">
                    <p className="text-small font-semibold text-ink">Picked for your {dosha.label} balance</p>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                        {loading ? [0, 1, 2].map((i) => <li key={i} className="h-28 animate-pulse rounded-lg bg-canvas-alt" />) : picks.map((product) => (
                            <li key={product.id}>
                                <Link to={`/product/${product.id}`} className="flex h-full items-center gap-3 rounded-lg border border-line bg-surface p-2.5 transition-colors hover:border-primary hover:bg-primary-soft sm:flex-col sm:items-stretch">
                                    <img src={imageUrl(product.images?.[0], 240)} alt="" width="120" height="120" loading="lazy" className="size-16 shrink-0 rounded-md bg-canvas-alt object-cover sm:aspect-square sm:size-auto sm:w-full" />
                                    <span className="min-w-0">
                                        <span className="line-clamp-2 text-small font-medium text-ink">{product.title}</span>
                                        <Price price={product.price} originalPrice={product.originalPrice} className="mt-1" />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to={shopPathFor(result.goal)}><Button>Shop my picks <ArrowRight size={16} aria-hidden="true" /></Button></Link>
                <Button variant="ghost" onClick={onRetake}><RotateCcw size={16} aria-hidden="true" /> Retake quiz</Button>
            </div>
            <p className="mt-5 text-caption text-muted">Traditional Ayurvedic guidance for general wellness. It is not medical advice; speak to your doctor about health conditions.</p>
        </div>
    );
}

/** "Know your Prakriti": a 4-question, 30-second Ayurvedic body-type quiz that ends in a personal product shortlist. */
export default function DoshaQuiz({ products = [], loading = false }) {
    const [result, setResult] = useState(loadSavedResult);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState([]);

    const total = STEPS.length;
    const isLastStep = step === total - 1;

    const pick = (index) => setAnswers((prev) => Object.assign([...prev], { [step]: index }));

    const next = () => {
        if (!isLastStep) return setStep(step + 1);
        const finished = { dosha: scoreDosha(answers), goal: GOAL_QUESTION.options[answers[total - 1]].value };
        saveResult(finished);
        return setResult(finished);
    };

    const retake = () => {
        saveResult(null);
        setResult(null);
        setStep(0);
        setAnswers([]);
    };

    return (
        <section className="section bg-canvas" aria-labelledby="prakriti-heading">
            <div className="container-page">
                <Reveal className="grid gap-8 overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-10 lg:grid-cols-[5fr_7fr] lg:gap-14 lg:p-14">
                    <div className="flex flex-col justify-center">
                        <p className="eyebrow mb-3">Ayurveda, made personal</p>
                        <h2 id="prakriti-heading">Find the ritual your body is asking for</h2>
                        <p className="mt-4 text-lead text-muted">In Ayurveda, no two people are the same. Answer four quick questions to discover your Prakriti and get a shortlist chosen for you.</p>
                        <p className="mt-6 inline-flex items-center gap-2 text-small font-medium text-primary-deep">
                            <Clock size={16} aria-hidden="true" /> Takes about 30 seconds · No sign-up
                        </p>
                    </div>

                    <div className="min-w-0 rounded-lg bg-canvas p-5 sm:p-8" aria-live="polite">
                        {result ? (
                            <Result result={result} products={products} loading={loading} onRetake={retake} />
                        ) : (
                            <>
                                <div className="mb-6 flex items-center gap-3">
                                    <p className="text-caption font-semibold text-muted">Question {step + 1} of {total}</p>
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-tint" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label="Quiz progress">
                                        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
                                    </div>
                                </div>
                                <Question key={step} question={STEPS[step]} step={step} selected={answers[step]} onPick={pick} />
                                <div className="mt-6 flex items-center justify-between gap-3">
                                    <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft size={16} aria-hidden="true" /> Back</Button>
                                    <Button onClick={next} disabled={answers[step] === undefined}>
                                        {isLastStep ? 'Show my result' : 'Next'} <ArrowRight size={16} aria-hidden="true" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
