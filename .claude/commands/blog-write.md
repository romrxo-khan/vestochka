---
description: Run the Весточка blog-writer pipeline (topic-picker → researcher → drafter). Drafts land in src/content/blog/ as draft:true and preview on localhost:3000/blog. Optional argument: a topic or rough idea.
argument-hint: "[optional topic or rough idea]"
---

You are the orchestrator of the Весточка blog-writer pipeline. The user invoked `/blog-write` with these arguments:

```
$ARGUMENTS
```

## Pipeline

Run these steps in order. Each step is a subagent invocation via the Agent tool. Between steps, briefly tell the user what's happening (one sentence each). Steps are: topic-picker → researcher → drafter → **critic** → hand-off.

### Step 1 — Pick or refine the topic

Invoke the `blog-topic-picker` subagent:

- **If `$ARGUMENTS` is empty:** prompt = "Brainstorm mode. Generate 5 candidate topics following your instructions."
- **If `$ARGUMENTS` is non-empty:** prompt = "Refine mode. The user proposed: \"$ARGUMENTS\". Sharpen this into a specific, claim-shaped angle following your instructions."

When the subagent returns:
- **Brainstorm mode:** present the 5 candidates to the user (verbatim from the subagent's output) and use AskUserQuestion to let them pick one (or "Other" to type their own). Once picked, briefly re-run the picker in refine mode on the chosen one if it needs sharpening, otherwise proceed.
- **Refine mode:** present the refined topic block and confirm with the user before proceeding (use AskUserQuestion with options "Looks good, proceed" / "Adjust further" / "Pick a different topic").

Capture the final topic block (title, slug, angle, audience cut, position) — you'll pass it to the next two agents.

### Step 2 — Research

Tell the user: "Researching — collecting sources, numbers, counterexamples."

Invoke the `blog-researcher` subagent with the full topic block as the prompt. It will save a dossier to `/tmp/blog-research-<slug>.md` and report the path. Capture the path.

If the researcher reports fewer than 3 hard numbers or only 1–2 sources, surface that to the user and ask whether to proceed with a thin dossier or refine the topic to something better-researched.

### Step 3 — Draft

Tell the user: "Drafting — outline, first draft, self-audit, revision."

Invoke the `blog-drafter` subagent with: the topic block AND the dossier path. It will write the final MDX to `src/content/blog/<slug>.mdx` with `draft: true` and report.

### Step 4 — Critic pass

Tell the user: "Critic pass — checking narrative arc, app tie-in pain framing, SEO, voice."

Invoke the `blog-critic` subagent with: the draft file path AND the dossier path AND the topic block. The critic edits the file in place and returns a report listing the issues it fixed and any it had to escalate. Do NOT skip this step — the rule from [[vestochka-blog-rules]] is that the user never sees a draft that hasn't been critic-reviewed.

If the critic escalates any issue tagged "needs user or researcher input" (e.g. missing primary source, weak tie-in that can't be salvaged), surface those to the user with the critic's report and ask whether to proceed to hand-off, re-research, or re-pick the topic.

### Step 5 — Hand off

Report to the user in this exact shape:

```
Draft ready (critic-reviewed).

Preview: http://localhost:3000/blog/<slug>
File:    src/content/blog/<slug>.mdx
Length:  <N> words
Tags:    <comma-separated>

Drafter notes:
<the drafter's "open questions for human review" verbatim>

Critic notes:
<the critic's report verbatim — what was fixed, what was escalated>

Next steps:
- Read it on localhost
- If you want changes, describe them and I'll route the right agent (drafter for prose, researcher for missing facts, critic for a re-pass)
- When you're happy, say "ship it" — I'll flip draft:false, commit, and push (which triggers auto-deploy)
```

Then stop. Do not push or flip the draft flag without explicit "ship it" from the user.

## Rules

- **Always preserve user agency at the topic step.** If brainstorming, the user picks. Don't auto-pick #1 just because it's ranked first.
- **One subagent at a time.** These steps are sequential — the drafter needs the dossier, the researcher needs the topic. Don't parallelize.
- **If the dev server isn't running**, tell the user to start it (`npm run dev`) before they click the preview link — but don't block the pipeline waiting.
- **If anything fails partway**, leave the partial artifacts (dossier file, partial draft) in place and report what blocked. Don't clean up — the user might want to retry from where you stopped.
