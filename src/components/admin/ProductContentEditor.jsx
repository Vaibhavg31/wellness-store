import { FlaskConical, HelpCircle, ListOrdered, Plus, Salad, Trash2 } from 'lucide-react';
import { OptionalSection, fieldClass } from '@/components/admin/AdminFormUi';

const addButton = 'inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-tint';
const removeButton = 'shrink-0 rounded-lg p-2.5 text-danger transition-colors hover:bg-danger-tint';

function RowRemove({ onClick, label }) {
    return (
        <button type="button" onClick={onClick} className={removeButton} aria-label={label}>
            <Trash2 size={15} />
        </button>
    );
}

/**
 * Product education content: ingredients, how-to-use steps, nutrition facts and FAQs.
 * Shown on the storefront as extra tabs (only the ones that have content). Lives in the product form state
 * as `ingredients`, `howToUse`, `nutrition` and `faqs`.
 */
export default function ProductContentEditor({ form, update, optional, setOptional }) {
    const setRow = (key, index, patch) => update(key, form[key].map((item, i) => (i === index ? { ...item, ...patch } : item)));
    const removeRow = (key, index) => update(key, form[key].filter((_, i) => i !== index));

    const nutrition = form.nutrition;
    const setNutritionRow = (index, patch) => update('nutrition', { ...nutrition, rows: nutrition.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) });

    return (
        <>
            <OptionalSection
                icon={FlaskConical}
                title="Key ingredients"
                description="What's inside and why it matters — shown as an Ingredients tab"
                enabled={optional.ingredients}
                onToggle={(v) => setOptional('ingredients', v)}
            >
                <div className="space-y-3">
                    {form.ingredients.map((item, i) => (
                        <div key={i} className="flex flex-col gap-2 sm:flex-row">
                            <input value={item.name} onChange={(e) => setRow('ingredients', i, { name: e.target.value })} className={`${fieldClass} sm:w-1/3`} placeholder="Ingredient (e.g. Ashwagandha)" aria-label={`Ingredient ${i + 1} name`} />
                            <input value={item.benefit} onChange={(e) => setRow('ingredients', i, { benefit: e.target.value })} className={fieldClass} placeholder="Benefit / what it does" aria-label={`Ingredient ${i + 1} benefit`} />
                            <RowRemove onClick={() => removeRow('ingredients', i)} label={`Remove ingredient ${i + 1}`} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('ingredients', [...form.ingredients, { name: '', benefit: '', image: '' }])}>
                    <Plus size={14} /> Add ingredient
                </button>
            </OptionalSection>

            <OptionalSection
                icon={ListOrdered}
                title="How to use"
                description="Step-by-step dosage and usage instructions"
                enabled={optional.howToUse}
                onToggle={(v) => setOptional('howToUse', v)}
            >
                <div className="space-y-2">
                    {form.howToUse.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-semibold text-primary-deep">{i + 1}</span>
                            <input value={step} onChange={(e) => update('howToUse', form.howToUse.map((s, j) => (j === i ? e.target.value : s)))} className={fieldClass} placeholder="e.g. Take 1 capsule twice daily after meals" aria-label={`Step ${i + 1}`} />
                            <RowRemove onClick={() => update('howToUse', form.howToUse.filter((_, j) => j !== i))} label={`Remove step ${i + 1}`} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('howToUse', [...form.howToUse, ''])}>
                    <Plus size={14} /> Add step
                </button>
            </OptionalSection>

            <OptionalSection
                icon={Salad}
                title="Nutrition facts"
                description="Supplement or nutrition panel, one row per nutrient"
                enabled={optional.nutrition}
                onToggle={(v) => setOptional('nutrition', v)}
            >
                <input value={nutrition.servingSize} onChange={(e) => update('nutrition', { ...nutrition, servingSize: e.target.value })} className={`${fieldClass} sm:w-1/2`} placeholder="Serving size (e.g. 30 ml or 1 capsule)" aria-label="Serving size" />
                <div className="space-y-2">
                    {nutrition.rows.map((row, i) => (
                        <div key={i} className="flex flex-col gap-2 sm:flex-row">
                            <input value={row.name} onChange={(e) => setNutritionRow(i, { name: e.target.value })} className={fieldClass} placeholder="Nutrient (e.g. Protein)" aria-label={`Nutrient ${i + 1}`} />
                            <input value={row.value} onChange={(e) => setNutritionRow(i, { value: e.target.value })} className={`${fieldClass} sm:w-32`} placeholder="Amount (24 g)" aria-label={`Amount ${i + 1}`} />
                            <input value={row.dailyValue} onChange={(e) => setNutritionRow(i, { dailyValue: e.target.value })} className={`${fieldClass} sm:w-28`} placeholder="% DV (12%)" aria-label={`Daily value ${i + 1}`} />
                            <RowRemove onClick={() => update('nutrition', { ...nutrition, rows: nutrition.rows.filter((_, j) => j !== i) })} label={`Remove nutrient ${i + 1}`} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('nutrition', { ...nutrition, rows: [...nutrition.rows, { name: '', value: '', dailyValue: '' }] })}>
                    <Plus size={14} /> Add nutrient
                </button>
            </OptionalSection>

            <OptionalSection
                icon={HelpCircle}
                title="Product FAQs"
                description="Questions shoppers ask about this product (also added to search-result rich snippets)"
                enabled={optional.faqs}
                onToggle={(v) => setOptional('faqs', v)}
            >
                <div className="space-y-3">
                    {form.faqs.map((faq, i) => (
                        <div key={i} className="space-y-2 rounded-lg border border-admin-border bg-admin-surface-alt p-3">
                            <div className="flex gap-2">
                                <input value={faq.question} onChange={(e) => setRow('faqs', i, { question: e.target.value })} className={fieldClass} placeholder="Question" aria-label={`FAQ ${i + 1} question`} />
                                <RowRemove onClick={() => removeRow('faqs', i)} label={`Remove FAQ ${i + 1}`} />
                            </div>
                            <textarea value={faq.answer} onChange={(e) => setRow('faqs', i, { answer: e.target.value })} rows={2} className={fieldClass} placeholder="Answer" aria-label={`FAQ ${i + 1} answer`} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('faqs', [...form.faqs, { question: '', answer: '' }])}>
                    <Plus size={14} /> Add FAQ
                </button>
            </OptionalSection>
        </>
    );
}
