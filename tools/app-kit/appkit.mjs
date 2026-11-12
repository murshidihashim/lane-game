#!/usr/bin/env node
// app-kit: owner-approved workflow records for any app project. No dependencies (Node 18+).
// Run from the project root:  node tools/app-kit/appkit.mjs <command> [...]
//
//   init --app "Name" --owner "Name" [--tz Area/City]   set up docs/workflow, CLAUDE.md, the agent
//   status                                   active package, pending approvals, last history line
//   plan "Title" [--problem "..."]           new work package PLAN-### (proposed)
//   decision "Title" [--question "..."]      new decision DEC-### (proposed)
//   report "Title" [--type "..."]            new report REP-### (snapshot; never rewritten)
//   approve ID "owner's exact words"         record approval (only the owner's words)
//   reject ID "owner's exact words"          record rejection
//   supersede ID BY_ID                       mark ID superseded by BY_ID
//   deliver ID "<delivery status>"           not started | in progress | implemented | verified | released
//   test PLAN-### "Acceptance text"          add acceptance test T# (result NOT RUN)
//   result PLAN-### T# RESULT "evidence"     PASS | FAIL | NOT RUN | NOT APPLICABLE
//   note PLAN-### "User-facing note"         add a line for the changelog
//   log "text"                               append a history line with the real local time
//   release VERSION "note" ["note" ...]      add a release candidate (includes verified, unreleased plans)
//   published VERSION COMMIT                 mark a release as published today
//   release-check [VERSION]                  refuse unless a candidate exists for the version
//   build                                    regenerate DECISIONS.md, CHANGELOG.md, STATE pending block
//   check                                    validate records, append-only history, views up to date
//
// Environment: APPKIT_DIR (default docs/workflow), APPKIT_BASE (git ref for the history check, default HEAD).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const DIR = process.env.APPKIT_DIR || 'docs/workflow';
const REC = `${DIR}/records`;
const REP = `${DIR}/reports`;
const OUT = { register: `${DIR}/DECISIONS.md`, changelog: 'CHANGELOG.md', state: `${DIR}/STATE.md` };
const APPROVAL = ['proposed', 'awaiting approval', 'approved', 'rejected', 'superseded'];
const DELIVERY = ['not started', 'in progress', 'implemented', 'verified', 'released'];
const RESULTS = ['PASS', 'FAIL', 'NOT RUN', 'NOT APPLICABLE'];
const PENDING = ['proposed', 'awaiting approval'];

