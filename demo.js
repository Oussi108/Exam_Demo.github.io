(() => {
  "use strict";
  const root = document.getElementById("demo");
  if (!window.DEMO) {
    root.textContent = "Exam data was not found. Extract the entire ZIP, then open index.html.";
    return;
  }
  const {papers, words} = window.DEMO;
  const storageKey = "gethsk-level3-real-demo-v3";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const label = i => String.fromCharCode(65 + i);
  const norm = text => String(text ?? "").trim().toLowerCase().replace(/[\s，。！？、,.!?]/gu, "");
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const pad = n => String(n).padStart(2, "0");
  const bt = (text, action, options = "") =>
    `<button type="button" class="button ${options.includes('data-primary') ? 'primary' : 'ghost'}" data-act="${action}" ${options}>${text}</button>`;
  let saved = {};
  let persistent = true;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; }
  catch { persistent = false; }
  let paper, run, mode, items, index, audio, playing = false, checked = false;
  const settings = {help:true, pinyin:false, speed:1};
  const playbackSpeeds = [1, 0.75, 0.6, 0.5];
  const key = () => paper.id + "-" + mode;
  const finished = () => !!run?.finished;
  const timed = () => mode === "timed";
  const assisted = () => !timed() && settings.help;
  const answers = () => run.answers;
  const answered = q => {
    const a = answers()[q.n];
    return q.type === "order" ? Array.isArray(a) && a.length === q.options.length :
      q.type === "text" ? !!norm(a) : Number.isInteger(a);
  };
  const count = () => items.filter(answered).length;
  const allowed = () => !timed() || finished() || Date.now() < run.deadline;
  function save() {
    if (run) saved[key()] = run;
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
    catch { persistent = false; }
    const status = document.getElementById("save-status");
    if (status) status.textContent = persistent ? "Saved on this device" : "Progress kept only while this tab is open";
  }
  function start(id, m, reset = false) {
    paper = papers.find(p => p.id === id);
    if (!paper) return;
    mode = m === "timed" ? "timed" : "learning";
    items = paper.parts.flatMap(p => p.items.map(q => ({...q, part:p})));
    run = !reset && saved[key()] || {
      deadline:timed() ? Date.now() + paper.minutes * 60000 : null,
      answers:{}, flags:{}, plays:{}, current:0, finished:false
    };
    index = Math.max(0, Math.min(items.length - 1, Number(run.current) || 0));
    checked = false;
    save();
    if (finished()) result();
    else if (!allowed()) finish(true);
    else render();
  }
  function stopAudio() {
    if (audio) { audio.pause(); audio = null; }
    playing = false;
  }
  function home() {
    stopAudio(); run = null;
    document.body.className = "hsk2-theme";
    const hasAnySaved = Object.keys(saved).length > 0;
    root.innerHTML = `<main class="demo-catalogue">
      <div class="demo-brand"><img src="assets/dragon.png" alt="">GetHSK</div>
      <header class="demo-hero"><span class="demo-eyebrow">Reviewer demo · HSK 2.0 · Level 3</span>
      <h1>Choose a practice paper</h1>
      <p>Four GetHSK Real practice papers, each with 40 listening, 30 reading, and 10 writing questions.</p>
      <p class="demo-note">Reviewer editions of Papers 01–04, with replacement questions and shared answer banks. Scores are for practice.</p></header>
      <section class="demo-grid" aria-label="Practice papers">${papers.map(p => {
        const sTimed = saved[p.id + "-timed"];
        const sLearning = saved[p.id + "-learning"];
        const hasPaperSaved = !!(sTimed || sLearning);
        return `<article class="demo-card">
          <div>
            <h2>GetHSK Real · Paper ${pad(p.id)}</h2>
            <p>80 questions · ${p.minutes} min timed</p>
            ${hasPaperSaved ? `<div class="demo-card-status">${sTimed ? `<span class="demo-tag">${sTimed.finished ? "Timed: Finished" : "Timed: In progress"}</span>` : ""}${sLearning ? `<span class="demo-tag">${sLearning.finished ? "Learning: Finished" : "Learning: In progress"}</span>` : ""}</div>` : ""}
          </div>
          <div class="demo-actions">${["timed","learning"].map(m => {
            const s = saved[p.id + "-" + m];
            const text = s?.finished ? "Review " + m : s ? "Resume " + m : m === "timed" ? "Start timed" : "Learning mode";
            return bt(text, "start", `data-paper="${p.id}" data-mode="${m}" ${m === 'timed' ? 'data-primary' : ''}`);
          }).join("")}${hasPaperSaved ? bt("Clear marks", "clear-paper-prompt", `data-paper="${p.id}" title="Clear saved answers and start fresh"`) : ""}</div></article>`;
      }).join("")}</section>
      ${hasAnySaved ? `<div class="demo-reset-bar"><span class="demo-note">Practice progress is saved in this browser.</span>${bt("Clear all saved marks", "clear-all-prompt", "title='Reset all practice papers and scores'")}</div>` : ""}
      <details class="demo-help"><summary>How the demo works</summary>
        <p>Timed mode starts the countdown immediately and gives one playback per listening question at normal speed. The timer continues if you leave the paper. Learning mode offers replay at 1×, 0.75×, 0.6×, or 0.5×, along with transcripts, pinyin, word meanings, and answer checks. The same speeds are available in answer review.</p>
        <p>Answers and flags are saved in this browser when local storage is available. Use the same extracted folder and browser to resume. If opening the file directly disables storage in your browser, keep the tab open.</p>
        <p>No account or internet is needed. Nothing is sent to GetHSK. Use the feedback form below to save notes and send them yourself.</p>
      </details>${feedbackBox()}</main>`;
    window.scrollTo(0,0);
  }
  function feedbackBox() {
    return `<details class="demo-help"><summary>Give feedback</summary>
      <p>Tell us what worked and what felt confusing. For a specific issue, include the paper and question number.</p>
      <label for="feedback">Your notes</label>
      <textarea id="feedback" class="demo-feedback" maxlength="5000" placeholder="For example: Paper 02, question 7 — two pictures looked too similar."></textarea>
      ${bt("Download feedback", "feedback", 'data-primary')}
      <p class="demo-note" role="status" id="feedback-status">Send the downloaded text file to the person who shared the demo.</p>
      <label for="feedback-copy" id="feedback-copy-label" hidden>Copy this note if the download is blocked</label>
      <textarea id="feedback-copy" class="demo-feedback" readonly hidden></textarea>
      </details>`;
  }
  const maxWord = Math.max(0, ...Object.keys(words).map(w => w.length));
  function tokenize(text) {
    if (!assisted() && !finished()) return esc(text);
    let html = "", i = 0;
    while (i < text.length) {
      let w = "";
      for (let size = Math.min(maxWord, text.length - i); size > 0; size--) {
        const candidate = text.slice(i, i + size);
        if (Object.hasOwn(words, candidate)) { w = candidate; break; }
      }
      if (w) {
        html += `<button type="button" class="demo-lookup" data-act="word" data-word="${esc(w)}">${esc(w)}</button>`;
        i += w.length;
      } else html += esc(text[i++]);
    }
    return html;
  }
  function chinese(field, interactive = true) {
    if (!field?.text) return "";
    return `<div class="demo-chinese" lang="zh-Hans">${interactive ? tokenize(field.text) : esc(field.text)}${(assisted() || finished()) && field.pinyin ? `<small class="demo-pinyin" lang="zh-Latn">${esc(field.pinyin)}</small>` : ""}</div>`;
  }
  function model(q) {
    if (q.type === "order" || q.type === "text") return q.key[0];
    if (q.type === "board") return label(q.key) + " · " + paper.boards[q.board][q.key].alt;
    const choice = q.options[q.key];
    return choice.alt || choice.text;
  }
  function correct(q) {
    if (!answered(q)) return false;
    const value = answers()[q.n];
    if (q.type === "order") return q.key.some(k => norm(k) === norm(value.map(i => q.options[i]?.text || "").join("")));
    if (q.type === "text") return q.key.some(k => norm(k) === norm(value));
    return value === q.key;
  }
  function navigator() {
    return paper.parts.map((p,i) => `<section class="paper-section-link">
      <div><span>${pad(i+1)}</span><b>${esc(cap(p.skill))} · ${esc(p.code.slice(1))}</b></div>
      <small>${p.items.length} questions</small><div class="question-palette">
        ${p.items.map(q => `<button type="button" data-act="jump" data-n="${q.n}" aria-label="Question ${q.n}" class="${q.n === index+1 ? 'current ' : ''}${answered(q) ? 'answered ' : ''}${run.flags[q.n] ? 'flagged' : ''}" ${q.n === index+1 ? 'aria-current="step"' : ''}>${q.n}</button>`).join("")}
      </div></section>`).join("");
  }
  function player(q) {
    if (!q.audio) return "";
    const spent = timed() && !finished() && !!run.plays[q.n];
    return `<div class="listening-player">
      <button type="button" class="audio-play" data-act="play" aria-label="Play listening recording" ${spent ? "disabled" : ""}>▶</button>
      <div><b>Listening recording</b><small id="audio-status" aria-live="polite">${spent ? "Playback used" : timed() && !finished() ? "One playback" : "Unlimited replays"}</small></div>
      <div class="audio-wave" aria-hidden="true">${"<i></i>".repeat(12)}</div>
      <audio preload="none" src="${esc(q.audio)}"></audio></div>`;
  }
  function usedByAnotherQuestion(q, option) {
    return items.some(other => other.n !== q.n && answers()[other.n] === option &&
      ((q.board && other.board === q.board) || (q.group && other.group === q.group)));
  }
  function pictureBoard(q) {
    const pictures = paper.boards[q.board];
    const first = Number(q.board);
    return `<fieldset class="demo-board">
      <legend>Choose a picture · Questions ${first}–${first + 4}</legend>
      ${pictures.map((picture, option) => {
        const image = `<img src="${esc(picture.image)}" alt="${esc(picture.alt)}">`;
        if (picture.label === "F") {
          return `<figure class="sample">${image}<figcaption><b>F</b> · sample</figcaption></figure>`;
        }
        const used = usedByAnotherQuestion(q, option);
        return `<label class="demo-picture${used ? " used" : ""}">
          <input type="radio" name="answer" value="${option}"
            aria-label="Picture ${picture.label}: ${esc(picture.alt)}"
            ${answers()[q.n] === option ? "checked" : ""}
            ${finished() || used ? "disabled" : ""}>
          ${image}
          <span class="demo-picture-caption"><b>${picture.label}</b>
            ${used ? "<small>Already used</small>" : '<small class="demo-picture-selected">Selected</small>'}
          </span>
        </label>`;
      }).join("")}
    </fieldset>
    <p class="demo-note">Tap a picture to select it. Use A–E once each.${pictures.length === 6 ? " F is a sample." : ""}</p>`;
  }
  function optionList(q) {
    const a = answers()[q.n];
    const example = paper.examples[q.group];
    return `<fieldset class="hsk-choices" style="border:0;padding:0" aria-label="Answer choices">
      ${q.options.map((o,i) => {
        const used = usedByAnotherQuestion(q, i);
        const sample = example?.key === i;
        return `<label><input type="radio" name="answer" value="${i}" ${a===i?'checked':''} ${finished() || used || sample ? 'disabled' : ''}>
        <span class="choice-letter">${label(i)}</span><span>${
          o.image ? `<img src="${esc(o.image)}" alt="${esc(o.alt || 'Picture ' + label(i))}">` : chinese(o, false)}${sample ? '<small> · example</small>' : used ? '<small> · already used</small>' : ''}</span></label>`;
      }).join("")}</fieldset>`;
  }
  function readingBank(q) {
    if (!q.group) return "";
    const example = paper.examples[q.group];
    const start = Number(q.group);
    return `<section class="demo-reading-bank" aria-label="Shared answer bank">
      <strong>Answer bank · Questions ${start}–${start+4}</strong>
      <p>Use each answer once in this group.</p>
      ${example ? `<p class="demo-example">Example · <span lang="zh-Hans">${esc(example.prompt.replace("____", q.options[example.key].text))}</span>
        <span>→ ${label(example.key)} · ${esc(q.options[example.key].text)}</span></p>` : ""}
    </section>`;
  }
  function inputs(q) {
    if (q.board) return pictureBoard(q);
    if (q.type === "text") return `<label for="character">Enter the missing character</label>
      <input id="character" class="demo-input" lang="zh-Hans" autocomplete="off" maxlength="16" value="${esc(answers()[q.n] || "")}" ${finished() ? 'readonly' : ''}>`;
    if (q.type !== "order") return optionList(q);
    const chosen = Array.isArray(answers()[q.n]) ? answers()[q.n] : [];
    return `<p class="demo-note">Tap words to build your sentence. Tap a chosen word to remove it.</p>
      <div class="demo-tiles demo-order" aria-label="Your sentence">${chosen.map(i =>
        bt(esc(q.options[i].text), "remove-tile", `lang="zh-Hans" data-i="${i}" ${finished()?'disabled':''}`)).join("")}</div>
      ${finished() ? "" : `<div class="demo-tiles" aria-label="Available words">${q.options.map((o,i) =>
        bt(esc(o.text), "tile", `lang="zh-Hans" data-i="${i}" ${chosen.includes(i)?'disabled':''}`)).join("")}</div>`}`;
  }
  function showFeedback(q) {
    const ok = correct(q);
    return `<div class="demo-review" data-correct="${ok}" role="status">
      <strong>${!answered(q) ? "Unanswered" : ok ? "Correct" : "Try reviewing this item"}</strong>
      <p>${q.type === "order" ? "Example answer" : "Answer"}: <span lang="zh-Hans">${esc(model(q))}</span></p>
      ${q.explanation ? `<p>${esc(q.explanation)}</p>` : ""}</div>`;
  }
  function render({focus = false} = {}) {
    stopAudio();
    const q = items[index];
    const review = finished();
    const spokenQuestion = ["L3", "L4"].includes(q.part.code);
    const showPrompt = !spokenQuestion || assisted() || review;
    document.body.className = "exam-mode hsk2-theme" + (settings.pinyin && (assisted() || review) ? " with-pinyin" : "");
    root.innerHTML = `<main class="hsk-shell demo-exam">
      <header class="hsk-topbar">${bt("← Papers", "home")}
        <div class="hsk-paper-title"><span>HSK 2.0 · LEVEL 3 · ${review?"REVIEW":timed()?"TIMED":"LEARNING"}</span><strong>GetHSK Real · Paper ${pad(paper.id)}</strong></div>
        <div class="hsk-progress-copy"><b id="answered-count">${count()}</b>/80 answered</div>
        <div class="hsk-timer" ${!timed() || review ? "hidden" : ""}><small>TIME REMAINING</small><strong id="timer"></strong></div>
      </header>
      <div class="demo-tools">
        ${!timed() && !review ? `<label><input type="checkbox" id="help" ${settings.help?"checked":""}> Learning help</label>` : ""}
        ${!timed() || review ? `<label><input type="checkbox" id="pinyin" ${settings.pinyin?"checked":""} ${!(assisted()||review)?"disabled":""}> Show pinyin</label>
          <label>Audio speed <select id="speed">${playbackSpeeds.map(speed =>
            `<option value="${speed}" ${settings.speed===speed?"selected":""}>${speed===1?"1× · Normal":speed+"×"}</option>`).join("")}</select></label>` : ""}
        <span id="save-status" class="demo-note"></span>
        ${bt(review ? "Retake (clear marks)" : "Restart paper", "retake-in-exam", `title="${review ? 'Clear marks and restart this paper' : 'Clear all answers and restart from Question 1'}"`)}
        ${bt(review?"Results":"Finish paper",review?"result":"confirm")}
      </div>
      <div class="hsk-layout"><aside class="hsk-sidebar" aria-label="Question navigator">${navigator()}</aside>
      <section class="hsk-workspace">
        <article class="hsk-question-page active">
          <div class="question-kicker"><span>${cap(q.part.skill)} · Part ${q.part.code.slice(1)}</span><b>Question ${q.n} of 80</b></div>
          ${player(q)}
          ${q.transcript.text && (assisted() || review) ? `<details class="demo-help"><summary>Listening script</summary>${chinese(q.transcript)}</details>` : ""}
          ${q.passage.text ? `<div class="exam-passage">${chinese(q.passage)}</div>` : ""}
          <h1 id="question-title" tabindex="-1" ${showPrompt ? 'lang="zh-Hans"' : ''}>${showPrompt ? esc(q.prompt.text) : "Listen and choose the answer."}</h1>
          ${(assisted()||review) && q.prompt.pinyin ? `<small class="demo-pinyin">${esc(q.prompt.pinyin)}</small>` : ""}
          ${chinese(q.statement)}${chinese(q.left)}
          ${q.image ? `<img class="demo-stimulus" src="${esc(q.image)}" alt="${esc(q.alt)}">` : ""}
          ${readingBank(q)}
          ${inputs(q)}${review || checked ? showFeedback(q) : ""}
        </article>
        <div class="hsk-controls demo-actions">
          ${bt("← Previous","prev",index===0?"disabled":"")}
          ${review ? "" : bt(run.flags[q.n]?"Unflag":"Flag","flag",`aria-pressed="${!!run.flags[q.n]}"`)}
          ${review ? "" : bt("Clear answer","clear")}
          ${assisted() && !review ? bt("Check answer","check",answered(q)?"":"disabled") : ""}
          ${index === 79 ? bt(review?"Results":"Finish", review?"result":"confirm", "data-primary") : bt("Next →","next","data-primary")}
        </div></section></div></main>`;
    audio = root.querySelector("audio");
    if (audio) {
      audio.playbackRate = timed() && !review ? 1 : settings.speed;
      audio.addEventListener("ended", () => {
        playing = false;
        const button = root.querySelector(".audio-play");
        button.textContent = "▶";
        button.setAttribute("aria-label", "Play listening recording");
        if (timed() && !review) button.disabled = true;
        document.getElementById("audio-status").textContent = timed() && !review ? "Playback used" : "Replay available";
      });
    }
    update();
    tick();
    if (focus) {
      const heading = document.getElementById("question-title");
      heading?.focus({preventScroll:true});
      window.scrollTo(0,0);
    }
  }
  function update() {
    save();
    const counter = document.getElementById("answered-count");
    if (counter) counter.textContent = count();
    const q = items[index];
    root.querySelector(`[data-n="${q.n}"]`)?.classList.toggle("answered", answered(q));
    const check = root.querySelector('[data-act="check"]');
    if (check) check.disabled = !answered(q);
  }
  function goto(n) {
    if (!allowed()) return finish(true);
    index = Math.max(0,Math.min(items.length-1,n));
    run.current = index;
    checked = false;
    render({focus:true});
  }
  function finish(expired = false) {
    stopAudio();
    if (!finished()) {
      run.finished = true;
      run.expired = expired;
      save();
    }
    document.getElementById("confirm-dialog").close();
    result();
  }
  function result() {
    stopAudio();
    document.body.className = "hsk2-theme";
    const total = items.filter(correct).length;
    const breakdown = ["listening","reading","writing"].map(skill => {
      const rows = items.filter(q => q.part.skill === skill);
      return `<article class="demo-card"><h2>${cap(skill)}</h2><p>${rows.filter(correct).length} of ${rows.length} correct</p></article>`;
    }).join("");
    root.innerHTML = `<main class="demo-catalogue"><div class="demo-brand"><img src="assets/dragon.png" alt="">GetHSK</div>
      <header class="demo-hero"><span class="demo-eyebrow">Paper ${pad(paper.id)} · ${cap(mode)} mode</span>
      <h1>${total} / 80 correct</h1><p>${count()} answered · ${80-count()} unanswered${run.expired?" · Time expired":""}</p>
      <p class="demo-note">Raw practice score. Writing checks the supplied answers and accepted alternatives; a valid unexpected answer may need human review.</p>
      <div class="demo-actions">
        ${bt("Review answers","review","data-primary")}
        ${bt("Retake (clear marks)","retake","title='Clear marks and restart this paper from question 1'")}
        ${bt("Clear & choose paper","clear-current-home","title='Clear marks for this paper and return to catalogue'")}
        ${bt("Choose a paper","home")}
      </div></header>
      <div class="demo-grid demo-result">${breakdown}</div>${feedbackBox()}</main>`;
    window.scrollTo(0,0);
  }
  async function play() {
    if (!audio || !allowed()) return;
    const q = items[index];
    const button = root.querySelector(".audio-play");
    const status = document.getElementById("audio-status");
    if (playing) {
      audio.pause(); playing = false;
      button.textContent = "▶"; button.setAttribute("aria-label", "Resume recording");
      status.textContent = "Paused"; return;
    }
    const active = audio;
    button.disabled = true;
    try {
      await active.play();
      if (audio !== active) { active.pause(); return; }
      if (timed() && !finished()) { run.plays[q.n] = true; save(); }
      playing = true;
      button.textContent = "Ⅱ"; button.setAttribute("aria-label","Pause recording");
      status.textContent = "Playing";
    } catch { status.textContent = "Could not play. Make sure all files were extracted."; }
    finally { if (audio === active) button.disabled = false; }
  }
  function tick() {
    if (!run || !timed() || finished()) return;
    const ms = run.deadline - Date.now();
    if (ms <= 0) { finish(true); return; }
    const t = document.getElementById("timer");
    const seconds = Math.ceil(ms/1000);
    if (t) t.textContent = `${Math.floor(seconds/60)}:${pad(seconds%60)}`;
  }
  function downloadFeedback() {
    const notes = document.getElementById("feedback").value.trim();
    const status = document.getElementById("feedback-status");
    if (!notes) { status.textContent = "Add a note before downloading."; return; }
    const context = paper ? `Paper ${pad(paper.id)} · ${cap(mode)} mode` : "Demo catalogue";
    const text = `GetHSK · HSK 2.0 Level 3 demo feedback\n${context}\n\n${notes}\n`;
    const copy = document.getElementById("feedback-copy");
    copy.value = text; copy.hidden = false;
    document.getElementById("feedback-copy-label").hidden = false;
    const url = URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
    const link = document.createElement("a"); link.href = url; link.download = "gethsk-exam-feedback.txt";
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
    status.textContent = "Send the text file or copy the note below.";
  }
  root.addEventListener("click", e => {
    const button = e.target.closest("[data-act]");
    if (!button) return;
    const {act, n, i, word} = button.dataset;
    if (act === "home") return home();
    if (act === "start") return start(Number(button.dataset.paper), button.dataset.mode);
    if (act === "feedback") return downloadFeedback();
    if (act === "clear-paper-prompt") {
      const pid = Number(button.dataset.paper);
      if (window.confirm(`Clear all saved marks and answers for Paper ${pad(pid)} so you can take it again from the beginning?`)) {
        delete saved[pid + "-timed"];
        delete saved[pid + "-learning"];
        try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
        catch { persistent = false; }
        return home();
      }
      return;
    }
    if (act === "clear-all-prompt") {
      if (window.confirm("Clear all saved marks and results across all papers? All exam progress will be reset.")) {
        saved = {};
        try { localStorage.removeItem(storageKey); }
        catch { persistent = false; }
        return home();
      }
      return;
    }
    if (!run || !allowed()) return run && finish(true);
    const q = items[index];
    switch (act) {
      case "jump": return goto(Number(n)-1);
      case "prev": return goto(index-1);
      case "next": return goto(index+1);
      case "play": return play();
      case "result": return result();
      case "review": return goto(0);
      case "retake":
      case "retake-in-exam":
        if (window.confirm(`Clear all marks and start a new attempt for Paper ${pad(paper.id)} (${cap(mode)} mode)?`)) {
          start(paper.id, mode, true);
        }
        return;
      case "clear-current-home":
        if (window.confirm(`Clear your saved marks for Paper ${pad(paper.id)} (${cap(mode)} mode) and return to paper selection?`)) {
          delete saved[key()];
          try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
          catch { persistent = false; }
          return home();
        }
        return;
      case "confirm": {
        const dialog = document.getElementById("confirm-dialog");
        dialog.returnValue = "cancel";
        document.getElementById("confirm-copy").textContent =
          `You answered ${count()} of 80 questions. Finishing locks your answers for review.`;
        dialog.showModal(); return;
      }
      case "flag":
        run.flags[q.n] = !run.flags[q.n];
        button.textContent = run.flags[q.n] ? "Unflag" : "Flag";
        button.setAttribute("aria-pressed", String(run.flags[q.n]));
        root.querySelector(`[data-n="${q.n}"]`).classList.toggle("flagged", run.flags[q.n]);
        return save();
      case "check":
        if (!assisted() || !answered(q)) return;
        checked = true;
        root.querySelector(".demo-review")?.remove();
        root.querySelector(".hsk-question-page").insertAdjacentHTML("beforeend", showFeedback(q));
        return;
      case "clear":
        if (finished()) return;
        delete answers()[q.n];
        checked = false;
        if (q.type === "order") {
          render();
          root.querySelector('[data-act="clear"]')?.focus();
        } else {
          root.querySelectorAll('input[name="answer"]').forEach(input => { input.checked = false; });
          const input = document.getElementById("character");
          if (input) input.value = "";
          root.querySelector(".demo-review")?.remove(); update();
        }
        return;
      case "tile":
      case "remove-tile": {
        if (finished()) return;
        const a = Array.isArray(answers()[q.n]) ? answers()[q.n] : [];
        answers()[q.n] = act === "tile" ? [...a,Number(i)] : a.filter(j => j !== Number(i));
        checked = false; render();
        root.querySelector('[data-act="tile"]:not(:disabled),[data-act="remove-tile"]')?.focus();
        return;
      }
      case "word": {
        const info = words[word];
        if (!info) return;
        document.getElementById("word-title").textContent = word;
        document.getElementById("word-pinyin").textContent = info.pinyin;
        document.getElementById("word-meaning").textContent = info.meaning;
        document.getElementById("word-dialog").showModal();
      }
    }
  });
  root.addEventListener("change", e => {
    if (!run) return;
    if (!allowed()) return finish(true);
    if (e.target.id === "pinyin") {
      settings.pinyin = e.target.checked;
      document.body.classList.toggle("with-pinyin", settings.pinyin);
    } else if (e.target.id === "help") {
      settings.help = e.target.checked; checked = false; render();
      document.getElementById("help")?.focus();
    } else if (e.target.id === "speed") {
      settings.speed = Number(e.target.value);
      if (audio) audio.playbackRate = settings.speed;
    } else if (e.target.name === "answer" && !finished()) {
      answers()[items[index].n] = Number(e.target.value);
      checked = false; root.querySelector(".demo-review")?.remove(); update();
    }
  });
  function saveCharacter(e) {
    if (!run || finished() || e.target.id !== "character" || e.isComposing) return;
    if (!allowed()) return finish(true);
    answers()[items[index].n] = e.target.value;
    checked = false; root.querySelector(".demo-review")?.remove(); update();
  }
  root.addEventListener("input", saveCharacter);
  root.addEventListener("compositionend", saveCharacter);
  document.getElementById("confirm-dialog").addEventListener("close", e => {
    if (e.target.returnValue === "finish" && run && !finished()) finish();
  });
  window.setInterval(tick, 500);
  home();
})();
