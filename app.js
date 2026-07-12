(() => {
  "use strict";

  const SETS = Array.isArray(window.WRITING_SETS) ? window.WRITING_SETS : [];
  const CATEGORIES = Array.isArray(window.WRITING_CATEGORIES) ? window.WRITING_CATEGORIES : [];
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const wordCount = (text = "") => (String(text).trim().match(/\b[\wÀ-ỹ'-]+\b/gu) || []).length;
  const storagePrefix = "ngoc-writing-review-v1";

  const state = {
    page: "home",
    selectedId: SETS[0]?.id || 1,
    part: "task1",
    examMode: false,
    timers: { task1: 1200, task2: 2400, shared: 3600 },
    timerHandles: { part: null, shared: null },
    review: null,
    submitting: false,
    phraseSeed: 0
  };

  const phrases = {
    task1: [
      ["I am writing to...", "Tôi viết thư để..."],
      ["Thank you for asking me about...", "Cảm ơn bạn đã hỏi tôi về..."],
      ["I would be happy to...", "Tôi rất sẵn lòng..."],
      ["Could you please let me know...?", "Bạn có thể vui lòng cho tôi biết...?"],
      ["I look forward to hearing from you.", "Tôi mong nhận được phản hồi."],
      ["Best wishes / Yours faithfully", "Thân mến / Trân trọng"]
    ],
    task2: [
      ["It is often argued that...", "Người ta thường cho rằng..."],
      ["On the one hand / On the other hand", "Một mặt / Mặt khác"],
      ["One major advantage is that...", "Một ưu điểm lớn là..."],
      ["However, this may also lead to...", "Tuy nhiên, điều này cũng có thể dẫn tới..."],
      ["For example / As a result", "Ví dụ / Do đó"],
      ["In conclusion, I believe that...", "Tóm lại, tôi cho rằng..."]
    ]
  };

  function currentSet() {
    return SETS.find(item => item.id === state.selectedId) || SETS[0];
  }
  function currentTask() {
    return currentSet()?.[state.part];
  }
  function draftKey(setId = state.selectedId, part = state.part) {
    return `${storagePrefix}:draft:${setId}:${part}`;
  }
  function doneKey(setId = state.selectedId, part = state.part) {
    return `${storagePrefix}:done:${setId}:${part}`;
  }
  function reviewKey(setId = state.selectedId, part = state.part) {
    return `${storagePrefix}:review:${setId}:${part}`;
  }
  function getDraft(setId = state.selectedId, part = state.part) {
    try { return localStorage.getItem(draftKey(setId, part)) || ""; } catch (_) { return ""; }
  }
  function setDraft(text) {
    try {
      if (text.trim()) localStorage.setItem(draftKey(), text);
      else localStorage.removeItem(draftKey());
    } catch (_) {}
  }
  function isDone(setId = state.selectedId, part = state.part) {
    try { return localStorage.getItem(doneKey(setId, part)) === "1"; } catch (_) { return false; }
  }
  function markDone() {
    try { localStorage.setItem(doneKey(), "1"); } catch (_) {}
  }
  function saveReview(review) {
    try { localStorage.setItem(reviewKey(), JSON.stringify(review)); } catch (_) {}
  }
  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function formatTime(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;
  }

  function setPage(page) {
    state.page = page;
    ["home","tests","practice"].forEach(name => $(`${name}View`).classList.toggle("hidden", name !== page));
    qsa(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));
    if (page === "tests") renderLibrary();
    if (page === "practice") renderPractice();
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function renderLibrary() {
    const search = ($("searchInput")?.value || "").trim().toLowerCase();
    const category = $("categoryFilter")?.value || "all";
    const filtered = SETS.filter(item => {
      const haystack = `${item.title} ${item.title_vi} ${item.task1.title} ${item.task2.title}`.toLowerCase();
      return (!search || haystack.includes(search)) && (category === "all" || item.category === category);
    });
    $("testLibrary").innerHTML = filtered.map(item => `
      <article class="test-card card">
        <div class="test-card-top"><span class="new-badge">${item.id === 1 ? "REVIEW MỚI" : "ĐỀ MỚI"}</span><span class="category-badge">${escapeHtml(item.category_vi)}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="vi-title">${escapeHtml(item.title_vi)}</p>
        <div class="task-preview"><small>TASK 1</small><p>${escapeHtml(item.task1.title)}</p></div>
        <div class="task-preview"><small>TASK 2</small><p>${escapeHtml(item.task2.title)}</p></div>
        <button class="btn primary" data-open-set="${item.id}">Mở bộ đề</button>
      </article>
    `).join("") || `<p class="muted">Không tìm thấy chủ đề phù hợp.</p>`;
    qsa("[data-open-set]").forEach(btn => btn.onclick = () => openSet(Number(btn.dataset.openSet)));
  }

  function openSet(id, part = "task1") {
    state.selectedId = id;
    state.part = part;
    state.review = null;
    setPage("practice");
  }

  function renderPractice() {
    const set = currentSet();
    const task = currentTask();
    if (!set || !task) return;
    renderSidebar();
    $("breadcrumb").textContent = `${set.category_vi} · Bộ ${String(set.id).padStart(2,"0")}`;
    $("setTitle").textContent = set.title;
    $("setTitleVi").textContent = set.title_vi;
    $("setTitleVi").classList.add("hidden");
    $("toggleSetTranslation").textContent = "Xem tên tiếng Việt";
    qsa(".part-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.part === state.part));
    $("taskType").textContent = task.type;
    $("taskTitle").textContent = task.title;
    $("timeBadge").textContent = `${task.minutes} minutes`;
    $("wordBadge").textContent = `At least ${task.minWords} words`;
    $("promptText").textContent = task.prompt_en;
    $("requirements").innerHTML = (task.requirements || []).map(req => `<div class="requirement">${escapeHtml(req.en)}</div>`).join("");
    $("promptVi").textContent = task.prompt_vi;
    $("promptVi").classList.add("hidden");
    $("togglePromptVi").textContent = "Xem bản dịch đề";
    $("outlinePanel").innerHTML = (task.outline || []).map((item, index) => `<p><b>${index + 1}.</b> ${escapeHtml(item.en)}<br><span class="muted">${escapeHtml(item.vi)}</span></p>`).join("");
    $("outlinePanel").classList.add("hidden");
    $("toggleOutline").textContent = "Gợi ý lập dàn ý";
    renderRecognition(task);
    $("answerBox").value = getDraft();
    state.timers[state.part] = task.minutes * 60;
    stopPartTimer();
    $("partTimer").textContent = formatTime(state.timers[state.part]);
    $("timerToggle").textContent = "Bắt đầu";
    $("resultSection").classList.add("hidden");
    renderEditorStats();
    renderChecklist();
    renderPhrases();
    updateStatuses();
    updateModeUi();
  }

  function renderSidebar() {
    $("topicNav").innerHTML = SETS.map(item => `
      <button class="topic-btn ${item.id === state.selectedId ? "active" : ""}" data-topic-id="${item.id}">
        <b>${String(item.id).padStart(2,"0")} · ${escapeHtml(item.title)}</b>
        <small>${escapeHtml(item.category_vi)}</small>
      </button>
    `).join("");
    qsa("[data-topic-id]").forEach(btn => btn.onclick = () => {
      saveCurrentDraft();
      state.selectedId = Number(btn.dataset.topicId);
      state.part = "task1";
      state.review = null;
      closeSidebar();
      renderPractice();
    });
    updateProgressCounts();
  }

  function renderRecognition(task) {
    const panel = $("recognitionPanel");
    if (state.part !== "task2") {
      panel.classList.add("hidden");
      panel.innerHTML = "";
      return;
    }
    const type = String(task.type || "");
    let form = "FORM 2";
    if (/Advantage/i.test(type)) form = "FORM 1";
    if (/Problem/i.test(type)) form = "FORM 3";
    panel.innerHTML = `<strong>${escapeHtml(type)} · ${form}</strong><p>${recognitionText(type)}</p>`;
    panel.classList.remove("hidden");
  }
  function recognitionText(type) {
    if (/Advantage/i.test(type)) return "Tìm các cụm: advantages and disadvantages, benefits and drawbacks, positive and negative effects.";
    if (/Problem/i.test(type)) return "Tìm các cụm: causes, problems, effects, solutions, what can be done.";
    if (/Discussion/i.test(type)) return "Trình bày cả hai quan điểm, sau đó nêu ý kiến của bạn.";
    return "Chọn rõ mức độ đồng ý hoặc quan điểm của bạn và giữ nhất quán đến kết luận.";
  }

  function renderEditorStats() {
    const text = $("answerBox").value;
    const wc = wordCount(text);
    const min = currentTask()?.minWords || 120;
    $("wordCount").textContent = wc;
    $("charCount").textContent = text.length;
    $("wordProgressBar").style.width = `${Math.min(100, (wc / min) * 100)}%`;
    $("saveStatus").textContent = text.trim() ? "Đã lưu tự động" : "Chưa có nội dung";
  }

  function renderChecklist() {
    const text = $("answerBox").value;
    const wc = wordCount(text);
    const task = currentTask();
    const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).filter(Boolean).length : 0;
    const hasOpening = state.part === "task1" ? /\b(dear|hi|hello)\b/i.test(text) : /\b(nowadays|currently|in recent years|it is often|many people)\b/i.test(text);
    const hasClosing = state.part === "task1" ? /\b(best wishes|yours sincerely|yours faithfully|regards|best)\b/i.test(text) : /\b(in conclusion|to conclude|overall)\b/i.test(text);
    const items = [
      [wc >= task.minWords, `Đủ ít nhất ${task.minWords} từ`],
      [paragraphs >= (state.part === "task1" ? 3 : 4), "Chia đoạn rõ ràng"],
      [hasOpening, state.part === "task1" ? "Có lời chào phù hợp" : "Có mở bài"],
      [hasClosing, state.part === "task1" ? "Có lời kết thư" : "Có kết luận"],
      [/[.!?]\s*$/.test(text.trim()), "Đã kiểm tra dấu câu cuối bài"]
    ];
    $("liveChecklist").innerHTML = items.map(([ok, label]) => `<div class="check-item ${ok ? "ok" : ""}">${ok ? "✓" : "○"} <span>${label}</span></div>`).join("");
  }

  function renderPhrases() {
    const list = phrases[state.part];
    const rotated = list.map((_, i) => list[(i + state.phraseSeed) % list.length]).slice(0, 5);
    $("phraseList").innerHTML = rotated.map(([en, vi]) => `<div class="phrase"><b>${escapeHtml(en)}</b><small>${escapeHtml(vi)}</small></div>`).join("");
  }

  function updateStatuses() {
    ["task1","task2"].forEach(part => {
      const el = $(part === "task1" ? "statusTask1" : "statusTask2");
      el.className = "";
      if (isDone(state.selectedId, part)) el.classList.add("done");
      else if (getDraft(state.selectedId, part).trim()) el.classList.add("has-draft");
    });
  }

  function saveCurrentDraft() {
    if ($("answerBox") && state.page === "practice") setDraft($("answerBox").value);
  }

  function switchPart(part) {
    if (part === state.part) return;
    saveCurrentDraft();
    stopPartTimer();
    state.part = part;
    state.review = null;
    renderPractice();
  }

  function startPartTimer() {
    if (state.examMode) return toast("Đang dùng đồng hồ 60 phút.");
    if (state.timerHandles.part) {
      stopPartTimer();
      $("timerToggle").textContent = "Tiếp tục";
      return;
    }
    $("timerToggle").textContent = "Tạm dừng";
    state.timerHandles.part = setInterval(() => {
      state.timers[state.part] = Math.max(0, state.timers[state.part] - 1);
      $("partTimer").textContent = formatTime(state.timers[state.part]);
      if (state.timers[state.part] <= 0) {
        stopPartTimer();
        toast("Hết thời gian phần này.");
      }
    }, 1000);
  }

  function stopPartTimer() {
    if (state.timerHandles.part) clearInterval(state.timerHandles.part);
    state.timerHandles.part = null;
  }

  function toggleExamMode() {
    state.examMode = !state.examMode;
    if (state.examMode) stopPartTimer();
    else stopSharedTimer();
    updateModeUi();
    toast(state.examMode ? "Đã bật thi trọn bài 60 phút." : "Đã chuyển về luyện từng phần.");
  }

  function updateModeUi() {
    $("modeLabel").textContent = state.examMode ? "Thi trọn 60 phút" : "Luyện từng phần";
    $("sharedTimerCard").classList.toggle("hidden", !state.examMode);
    $("sharedTimer").textContent = formatTime(state.timers.shared);
    $("timerToggle").disabled = state.examMode;
  }

  function toggleSharedTimer() {
    if (state.timerHandles.shared) {
      stopSharedTimer();
      $("sharedTimerToggle").textContent = "Tiếp tục";
      return;
    }
    $("sharedTimerToggle").textContent = "Tạm dừng";
    state.timerHandles.shared = setInterval(() => {
      state.timers.shared = Math.max(0, state.timers.shared - 1);
      $("sharedTimer").textContent = formatTime(state.timers.shared);
      if (state.timers.shared <= 0) {
        stopSharedTimer();
        toast("Hết 60 phút.");
      }
    }, 1000);
  }

  function stopSharedTimer() {
    if (state.timerHandles.shared) clearInterval(state.timerHandles.shared);
    state.timerHandles.shared = null;
  }

  function resetPartTimer() {
    stopPartTimer();
    state.timers[state.part] = currentTask().minutes * 60;
    $("partTimer").textContent = formatTime(state.timers[state.part]);
    $("timerToggle").textContent = "Bắt đầu";
  }

  function offlineReview(text, task) {
    const wc = wordCount(text);
    const paragraphs = text.trim().split(/\n\s*\n/).filter(Boolean).length;
    const sentences = (text.match(/[.!?]+/g) || []).length;
    const linkers = (text.match(/\b(first|second|however|therefore|moreover|in addition|for example|in conclusion|on the one hand|on the other hand|because|although)\b/gi) || []).length;
    const unique = new Set((text.toLowerCase().match(/\b[a-z']+\b/g) || [])).size;
    const ratio = Math.min(1, wc / task.minWords);
    const taskScore = clamp(4.2 + ratio * 4.2 + requirementCoverage(text, task).filter(x => x.met).length * .35);
    const organization = clamp(4.4 + Math.min(2.2, paragraphs * .5) + Math.min(1.8, linkers * .22) + (sentences >= 6 ? .7 : 0));
    const vocabulary = clamp(4.5 + Math.min(3.7, unique / Math.max(1, wc) * 14) + (wc >= task.minWords ? .5 : 0));
    const grammar = clamp(5.2 + (sentences >= 5 ? .8 : 0) + (/[.!?]\s*$/.test(text.trim()) ? .5 : 0) - roughErrorPenalty(text));
    const total = round1((taskScore + organization + vocabulary + grammar) / 4);
    const coverage = requirementCoverage(text, task);
    const strengths = [];
    const improvements = [];
    if (wc >= task.minWords) strengths.push(`Bài đã đạt yêu cầu tối thiểu ${task.minWords} từ.`);
    else improvements.push(`Bài còn thiếu khoảng ${task.minWords - wc} từ so với yêu cầu tối thiểu.`);
    if (paragraphs >= (state.part === "task1" ? 3 : 4)) strengths.push("Bài đã được chia thành các đoạn tương đối rõ.");
    else improvements.push("Nên chia bài thành các đoạn rõ hơn, mỗi đoạn tập trung vào một ý.");
    if (linkers >= 3) strengths.push("Đã sử dụng một số từ nối để liên kết ý.");
    else improvements.push("Nên thêm từ nối như First, However, For example và In conclusion.");
    if (coverage.some(x => !x.met)) improvements.push("Một số yêu cầu của đề có thể chưa được thể hiện rõ; hãy kiểm tra bảng độ bao phủ.");
    if (!strengths.length) strengths.push("Bài đã có nội dung để tiếp tục phát triển và sửa.");
    if (!improvements.length) improvements.push("Đọc lại để kiểm tra mạo từ, chia động từ, số nhiều và dấu câu.");
    const errors = basicErrors(text);
    return {
      scores: {task:round1(taskScore),organization:round1(organization),vocabulary:round1(vocabulary),grammar:round1(grammar),total},
      strengths, improvements, errors,
      correctedEnglish: text.trim(),
      translationVi: "Bản dịch đầy đủ sẽ được tạo khi AI hoạt động. Phần chấm offline không tự dịch toàn bài để tránh dịch sai.",
      coverage,
      engine: "offline"
    };
  }

  function requirementCoverage(text, task) {
    const lower = text.toLowerCase();
    return (task.requirements || []).map(req => {
      const tokens = String(req.en).toLowerCase().match(/[a-z]{4,}/g) || [];
      const meaningful = tokens.filter(t => !["about","whether","suitable","explain","describe","mention","request","formal","informal","letter","email","write"].includes(t));
      const met = meaningful.length ? meaningful.some(token => lower.includes(token.slice(0, Math.max(4, token.length - 2)))) : wordCount(text) > 60;
      return {en:req.en, vi:req.vi, met};
    });
  }

  function basicErrors(text) {
    const checks = [
      [/\bi\b/g, "I", "Grammar", "Đại từ I luôn phải viết hoa.", "The pronoun I must always be capitalized."],
      [/\bpeople is\b/gi, "people are", "Grammar", "People là danh từ số nhiều nên dùng are.", "People is plural, so use are."],
      [/\bmore easier\b/gi, "easier", "Grammar", "Không dùng more với tính từ đã có dạng so sánh hơn -er.", "Do not use more with an -er comparative."],
      [/\binformations\b/gi, "information", "Vocabulary", "Information là danh từ không đếm được.", "Information is uncountable."],
      [/\badvices\b/gi, "advice", "Vocabulary", "Advice là danh từ không đếm được.", "Advice is uncountable."],
      [/\bdiscuss about\b/gi, "discuss", "Grammar", "Discuss không đi với about trong cấu trúc này.", "Discuss does not take about here."],
      [/\bon the other hands\b/gi, "on the other hand", "Vocabulary", "Cụm cố định dùng hand số ít.", "The fixed phrase uses singular hand."]
    ];
    const found = [];
    for (const [pattern, suggestion, category, vi, en] of checks) {
      const match = text.match(pattern);
      if (match) found.push({category, original:match[0], suggestion, vi, en});
    }
    return found.slice(0, 8);
  }

  function roughErrorPenalty(text) {
    let penalty = 0;
    if (/\bi\b/.test(text)) penalty += .5;
    if (/\bpeople is\b/i.test(text)) penalty += .6;
    if (/\bmore easier\b/i.test(text)) penalty += .5;
    if (/\bdiscuss about\b/i.test(text)) penalty += .4;
    return penalty;
  }
  function clamp(value) { return Math.max(1, Math.min(10, value)); }
  function round1(value) { return Math.round(value * 10) / 10; }

  async function submitWriting(forceAi = false) {
    const text = $("answerBox").value.trim();
    const task = currentTask();
    if (wordCount(text) < 20) return toast("Bài quá ngắn. Hãy viết thêm trước khi nộp.");
    if (state.submitting) return;
    state.submitting = true;
    saveCurrentDraft();
    markDone();
    const offline = offlineReview(text, task);
    state.review = offline;
    saveReview(offline);
    renderReview(offline, "Đã chấm nhanh bằng bộ kiểm tra offline. AI đang đọc kỹ bài viết…");
    $("resultSection").classList.remove("hidden");
    $("resultSection").scrollIntoView({behavior:"smooth", block:"start"});
    updateStatuses();
    updateProgressCounts();
    $("retryAiBtn").classList.add("hidden");
    try {
      const response = await fetch("/api/review", {
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({text, task, part:state.part})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.error) throw new Error(payload.detail || payload.error || "AI không phản hồi.");
      payload.engine = "ai";
      state.review = payload;
      saveReview(payload);
      renderReview(payload, `AI đã sửa bài bằng mô hình ${payload.model || "được cấu hình trên Vercel"}. Điểm chỉ dùng để luyện tập.`);
      toast("AI đã hoàn thành sửa bài.");
    } catch (error) {
      $("reviewEngineLabel").textContent = `AI chưa hoạt động: ${error.message}. Kết quả offline vẫn được giữ lại.`;
      $("retryAiBtn").classList.remove("hidden");
      if (forceAi) toast("Chưa chấm được bằng AI. Hãy kiểm tra biến môi trường trên Vercel.");
    } finally {
      state.submitting = false;
    }
  }

  function renderReview(review, label) {
    $("reviewEngineLabel").textContent = label;
    const scoreNames = [["task","Đủ ý"],["organization","Bố cục"],["vocabulary","Từ vựng"],["grammar","Ngữ pháp"],["total","Tổng"]];
    $("scoreGrid").innerHTML = scoreNames.map(([key,name]) => {
      const value = Number(review.scores?.[key] || 0);
      return `<article class="score-card"><small>${name}</small><b>${value.toFixed(1)}/10</b><div class="score-track"><i style="width:${Math.min(100,value*10)}%"></i></div></article>`;
    }).join("");
    $("panel-overview").innerHTML = `
      <div class="feedback-grid">
        <div class="feedback-box"><h3>Điểm làm tốt</h3><ul>${(review.strengths || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
        <div class="feedback-box"><h3>Cần cải thiện</h3><ul>${(review.improvements || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
      </div>
      <h3 style="margin-top:20px">Độ bao phủ yêu cầu</h3>
      <div class="coverage-list">${(review.coverage || []).map(item => `<div class="coverage-item ${item.met ? "met" : "missing"}"><b>${item.met ? "✓ Đã thể hiện" : "△ Cần làm rõ"}</b><div>${escapeHtml(item.en)}</div><small class="muted">${escapeHtml(item.vi || "")}</small></div>`).join("")}</div>`;
    $("panel-errors").innerHTML = (review.errors || []).length ? (review.errors || []).map(err => `
      <article class="error-card">
        <div class="error-top"><b class="error-category">${escapeHtml(err.category)}</b></div>
        <p><span class="original">${escapeHtml(err.original)}</span> → <span class="suggestion">${escapeHtml(err.suggestion)}</span></p>
        <p>${escapeHtml(err.vi || "")}</p><small class="muted">${escapeHtml(err.en || "")}</small>
      </article>`).join("") : `<p class="muted">Bộ kiểm tra chưa phát hiện lỗi mẫu rõ ràng. AI có thể tìm thêm lỗi về ngữ cảnh và độ tự nhiên.</p>`;
    $("panel-corrected").innerHTML = `<div class="prose">${escapeHtml(review.correctedEnglish || $("answerBox").value)}</div>`;
    $("panel-translation").innerHTML = `<div class="prose">${escapeHtml(review.translationVi || "Chưa có bản dịch.")}</div>`;
    const task = currentTask();
    $("panel-model").innerHTML = `<h3>Bài mẫu tiếng Anh</h3><div class="prose">${escapeHtml(task.model_en || task.sample_en || "")}</div><h3 style="margin-top:22px">Bản dịch tiếng Việt</h3><div class="prose">${escapeHtml(task.model_vi || task.sample_vi || "")}</div>`;
    activateResultTab("overview");
  }

  function activateResultTab(name) {
    qsa(".result-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.result === name));
    qsa(".result-panel").forEach(panel => panel.classList.toggle("active", panel.id === `panel-${name}`));
  }

  function updateProgressCounts() {
    let drafts = 0, done = 0;
    SETS.forEach(set => ["task1","task2"].forEach(part => {
      if (getDraft(set.id, part).trim()) drafts++;
      if (isDone(set.id, part)) done++;
    }));
    if ($("draftCount")) $("draftCount").textContent = drafts;
    if ($("doneCount")) $("doneCount").textContent = done;
    return {drafts, done};
  }

  function showProgress() {
    const stats = updateProgressCounts();
    $("progressContent").innerHTML = `
      <div class="progress-grid">
        <div><strong>${stats.done}/14</strong><span>phần đã nộp</span></div>
        <div><strong>${stats.drafts}</strong><span>bản nháp</span></div>
        <div><strong>${SETS.filter(set => isDone(set.id,"task1") && isDone(set.id,"task2")).length}/7</strong><span>bộ hoàn thành</span></div>
      </div>
      <div class="progress-list">${SETS.map(set => {
        const a = isDone(set.id,"task1"), b = isDone(set.id,"task2");
        return `<div class="progress-row"><span>${String(set.id).padStart(2,"0")} · ${escapeHtml(set.title)}</span><b>${a && b ? "Hoàn thành" : a || b ? "1/2 phần" : "Chưa nộp"}</b></div>`;
      }).join("")}</div>`;
    $("progressModal").classList.remove("hidden");
  }

  function openSidebar() {
    $("sidebar").classList.add("open");
    $("sidebarOverlay").classList.remove("hidden");
  }
  function closeSidebar() {
    $("sidebar").classList.remove("open");
    $("sidebarOverlay").classList.add("hidden");
  }

  function bindEvents() {
    $("brandBtn").onclick = () => setPage("home");
    qsa("[data-page]").forEach(btn => btn.onclick = () => setPage(btn.dataset.page));
    $("quickStartBtn").onclick = () => openSet(1);
    $("openNewestBtn").onclick = () => openSet(1);
    $("chooseTestBtn").onclick = () => setPage("tests");
    $("randomBtn").onclick = () => openSet(SETS[Math.floor(Math.random()*SETS.length)].id);
    $("searchInput").oninput = renderLibrary;
    $("categoryFilter").onchange = renderLibrary;
    $("backToTestsBtn").onclick = () => { saveCurrentDraft(); setPage("tests"); };
    qsa(".part-tab").forEach(btn => btn.onclick = () => switchPart(btn.dataset.part));
    $("toggleSetTranslation").onclick = () => {
      const hidden = $("setTitleVi").classList.toggle("hidden");
      $("toggleSetTranslation").textContent = hidden ? "Xem tên tiếng Việt" : "Ẩn tên tiếng Việt";
    };
    $("togglePromptVi").onclick = () => {
      const hidden = $("promptVi").classList.toggle("hidden");
      $("togglePromptVi").textContent = hidden ? "Xem bản dịch đề" : "Ẩn bản dịch đề";
    };
    $("toggleOutline").onclick = () => {
      const hidden = $("outlinePanel").classList.toggle("hidden");
      $("toggleOutline").textContent = hidden ? "Gợi ý lập dàn ý" : "Ẩn dàn ý";
    };
    $("answerBox").oninput = () => {
      setDraft($("answerBox").value);
      renderEditorStats();
      renderChecklist();
      updateStatuses();
      updateProgressCounts();
    };
    $("timerToggle").onclick = startPartTimer;
    $("timerReset").onclick = resetPartTimer;
    $("examModeBtn").onclick = toggleExamMode;
    $("sharedTimerToggle").onclick = toggleSharedTimer;
    $("clearBtn").onclick = () => {
      if (!confirm("Xóa toàn bộ bài viết hiện tại?")) return;
      $("answerBox").value = "";
      setDraft("");
      renderEditorStats(); renderChecklist(); updateStatuses(); updateProgressCounts();
    };
    $("copyBtn").onclick = async () => {
      await navigator.clipboard.writeText($("answerBox").value);
      toast("Đã sao chép bài viết.");
    };
    $("submitBtn").onclick = () => submitWriting(false);
    $("retryAiBtn").onclick = () => submitWriting(true);
    $("closeResultBtn").onclick = () => $("resultSection").classList.add("hidden");
    qsa(".result-tab").forEach(btn => btn.onclick = () => activateResultTab(btn.dataset.result));
    $("shufflePhrases").onclick = () => { state.phraseSeed = (state.phraseSeed + 1) % phrases[state.part].length; renderPhrases(); };
    $("progressBtn").onclick = showProgress;
    $("closeProgressBtn").onclick = () => $("progressModal").classList.add("hidden");
    $("formHelpBtn").onclick = () => $("formHelpModal").classList.remove("hidden");
    $("closeFormHelpBtn").onclick = () => $("formHelpModal").classList.add("hidden");
    $("progressModal").onclick = event => { if (event.target === $("progressModal")) $("progressModal").classList.add("hidden"); };
    $("formHelpModal").onclick = event => { if (event.target === $("formHelpModal")) $("formHelpModal").classList.add("hidden"); };
    $("openSidebarBtn").onclick = openSidebar;
    $("closeSidebarBtn").onclick = closeSidebar;
    $("sidebarOverlay").onclick = closeSidebar;
    $("themeBtn").onclick = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      if (dark) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = "dark";
      try { localStorage.setItem("ngoc-writing-review-theme", dark ? "light" : "dark"); } catch (_) {}
    };
    window.addEventListener("beforeunload", saveCurrentDraft);
  }

  function init() {
    $("categoryFilter").innerHTML = CATEGORIES.map(item => `<option value="${item.id}">${escapeHtml(item.vi)}</option>`).join("");
    bindEvents();
    renderLibrary();
    updateProgressCounts();
  }

  init();
})();