const abs = (f) => join(ROOT, f);
const read = (f) => readFileSync(abs(f), 'utf8');
const json = (f) => JSON.parse(read(f));
const save = (f, data) => writeFileSync(abs(f), typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const die = (title, errs = []) => { console.error([title, ...errs.map((e) => `  - ${e}`)].join('\n')); process.exit(1); };
const pad = (n) => String(n).padStart(3, '0');

/** Real local time in the project's time zone: "YYYY-MM-DD HH:MM". */
function now(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// ---------- argument parsing ----------

const argv = process.argv.slice(2);
const cmd = argv[0];
const pos = [];
const opt = {};
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
  else pos.push(argv[i]);
}

// ---------- init ----------

function init() {
  const app = opt.app, owner = opt.owner, tz = opt.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  if (!app || !owner) die('Usage: appkit init --app "App name" --owner "Owner name" [--tz Area/City]');
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { die(`Unknown time zone "${tz}". Use a name like Asia/Kuala_Lumpur.`); }
  const date = now(tz).slice(0, 10);
  const fill = (s) => s.replaceAll('{{APP}}', app).replaceAll('{{OWNER}}', owner).replaceAll('{{TZ}}', tz).replaceAll('{{DATE}}', date);
  const made = [];
  const put = (file, text) => { if (existsSync(abs(file))) return; mkdirSync(dirname(abs(file)), { recursive: true }); save(file, text); made.push(file); };

  put(`${REC}/decisions.json`, { app, owner, timezone: tz, decisions: [], history: [{ at: now(tz), text: `Project records started for ${app}.` }] });
  put(`${REC}/releases.json`, { releases: [] });
  mkdirSync(abs(REP), { recursive: true });
  for (const t of ['STATE.md', 'APP-BRIEF.md', 'OWNER-BRIEF.md']) put(`${DIR}/${t}`, fill(read0(`templates/${t}`)));
  put('CLAUDE.md', fill(read0('templates/CLAUDE.md')));
  const agent = '.claude/agents/app-steward.md';
  if (!existsSync(abs(agent))) { mkdirSync(abs('.claude/agents'), { recursive: true }); copyFileSync(join(KIT, 'agent/app-steward.md'), abs(agent)); made.push(agent); }
  build(true);
  console.log(made.length ? `Created:\n${made.map((f) => `  ${f}`).join('\n')}` : 'Nothing to create; the project is already set up.');
  console.log('Next: fill APP-BRIEF.md, put your real commands in CLAUDE.md, add "appkit check" to your verify command.');
}
function read0(rel) { return readFileSync(join(KIT, rel), 'utf8'); }

// ---------- loading and ids ----------

function load(base) {
  const get = (f) => {
    if (!base) return existsSync(abs(f)) ? json(f) : null;
    try { return JSON.parse(git('show', `${base}:${f}`)); } catch { return null; }
  };
  let planFiles;
  if (base) { try { planFiles = git('ls-tree', '--name-only', base, `${REC}/`).split('\n').map((p) => p.split('/').pop()); } catch { planFiles = []; } }
  else planFiles = existsSync(abs(REC)) ? readdirSync(abs(REC)) : [];
  return {
    dec: get(`${REC}/decisions.json`),
    plans: planFiles.filter((f) => /^PLAN-\d{3}\.json$/.test(f)).sort().map((f) => get(`${REC}/${f}`)).filter(Boolean),
    rel: get(`${REC}/releases.json`) ?? { releases: [] },
  };
}
const reportIds = () => (existsSync(abs(REP)) ? readdirSync(abs(REP)).filter((f) => /^REP-\d{3}\.md$/.test(f)).sort().map((f) => f.slice(0, 7)) : []);
const nextId = (kind, ids) => `${kind}-${pad(ids.length + 1)}`;

function state() {
  const s = load(null);
  if (!s.dec) die(`No records found in ${REC}. Run: appkit init --app "Name" --owner "Name"`);
  return s;
}
function findRecord(s, id) {
  if (id?.startsWith('PLAN-')) {
    const p = s.plans.find((x) => x.id === id);
    if (!p) die(`${id} doesn't exist.`);
    return { rec: p, commit: () => save(`${REC}/${id}.json`, p) };
  }
  const d = s.dec.decisions.find((x) => x.id === id);
  if (!d) die(`${id} doesn't exist.`);
  return { rec: d, commit: () => save(`${REC}/decisions.json`, s.dec) };
}
function history(s, text) { s.dec.history.push({ at: now(s.dec.timezone), text }); save(`${REC}/decisions.json`, s.dec); }

// ---------- record commands ----------

function plan() {
  const s = state(); const title = pos[0];
  if (!title) die('Usage: appkit plan "Title" [--problem "..."]');
  const id = nextId('PLAN', s.plans.map((p) => p.id));
  const rec = {
    id, title, problem: opt.problem ?? '', scope: [], exclusions: [], acceptance: [],
    risks: [], cost: opt.cost ?? 'not estimated', decisions: [], reports: [],
    changes: { added: [], changed: [], fixed: [], removed: [] }, userNotes: [],
    approval: { status: 'proposed' }, delivery: 'not started', release: 'unreleased',
  };
  save(`${REC}/${id}.json`, rec);
  history(s, `${id} proposed: ${title}.`);
  console.log(`${id} created (proposed). Fill problem, scope, exclusions, acceptance, risks and cost in ${REC}/${id}.json.`);
}

function decision() {
  const s = state(); const title = pos[0];
  if (!title) die('Usage: appkit decision "Title" [--question "..."] [--choice "..."]');
  const id = nextId('DEC', s.dec.decisions.map((d) => d.id));
  s.dec.decisions.push({
    id, title, question: opt.question ?? '', options: [], choice: opt.choice ?? '', rationale: '',
    impact: { user: '', technical: '', data: '' }, cost: opt.cost ?? 'not estimated', owner: s.dec.owner,
    approval: { status: 'proposed' }, delivery: 'not started', reports: [], reviewTrigger: '',
  });
  history(s, `${id} proposed: ${title}.`);
  console.log(`${id} created (proposed). Fill question, options, choice, rationale and impact in ${REC}/decisions.json.`);
}

function report() {
  const s = state(); const title = pos[0];
  if (!title) die('Usage: appkit report "Title" [--type "..."]');
  const id = nextId('REP', reportIds());
  const at = now(s.dec.timezone);
  let branch = '', commit = '';
  try { branch = git('rev-parse', '--abbrev-ref', 'HEAD'); commit = git('rev-parse', '--short', 'HEAD'); } catch { /* not a git repo yet */ }
  save(`${REP}/${id}.md`, [
    `# ${id} · ${title}`, '', '| | |', '|---|---|',
    `| App | ${s.dec.app} (branch ${branch || 'n/a'}, ${commit || 'no commit'}) |`,
    `| Report date | ${at} (${s.dec.timezone}) |`,
    `| Type | ${opt.type ?? '<plan proposal / implementation / analysis / release>'} |`,
    '| Request | "<owner\'s words>" |', '| Plans | <PLAN-###> |', '',
    '## STATUS', '', '<one paragraph>', '',
    '## SUMMARY', '', '## PLAN OR WORK COMPLETED', '',
    '## VALIDATION', '', '| Test | Result | Evidence |', '|---|---|---|', '| T1 | NOT RUN | |', '',
    '## NOT DONE OR NOT VERIFIED', '', '## CHANGELOG', '', '## RISKS AND COSTS', '',
    '## NEXT ACTION OR APPROVAL', '', '## DOCUMENT RECORD', '', `Written ${at}. This report is a snapshot and is not rewritten.`, '',
  ].join('\n'));
  history(s, `${id} written: ${title}.`);
  console.log(`${id} created at ${REP}/${id}.md.`);
}

function setApproval(status) {
  const s = state(); const [id, words] = pos;
  if (!id || !words) die(`Usage: appkit ${cmd} ID "owner's exact words"`);
  const { rec, commit } = findRecord(s, id);
  if (['approved', 'rejected'].includes(rec.approval.status)) die(`${id} is already ${rec.approval.status}. Recorded approvals are never rewritten; create a new plan or decision.`);
  const date = now(s.dec.timezone).slice(0, 10);
  rec.approval = { status, evidence: words, date };
  commit();
  history(s, `Owner ${status} ${id}: "${words}".`);
  console.log(`${id} ${status} (${date}).`);
}

function supersede() {
  const s = state(); const [id, by] = pos;
  if (!id || !by) die('Usage: appkit supersede ID BY_ID');
  const { rec, commit } = findRecord(s, id);
  findRecord(s, by);
  rec.approval = { ...rec.approval, status: 'superseded' };
  rec.supersededBy = by;
  commit();
  history(s, `${id} superseded by ${by}.`);
  console.log(`${id} superseded by ${by}.`);
}

function deliver() {
  const s = state(); const [id, status] = pos;
  if (!id || !DELIVERY.includes(status)) die(`Usage: appkit deliver ID "${DELIVERY.join(' | ')}"`);
  const { rec, commit } = findRecord(s, id);
  if (status !== 'not started' && rec.approval.status !== 'approved') die(`${id} is "${rec.approval.status}". Work starts only after the owner approves.`);
  if (status === 'verified' && id.startsWith('PLAN-')) {
    const open = (rec.acceptance ?? []).filter((a) => a.result !== 'PASS' && a.result !== 'NOT APPLICABLE');
    if (open.length) die(`${id} can't be verified: ${open.map((a) => `${a.id} is ${a.result}`).join(', ')}.`);
  }
  rec.delivery = status;
  commit();
  history(s, `${id} delivery: ${status}.`);
  console.log(`${id} delivery: ${status}.`);
}

function test() {
  const s = state(); const [id, text] = pos;
  if (!id?.startsWith('PLAN-') || !text) die('Usage: appkit test PLAN-### "Acceptance text"');
  const { rec, commit } = findRecord(s, id);
  const tid = `T${rec.acceptance.length + 1}`;
  rec.acceptance.push({ id: tid, text, result: 'NOT RUN', evidence: '' });
  commit();
  console.log(`${id} ${tid} added (NOT RUN).`);
}

function result() {
  const s = state(); const [id, tid, res, evidence] = pos;
  if (!id?.startsWith('PLAN-') || !tid || !RESULTS.includes(res)) die(`Usage: appkit result PLAN-### T# "${RESULTS.join(' | ')}" "evidence"`);
  if (res !== 'NOT RUN' && !evidence) die('A result needs evidence: the command and its output, a file, or a screenshot.');
  const { rec, commit } = findRecord(s, id);
  const t = rec.acceptance.find((a) => a.id === tid);
  if (!t) die(`${id} has no ${tid}.`);
  Object.assign(t, { result: res, evidence: evidence ?? '' });
  commit();
  history(s, `${id} ${tid}: ${res}${evidence ? ` (${evidence})` : ''}.`);
  console.log(`${id} ${tid}: ${res}.`);
}

function note() {
  const s = state(); const [id, text] = pos;
  if (!id?.startsWith('PLAN-') || !text) die('Usage: appkit note PLAN-### "User-facing note"');
  const { rec, commit } = findRecord(s, id);
  rec.userNotes.push(text);
  commit();
  console.log(`${id}: note added.`);
}

function log() {
  const s = state();
  if (!pos[0]) die('Usage: appkit log "text"');
  history(s, pos.join(' '));
  console.log('History line added.');
}

function release() {
  const s = state(); const [version, ...notes] = pos;
  if (!version || !notes.length) die('Usage: appkit release VERSION "note" ["note" ...]');
  if (s.rel.releases.some((r) => r.version === version)) die(`Release ${version} already exists.`);
  const plans = s.plans.filter((p) => p.release === 'unreleased' && p.delivery === 'verified').map((p) => p.id);
  s.rel.releases.push({ version, status: 'candidate', notes, plans });
  save(`${REC}/releases.json`, s.rel);
  history(s, `Release candidate ${version} prepared${plans.length ? ` (${plans.join(', ')})` : ''}. Publishing needs the owner's separate approval.`);
  console.log(`Release candidate ${version} added. Plans included: ${plans.join(', ') || 'none'}.`);
}

function published() {
  const s = state(); const [version, commitId] = pos;
  if (!version || !commitId) die('Usage: appkit published VERSION COMMIT');
  const r = s.rel.releases.find((x) => x.version === version);
  if (!r) die(`No release ${version}.`);
  if (r.status === 'published') die(`${version} is already published.`);
  Object.assign(r, { status: 'published', date: now(s.dec.timezone).slice(0, 10), commit: commitId });
  save(`${REC}/releases.json`, s.rel);
  for (const id of r.plans ?? []) {
    const p = s.plans.find((x) => x.id === id);
    if (p) { p.release = version; p.delivery = 'released'; save(`${REC}/${id}.json`, p); }
  }
  history(s, `Release ${version} published at ${commitId} (performed by the owner).`);
  console.log(`${version} marked published.`);
}

function releaseCheck() {
  const s = state();
  let version = pos[0];
  if (!version && existsSync(abs('package.json'))) version = json('package.json').version;
  if (!version) die('Usage: appkit release-check VERSION');
  const r = s.rel.releases.find((x) => x.version === version);
  const problems = [];
  if (!r) problems.push(`No release entry for ${version}. Ask Claude to PREPARE RELEASE first.`);
  else if (r.status !== 'candidate') problems.push(`Release ${version} is already published. Bump the version.`);
  try { if (git('ls-remote', '--tags', 'origin', `refs/tags/v${version}`)) problems.push(`Tag v${version} already exists.`); } catch { /* offline: checked again when tagging */ }
  if (problems.length) die('RELEASE CHECK FAILED:', problems);
  console.log(`RELEASE OK: ${version}\n${r.notes.map((n) => `  - ${n}`).join('\n')}`);
}

function status() {
  const s = state();
  const active = s.plans.filter((p) => p.approval.status === 'approved' && ['in progress', 'implemented'].includes(p.delivery));
  const pending = [...s.dec.decisions, ...s.plans].filter((r) => PENDING.includes(r.approval.status));
  const last = s.dec.history[s.dec.history.length - 1];
  const cand = s.rel.releases.filter((r) => r.status === 'candidate').map((r) => r.version);
  const live = s.rel.releases.filter((r) => r.status === 'published').pop();
  console.log([
    `${s.dec.app} · owner ${s.dec.owner}`,
    `Active: ${active.map((p) => `${p.id} ${p.title} (${p.delivery})`).join('; ') || 'none'}${active.length > 1 ? '  ← more than one active package' : ''}`,
    `Waiting for the owner: ${pending.map((r) => `${r.id} ${r.title}`).join('; ') || 'nothing'}`,
    `Live: ${live ? `${live.version} (${live.date})` : 'not published'}${cand.length ? ` · candidate ${cand.join(', ')}` : ''}`,
    `Last record: ${last ? `${last.at} · ${last.text}` : 'none'}`,
  ].join('\n'));
}

// ---------- checks ----------

function validate({ dec, plans, rel }) {
  const errs = [];
  const reports = reportIds();
  const seq = (ids, kind) => ids.forEach((id, i) => {
    if (id !== `${kind}-${pad(i + 1)}`) errs.push(`${kind} IDs must run 001, 002, … without gaps: found ${id} where ${kind}-${pad(i + 1)} was expected.`);
  });
  seq(dec.decisions.map((d) => d.id), 'DEC');
  seq(plans.map((p) => p.id), 'PLAN');
  seq(reports, 'REP');
  const known = new Set([...dec.decisions.map((d) => d.id), ...plans.map((p) => p.id), ...reports]);
  for (const r of [...dec.decisions, ...plans]) {
    const a = r.approval ?? {};
    if (!APPROVAL.includes(a.status)) errs.push(`${r.id}: approval "${a.status}" must be one of: ${APPROVAL.join(', ')}.`);
    if (['approved', 'rejected'].includes(a.status) && !(a.evidence && /^\d{4}-\d{2}-\d{2}$/.test(a.date ?? ''))) errs.push(`${r.id} is ${a.status} without the owner's words and a date.`);
    if (a.status === 'superseded' && !known.has(r.supersededBy)) errs.push(`${r.id} is superseded by "${r.supersededBy}", which doesn't exist.`);
    if (!DELIVERY.includes(r.delivery)) errs.push(`${r.id}: delivery "${r.delivery}" must be one of: ${DELIVERY.join(', ')}.`);
    if (r.delivery !== 'not started' && !['approved', 'superseded'].includes(a.status)) errs.push(`${r.id} is "${r.delivery}" but was never approved.`);
    for (const x of [...(r.reports ?? []), ...(r.decisions ?? [])]) if (!known.has(x)) errs.push(`${r.id} refers to ${x}, which doesn't exist.`);
  }
  for (const p of plans) (p.acceptance ?? []).forEach((t) => {
    if (!RESULTS.includes(t.result)) errs.push(`${p.id} ${t.id}: result "${t.result}" must be ${RESULTS.join(' / ')}.`);
    if (['PASS', 'FAIL'].includes(t.result) && !t.evidence) errs.push(`${p.id} ${t.id} says ${t.result} without evidence.`);
  });
  for (const r of reports) {
    const md = read(`${REP}/${r}.md`);
    if (!md.startsWith(`# ${r} `)) errs.push(`${r}.md must start with "# ${r} ".`);
    for (const ref of new Set(md.match(/\b(?:DEC|PLAN|REP)-\d{3}\b/g) ?? [])) if (!known.has(ref)) errs.push(`${r}.md mentions ${ref}, which doesn't exist.`);
  }
  dec.history.forEach((h, i) => {
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(h.at ?? '')) errs.push(`History line ${i + 1} needs a time like "2026-01-31 13:15".`);
    if (i && h.at < dec.history[i - 1].at) errs.push(`History line ${i + 1} (${h.at}) is earlier than the line before it.`);
  });
  const versions = rel.releases.map((r) => r.version);
  if (new Set(versions).size !== versions.length) errs.push('Each release version may appear only once.');
  rel.releases.forEach((r) => { if (!['candidate', 'published'].includes(r.status)) errs.push(`Release ${r.version}: status must be candidate or published.`); });
  return errs;
}

