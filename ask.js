/*
 * ask.js — "Ask my resume" client-side assistant.
 *
 * Runs ENTIRELY in the browser: no backend, no API key, no per-message cost.
 * It retrieves over a hand-authored knowledge base of real resume facts using
 * keyword + token overlap scoring, and answers conversationally in first person.
 *
 * $0 forever on static hosting (GitHub Pages). If you ever want free-form
 * *generative* answers, swap `answer()` to call a serverless endpoint (Cloudflare
 * Workers / Vercel free tier) that runs RAG over this same KB — the UI is unchanged.
 *
 * Usage:
 *   <div id="ask"></div>
 *   <script src="ask.js"></script>
 *   <script>initAskMe(document.getElementById('ask'));</script>
 */
(function (global) {
  'use strict';

  // --------------------------------------------------------------------- //
  // Knowledge base — real facts only.                                     //
  // --------------------------------------------------------------------- //
  const KB = [
    {
      id: 'about',
      keywords: ['who', 'about', 'yourself', 'summary', 'bio', 'background', 'intro', 'jared', 'krekeler', 'tell', 'story'],
      answer:
        "I'm Jared Krekeler, a senior studying Computer Science at the University of Cincinnati with a minor in Statistics (graduating Fall 2026). I work as an Applied AI Engineer at GE Aerospace, where I build production ML and LLM systems. I like ML that actually ships — RAG assistants, agentic workflows, and full-stack apps like DraftVision.",
    },
    {
      id: 'ge',
      keywords: ['ge', 'aerospace', 'current', 'job', 'work', 'metrology', 'applied', 'ai', 'engineer', 'intern', 'now'],
      answer:
        "At GE Aerospace I'm an Applied AI Engineer on the Metrology team. I design, build, and own production AI: a RAG-backed Metrology AI Toolkit, agentic CMM automation, and analytics features that ship to internal users. I've earned 3 Corporate Impact Awards there.",
    },
    {
      id: 'awards',
      keywords: ['award', 'awards', 'impact', 'recognition', 'achievement', 'achievements', 'honors', 'accomplishment'],
      answer:
        "I've earned 3 GE Aerospace Corporate Impact Awards — for CMM Automation, Project Leadership, and a CMM Hackathon — all as an intern.",
    },
    {
      id: 'toolkit',
      keywords: ['toolkit', 'rag', 'retrieval', 'llm', 'knowledge', 'assistant', 'drawings', 'inspection', 'metrology', 'rework'],
      answer:
        "The Metrology AI Toolkit is a production RAG assistant I built and own end-to-end. It answers over engineering drawings and inspection instructions, and it cut CMM rework lead time by about 50%. It's deployed to GE's internal reusable-agent library.",
    },
    {
      id: 'agents',
      keywords: ['agent', 'agents', 'agentic', 'mcp', 'automation', 'cmm', 'orchestration', 'multi', 'autonomous', 'hpc', 'hypermesh'],
      answer:
        "I built agentic CMM automation — an internal MCP server plus HyperMesh mesh-morphing on HPC, with multi-agent orchestration across defect types. It compressed roughly 6 months of work into 5 days and saved hundreds of labor hours.",
    },
    {
      id: 'tools',
      keywords: ['calcite', 'pulse', 'production', 'users', 'tool', 'spc', 'process', 'sentry', 'monitoring', 'adoption', 'claude', 'onboard', 'mentor'],
      answer:
        "I ship and maintain production tools: QC-Calcite serves 200+ internal users and runs error-free (Sentry-monitored), and Process Pulse is a statistical-process-control analytics feature live in GE's metrology AI assistant. I also drove Claude Code adoption across the org, onboarding 30+ engineers.",
    },
    {
      id: 'pg',
      keywords: ['p&g', 'pg', 'procter', 'gamble', 'accelerator', 'vision', 'computer', 'surrogate', 'neural', 'kpi', 'downtime', 'simulation'],
      answer:
        "At the P&G Digital Accelerator I was a Data Science Intern. I engineered a computer-vision pipeline that fed a surrogate neural network — speeding KPI prediction ~30% and reducing downtime ~15% — and built AI-agent workflows that automated modeling-and-simulation setup.",
    },
    {
      id: 'tql',
      keywords: ['tql', 'total', 'quality', 'logistics', 'pricing', 'xgboost', 'databricks', 'azure', 'powerbi', 'dashboard', 'rate', 'analytics'],
      answer:
        "At TQL I was a Data Science & Analytics Intern. I fine-tuned a production XGBoost pricing model (improving real-time rate-recommendation accuracy ~8%), migrated legacy workflows to Databricks on Azure, and built a PowerBI dashboard used by Sales VPs.",
    },
    {
      id: 'draftvision',
      keywords: ['draftvision', 'draft', 'nfl', 'prospect', 'prospects', 'ensemble', 'catboost', 'flask', 'react', 'docker'],
      answer:
        "DraftVision is my full-stack ML app that predicts NFL draft success for 9,000+ college and high-school prospects. It uses a calibrated XGBoost/CatBoost ensemble (~73% held-out accuracy), a React front end + Flask API, live sports data, and Claude Vision mock-draft import — deployed with Docker on Fly.io. Live at draft.jkrek.com.",
    },
    {
      id: 'projects',
      keywords: ['project', 'projects', 'built', 'build', 'portfolio', 'side', 'made', 'create', 'created', 'work'],
      answer:
        "My flagship projects: DraftVision — a full-stack ML app predicting NFL draft success for 9,000+ prospects (XGBoost/CatBoost ensemble, React/Flask/Docker) — and a model-based reinforcement-learning football play-caller with a world model trained on 116k real NFL plays. Ask about either one for details.",
    },
    {
      id: 'rl',
      keywords: ['reinforcement', 'rl', 'dqn', 'gymnasium', 'pytorch', 'world', 'playcaller', 'playcalling', 'bot'],
      answer:
        "I built a deep reinforcement learning play-caller (Deep Q-Network in PyTorch + Gymnasium) and upgraded it into a model-based system with a football world model trained on 116k real NFL plays — it learns outcome distributions and plans plays by simulating imagined drives.",
    },
    {
      id: 'skills',
      keywords: ['skill', 'skills', 'language', 'languages', 'stack', 'tech', 'technology', 'tools', 'python', 'java', 'sql', 'pytorch', 'tensorflow', 'ml', 'machine', 'learning', 'know', 'good'],
      answer:
        "Languages: Python, Java, C++, SQL, JavaScript, R. ML/AI: PyTorch, TensorFlow, XGBoost, OpenCV, plus LLMs, RAG, agentic workflows, and MCP. Platforms: AWS, Docker, Git, React, Flask, Databricks, and HPC.",
    },
    {
      id: 'education',
      keywords: ['education', 'school', 'college', 'university', 'cincinnati', 'uc', 'degree', 'study', 'major', 'minor', 'statistics', 'graduate', 'graduating', 'coursework', 'classes', 'gpa'],
      answer:
        "I'm a B.S. Computer Science student at the University of Cincinnati with a minor in Statistics, graduating Fall 2026. Relevant coursework: Machine Learning, Deep Learning, Artificial Intelligence, Data Science, Data Structures, Web Development, Regression Analysis, Linear Algebra, and Computer Graphics.",
    },
    {
      id: 'certs',
      keywords: ['cert', 'certs', 'certification', 'certifications', 'aws', 'cloud', 'google', 'coursera', 'credential', 'credentials'],
      answer:
        "I hold the AWS Certified AI Practitioner and AWS Certified Cloud Practitioner certifications, plus the Google Advanced Data Analytics certificate and the Machine Learning Specialization (Stanford/DeepLearning.AI).",
    },
    {
      id: 'contact',
      keywords: ['contact', 'email', 'reach', 'linkedin', 'github', 'connect', 'hire', 'resume', 'cv', 'phone', 'link', 'links'],
      answer:
        "You can reach me at krekeljd@mail.uc.edu, connect on LinkedIn (/in/jaredkrekeler), or see my code on GitHub (/Jkrek). My resume is linked in the nav.",
    },
    {
      id: 'looking',
      keywords: ['looking', 'want', 'seeking', 'roles', 'role', 'hiring', 'opportunity', 'opportunities', 'fulltime', 'full', 'time', 'available', 'availability', 'interested', 'career'],
      answer:
        "I'm targeting full-time new-grad roles in Machine Learning / Applied AI Engineering, Data Science, and Software Engineering, starting after I graduate in Fall 2026. I'm most excited about teams shipping production ML and LLM systems.",
    },
    {
      id: 'why',
      keywords: ['why', 'strength', 'strengths', 'best', 'stand', 'special', 'unique', 'value', 'great', 'impressive'],
      answer:
        "What sets me apart: I ship ML to production and own it. At GE I've taken RAG and agentic systems from idea to deployed tools used by 200+ people, earned 3 impact awards as an intern, and on the side I built and deployed DraftVision. I move fast and I care about the last mile — monitoring, calibration, and real users.",
    },
  ];

  const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'do', 'does', 'did', 'you', 'your',
    'me', 'my', 'i', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'with', 'what', 'whats', 'tell',
    'about', 'can', 'could', 'would', 'have', 'has', 'how', 'that', 'this', 'it', 'at', 'as', 'be',
    'so', 'any', 'some', 'more', 'please', 'give', 'show', 'know', 'us', 'we']);

  function tokenize(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9&+ ]/g, ' ').split(/\s+/)
      .filter((t) => t && !STOP.has(t));
  }

  function retrieve(query) {
    const toks = tokenize(query);
    if (!toks.length) return null;
    let best = null;
    const scored = KB.map((entry) => {
      let score = 0, matchLen = 0;
      for (const t of toks) {
        for (const k of entry.keywords) {
          if (k === t) { score += 2; matchLen += k.length; }
          else if ((t.length >= 4 && k.indexOf(t) === 0) || (k.length >= 4 && t.indexOf(k) === 0)) {
            score += 1; matchLen += Math.min(k.length, t.length);
          }
        }
      }
      return { entry, score, matchLen };
    }).sort((a, b) => (b.score - a.score) || (b.matchLen - a.matchLen));
    best = scored[0];
    if (!best || best.score < 1) return null;
    return { entry: best.entry, score: best.score,
      related: scored.slice(1, 3).filter((s) => s.score > 0).map((s) => s.entry) };
  }

  const SLASH = {
    '/help': "Try asking about my experience, projects, skills, education, or how to reach me. Slash commands: /experience /projects /skills /awards /education /contact",
    '/experience': 'ge',
    '/projects': 'projects',
    '/skills': 'skills',
    '/awards': 'awards',
    '/education': 'education',
    '/contact': 'contact',
  };

  const STARTERS = [
    'What do you do at GE Aerospace?',
    'Tell me about DraftVision',
    'What are your strongest skills?',
    'What roles are you looking for?',
    'How can I reach you?',
  ];

  function byId(id) { return KB.find((e) => e.id === id); }

  function answer(query) {
    const q = (query || '').trim();
    const low = q.toLowerCase();

    if (/^\/(\w+)/.test(low)) {
      const cmd = low.split(/\s+/)[0];
      if (cmd === '/help') return { text: SLASH['/help'], related: [] };
      const target = SLASH[cmd];
      if (target) { const e = byId(target); return { text: e.answer, related: [] }; }
      return { text: "Unknown command. Type /help for options.", related: [] };
    }

    if (/^(hi|hey|hello|yo|sup|howdy|greetings)\b/.test(low)) {
      return { text: "Hi! I'm Jared's resume assistant. Ask me about his experience, projects, skills, or how to get in touch — or tap a suggestion below.", related: [] };
    }
    if (/(thank|thanks|thx|cheers)\b/.test(low)) {
      return { text: "Anytime! Want to know about my projects or how to reach me?", related: [byId('draftvision'), byId('contact')] };
    }

    const hit = retrieve(q);
    if (!hit) {
      return {
        text: "I don't have that in my resume, but I can tell you about my GE Aerospace work, projects like DraftVision, my skills, education, or how to reach me. Try one of these:",
        related: [byId('ge'), byId('draftvision'), byId('skills')],
        unmatched: true,
      };
    }
    return { text: hit.entry.answer, related: hit.related || [] };
  }

  // Export the engine for Node tests; keep DOM code browser-only.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { answer, retrieve, KB, tokenize };
  }

  // --------------------------------------------------------------------- //
  // UI                                                                    //
  // --------------------------------------------------------------------- //
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  const CSS = `
  .askme{--ink:#eef1ff;--muted:#9aa3c7;--cyan:#22d3ee;--purple:#8b5cf6;--lime:#a3e635;
    --panel:rgba(15,18,35,.72);--border:rgba(37,44,73,.9);
    display:flex;flex-direction:column;height:100%;min-height:0;
    font-family:'Inter',system-ui,sans-serif;color:var(--ink);
    border:1px solid var(--border);border-radius:18px;overflow:hidden;background:var(--panel);
    backdrop-filter:blur(10px)}
  .askme__hd{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)}
  .askme__dot{width:9px;height:9px;border-radius:50%;background:var(--lime);box-shadow:0 0 12px var(--lime)}
  .askme__title{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px}
  .askme__sub{color:var(--muted);font-size:12px;font-family:'JetBrains Mono',monospace}
  .askme__log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
  .askme__row{display:flex;gap:9px;max-width:100%}
  .askme__row.me{flex-direction:row-reverse}
  .askme__av{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;
    font-size:13px;background:rgba(34,211,238,.12);border:1px solid var(--border)}
  .askme__bub{padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;
    background:rgba(11,13,23,.6);border:1px solid var(--border);max-width:78%}
  .askme__row.me .askme__bub{background:linear-gradient(120deg,rgba(139,92,246,.22),rgba(34,211,238,.18));
    color:var(--ink)}
  .askme__chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 12px}
  .askme__chip{cursor:pointer;font-size:12px;color:#cfe9ff;background:rgba(34,211,238,.08);
    border:1px solid var(--border);border-radius:999px;padding:6px 11px;transition:.2s}
  .askme__chip:hover{border-color:var(--cyan);color:#fff;background:rgba(34,211,238,.16)}
  .askme__in{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--border)}
  .askme__in input{flex:1;background:rgba(5,6,13,.6);border:1px solid var(--border);border-radius:11px;
    color:var(--ink);padding:11px 13px;font-size:14px;font-family:inherit;outline:none}
  .askme__in input:focus{border-color:var(--cyan)}
  .askme__send{cursor:pointer;border:none;border-radius:11px;padding:0 16px;font-weight:600;color:#05060d;
    background:linear-gradient(120deg,#8b5cf6,#22d3ee 55%,#a3e635)}
  .askme__typing span{display:inline-block;width:6px;height:6px;margin:0 1px;border-radius:50%;
    background:var(--muted);animation:askmeblink 1.2s infinite}
  .askme__typing span:nth-child(2){animation-delay:.2s}.askme__typing span:nth-child(3){animation-delay:.4s}
  @keyframes askmeblink{0%,60%,100%{opacity:.25}30%{opacity:1}}
  @media (prefers-reduced-motion: reduce){.askme__typing span{animation:none;opacity:.6}}
  `;

  function initAskMe(mount, opts) {
    opts = opts || {};
    if (!document.getElementById('askme-css')) {
      const style = el('style'); style.id = 'askme-css'; style.textContent = CSS;
      document.head.appendChild(style);
    }
    const root = el('div', 'askme');
    root.innerHTML =
      '<div class="askme__hd"><span class="askme__dot"></span>' +
      '<div><div class="askme__title">Ask my résumé</div>' +
      '<div class="askme__sub">runs in your browser · no data leaves this page</div></div></div>' +
      '<div class="askme__log"></div>' +
      '<div class="askme__chips"></div>' +
      '<form class="askme__in"><input type="text" placeholder="Ask about my experience, projects, skills…" ' +
      'aria-label="Ask my resume" autocomplete="off" /><button class="askme__send" type="submit">Ask</button></form>';
    mount.appendChild(root);

    const log = root.querySelector('.askme__log');
    const chips = root.querySelector('.askme__chips');
    const form = root.querySelector('.askme__in');
    const input = form.querySelector('input');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function bubble(text, who) {
      const row = el('div', 'askme__row' + (who === 'me' ? ' me' : ''));
      row.appendChild(el('div', 'askme__av', who === 'me' ? '👤' : '🚀'));
      row.appendChild(el('div', 'askme__bub', text));
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
    }
    function setChips(list) {
      chips.innerHTML = '';
      list.forEach((c) => {
        const chip = el('button', 'askme__chip', typeof c === 'string' ? c : c.label);
        chip.type = 'button';
        chip.onclick = () => ask(typeof c === 'string' ? c : c.q);
        chips.appendChild(chip);
      });
    }
    function relatedChips(related) {
      const map = { ge: 'GE Aerospace work', draftvision: 'DraftVision', skills: 'Skills',
        contact: 'Contact', awards: 'Awards', tql: 'TQL', pg: 'P&G', looking: 'Roles I want',
        toolkit: 'RAG toolkit', agents: 'Agentic automation', rl: 'RL / world model', projects: 'Projects',
        education: 'Education', certs: 'Certifications', about: 'About me', why: 'Why hire me' };
      return (related || []).filter(Boolean).map((e) => ({ label: map[e.id] || e.id, q: 'tell me about ' + e.id }));
    }

    function ask(q) {
      if (!q || !q.trim()) return;
      bubble(q, 'me');
      input.value = '';
      const typing = el('div', 'askme__row');
      typing.appendChild(el('div', 'askme__av', '🚀'));
      typing.appendChild(el('div', 'askme__bub askme__typing', '<span></span><span></span><span></span>'));
      log.appendChild(typing);
      log.scrollTop = log.scrollHeight;

      const res = answer(q);
      const delay = reduced ? 0 : 380;
      setTimeout(() => {
        typing.remove();
        bubble(res.text, 'bot');
        const rel = relatedChips(res.related);
        setChips(rel.length ? rel : STARTERS);
      }, delay);
    }

    // greeting
    bubble("Hi 👋 I'm Jared's résumé, in chat form. Ask me anything — or tap a suggestion.", 'bot');
    setChips(STARTERS);
    form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });

    return { ask };
  }

  global.initAskMe = initAskMe;
})(typeof window !== 'undefined' ? window : globalThis);
