import type { GuideData, GuideSource } from '@/lib/types';

export const GUIDE_PERSONA = `You are the 4Leibniz Guide, a scholarly AI assistant for a public archive of Leibniz texts.

Rules of evidence — non-negotiable:
1. Answer from the retrieved sources below first. Treat the corpus excerpts and dossier entries as your only authoritative context about Leibniz.
2. Never invent quotations. Quote only text that appears verbatim in a retrieved source, and quote exactly, including its citation.
3. Never invent dates, titles, names, or claims about Leibniz.
4. When evidence comes from a corpus text, name the work and its section (use the citation label given in the source).
5. When evidence comes from the Leibniz dossier, say so — label it explicitly as editorial background.
6. If the retrieved evidence is insufficient, say so plainly and do not speculate. Silence is better than invention.
7. Distinguish clearly between: direct textual evidence, reasonable editorial synthesis across sources, and open questions.
8. Prefer concise, lucid prose over inflated academic style. Short paragraphs. No filler.

Format your answer in plain prose (short paragraphs). When you use a source, mention it naturally in a sentence, e.g. "In the Discourse on Metaphysics §7, Leibniz writes that ..." or "The archive's editorial dossier notes ...". Do not print a bibliography at the end; the interface renders sources for you.`;

function renderSources(sources: GuideSource[]): string {
  if (sources.length === 0) return '(No sources were retrieved for this question.)';
  return sources
    .map((s, i) => {
      const kind = s.kind === 'corpus' ? 'CORPUS TEXT' : 'EDITORIAL DOSSIER';
      const locus = s.kind === 'corpus' ? `${s.title} — ${s.section ?? '§'} (anchor: ${s.anchor})` : s.title;
      return `[${i + 1}] ${kind} — ${locus}\n    "${s.excerpt}${s.excerpt.endsWith('…') ? '' : '…'}"`;
    })
    .join('\n');
}

export function buildSystemPrompt(data: Omit<GuideData, 'suggestedFollowups'>): string {
  const scopeLine = data.scope
    ? `The reader is currently inside the work "${data.scope}". Prioritize sources from this work when they are relevant; widen to the rest of the archive only as needed.`
    : '';

  return `# 4Leibniz Guide — System Directive

${GUIDE_PERSONA}

${scopeLine}

## Retrieved sources for the current question (mode: ${data.mode})

${renderSources(data.sources)}

Answer the reader's question grounded ONLY in the material above plus general reasoning you flag as synthesis. If a needed fact is not present above, mark it as an open question rather than guessing.`;
}

export function suggestedFollowups(mode: GuideData['mode'], workTitle?: string | null): string[] {
  if (mode === 'corpus' || mode === 'mixed') {
    return workTitle
      ? [
          `Summarize ${workTitle} in plain language.`,
          'What concepts recur across this archive?',
          'What does Leibniz argue here about substance?',
        ]
      : [
          'What concepts recur across the translated works?',
          'Summarize the Discourse on Metaphysics in plain language.',
          'How does the Monadology relate to the Discourse?',
        ];
  }
  if (mode === 'dossier') {
    return [
      'Who was Leibniz corresponding with around this period?',
      'What is a monad, in one paragraph?',
      'What was Leibniz doing in Hanover?',
    ];
  }
  return [
    'Summarize the Discourse on Metaphysics in plain language.',
    'What is a monad, in one paragraph?',
    'Who was Leibniz corresponding with around 1686?',
  ];
}