/** History only grows, and recorded approvals never change. */
function appendOnly(cur, base) {
  const errs = [];
  if (!base.dec) return errs;
  base.dec.history.forEach((h, i) => {
    const n = cur.dec.history[i];
    if (!n || n.at !== h.at || n.text !== h.text) errs.push(`History line ${i + 1} (${h.at}) was changed or removed. Add a correction line instead.`);
  });
  const all = (s) => [...s.dec.decisions, ...s.plans];
  for (const old of all(base)) {
    const a = old.approval ?? {};
    if (!['approved', 'rejected'].includes(a.status)) continue;
    const n = all(cur).find((r) => r.id === old.id)?.approval ?? {};
    if (n.evidence !== a.evidence || n.date !== a.date) errs.push(`${old.id}: the recorded owner approval was changed.`);
  }
  return errs;
}

// ---------- generated views ----------

const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const appr = (a) => (['approved', 'rejected'].includes(a.status) ? `${a.status} (owner, ${a.date})` : a.status);

function register({ dec, plans }) {
  const pending = [...dec.decisions, ...plans].filter((r) => PENDING.includes(r.approval.status));
  const L = [`# ${dec.app} · Decision register`, '',
    `_Generated by appkit from \`${REC}/\`. Do not edit by hand. Times in ${dec.timezone}._`, '',
    'Approval and delivery are separate. Only the owner\'s explicit words set "approved".', '', '## Pending approvals', ''];
  L.push(...(pending.length ? ['| ID | What | Status |', '|---|---|---|', ...pending.map((r) => `| ${r.id} | ${cell(r.title)} | ${cap(r.approval.status)} |`)] : ['None.']), '');
  L.push('## Decisions', '', '| ID | Decision | Approval | Delivery |', '|---|---|---|---|',
    ...dec.decisions.map((d) => `| ${d.id} | ${cell(d.title)} | ${cap(appr(d.approval))} | ${cap(d.delivery)} |`), '');
  L.push('## Work packages', '', '| ID | Package | Approval | Delivery | Tests passed | Release |', '|---|---|---|---|---|---|',
    ...plans.map((p) => {
      const t = p.acceptance ?? [];
      return `| ${p.id} | ${cell(p.title)} | ${cap(appr(p.approval))} | ${cap(p.delivery)} | ${t.filter((x) => x.result === 'PASS').length}/${t.length} | ${cap(p.release)} |`;
    }), '');
  L.push('## Decision details', '');
  for (const d of dec.decisions) {
    L.push(`### ${d.id} · ${d.title}`, '', `- **Question:** ${d.question}`,
      ...(d.options?.length ? [`- **Options:** ${d.options.join(' · ')}`] : []),
      `- **Choice:** ${d.choice}`, `- **Rationale:** ${d.rationale}`,
      `- **User impact:** ${d.impact?.user ?? ''}`, `- **Technical impact:** ${d.impact?.technical ?? ''}`,
      `- **Data and privacy:** ${d.impact?.data ?? ''}`, `- **Cost:** ${d.cost}`,
      `- **Approval:** ${cap(d.approval.status)}${d.approval.evidence ? `: “${d.approval.evidence}” (${d.approval.date})` : ''}`,
      `- **Delivery:** ${cap(d.delivery)}`, ...(d.supersededBy ? [`- **Superseded by:** ${d.supersededBy}`] : []),
      `- **Review trigger:** ${d.reviewTrigger ?? ''}`, '');
  }
  L.push('## History (oldest first)', '', ...dec.history.map((h) => `- ${h.at} · ${h.text}`), '');
  return L.join('\n');
}

function changelog({ dec, plans, rel }) {
  const L = ['# Changelog', '', `_What changed for users of ${dec.app}. Generated by appkit. Do not edit by hand._`, '', '## Unreleased', ''];
  const open = plans.filter((p) => p.release === 'unreleased' && p.delivery !== 'not started');
  const notes = open.flatMap((p) => p.userNotes ?? []);
  L.push(...(notes.length ? notes.map((n) => `- ${n}`) : ['- No user-facing changes yet.']), '');
  for (const r of [...rel.releases].reverse()) {
    L.push(r.status === 'published' ? `## ${r.version} · published ${r.date} (\`${r.commit}\`)` : `## ${r.version} · release candidate (not published)`, '',
      ...r.notes.map((n) => `- ${n}`), ...(r.plans?.length ? [`- Includes: ${r.plans.join(', ')}.`] : []), '');
  }
  return L.join('\n');
}

const MARK = ['<!-- appkit:pending:start (generated) -->', '<!-- appkit:pending:end -->'];
function stateBlock({ dec, plans }, current) {
  const pending = [...dec.decisions, ...plans].filter((r) => PENDING.includes(r.approval.status));
  const block = [MARK[0], '## Pending approvals (generated)', '',
    ...(pending.length ? pending.map((r) => `- ${r.id}: ${r.title} (${r.approval.status})`) : ['- None.']), MARK[1]].join('\n');
  const i = current.indexOf(MARK[0]), j = current.indexOf(MARK[1]);
  return i >= 0 && j > i ? current.slice(0, i) + block + current.slice(j + MARK[1].length) : `${current.trimEnd()}\n\n${block}\n`;
}

function views(s) {
  return { [OUT.register]: register(s), [OUT.changelog]: changelog(s), [OUT.state]: stateBlock(s, existsSync(abs(OUT.state)) ? read(OUT.state) : '') };
}

function build(quiet) {
  const s = state();
  const errs = validate(s);
  if (errs.length) die('RECORDS INVALID:', errs);
  for (const [file, text] of Object.entries(views(s))) {
    if (!existsSync(abs(file)) || read(file) !== text) { save(file, text); if (!quiet) console.log('updated', file); }
  }
  if (!quiet) console.log('Views up to date.');
}

function check() {
  const s = state();
  const errs = validate(s);
  if (errs.length) die('RECORDS INVALID:', errs);
  const base = process.env.APPKIT_BASE || 'HEAD';
  let baseOk = true;
  try { git('rev-parse', '--verify', `${base}^{commit}`); } catch { baseOk = false; }
  const problems = baseOk ? appendOnly(s, load(base)) : [];
  for (const [file, text] of Object.entries(views(s))) if (!existsSync(abs(file)) || read(file) !== text) problems.push(`${file} is out of date. Run: appkit build`);
  if (problems.length) die('RECORDS CHECK FAILED:', problems);
  console.log(`RECORDS OK: ${s.dec.decisions.length} decisions, ${s.plans.length} packages, ${reportIds().length} reports, ${s.rel.releases.length} releases; history ${baseOk ? `checked against ${base}` : 'not compared (no git base)'}.`);
}

// ---------- dispatch ----------

const COMMANDS = {
  init, status, plan, decision, report, approve: () => setApproval('approved'), reject: () => setApproval('rejected'),
  supersede, deliver, test, result, note, log, release, published, 'release-check': releaseCheck, build: () => build(false), check,
};
if (!COMMANDS[cmd]) {
  const lines = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1);
  console.log(lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(cmd ? 1 : 0);
}
COMMANDS[cmd]();
