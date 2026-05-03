// ══════════════════════════════════════
//  GLOBALS
// ══════════════════════════════════════
let analysisData = null;
let uploadedFiles = [];
let qFilterVal = 'all';
let chatHistory = [];
let storedPaperTexts = []; // stores extracted text for all tabs

// ══════════════════════════════════════
//  PDF.js — load from CDN for real extraction
// ══════════════════════════════════════
let pdfJsLoaded = false;

function loadPdfJs() {
  return new Promise((resolve) => {
    if (typeof pdfjsLib !== 'undefined') { pdfJsLoaded = true; resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfJsLoaded = true;
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// Extract real text from a PDF File object using PDF.js
async function extractPdfText(file) {
  if (!pdfJsLoaded) await loadPdfJs();
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js not available');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 30); // cap at 30 pages for speed
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText.trim();
}

// ══════════════════════════════════════
//  DARK MODE
// ══════════════════════════════════════
function toggleDark() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('darkLabel').textContent = isDark ? 'Dark' : 'Light';
  if (analysisData) drawAllCharts();
}

// ══════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════
const pageLabels = {
  quickstart: ['Quick Start', 'START HERE'],
  features: ['All Features', 'GUIDE'],
  workflow: ['Workflow', 'GUIDE'],
  tips: ['Tips & Tricks', 'GUIDE'],
  shortcuts: ['Shortcuts', 'GUIDE'],
  faq: ['FAQ', 'GUIDE'],
  upload: ['Data Upload', 'UPLOAD'],
  dashboard: ['Overview', 'PROFILING'],
  topics: ['Topic Ranking', 'PROFILING'],
  syllabus: ['Syllabus Map', 'PROFILING'],
  predict: ['Predictions', 'AI'],
  planner: ['Study Planner', 'STUDY'],
  practice: ['Practice Qs', 'STUDY'],
  mocktest: ['Mock Test', 'STUDY'],
  report: ['Report', 'EXPORT'],
  assistant: ['AI Assistant', 'AI'],
};

function goto(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  const lbl = pageLabels[page] || [page, ''];
  document.getElementById('topbarTitle').textContent = lbl[0];
  document.getElementById('topbarBadge').textContent = lbl[1];

  if (page === 'dashboard' && analysisData) drawAllCharts();
  if (page === 'syllabus' && analysisData) drawCoverageDonut();
  if (page === 'planner' && analysisData) buildPlanner();
  if (page === 'practice' && analysisData) renderQuestions();
  if (page === 'mocktest') initMockTestPage();
  if (page === 'predict' && analysisData) renderPredictions();
  if (page === 'report' && analysisData) renderReport();
}

function toggleNav(btn, id) {
  btn.classList.toggle('open');
  document.getElementById(id).classList.toggle('closed');
}

document.addEventListener('keydown', e => {
  if (e.altKey) {
    if (e.key === 'u') { e.preventDefault(); goto('upload'); }
    if (e.key === 'd') { e.preventDefault(); goto('dashboard'); }
    if (e.key === 'a') { e.preventDefault(); goto('assistant'); }
    if (e.key === 'r') { e.preventDefault(); resetAll(); }
  }
});

// ══════════════════════════════════════
//  FILE HANDLING
// ══════════════════════════════════════
function handleDragOver(e) { e.preventDefault(); document.getElementById('dropZone').classList.add('drag'); }
function handleDragLeave() { document.getElementById('dropZone').classList.remove('drag'); }
function handleDrop(e) { e.preventDefault(); document.getElementById('dropZone').classList.remove('drag'); handleFiles(e.dataTransfer.files); }

function handleFiles(files) {
  for (const f of files) {
    if (uploadedFiles.some(u => u.name === f.name)) continue;
    uploadedFiles.push({ file: f, name: f.name, size: f.size, year: new Date().getFullYear(), type: f.type || 'text/plain' });
  }
  renderFileList();
  document.getElementById('paperCount').textContent = uploadedFiles.length + ' paper' + (uploadedFiles.length !== 1 ? 's' : '');
  document.getElementById('sideStatus').textContent = uploadedFiles.length + ' paper' + (uploadedFiles.length !== 1 ? 's' : '') + ' loaded';
  showToast('✅ ' + files.length + ' file(s) added');
}

function renderFileList() {
  document.getElementById('fileList').innerHTML = uploadedFiles.map((f, i) => `
    <div class="file-item">
      <span class="file-icon">${f.type && f.type.includes('pdf') ? '📄' : f.type && f.type.includes('image') ? '🖼️' : '📝'}</span>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">${(f.size / 1024).toFixed(1)} KB</div>
      </div>
      <select class="file-year-input" onchange="uploadedFiles[${i}].year=this.value">${
    Array.from({ length: 15 }, (_, k) => new Date().getFullYear() - k)
      .map(y => `<option ${y == f.year ? 'selected' : ''}>${y}</option>`).join('')
  }</select>
      <button class="file-del" onclick="removeFile(${i})">✕</button>
    </div>
  `).join('');
}

function removeFile(i) {
  uploadedFiles.splice(i, 1);
  renderFileList();
  document.getElementById('paperCount').textContent = uploadedFiles.length + ' papers';
}

// ══════════════════════════════════════
//  SAMPLE SYLLABI
// ══════════════════════════════════════
const SYLLABI = {
  cs: `Arrays and Strings\nLinked Lists\nStacks and Queues\nTrees and Binary Search Trees\nHeap and Priority Queues\nGraphs and BFS/DFS\nDynamic Programming\nSorting Algorithms\nSearching Algorithms\nHashing and Hash Tables\nRecursion and Backtracking\nGreedy Algorithms\nTime and Space Complexity\nDivide and Conquer\nString Matching`,
  math: `Limits and Continuity\nDifferentiation\nIntegration\nDifferential Equations\nLinear Algebra\nMatrices and Determinants\nVectors\nProbability and Statistics\nComplex Numbers\nSeries and Sequences\nTrigonometry\nCoordinate Geometry\nNumber Theory\nSet Theory\nMathematical Logic`,
  physics: `Mechanics and Motion\nNewton's Laws\nWork, Energy and Power\nRotational Motion\nGravitation\nElectrostatics\nCurrent Electricity\nMagnetic Effects of Current\nElectromagnetic Induction\nOptics\nModern Physics\nSemiconductors\nThermodynamics\nWave Motion\nNuclear Physics`,
  bio: `Cell Biology\nGenetics and Heredity\nEvolution\nEcology and Environment\nBiochemistry\nMolecular Biology\nPlant Physiology\nAnimal Physiology\nReproduction\nBiotechnology\nHuman Health and Disease\nMicrobiology\nClassification of Organisms\nEndocrine System\nNervous System`,
  law: `Constitutional Law\nContract Law\nTort Law\nCriminal Law\nProperty Law\nFamily Law\nAdministrative Law\nInternational Law\nCivil Procedure\nLegal Methods and Research\nEvidence Law\nLaw of Equity\nCompany Law\nLabour Law\nEnvironmental Law`,
  med: `Anatomy\nPhysiology\nBiochemistry\nPathology\nPharmacology\nMicrobiology\nForensic Medicine\nCommunity Medicine\nInternal Medicine\nSurgery\nObstetrics and Gynecology\nPediatrics\nPsychiatry\nOphthalmology\nOtorhinolaryngology`,
  econ: `Microeconomics\nMacroeconomics\nDemand and Supply\nElasticity\nMarket Structures\nNational Income\nMonetary Policy\nFiscal Policy\nInternational Trade\nDevelopment Economics\nPublic Finance\nBanking System\nBalance of Payments\nInflation and Deflation\nEconometrics`,
  hist: `Ancient Civilizations\nMedieval History\nModern History\nWorld Wars\nColonialism and Imperialism\nIndian Freedom Movement\nConstitutional History\nSocial Reform Movements\nReligious History\nEconomic History\nCultural History\nPolitical Thought\nEnvironmental History\nScientific Revolution\nGlobalization`,
};

function loadSample(key) {
  document.getElementById('syllabusInput').value = SYLLABI[key] || '';
  showToast('📋 Sample syllabus loaded');
}

// ══════════════════════════════════════
//  DEMO DATA
// ══════════════════════════════════════
function loadDemo() {
  uploadedFiles = [
    { name: 'DataStructures_2024.pdf', size: 184320, year: 2024, type: 'application/pdf', content: 'Q1. Explain Binary Search Tree with insertion and deletion operations with examples. Q2. Implement Dijkstra shortest path algorithm with time complexity analysis. Q3. Dynamic Programming approach to 0/1 Knapsack problem. Q4. Compare QuickSort vs MergeSort — time and space complexity. Q5. Graph traversal using BFS and DFS with applications.' },
    { name: 'DataStructures_2023.pdf', size: 172800, year: 2023, type: 'application/pdf', content: 'Q1. Binary trees traversal — inorder preorder postorder with recursion and iteration. Q2. Hashing: open addressing vs chaining for collision resolution. Q3. Dynamic programming: Longest Common Subsequence algorithm. Q4. Linked list operations insertion deletion at various positions. Q5. Time complexity analysis of common algorithms — Big O notation.' },
    { name: 'DataStructures_2022.pdf', size: 196608, year: 2022, type: 'application/pdf', content: 'Q1. AVL trees: rotation types, balancing factor, insertion with examples. Q2. Graph shortest path algorithms: Bellman-Ford vs Dijkstra. Q3. Recursion and backtracking: N-Queens problem step by step. Q4. Heap sort and priority queue implementation. Q5. String matching using KMP algorithm.' },
    { name: 'DataStructures_2021.pdf', size: 163840, year: 2021, type: 'application/pdf', content: 'Q1. Binary search: recursive and iterative approaches with complexity. Q2. Sorting algorithms: bubble, selection, insertion — compare all three. Q3. Stack applications: infix to postfix conversion with example. Q4. Queue variants: circular queue and dequeue operations. Q5. Tree balancing and rotation techniques.' },
    { name: 'DataStructures_2020.pdf', size: 155648, year: 2020, type: 'application/pdf', content: 'Q1. Multi-dimensional arrays and matrix operations. Q2. Linked lists types: singly doubly circular — compare and implement. Q3. Greedy algorithms: Huffman coding for data compression. Q4. Dynamic programming: matrix chain multiplication. Q5. Graph coloring problem and minimum spanning trees.' },
  ];
  document.getElementById('iSubject').value = 'Data Structures & Algorithms';
  document.getElementById('iLevel').value = 'B.Tech / Engineering';
  document.getElementById('syllabusInput').value = SYLLABI.cs;
  renderFileList();
  document.getElementById('paperCount').textContent = uploadedFiles.length + ' papers';
  document.getElementById('sideStatus').textContent = '5 papers loaded (Demo)';
  showToast('📋 Demo dataset loaded! Click "Analyze with AI"');
}

function loadDemoAndAnalyze() {
  loadDemo();
  goto('upload');
  setTimeout(() => runAnalysis(), 500);
}

// ══════════════════════════════════════
//  READ FILE AS TEXT — supports PDF, DOCX, images, plain text
// ══════════════════════════════════════
async function readFileAsText(file) {
  const name = file.name.toLowerCase();

  // ── PDF: use PDF.js for real text extraction ──
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const text = await extractPdfText(file);
      if (text && text.length > 50) return text;
      return `[PDF: ${file.name} — no extractable text layer. If this is a scanned PDF, please use a text-based PDF or .txt version.]`;
    } catch (err) {
      return `[PDF parse error for ${file.name}: ${err.message}]`;
    }
  }

  // ── Images: tell AI it's an image, can't extract text client-side ──
  if (file.type.startsWith('image/')) {
    return `[Image file: ${file.name} — visual content, no text extraction possible in browser. Analyze based on filename and subject context.]`;
  }

  // ── DOCX: extract raw XML text (basic but functional) ──
  if (name.endsWith('.docx')) {
    try {
      const zip = await readZipFile(file);
      if (zip) {
        const xml = zip['word/document.xml'];
        if (xml) {
          const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
          return text.length > 50 ? text : `[DOCX: ${file.name} — could not extract text]`;
        }
      }
    } catch (e) { /* fall through */ }
    return `[DOCX: ${file.name} — extraction failed. Try saving as .txt or .pdf]`;
  }

  // ── Plain text, CSV, markdown, code files ──
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsText(file);
  });
}

// Minimal ZIP reader for DOCX (Word XML)
function readZipFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Use JSZip if available, else fallback
        if (typeof JSZip !== 'undefined') {
          const zip = await JSZip.loadAsync(e.target.result);
          const files = {};
          for (const [name, entry] of Object.entries(zip.files)) {
            if (!entry.dir && name.endsWith('.xml')) {
              files[name] = await entry.async('text');
            }
          }
          resolve(files);
        } else {
          resolve(null);
        }
      } catch { resolve(null); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

// ══════════════════════════════════════
//  REAL AI ANALYSIS
// ══════════════════════════════════════
async function runAnalysis() {
  const subject = document.getElementById('iSubject').value.trim() || 'General Studies';
  const level = document.getElementById('iLevel').value || 'University Level';
  const syllabus = document.getElementById('syllabusInput').value.trim();
  const examDate = document.getElementById('iExamDate').value;

  if (uploadedFiles.length === 0) {
    showToast('⚠️ Please upload papers or load the demo first');
    return;
  }

  document.getElementById('analyzeBtn').disabled = true;
  showLoading('Extracting Text from Papers...', 'Reading your exam papers — please wait');

  // ── Step 1: Extract text from ALL files ──
  let paperTexts = [];
  const PER_FILE_LIMIT = 3000; // chars per file for AI context

  showToast('📄 Extracting text from files...');

  for (const f of uploadedFiles) {
    stepActive(1);
    if (f.content) {
      // Demo data — already has text
      paperTexts.push({ year: f.year, name: f.name, text: f.content.slice(0, PER_FILE_LIMIT) });
    } else {
      try {
        const raw = await readFileAsText(f.file);
        const clean = raw
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]{3,}/g, ' ')
          .trim();
        if (clean.length < 30) {
          paperTexts.push({ year: f.year, name: f.name, text: `[${f.name}: no readable text found — using filename/subject for analysis]` });
        } else {
          paperTexts.push({ year: f.year, name: f.name, text: clean.slice(0, PER_FILE_LIMIT) });
        }
      } catch (e) {
        paperTexts.push({ year: f.year, name: f.name, text: `[${f.name}: read error — ${e.message}]` });
      }
    }
  }

  storedPaperTexts = paperTexts; // save globally for all tabs

  stepDone(1); stepActive(2);
  await delay(400);
  stepDone(2); stepActive(3);

  // Build paper context string for AI (generous token budget)
  const MAX_TOTAL_CHARS = 6000;
  const perFile = Math.max(200, Math.floor(MAX_TOTAL_CHARS / Math.max(paperTexts.length, 1)));
  const papersContent = paperTexts
    .map(p => `\n=== [${p.year}] ${p.name} ===\n${p.text.slice(0, perFile)}`)
    .join('\n')
    .slice(0, MAX_TOTAL_CHARS);

  const syllabusShort = syllabus ? syllabus.slice(0, 400) : '';
  const ctx = `Subject: "${subject}"\nLevel: "${level}"\nExam date: "${examDate || 'not specified'}"\n\nUPLOADED PAPER CONTENT:\n${papersContent}${syllabusShort ? '\n\nSYLLABUS TOPICS:\n' + syllabusShort : ''}`;

  // Helper: call Groq and parse JSON safely
  async function groqJSON(userMsg, openChar, maxTok) {
    const raw = await callGroq([
      { role: 'system', content: 'Return ONLY raw JSON, no markdown, no explanation. Use the actual paper content provided.' },
      { role: 'user', content: userMsg }
    ], maxTok);
    if (!raw || !raw.includes(openChar)) throw new Error('No JSON in response');
    return JSON.parse(cleanJSON(raw, openChar, openChar === '[' ? ']' : '}'));
  }

  // Build analysisData shell
  analysisData = {
    subject, level,
    uploadedCount: uploadedFiles.length,
    totalQuestions: 0, covPct: 70, domainType: 'General',
    topics: [], questionTypes: [], yearTrends: [],
    syllabusMapping: [], predictions: [], practiceQs: [],
    insights: [], reportSummary: ''
  };

  try {
    stepDone(3); stepActive(4);

    // ── CALL 1: Topics + domain — based on REAL paper text ──
    const r1 = await groqJSON(
      `You are analyzing REAL exam papers. Read the paper content carefully and extract actual topics, questions, and patterns.\n\n${ctx}\n\nReturn JSON: {"domainType":"Engineering|Medicine|Law|Arts|Science|Commerce|Other","totalQuestions":0,"covPct":70,"topics":[{"name":"actual topic from paper","frequency":1,"years":[2023],"difficulty":"Medium","priority":"high","score":80,"avgMarks":5}]}\nExtract up to 10 real topics found in the papers. Set frequency = how many papers contain that topic.`,
      '{', 1200
    );
    Object.assign(analysisData, r1);

    await delay(800);
    stepDone(4); stepActive(5);

    // ── CALL 2: Trends + types + predictions — all from real content ──
    const years = paperTexts.map(p => p.year).filter(Boolean);
    const topicNames = analysisData.topics.slice(0, 6).map(t => t.name).join(', ') || subject;
    const r2 = await groqJSON(
      `Based on these REAL exam papers:\n${ctx}\n\nTopics found: ${topicNames}\nYears: ${years.join(',')}\n\nReturn JSON: {"questionTypes":[{"type":"Theory","count":5,"pct":50}],"yearTrends":[{"year":2023,"count":10,"topTopic":"actual topic"}],"predictions":[{"topic":"actual topic","probability":80,"tier":"high","reason":"appeared in X papers, specific pattern"}],"insights":["specific insight from paper content"],"reportSummary":"summary referencing actual content"}\nBase EVERYTHING on the actual paper text. Max 4 items per array.`,
      '{', 900
    ).catch(() => ({}));
    Object.assign(analysisData, r2);

    await delay(800);

    // ── CALL 3: Practice questions — generated from actual paper topics ──
    const rawQ = await groqJSON(
      `Based on these real exam papers:\n${ctx}\n\nGenerate 6 practice questions similar to what's in these papers. Topics: ${topicNames}\n\nReturn JSON array: [{"topic":"actual topic","question":"realistic exam question based on paper content","type":"Short|Long|Problem|MCQ","difficulty":"Easy|Medium|Hard","marks":5,"priority":"high|medium|low","hint":"specific hint for this question"}]\nMake questions similar to the actual paper style.`,
      '[', 1200
    ).catch(() => []);
    if (Array.isArray(rawQ)) analysisData.practiceQs = rawQ;

    // Ensure syllabusMapping has real data
    if (!analysisData.syllabusMapping?.length) {
      analysisData.syllabusMapping = analysisData.topics.slice(0, 8).map(t => ({
        topic: t.name, covered: 'covered', pct: t.score || 70, frequency: t.frequency || 1, note: ''
      }));
    }

    stepDone(5); stepActive(6);
    await delay(400);
    stepDone(6);

  } catch (err) {
    console.error('AI analysis error:', err);
    hideLoading();
    document.getElementById('analyzeBtn').disabled = false;

    if (err.message === 'FILE_PROTOCOL_BLOCKED') {
      analysisData = generateFallbackData(subject, level, syllabus, uploadedFiles);
      renderDashboard(); renderTopicTable(); renderSyllabusMap();
      renderPredictions(); buildPlanner(); renderQuestions(); renderReport();
      document.getElementById('sideStatus').textContent = analysisData.subject + ' · ' + analysisData.uploadedCount + ' papers (offline)';
      goto('dashboard');
      setTimeout(() => {
        showLaunchModal();
        showToast('📊 Showing offline demo data — set up local server for real AI analysis!');
      }, 300);
      return;
    }

    const isAuth = /401|403|invalid.*key|auth/i.test(err.message);
    const isQuota = /429|quota|rate.limit/i.test(err.message);
    let userMsg;
    if (isAuth) userMsg = "API Key Error — The Groq key was rejected.\nGet a fresh key at console.groq.com and update GROQ_API_KEY in app.js.";
    else if (isQuota) userMsg = "Rate Limit — Wait ~60 seconds and try again.";
    else userMsg = "Analysis failed: " + err.message;

    alert(userMsg);
    analysisData = generateFallbackData(subject, level, syllabus, uploadedFiles);
    renderDashboard(); renderTopicTable(); renderSyllabusMap();
    renderPredictions(); buildPlanner(); renderQuestions(); renderReport();
    document.getElementById('sideStatus').textContent = analysisData.subject + ' · ' + analysisData.uploadedCount + ' papers';
    goto('dashboard');
    showToast('⚠️ Using offline analysis as fallback.');
    return;
  }

  hideLoading();
  document.getElementById('analyzeBtn').disabled = false;

  renderDashboard();
  renderTopicTable();
  renderSyllabusMap();
  renderPredictions();
  buildPlanner();
  renderQuestions();
  renderReport();

  document.getElementById('sideStatus').textContent = analysisData.subject + ' · ' + analysisData.uploadedCount + ' papers';
  goto('dashboard');
  showToast('✅ Analysis complete! All tabs now reflect your uploaded papers.');
}

function stepDone(n) { const s = document.getElementById('ls' + n); if (s) { s.classList.remove('active'); s.classList.add('done'); s.textContent = '✓ ' + s.textContent.replace(/^[^a-zA-Z]*/, ''); } }
function stepActive(n) { const s = document.getElementById('ls' + n); if (s) s.classList.add('active'); }

// ══════════════════════════════════════
//  FALLBACK DATA GENERATOR
// ══════════════════════════════════════
function generateFallbackData(subject, level, syllabus, files) {
  const syllabusTopics = syllabus ? syllabus.split('\n').filter(t => t.trim()) : [];
  const years = files.map(f => parseInt(f.year) || 2024).sort();

  const domainTopics = {
    'B.Tech / Engineering': ['Data Structures', 'Algorithms', 'Operating Systems', 'Database Management', 'Computer Networks', 'Software Engineering', 'Theory of Computation', 'Compiler Design', 'Microprocessors', 'Digital Logic'],
    'MBBS / Medicine': ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 'Microbiology', 'Surgery', 'Medicine', 'Pediatrics', 'Obstetrics'],
    'LLB / Law': ['Constitutional Law', 'Contract Law', 'Criminal Law', 'Tort Law', 'Property Law', 'Administrative Law', 'International Law', 'Evidence', 'Civil Procedure', 'Family Law'],
    'Class 12 (CBSE/ICSE)': ['Calculus', 'Algebra', 'Probability', 'Mechanics', 'Electrostatics', 'Organic Chemistry', 'Genetics', 'Cell Biology', 'Economic Development', 'Indian History'],
  };

  const topics = (domainTopics[level] || syllabusTopics.slice(0, 10) || ['Topic A', 'Topic B', 'Topic C', 'Topic D', 'Topic E'])
    .slice(0, 12).map((name, i) => ({
      name,
      frequency: Math.floor(Math.random() * 8) + 2,
      years: years.slice(0, Math.floor(Math.random() * years.length) + 1),
      difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(i / 4)],
      priority: i < 4 ? 'high' : i < 8 ? 'medium' : 'low',
      score: Math.max(30, 100 - i * 7 + Math.floor(Math.random() * 10)),
      avgMarks: [10, 8, 6, 5][Math.min(i, 3)],
    }));

  return {
    subject, level,
    uploadedCount: files.length,
    totalQuestions: files.length * 10 + Math.floor(Math.random() * 20),
    covPct: syllabusTopics.length ? Math.floor(60 + Math.random() * 30) : 75,
    topics,
    questionTypes: [
      { type: 'Theory', count: 15, pct: 30 },
      { type: 'Problem-Solving', count: 12, pct: 24 },
      { type: 'Short Answer', count: 10, pct: 20 },
      { type: 'MCQ', count: 8, pct: 16 },
      { type: 'Diagram', count: 5, pct: 10 },
    ],
    yearTrends: years.map(y => ({ year: y, count: Math.floor(Math.random() * 5) + 8, topTopic: topics[0]?.name || 'Topic A' })),
    syllabusMapping: (syllabusTopics.length ? syllabusTopics : topics.map(t => t.name)).map((t, i) => ({
      topic: t, pct: Math.floor(Math.random() * 80) + 10,
      covered: i < Math.floor(topics.length * 0.5) ? 'covered' : i < Math.floor(topics.length * 0.75) ? 'partial' : 'missing',
      frequency: Math.floor(Math.random() * 5) + 1, note: ''
    })),
    predictions: topics.slice(0, 8).map((t, i) => ({
      topic: t.name, probability: Math.max(40, 92 - i * 7),
      tier: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
      reason: `Appeared in ${t.years?.length || 2}/${files.length} papers with ${t.difficulty} difficulty`
    })),
    practiceQs: topics.slice(0, 10).map((t, i) => ({
      topic: t.name,
      question: `Explain the key concepts of ${t.name} with a detailed example. Discuss its applications and limitations.`,
      type: ['Short', 'Long', 'Problem', 'MCQ'][i % 4],
      difficulty: t.difficulty,
      marks: t.avgMarks,
      priority: t.priority,
      hint: `Focus on definition, working mechanism, and real-world applications of ${t.name}`
    })),
    insights: [
      `📊 ${topics[0]?.name} is the most frequently tested topic — appeared in all ${files.length} papers`,
      `⚠️ ${Math.round(100 - (syllabusTopics.length ? 70 : 75))}% of syllabus topics are under-tested — potential surprise areas`,
      `📈 Medium difficulty questions make up ~45% of all papers`,
      `🎯 Focus on High Priority topics for maximum marks coverage`,
      `💡 ${topics[0]?.name} and ${topics[1]?.name} together account for ~40% of total marks`,
    ],
    domainType: level.includes('Engineering') ? 'Engineering' : level.includes('MBBS') ? 'Medicine' : level.includes('Law') ? 'Law' : 'General',
    reportSummary: `Analysis of ${files.length} ${subject} papers reveals strong focus on ${topics.slice(0, 3).map(t => t.name).join(', ')}. Coverage of syllabus stands at approximately ${syllabusTopics.length ? Math.floor(60 + Math.random() * 30) : 75}%. High-priority topics should receive priority study attention.`,
  };
}

// ══════════════════════════════════════
//  DASHBOARD RENDER
// ══════════════════════════════════════
function renderDashboard() {
  if (!analysisData) return;
  const d = analysisData;

  document.getElementById('dashSubtitle').textContent = `${d.subject} — ${d.uploadedCount} papers analyzed`;
  document.getElementById('st1').textContent = d.uploadedCount;
  document.getElementById('st2').textContent = d.topics.length;
  document.getElementById('st3').textContent = d.totalQuestions;
  document.getElementById('st4').textContent = d.covPct + '%';

  const years = [...new Set(d.yearTrends?.map(y => y.year) || [])].sort();
  document.getElementById('yearFilterBtns').innerHTML =
    ['All', ...years].map((y, i) => `<button class="toggle-btn ${i === 0 ? 'active' : ''}" onclick="this.parentNode.querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');">${y}</button>`).join('');

  const top8 = d.topics.slice(0, 8);
  const maxF = Math.max(...top8.map(t => t.frequency), 1);
  const colors = ['bf-green', 'bf-gold', 'bf-blue', 'bf-red', 'bf-purple', 'bf-green', 'bf-gold', 'bf-blue'];
  document.getElementById('topicBarChart').innerHTML = top8.map((t, i) => `
    <div class="bar-row">
      <div class="bar-label">${t.name}</div>
      <div class="bar-track">
        <div class="bar-fill ${colors[i]}" style="width:0%" data-w="${Math.round(t.frequency / maxF * 100)}%">${t.frequency}x</div>
      </div>
      <div class="bar-count">${t.frequency}</div>
    </div>
  `).join('');
  setTimeout(() => {
    document.querySelectorAll('.bar-fill[data-w]').forEach(b => b.style.width = b.dataset.w);
  }, 100);

  document.getElementById('insightsList').innerHTML = (d.insights || []).map(ins => `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:0.9rem;flex-shrink:0;">${ins.charAt(0)}</span>
      <div style="font-size:0.82rem;color:var(--text2);line-height:1.5;">${ins.slice(1)}</div>
    </div>
  `).join('');

  const hCls = (f, max) => f >= max * 0.8 ? 'h5' : f >= max * 0.6 ? 'h4' : f >= max * 0.4 ? 'h3' : f >= max * 0.2 ? 'h2' : 'h1';
  const maxFreq = Math.max(...d.topics.map(t => t.frequency), 1);
  document.getElementById('heatmapGrid').innerHTML = d.topics.slice(0, 20).map(t => `
    <div class="heat-cell ${hCls(t.frequency, maxFreq)}" title="${t.name}: ${t.frequency} times">
      <div class="heat-topic">${t.name.slice(0, 12)}</div>
      <div class="heat-val">${t.frequency}×</div>
    </div>
  `).join('');

  drawAllCharts();
}

// ══════════════════════════════════════
//  CHARTS
// ══════════════════════════════════════
function drawAllCharts() {
  if (!analysisData) return;
  drawDonut('donutCanvas', 'donutLegend', analysisData.questionTypes.map(q => ({ label: q.type, value: q.count })));
  drawTrendLine();
}

function drawDonut(canvasId, legendId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 - 10, r = Math.min(cx, cy) - 20, ir = r * 0.55;
  const COLS = ['#2d6a4f', '#b8860b', '#1a5fa8', '#c0392b', '#6b3fa0', '#5dba8a', '#d4a017'];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath(); ctx.fillStyle = COLS[i % COLS.length]; ctx.fill();
    angle += slice;
  });
  ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff';
  ctx.fill();
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#000';
  ctx.font = 'bold 13px Syne,sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);

  if (legendId) document.getElementById(legendId).innerHTML = data.map((d, i) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:0.75rem;">
      <div style="width:10px;height:10px;border-radius:2px;background:${COLS[i % COLS.length]};flex-shrink:0;"></div>
      <span style="color:var(--text2)">${d.label}</span>
      <span style="margin-left:auto;font-family:var(--font-mono);font-size:0.68rem;color:var(--muted);">${Math.round(d.value / total * 100)}%</span>
    </div>
  `).join('');
}

function drawTrendLine() {
  const canvas = document.getElementById('trendCanvas');
  if (!canvas || !analysisData?.yearTrends?.length) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const data = analysisData.yearTrends.sort((a, b) => a.year - b.year);
  if (!data.length) return;
  const counts = data.map(d => d.count);
  const minC = Math.min(...counts), maxC = Math.max(...counts, minC + 1);
  const pad = { t: 20, b: 30, l: 35, r: 20 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const xs = data.map((_, i) => pad.l + (i / (Math.max(data.length - 1, 1))) * pw);
  const ys = data.map(d => pad.t + (1 - (d.count - minC) / (maxC - minC)) * ph);

  ctx.strokeStyle = 'rgba(128,128,128,0.1)'; ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(f => {
    const y = pad.t + f * ph; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
  });

  ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
  xs.forEach((_, i) => ctx.lineTo(xs[i], ys[i]));
  ctx.lineTo(xs[xs.length - 1], pad.t + ph); ctx.lineTo(xs[0], pad.t + ph); ctx.closePath();
  ctx.fillStyle = 'rgba(45,106,79,0.1)'; ctx.fill();

  ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
  xs.forEach((_, i) => ctx.lineTo(xs[i], ys[i]));
  ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 2.5; ctx.stroke();

  data.forEach((d, i) => {
    ctx.beginPath(); ctx.arc(xs[i], ys[i], 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2d6a4f'; ctx.fill();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#888';
    ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText(d.year, xs[i], pad.t + ph + 16);
    ctx.fillText(d.count, xs[i], ys[i] - 8);
  });
}

function drawCoverageDonut() {
  if (!analysisData) return;
  const sm = analysisData.syllabusMapping || [];
  const cov = sm.filter(t => t.covered === 'covered').length;
  const part = sm.filter(t => t.covered === 'partial').length;
  const miss = sm.filter(t => t.covered === 'missing').length;
  drawDonut('coverageDonut', 'coverageLegend', [
    { label: 'Covered', value: cov }, { label: 'Partial', value: part }, { label: 'Missing', value: miss }
  ]);
}

// ══════════════════════════════════════
//  TOPIC TABLE
// ══════════════════════════════════════
function renderTopicTable() {
  if (!analysisData) return;
  const d = analysisData;
  document.getElementById('highCount').textContent = d.topics.filter(t => t.priority === 'high').length;
  document.getElementById('medCount').textContent = d.topics.filter(t => t.priority === 'medium').length;
  document.getElementById('lowCount').textContent = d.topics.filter(t => t.priority === 'low').length;
  renderTopicRows(d.topics);
}

function renderTopicRows(topics) {
  const priCls = { high: 'pill-red', medium: 'pill-gold', low: 'pill-blue' };
  const difCls = { Easy: 'pill-green', Medium: 'pill-gold', Hard: 'pill-red' };
  document.getElementById('topicTableBody').innerHTML = topics.map((t, i) => `
    <tr>
      <td><span class="rank-badge ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : 'rn'}">${i + 1}</span></td>
      <td><strong>${t.name}</strong></td>
      <td>${t.frequency}×</td>
      <td>${(t.years || []).map(y => `<span class="year-chip">${y}</span>`).join(' ')}</td>
      <td><span class="pill ${difCls[t.difficulty] || 'pill-muted'}">${t.difficulty || '—'}</span></td>
      <td><span class="pill ${priCls[t.priority] || 'pill-muted'}">${t.priority}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="prog-mini"><div class="prog-mini-fill" style="width:${t.score || 50}%;"></div></div>
          <span style="font-size:0.75rem;font-family:var(--font-mono);">${t.score || 50}</span>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterTopics() {
  if (!analysisData) return;
  const q = document.getElementById('topicSearch').value.toLowerCase();
  renderTopicRows(q ? analysisData.topics.filter(t => t.name.toLowerCase().includes(q)) : analysisData.topics);
}

// ══════════════════════════════════════
//  SYLLABUS MAP
// ══════════════════════════════════════
function renderSyllabusMap() {
  if (!analysisData) return;
  const sm = analysisData.syllabusMapping || [];
  document.getElementById('covCount').textContent = sm.filter(t => t.covered === 'covered').length;
  document.getElementById('partCount').textContent = sm.filter(t => t.covered === 'partial').length;
  document.getElementById('gapCount').textContent = sm.filter(t => t.covered === 'missing').length;

  document.getElementById('gapsList').innerHTML = sm.filter(t => t.covered === 'missing').slice(0, 8).map(t => `
    <div class="cov-item"><div class="cov-dot cov-missing"></div><div class="cov-label">${t.topic}</div><span class="pill pill-red">Gap</span></div>
  `).join('') || '<div style="color:var(--muted);font-size:0.82rem;padding:10px 0;">No gaps found — great coverage!</div>';

  document.getElementById('syllabusMapList').innerHTML = sm.map(t => `
    <div class="cov-item">
      <div class="cov-dot ${t.covered === 'covered' ? 'cov-covered' : t.covered === 'partial' ? 'cov-partial' : 'cov-missing'}"></div>
      <div class="cov-label">${t.topic} ${t.note ? `<span style="font-size:0.72rem;color:var(--muted);">— ${t.note}</span>` : ''}</div>
      <div class="prog-mini"><div class="prog-mini-fill" style="width:${t.pct || 0}%;background:${t.covered === 'covered' ? 'var(--green)' : t.covered === 'partial' ? 'var(--gold)' : 'var(--red)'};"></div></div>
      <div class="cov-pct">${t.pct || 0}%</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════
//  PREDICTIONS
// ══════════════════════════════════════
function renderPredictions() {
  if (!analysisData) return;
  const tiercls = { high: 'prob-high', medium: 'prob-med', low: 'prob-low' };
  document.getElementById('predictionsList').innerHTML = (analysisData.predictions || []).slice(0, 10).map(p => `
    <div class="pred-card">
      <div class="pred-prob ${tiercls[p.tier] || 'prob-med'}">${p.probability}%</div>
      <div class="pred-info">
        <div class="pred-topic">${p.topic}</div>
        <div class="pred-reason">${p.reason}</div>
      </div>
      <span class="pill ${p.tier === 'high' ? 'pill-red' : p.tier === 'medium' ? 'pill-gold' : 'pill-blue'}">${p.tier}</span>
    </div>
  `).join('');

  const low = (analysisData.topics || []).filter(t => t.priority === 'low');
  document.getElementById('lowYieldList').innerHTML = low.map(t => `<span class="pill pill-muted">${t.name}</span>`).join('');
}

// ══════════════════════════════════════
//  PLANNER
// ══════════════════════════════════════
function buildPlanner() {
  if (!analysisData) return;
  const d = analysisData;
  const weeks = parseInt(document.getElementById('weekCount').value) || 4;
  const high = d.topics.filter(t => t.priority === 'high');
  const med = d.topics.filter(t => t.priority === 'medium');
  const low = d.topics.filter(t => t.priority === 'low');
  document.getElementById('hp1').textContent = high.length;
  document.getElementById('hp2').textContent = med.length;
  document.getElementById('hp3').textContent = weeks * 7;
  document.getElementById('schedLabel').textContent = `${weeks}-week study plan for ${d.subject}`;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekGrid = document.getElementById('weekPlanGrid');
  weekGrid.innerHTML = days.map((day, di) => {
    const allTopics = [...high, ...med, ...low];
    const t = allTopics[di % allTopics.length] || allTopics[0];
    return `<div>
      <div class="day-hdr">${day}</div>
      <div class="day-slot ${di === 0 ? 'active' : ''}">
        <span class="slot-pri ${t.priority === 'high' ? 'sp-high' : t.priority === 'medium' ? 'sp-med' : 'sp-low'}">${t.priority.toUpperCase()}</span>
        <div class="slot-topic">${t.name.slice(0, 18)}</div>
        <div class="slot-time">${t.priority === 'high' ? 3 : 2}hr Study + 1hr Practice</div>
      </div>
    </div>`;
  }).join('');

  const sched = document.getElementById('fullSchedule');
  const allOrdered = [...high, ...med, ...low];
  let html = '';
  for (let w = 1; w <= weeks; w++) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-family:var(--font-head);font-weight:700;font-size:0.85rem;color:var(--green);padding:6px 0;margin-bottom:4px;border-bottom:1px solid var(--border);">Week ${w} — ${w === 1 ? 'High Priority Focus' : w === 2 ? 'Core Topics' : w === 3 ? 'Consolidation' : 'Full Revision & Practice'}</div>`;
    for (let di = 0; di < 7; di++) {
      const idx = (w - 1) * 7 + di;
      const t = allOrdered[idx % allOrdered.length];
      html += `<div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
        <div style="width:32px;font-size:0.7rem;color:var(--muted);font-family:var(--font-mono);">${days[di]}</div>
        <span class="slot-pri ${t.priority === 'high' ? 'sp-high' : t.priority === 'medium' ? 'sp-med' : 'sp-low'}" style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:0.6rem;font-family:var(--font-mono);">${t.priority}</span>
        <div style="flex:1;font-size:0.82rem;">${t.name}</div>
        <div style="font-size:0.7rem;color:var(--muted);font-family:var(--font-mono);">${t.priority === 'high' ? '3hrs' : t.priority === 'medium' ? '2hrs' : '1hr'}</div>
      </div>`;
    }
    html += '</div>';
  }
  sched.innerHTML = html;
}

// ══════════════════════════════════════
//  PRACTICE QUESTIONS
// ══════════════════════════════════════
function generateMoreQuestions() {
  if (!analysisData) { showToast('⚠️ Analyze papers first'); return; }
  const panel = document.getElementById('genMorePanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function runGenerateQuestions() {
  if (!analysisData) { showToast('⚠️ Analyze papers first'); return; }
  const topic = document.getElementById('genTopic').value.trim();
  const type = document.getElementById('genType').value;
  const diff = document.getElementById('genDiff').value;
  const count = parseInt(document.getElementById('genCount').value) || 10;
  const btn = document.getElementById('runGenBtn');
  const status = document.getElementById('genStatus');

  btn.disabled = true;
  btn.textContent = '⏳ Generating…';
  status.style.display = 'block';
  status.style.color = '';
  status.textContent = `Generating ${count} questions from your papers…`;

  const topTopics = analysisData.topics.slice(0, 5).map(t => t.name).join(', ');
  const targetTopic = (topic || topTopics).slice(0, 200);
  const qType = type === 'mixed' ? 'Short,Long,MCQ' : type;
  const qDiff = diff === 'mixed' ? 'Easy,Medium,Hard' : diff;

  // Include paper context for more relevant questions
  const paperContext = storedPaperTexts.length > 0
    ? '\nActual paper content:\n' + storedPaperTexts.map(p => `[${p.year}] ${p.text.slice(0, 300)}`).join('\n').slice(0, 1500)
    : '';

  const batchSize = 5;
  const batches = Math.ceil(count / batchSize);
  let allQs = [];

  for (let b = 0; b < batches; b++) {
    const batchCount = Math.min(batchSize, count - allQs.length);
    if (batchCount <= 0) break;

    const genPrompt = `Write ${batchCount} exam questions based on these actual exam papers.
Subject:"${analysisData.subject}" Topics:${targetTopic} Type:${qType} Difficulty:${qDiff}${paperContext}
Return ONLY a JSON array, no markdown:
[{"topic":"actual topic","question":"realistic exam question","type":"Short","difficulty":"Medium","marks":5,"priority":"high","hint":"specific hint"}]
Make questions similar in style to the actual papers. For MCQ add options inside question text.`;

    try {
      if (b > 0) await delay(1500);
      let raw = await callGroq([
        { role: 'system', content: 'Return ONLY a valid JSON array. No markdown. Base questions on the actual paper content provided.' },
        { role: 'user', content: genPrompt }
      ], 1200);

      if (raw && raw.includes('[')) {
        const cleaned = cleanJSON(raw, '[', ']');
        const qs = JSON.parse(cleaned);
        if (Array.isArray(qs)) allQs = [...allQs, ...qs];
      }
      status.textContent = `Generated ${allQs.length} of ${count} questions…`;
    } catch (e) {
      console.warn('Batch', b, 'failed:', e.message);
      if (b === 0) {
        status.textContent = `❌ Error: ${e.message}`;
        status.style.color = 'var(--red)';
        btn.disabled = false;
        btn.textContent = '🚀 Generate';
        return;
      }
      break;
    }
  }

  if (allQs.length > 0) {
    analysisData.practiceQs = [...(analysisData.practiceQs || []), ...allQs];
    renderQuestions();
    status.textContent = `✅ Added ${allQs.length} new questions!`;
    status.style.color = 'var(--green)';
    showToast(`✅ ${allQs.length} new questions generated from your papers!`);
  } else {
    status.textContent = `❌ No questions generated — try again`;
    status.style.color = 'var(--red)';
  }

  btn.disabled = false;
  btn.textContent = '🚀 Generate';
}

function filterQ(f, btn) {
  qFilterVal = f;
  document.querySelectorAll('#qFilter .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderQuestions();
}

function renderQuestions() {
  if (!analysisData) {
    document.getElementById('questionBank').innerHTML = '<div class="empty"><div class="empty-icon">✏️</div><p>Analyze papers first to generate practice questions</p></div>';
    return;
  }
  const qs = qFilterVal === 'all' ? analysisData.practiceQs : analysisData.practiceQs.filter(q => q.priority === qFilterVal);
  const priCls = { high: 'pill-red', medium: 'pill-gold', low: 'pill-blue' };
  const difCls = { Hard: 'pill-red', Medium: 'pill-gold', Easy: 'pill-green' };
  document.getElementById('questionBank').innerHTML = qs.map((q, i) => `
    <div class="q-card">
      <div class="q-meta">
        <span class="pill ${priCls[q.priority] || 'pill-muted'}">${q.priority} priority</span>
        <span class="pill pill-blue">${q.type}</span>
        <span class="pill ${difCls[q.difficulty] || 'pill-muted'}">${q.difficulty}</span>
        <span class="pill pill-purple">${q.marks} marks</span>
        <span class="year-chip">📌 ${q.topic?.slice(0, 20) || ''}</span>
      </div>
      <div class="q-text"><strong>Q${i + 1}.</strong> ${q.question}</div>
      <div class="q-hint" id="hint-${i}">${q.hint ? '💡 <strong>Hint:</strong> ' + q.hint : ''}</div>
      <div class="q-actions">
        <button class="toggle-btn" onclick="toggleHint(${i})">💡 Show Hint</button>
        <button class="toggle-btn" onclick="askAI('${(q.topic || '').replace(/'/g, "\\'")}')">✨ Ask AI</button>
      </div>
    </div>
  `).join('') || '<div class="empty"><div class="empty-icon">✏️</div><p>No questions found for this filter</p></div>';
}

function toggleHint(i) { document.getElementById('hint-' + i).classList.toggle('show'); }
function askAI(topic) { goto('assistant'); document.getElementById('chatInput').value = `Explain how to approach ${topic} questions in exams. What are common pitfalls and answer strategies?`; sendChat(); }

// ══════════════════════════════════════
//  MOCK TEST
// ══════════════════════════════════════
let mockState = {
  questions: [],
  answers: [],
  timeLimitSecs: 1800,
  timeLeftSecs: 1800,
  timerInterval: null,
  paused: false,
  started: false,
  submitted: false,
};

function initMockTestPage() {
  // Reset to setup panel if not mid-test
  if (!mockState.started || mockState.submitted) {
    showMockPanel('setup');
  }
}

function showMockPanel(panel) {
  document.getElementById('mockSetupPanel').style.display = panel === 'setup' ? 'block' : 'none';
  document.getElementById('mockTestPanel').style.display = panel === 'test' ? 'block' : 'none';
  document.getElementById('mockResultsPanel').style.display = panel === 'results' ? 'block' : 'none';
}

async function startMockTest() {
  if (!analysisData) { showToast('⚠️ Analyze papers first to generate a mock test'); goto('upload'); return; }

  const qCount = parseInt(document.getElementById('mockQCount').value) || 10;
  const qType = document.getElementById('mockQType').value;
  const diff = document.getElementById('mockDiff').value;
  const timeMins = parseInt(document.getElementById('mockTime').value) || 30;

  const btn = document.getElementById('startMockBtn');
  const status = document.getElementById('mockGenStatus');
  btn.disabled = true;
  btn.textContent = '⏳ Generating paper…';
  status.style.display = 'block';
  status.style.color = '';
  status.textContent = 'AI is generating your mock test paper — please wait…';

  // Keep paper context small to avoid token overflow
  const topTopics = (analysisData.topics || []).slice(0, 6).map(t => t.name).join(', ') || analysisData.subject;
  const paperCtx = storedPaperTexts.length > 0
    ? '\nSample from actual papers:\n' + storedPaperTexts.slice(0, 2).map(p => `[${p.year}] ${(p.text || '').slice(0, 200)}`).join('\n')
    : '';

  const typeInstruction = qType === 'mixed'
    ? 'Mix question types: include MCQ, Short Answer, and Long Answer.'
    : `All questions must be type: ${qType}.`;
  const diffInstruction = diff === 'mixed' ? 'Mix Easy, Medium, Hard.' : `All questions: ${diff} difficulty.`;

  // Build one batch prompt per 5 questions to stay within token limits
  const BATCH = 5;
  const batches = Math.ceil(qCount / BATCH);
  let allQuestions = [];

  const sysMsg = 'Return ONLY a valid JSON array. No markdown. No backticks. No explanation before or after the JSON array.';

  for (let b = 0; b < batches; b++) {
    const batchCount = Math.min(BATCH, qCount - allQuestions.length);
    if (batchCount <= 0) break;

    const startIdx = allQuestions.length + 1;
    status.textContent = `Generating questions ${startIdx}–${startIdx + batchCount - 1} of ${qCount}…`;

    const prompt = `Generate ${batchCount} exam questions (questions ${startIdx} to ${startIdx + batchCount - 1}) for:
Subject: "${analysisData.subject}" | Level: ${analysisData.level || 'University'}
Topics: ${topTopics}
${typeInstruction} ${diffInstruction}${paperCtx}

Return ONLY a JSON array (no markdown, no backticks):
[{"q":${startIdx},"topic":"topic","question":"Full question. For MCQ write: Question text\\nA) opt1\\nB) opt2\\nC) opt3\\nD) opt4","type":"MCQ or Short or Long","marks":2,"difficulty":"Easy or Medium or Hard","modelAnswer":"Correct answer with brief explanation","hint":"One-line study hint"}]
Marks: MCQ=2, Short=5, Long=10. Make questions exam-realistic.`;

    try {
      if (b > 0) await delay(1200);
      let raw = await callGroq([
        { role: 'system', content: sysMsg },
        { role: 'user', content: prompt }
      ], 3000);  // higher token limit

      if (!raw) throw new Error('Empty response from AI');

      // Try to extract JSON array robustly
      let parsed = null;
      try {
        const cleaned = cleanJSON(raw, '[', ']');
        parsed = JSON.parse(cleaned);
      } catch (_) {
        // fallback: try parsing raw directly if it looks like JSON
        const trimmed = raw.trim();
        if (trimmed.startsWith('[')) {
          try { parsed = JSON.parse(trimmed); } catch (_2) {}
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        allQuestions = [...allQuestions, ...parsed];
      } else {
        console.warn('Batch', b, 'returned no valid questions. Raw:', raw.slice(0, 200));
        if (b === 0) throw new Error('AI returned invalid format. Please try again.');
        // partial batch failure — continue with what we have
      }
    } catch (e) {
      if (b === 0) {
        // First batch failed — show error and stop
        status.textContent = `❌ ${e.message}`;
        status.style.color = 'var(--red)';
        showToast('❌ Failed to generate test — check your API key or try again');
        btn.disabled = false;
        btn.textContent = '🎯 Generate & Start Mock Test';
        return;
      }
      break; // partial success — use what we have
    }
  }

  // Final fallback: use existing practiceQs if API keeps failing
  if (allQuestions.length === 0 && analysisData.practiceQs && analysisData.practiceQs.length > 0) {
    status.textContent = '⚠️ Using practice questions as fallback…';
    allQuestions = analysisData.practiceQs.slice(0, qCount).map((q, i) => ({
      q: i + 1, topic: q.topic, question: q.question, type: q.type,
      marks: q.marks || 5, difficulty: q.difficulty,
      modelAnswer: q.hint || 'Refer to your study material.',
      hint: q.hint || '',
    }));
  }

  if (allQuestions.length === 0) {
    status.textContent = '❌ Could not generate questions. Please ensure papers are analyzed and try again.';
    status.style.color = 'var(--red)';
    btn.disabled = false;
    btn.textContent = '🎯 Generate & Start Mock Test';
    return;
  }

  // Normalise question numbers
  allQuestions = allQuestions.map((q, i) => ({ ...q, q: i + 1 }));

  mockState = {
    questions: allQuestions,
    answers: new Array(allQuestions.length).fill(''),
    timeLimitSecs: timeMins * 60,
    timeLeftSecs: timeMins * 60,
    timerInterval: null,
    paused: false,
    started: true,
    submitted: false,
  };

  renderMockTest();
  showMockPanel('test');
  startMockTimer();
  showToast(`✅ ${allQuestions.length}-question mock test ready — Timer started!`);

  btn.disabled = false;
  btn.textContent = '🎯 Generate & Start Mock Test';
}

function renderMockTest() {
  const { questions } = mockState;
  const totalMarks = questions.reduce((s, q) => s + (q.marks || 5), 0);

  document.getElementById('mockSubjectLabel').textContent = analysisData.subject;
  document.getElementById('mockMetaLabel').textContent =
    `${questions.length} questions · ${totalMarks} marks · ${Math.round(mockState.timeLimitSecs / 60)} minutes`;

  const priColors = { Easy: 'pill-green', Medium: 'pill-gold', Hard: 'pill-red' };

  document.getElementById('mockQuestionsContainer').innerHTML = questions.map((q, i) => `
    <div class="q-card mock-q-card" id="mockQ-${i}">
      <div class="q-meta" style="margin-bottom:10px;">
        <span class="pill pill-muted">Q${i + 1}</span>
        <span class="pill ${priColors[q.difficulty] || 'pill-muted'}">${q.difficulty}</span>
        <span class="pill pill-blue">${q.type}</span>
        <span class="pill pill-purple">${q.marks} marks</span>
        <span class="year-chip">📌 ${(q.topic || '').slice(0, 22)}</span>
      </div>
      <div class="q-text" style="margin-bottom:12px;"><strong>Q${i + 1}.</strong> ${q.question}</div>
      <div>
        <label style="font-size:0.72rem;font-family:var(--font-mono);color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px;">Your Answer</label>
        ${q.type === 'MCQ'
          ? `<div class="mock-mcq-opts" id="mcqOpts-${i}">
              ${['A','B','C','D'].map(opt => `
                <label class="mock-mcq-label">
                  <input type="radio" name="mcq-${i}" value="${opt}" onchange="recordAnswer(${i}, '${opt}')"/>
                  <span>${opt}</span>
                </label>`).join('')}
             </div>`
          : `<textarea class="mock-answer-box" id="ans-${i}" rows="${q.type === 'Long' ? 6 : 3}"
               placeholder="${q.type === 'Short' ? 'Write a concise answer (2-5 sentences)…' : 'Write a detailed answer…'}"
               oninput="recordAnswer(${i}, this.value); updateMockProgress()"></textarea>`
        }
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
        <button class="toggle-btn" onclick="toggleMockHint(${i})" style="font-size:0.72rem;">💡 Hint</button>
        <div class="mock-answered-badge" id="mockBadge-${i}" style="display:none;">✓ Answered</div>
      </div>
      <div class="q-hint" id="mockHint-${i}">${q.hint ? '💡 <strong>Hint:</strong> ' + q.hint : 'No hint available.'}</div>
    </div>
  `).join('');

  updateMockProgress();
}

function recordAnswer(i, val) {
  mockState.answers[i] = val;
  const badge = document.getElementById('mockBadge-' + i);
  if (badge) badge.style.display = val.trim() ? 'inline-flex' : 'none';
  updateMockProgress();
}

function toggleMockHint(i) {
  document.getElementById('mockHint-' + i).classList.toggle('show');
}

function updateMockProgress() {
  const answered = mockState.answers.filter(a => a && a.toString().trim()).length;
  const total = mockState.questions.length;
  const pct = total > 0 ? (answered / total) * 100 : 0;
  const bar = document.getElementById('mockProgressBar');
  if (bar) bar.style.width = pct + '%';
}

function startMockTimer() {
  clearInterval(mockState.timerInterval);
  mockState.timerInterval = setInterval(() => {
    if (mockState.paused) return;
    mockState.timeLeftSecs--;
    updateTimerDisplay();
    if (mockState.timeLeftSecs <= 0) {
      clearInterval(mockState.timerInterval);
      showToast('⏰ Time is up! Submitting automatically…');
      submitMockTest();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const s = mockState.timeLeftSecs;
  const mins = Math.floor(s / 60).toString().padStart(2, '0');
  const secs = (s % 60).toString().padStart(2, '0');
  const display = document.getElementById('mockTimerDisplay');
  if (!display) return;
  display.textContent = `${mins}:${secs}`;
  // Color coding
  if (s <= 120) display.style.color = 'var(--red)';
  else if (s <= 300) display.style.color = 'var(--gold)';
  else display.style.color = 'var(--green)';
}

function toggleMockPause() {
  mockState.paused = !mockState.paused;
  document.getElementById('mockPauseBtn').textContent = mockState.paused ? '▶ Resume' : '⏸ Pause';
  showToast(mockState.paused ? '⏸ Test paused' : '▶ Test resumed');
}

function cancelMockTest() {
  if (!confirm('Cancel this mock test? All answers will be lost.')) return;
  clearInterval(mockState.timerInterval);
  mockState = { questions: [], answers: [], timeLimitSecs: 1800, timeLeftSecs: 1800, timerInterval: null, paused: false, started: false, submitted: false };
  showMockPanel('setup');
}

async function submitMockTest() {
  clearInterval(mockState.timerInterval);
  mockState.submitted = true;
  showMockPanel('results');

  const { questions, answers, timeLimitSecs, timeLeftSecs } = mockState;
  const timeTakenSecs = timeLimitSecs - timeLeftSecs;
  const timeTakenMins = Math.floor(timeTakenSecs / 60);
  const answeredCount = answers.filter(a => a && a.toString().trim()).length;
  const totalMarks = questions.reduce((s, q) => s + (q.marks || 5), 0);

  document.getElementById('mockResultSubtitle').textContent =
    `${answeredCount}/${questions.length} ANSWERED · ${timeTakenMins} MIN TAKEN`;

  // Show preliminary score cards (before AI eval)
  document.getElementById('mockScoreCards').innerHTML = `
    <div class="stat-card sc-green"><div class="stat-label">Questions Answered</div><div class="stat-value">${answeredCount}/${questions.length}</div><div class="stat-change">↑ Attempted</div></div>
    <div class="stat-card sc-gold"><div class="stat-label">Time Taken</div><div class="stat-value">${timeTakenMins}m</div><div class="stat-change">Of ${Math.round(timeLimitSecs/60)} min limit</div></div>
    <div class="stat-card sc-blue"><div class="stat-label">Total Marks</div><div class="stat-value" id="mockFinalScore">—</div><div class="stat-change">AI evaluating…</div></div>
    <div class="stat-card" style="--sc-color:var(--purple)"><div class="stat-label">Percentage</div><div class="stat-value" id="mockFinalPct">—</div><div class="stat-change">Out of ${totalMarks}</div></div>
  `;

  document.getElementById('mockEvalLoading').style.display = 'block';
  document.getElementById('mockDetailedResults').style.display = 'none';

  // Send to AI for evaluation
  // Build compact eval prompt — avoid JSON.stringify bloat
  const evalLines = questions.map((q, i) => {
    const ans = (answers[i] || '[No answer]').slice(0, 300); // cap long answers
    return `Q${i+1} [${q.type}, ${q.marks}marks, topic:${q.topic}]: ${q.question.slice(0,120)}\nModel: ${(q.modelAnswer||'').slice(0,120)}\nStudent: ${ans}`;
  }).join('\n---\n');

  const evalPrompt = `You are an examiner for "${analysisData.subject}". Evaluate the student answers below fairly.

${evalLines}

Return ONLY a JSON array (no markdown):
[{"q":1,"marksAwarded":2,"feedback":"brief feedback","modelAnswer":"correct answer"}]
Give marksAwarded out of each question's marks. Be accurate and constructive.`;

  try {
    let raw = await callGroq([
      { role: 'system', content: 'Return ONLY valid JSON array. No markdown. No backticks.' },
      { role: 'user', content: evalPrompt }
    ], 3000);

    let evalResults = null;
    try {
      const cleaned = cleanJSON(raw, '[', ']');
      evalResults = JSON.parse(cleaned);
    } catch (_) {
      const trimmed = (raw || '').trim();
      if (trimmed.startsWith('[')) try { evalResults = JSON.parse(trimmed); } catch (_2) {}
    }

    if (!Array.isArray(evalResults)) throw new Error('Invalid eval response');

    const scored = questions.map((q, i) => {
      const ev = evalResults.find(e => e.q === i + 1) || {};
      return { ...q, studentAnswer: answers[i] || '[No answer]', marksAwarded: ev.marksAwarded || 0, feedback: ev.feedback || 'No feedback.', modelAnswer: ev.modelAnswer || q.modelAnswer || '' };
    });

    const totalEarned = scored.reduce((s, q) => s + (q.marksAwarded || 0), 0);
    const pct = totalMarks > 0 ? Math.round((totalEarned / totalMarks) * 100) : 0;

    document.getElementById('mockFinalScore').textContent = `${totalEarned}/${totalMarks}`;
    document.getElementById('mockFinalPct').textContent = `${pct}%`;

    // Grade
    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
    const gradeColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--red)';
    const gradeMsg = pct >= 80 ? '🎉 Excellent work!' : pct >= 60 ? '👍 Good effort!' : pct >= 40 ? '📚 Keep practicing!' : '💪 More study needed!';

    const difColors = { Easy: 'pill-green', Medium: 'pill-gold', Hard: 'pill-red' };

    document.getElementById('mockEvalLoading').style.display = 'none';
    document.getElementById('mockDetailedResults').style.display = 'block';
    document.getElementById('mockDetailedResults').innerHTML = `
      <div class="card" style="margin-bottom:16px;text-align:center;padding:20px;background:linear-gradient(135deg,var(--green-light),var(--bg2));">
        <div style="font-size:3rem;font-weight:900;font-family:var(--font-head);color:${gradeColor};">${grade}</div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:4px;">${gradeMsg}</div>
        <div style="font-size:0.82rem;color:var(--muted);">You scored <strong style="color:${gradeColor}">${totalEarned} out of ${totalMarks}</strong> (${pct}%)</div>
      </div>

      <div style="font-size:0.72rem;font-weight:700;color:var(--muted);font-family:var(--font-mono);letter-spacing:1px;margin-bottom:12px;">QUESTION-BY-QUESTION REVIEW</div>

      ${scored.map((q, i) => {
        const earned = q.marksAwarded || 0;
        const max = q.marks || 5;
        const pctQ = max > 0 ? Math.round((earned / max) * 100) : 0;
        const barColor = pctQ >= 80 ? 'var(--green)' : pctQ >= 50 ? 'var(--gold)' : 'var(--red)';
        return `
        <div class="q-card" style="margin-bottom:12px;">
          <div class="q-meta">
            <span class="pill pill-muted">Q${i + 1}</span>
            <span class="pill ${difColors[q.difficulty] || 'pill-muted'}">${q.difficulty}</span>
            <span class="pill pill-blue">${q.type}</span>
            <span class="year-chip">📌 ${(q.topic || '').slice(0, 22)}</span>
            <span class="pill" style="background:${barColor}22;color:${barColor};border:1px solid ${barColor}44;">${earned}/${max} marks</span>
          </div>
          <div class="q-text" style="margin-bottom:10px;"><strong>Q${i + 1}.</strong> ${q.question}</div>
          <div style="margin-bottom:8px;">
            <div style="font-size:0.68rem;font-family:var(--font-mono);color:var(--muted);margin-bottom:4px;">YOUR ANSWER</div>
            <div style="background:var(--bg3);border-radius:6px;padding:10px 12px;font-size:0.82rem;color:var(--text2);line-height:1.5;white-space:pre-wrap;border-left:3px solid ${q.studentAnswer && q.studentAnswer !== '[No answer]' ? 'var(--blue)' : 'var(--red)'};">${q.studentAnswer || '<em style="color:var(--muted)">No answer provided</em>'}</div>
          </div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:10px;overflow:hidden;">
            <div style="height:100%;width:${pctQ}%;background:${barColor};border-radius:2px;transition:width 0.6s;"></div>
          </div>
          <div style="margin-bottom:8px;">
            <div style="font-size:0.68rem;font-family:var(--font-mono);color:var(--muted);margin-bottom:4px;">MODEL ANSWER</div>
            <div style="background:var(--green-light);border-radius:6px;padding:10px 12px;font-size:0.82rem;color:var(--text2);line-height:1.5;white-space:pre-wrap;border-left:3px solid var(--green);">${q.modelAnswer || 'See hint for guidance.'}</div>
          </div>
          <div style="background:var(--gold-light,#fffbeb);border:1px solid var(--gold-border,#f59e0b44);border-radius:6px;padding:9px 12px;font-size:0.78rem;color:var(--text2);line-height:1.5;">
            💬 <strong>Feedback:</strong> ${q.feedback}
          </div>
        </div>`;
      }).join('')}

      <div style="text-align:center;margin-top:20px;">
        <button class="analyze-btn" onclick="retakeMockTest()" style="max-width:260px;margin:0 auto;">🔄 Take Another Test</button>
      </div>
    `;

    showToast(`✅ Evaluation complete! You scored ${totalEarned}/${totalMarks} (${pct}%)`);

  } catch (e) {
    document.getElementById('mockEvalLoading').innerHTML = `<div style="color:var(--red);padding:20px;">❌ Evaluation failed: ${e.message}. <button class="toggle-btn" onclick="retakeMockTest()">Try Again</button></div>`;
  }
}

function retakeMockTest() {
  clearInterval(mockState.timerInterval);
  mockState = { questions: [], answers: [], timeLimitSecs: 1800, timeLeftSecs: 1800, timerInterval: null, paused: false, started: false, submitted: false };
  document.getElementById('mockGenStatus').style.display = 'none';
  document.getElementById('startMockBtn').textContent = '🎯 Generate & Start Mock Test';
  document.getElementById('startMockBtn').disabled = false;
  showMockPanel('setup');
}

// ══════════════════════════════════════
//  REPORT GENERATOR
// ══════════════════════════════════════
function renderReport() {
  if (!analysisData) return;
  const d = analysisData;
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  // Show a sample of extracted text in the report
  const extractedPreview = storedPaperTexts.length > 0
    ? storedPaperTexts.map(p => `<tr><td>${p.year}</td><td>${p.name}</td><td style="font-size:0.72rem;color:var(--muted);max-width:300px;word-break:break-word;">${(p.text || '').slice(0, 120)}…</td></tr>`).join('')
    : '<tr><td colspan="3" style="color:var(--muted);">No extracted text available</td></tr>';

  document.getElementById('reportContent').innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div style="font-size:0.7rem;color:var(--green);font-family:var(--font-mono);font-weight:600;letter-spacing:1.5px;margin-bottom:6px;">📄 ANALYSIS REPORT</div>
      <h2 style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;margin-bottom:4px;">${d.subject} — Past Paper Analysis</h2>
      <div style="font-size:0.78rem;color:var(--muted);">${d.uploadedCount} papers · ${d.level} · Generated ${today}</div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">📊 Analysis Summary</div>
      <table class="report-table">
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Papers Analyzed</td><td>${d.uploadedCount}</td></tr>
          <tr><td>Unique Topics Found</td><td>${d.topics.length}</td></tr>
          <tr><td>Total Questions</td><td>${d.totalQuestions}</td></tr>
          <tr><td>Syllabus Coverage</td><td>${d.covPct}%</td></tr>
          <tr><td>High Priority Topics</td><td>${d.topics.filter(t => t.priority === 'high').length}</td></tr>
          <tr><td>Coverage Gaps</td><td>${(d.syllabusMapping || []).filter(t => t.covered === 'missing').length}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">📄 Extracted Paper Content (Preview)</div>
      <table class="report-table">
        <thead><tr><th>Year</th><th>File</th><th>Extracted Text Sample</th></tr></thead>
        <tbody>${extractedPreview}</tbody>
      </table>
      <div style="font-size:0.72rem;color:var(--muted);margin-top:8px;">This shows what AI actually read from your files. All tabs (Topics, Predictions, Practice Qs) are based on this extracted text.</div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">🔥 Top Topics Identified</div>
      <div class="bar-chart">
        ${d.topics.slice(0, 6).map((t, i) => {
    const maxF = Math.max(...d.topics.map(x => x.frequency), 1);
    return `<div class="bar-row">
            <div class="bar-label">${t.name}</div>
            <div class="bar-track"><div class="bar-fill bf-green" style="width:${Math.round(t.frequency / maxF * 100)}%">${t.frequency}×</div></div>
            <div class="bar-count">${t.frequency}</div>
          </div>`;
  }).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">💡 Key Insights</div>
      ${(d.insights || []).map(ins => `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;line-height:1.5;">${ins}</div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">📋 Report Summary</div>
      <p style="font-size:0.85rem;color:var(--text2);line-height:1.6;">${d.reportSummary || 'Analysis complete.'}</p>
      <div style="margin-top:10px;font-size:0.72rem;color:var(--muted);">Generated by PaperMentor · Powered by Groq AI · ${today}</div>
    </div>
  `;
}

function downloadReport() {
  if (!analysisData) { showToast('⚠️ Analyze papers first'); return; }
  const html = `<!DOCTYPE html><html><head><title>PaperMentor Report</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;color:#1a1f14;}h1{color:#2d6a4f;}table{width:100%;border-collapse:collapse;}th,td{padding:8px 12px;border:1px solid #e0e2d8;text-align:left;}th{background:#f5f6f0;}</style></head><body>${document.getElementById('reportContent').innerHTML}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `PaperMentor_${analysisData.subject.replace(/\s+/g, '_')}_Report.html`;
  a.click();
  showToast('✅ Report downloaded!');
}

// ══════════════════════════════════════
//  GROQ API KEY (hardcoded)
// ══════════════════════════════════════
const GROQ_API_KEY = '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';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // use full 70b for better paper understanding
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// ══════════════════════════════════════
//  JSON CLEANER
// ══════════════════════════════════════
function cleanJSON(raw, openChar = '{', closeChar = '}') {
  if (!raw) throw new Error('Empty response from AI');

  let s = raw.replace(/```[\w]*\n?/gi, '').replace(/```/g, '').trim();
  s = s.replace(/^(here\s+is|here's|below\s+is|sure[,!]?|of\s+course[,!]?)[^{[\n]*/i, '').trim();

  function extractBalanced(str, open, close) {
    const start = str.indexOf(open);
    if (start === -1) return null;
    let depth = 0, inString = false, escape = false;
    for (let i = start; i < str.length; i++) {
      const ch = str[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === open) depth++;
      if (ch === close) { depth--; if (depth === 0) return str.slice(start, i + 1); }
    }
    return null;
  }

  let extracted = extractBalanced(s, openChar, closeChar);
  if (!extracted) {
    const altOpen = openChar === '{' ? '[' : '{';
    const altClose = closeChar === '}' ? ']' : '}';
    extracted = extractBalanced(s, altOpen, altClose);
  }
  if (!extracted) throw new Error('No JSON object found in AI response');

  extracted = extracted.replace(/,\s*([}\]])/g, '$1');
  extracted = extracted.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
  return extracted;
}

async function callGroq(messages, maxTokens = 4000) {
  const body = JSON.stringify({ model: GROQ_MODEL, max_tokens: maxTokens, messages });
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` };

  try {
    const res = await fetch(GROQ_ENDPOINT, { method: 'POST', headers, body });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return (await res.json()).choices?.[0]?.message?.content || '';
  } catch (e) {
    if (!/fetch|Failed|Network|CORS|Load/i.test(e.message)) throw e;
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', GROQ_ENDPOINT);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.timeout = 30000;
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText).choices?.[0]?.message?.content || ''); }
          catch { reject(new Error('parse error')); }
        } else reject(new Error(`XHR ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('XHR network error'));
      xhr.ontimeout = () => reject(new Error('XHR timeout'));
      xhr.send(body);
    });
    return result;
  } catch (e) { /* continue */ }

  showLaunchModal();
  throw new Error('FILE_PROTOCOL_BLOCKED');
}

// ══════════════════════════════════════
//  LOCAL SERVER LAUNCH HELPER MODAL
// ══════════════════════════════════════
function showLaunchModal() {
  if (document.getElementById('launchModal')) return;

  const isWin = navigator.platform.toLowerCase().includes('win');
  const filePath = location.href.replace('file:///', '').replace('file://', '');
  const dir = filePath.substring(0, filePath.lastIndexOf('/') + 1) || filePath.substring(0, filePath.lastIndexOf('\\') + 1);

  const cmds = {
    python: isWin ? `cd "${dir.replace(/\//g, '\\')}" && python -m http.server 8080` : `cd "${dir}" && python3 -m http.server 8080`,
    node: `npx serve "${dir}" -l 8080`,
    vscode: 'Install "Live Server" extension → right-click HTML → Open with Live Server'
  };

  const modal = document.createElement('div');
  modal.id = 'launchModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',sans-serif;backdrop-filter:blur(6px);`;

  modal.innerHTML = `
    <div style="background:#0f1f17;border:1px solid #2d6a4f;border-radius:16px;max-width:560px;width:100%;padding:28px 32px;box-shadow:0 24px 80px rgba(0,0,0,0.6);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#5dba8a,#2d6a4f);display:grid;place-items:center;font-size:20px;flex-shrink:0;">📚</div>
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:#fff;">One More Step!</div>
          <div style="font-size:0.72rem;color:#5dba8a;letter-spacing:2px;text-transform:uppercase;font-family:monospace;">Browser blocked API from file:// — serve locally</div>
        </div>
      </div>
      <p style="font-size:0.83rem;color:rgba(255,255,255,0.6);margin:14px 0 20px;line-height:1.6;">Your browser security prevents API calls when opening HTML directly. Run any command below — it takes <strong style="color:#fff;">5 seconds</strong> and fixes it permanently.</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        ${[
      { label: '🐍 Python (recommended)', cmd: cmds.python, id: 'cmd-python' },
      { label: '⬡ Node.js', cmd: cmds.node, id: 'cmd-node' },
      { label: '🆚 VS Code Live Server', cmd: cmds.vscode, id: 'cmd-vscode' }
    ].map(c => `
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 14px;">
            <div style="font-size:0.72rem;color:#5dba8a;font-weight:700;margin-bottom:7px;letter-spacing:0.5px;">${c.label}</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <code id="${c.id}" style="flex:1;font-size:0.75rem;color:#e0f0e8;font-family:monospace;background:rgba(0,0,0,0.3);padding:6px 10px;border-radius:6px;word-break:break-all;">${c.cmd}</code>
              <button onclick="copyCmd('${c.id}')" style="background:#2d6a4f;border:none;color:#fff;padding:6px 12px;border-radius:7px;cursor:pointer;font-size:0.72rem;font-weight:700;flex-shrink:0;white-space:nowrap;">Copy</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="background:rgba(93,186,138,0.1);border:1px solid rgba(93,186,138,0.3);border-radius:10px;padding:12px 16px;margin-bottom:20px;">
        <div style="font-size:0.75rem;font-weight:700;color:#5dba8a;margin-bottom:8px;">After running the command:</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:0.8rem;color:rgba(255,255,255,0.7);">Open this URL in your browser:</span>
          <a href="http://localhost:8080" target="_blank" style="background:#2d6a4f;color:#fff;padding:5px 14px;border-radius:7px;font-size:0.78rem;font-weight:700;text-decoration:none;white-space:nowrap;">🌐 Open localhost:8080</a>
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('launchModal').remove()" style="flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);padding:10px;border-radius:9px;cursor:pointer;font-size:0.83rem;">✕ Close</button>
        <button onclick="window.open('http://localhost:8080','_blank');document.getElementById('launchModal').remove();" style="flex:2;background:linear-gradient(135deg,#2d6a4f,#5dba8a);border:none;color:#fff;padding:10px;border-radius:9px;cursor:pointer;font-size:0.83rem;font-weight:700;">🚀 Open localhost:8080 →</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function copyCmd(id) {
  const txt = document.getElementById(id)?.textContent || '';
  navigator.clipboard.writeText(txt).then(() => showToast('📋 Command copied! Paste it in Terminal.')).catch(() => {
    prompt('Copy this command:', txt);
  });
}

// ══════════════════════════════════════
//  AI CHAT — uses storedPaperTexts for context
// ══════════════════════════════════════
function initApiKey() {
  updateApiStatus(GROQ_API_KEY);
  const inp = document.getElementById('groqApiKey');
  if (inp) { inp.value = GROQ_API_KEY; inp.disabled = true; inp.placeholder = 'API key active ✓'; }
}

function saveApiKey() { updateApiStatus(GROQ_API_KEY); }

function updateApiStatus(key) {
  const dot = document.getElementById('apiDot');
  const status = document.getElementById('apiStatus');
  if (!dot || !status) return;
  dot.style.background = '#4CAF50';
  status.textContent = 'Groq Active ✓';
}

function updateProviderUI() {}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  chatHistory.push({ role: 'user', content: msg });
  appendMsg(msg, 'user');
  const thinkId = 'thinking-' + Date.now();
  appendMsg('⏳ Thinking…', 'ai', thinkId);

  // Build full paper text for chat — this is the KEY fix: include all extracted text
  const PER_FILE_CHAT = 500;
  const chatPaperContext = storedPaperTexts.length > 0
    ? '\n\n━━━ ACTUAL CONTENT FROM UPLOADED PAPERS ━━━\n' +
    storedPaperTexts
      .map(p => `\n[${p.year}] ${p.name}:\n${p.text.slice(0, PER_FILE_CHAT)}`)
      .join('\n---\n')
      .slice(0, 3000)
    : '\n\n[No papers have been analyzed yet. Ask the user to upload and analyze papers first.]';

  const topicsStr = analysisData
    ? (analysisData.topics || []).slice(0, 8).map(t => `${t.name}(${t.frequency}x,${t.priority})`).join(', ')
    : 'none';

  const systemPrompt = analysisData
    ? `You are an expert AI study assistant. You have READ the student's actual uploaded exam papers and analyzed them.

Subject: ${analysisData.subject} | Level: ${analysisData.level} | Domain: ${analysisData.domainType || 'General'}
Papers analyzed: ${analysisData.uploadedCount} | Syllabus coverage: ${analysisData.covPct}%
Top Topics (from papers): ${topicsStr}
High Priority: ${(analysisData.topics || []).filter(t => t.priority === 'high').map(t => t.name).join(', ')}
Coverage Gaps: ${(analysisData.syllabusMapping || []).filter(t => t.covered === 'missing').map(t => t.topic).join(', ') || 'None'}
Key Insights: ${(analysisData.insights || []).join(' | ')}
${chatPaperContext}

IMPORTANT: When the user asks "what does my PDF say", "what's in my paper", or similar — READ the paper content above and give a specific, detailed answer based on what's actually there. Cite the year and filename. Be specific about actual questions/topics found.`
    : `You are a helpful AI study assistant. The user has not yet analyzed any papers.
Help with exam prep, study tips, practice questions, and explanations.
${chatPaperContext}`;

  try {
    const reply = await callGroq([
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-12)
    ], 1500);
    document.getElementById(thinkId)?.remove();
    appendMsg(reply, 'ai');
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    document.getElementById(thinkId)?.remove();
    if (e.message === 'FILE_PROTOCOL_BLOCKED') {
      const fallback = generateLocalResponse(msg);
      appendMsg('🚫 AI needs a local server to work.\n\n' + fallback + '\n\n👆 Click "🔧 Fix Now" in the top banner to set up in 30 seconds.', 'ai');
      setTimeout(() => showLaunchModal(), 200);
    } else {
      const errMsg = `❌ ${e.message}\n\n${generateLocalResponse(msg)}`;
      appendMsg(errMsg, 'ai');
      chatHistory.push({ role: 'assistant', content: errMsg });
    }
  }
}

function quickChat(msg) {
  document.getElementById('chatInput').value = msg;
  sendChat();
}

function clearChat() {
  chatHistory = [];
  document.getElementById('chatMsgs').innerHTML = '<div class="msg ai">👋 Chat cleared! Add your papers and ask me anything about them!</div>';
}

function appendMsg(text, role, id) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.style.whiteSpace = 'pre-wrap';
  el.textContent = text;
  if (id) el.id = id;
  const msgs = document.getElementById('chatMsgs');
  msgs.appendChild(el);
  msgs.scrollTop = 9999;
}

function generateLocalResponse(msg) {
  if (!analysisData) return "I'm ready to help! Try analyzing your papers first, or ask me anything about exam preparation.";
  const m = msg.toLowerCase();
  const { topics, covPct, syllabusMapping } = analysisData;
  if (m.includes('top') || m.includes('important'))
    return `Top 5 most important topics from your papers:\n1. ${topics[0]?.name} (${topics[0]?.frequency}×)\n2. ${topics[1]?.name} (${topics[1]?.frequency}×)\n3. ${topics[2]?.name} (${topics[2]?.frequency}×)\n4. ${topics[3]?.name} (${topics[3]?.frequency}×)\n5. ${topics[4]?.name} (${topics[4]?.frequency}×)\n\nFocus 60% of study time on these!`;
  if (m.includes('gap') || m.includes('miss'))
    return `Coverage: ${covPct}%. Missing topics: ${(syllabusMapping || []).filter(t => t.covered === 'missing').map(t => t.topic).join(', ') || 'None identified'}. These could be surprise questions!`;
  if (m.includes('pdf') || m.includes('paper') || m.includes('say'))
    return `Your papers contain: ${topics.slice(0, 5).map(t => t.name).join(', ')}. Upload and analyze first for the full detailed breakdown.`;
  if (m.includes('plan') || m.includes('schedule'))
    return `Study plan:\nWeek 1 → High priority: ${topics.slice(0, 3).map(t => t.name).join(', ')}\nWeek 2 → Medium priority topics\nWeek 3 → Past paper practice\nWeek 4 → Full revision + weak areas`;
  return `Based on analysis of ${analysisData.uploadedCount} papers, "${topics[0]?.name}" is most important. Syllabus coverage is ${covPct}%. Visit Topic Ranking for the full breakdown!`;
}

// ══════════════════════════════════════
//  UTILS
// ══════════════════════════════════════
function showLoading(txt, sub) {
  document.getElementById('loadingOverlay').classList.add('show');
  document.getElementById('loadingText').textContent = txt;
  document.getElementById('loadingSub').textContent = sub;
  for (let i = 1; i <= 6; i++) {
    const s = document.getElementById('ls' + i);
    if (s) { s.className = 'load-step'; s.textContent = s.textContent.replace(/^✓\s*/, ''); }
  }
  document.getElementById('ls1').classList.add('active');
}
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('show'); }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function shareApp() {
  navigator.clipboard.writeText(window.location.href).catch(() => {});
  showToast('🔗 Link copied to clipboard!');
}

function resetAll() {
  if (analysisData && !confirm('Reset all analysis data?')) return;
  analysisData = null; uploadedFiles = []; chatHistory = []; storedPaperTexts = [];
  document.getElementById('fileList').innerHTML = '';
  document.getElementById('paperCount').textContent = '0 papers';
  document.getElementById('sideStatus').textContent = 'READY — No papers loaded';
  document.getElementById('syllabusInput').value = '';
  document.getElementById('iSubject').value = '';
  document.getElementById('chatMsgs').innerHTML = '<div class="msg ai">👋 Hi! I\'m your AI assistant. Analyze your papers first, then ask me anything about them!</div>';
  document.getElementById('reportContent').innerHTML = '<div class="empty"><div class="empty-icon">📄</div><p>Analyze your papers first to generate the report</p></div>';
  goto('quickstart');
  showToast('🔄 All data reset');
}

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initApiKey();

  // Pre-load PDF.js in background
  loadPdfJs().then(ok => {
    if (ok) console.log('✅ PDF.js loaded — PDF text extraction ready');
    else console.warn('⚠️ PDF.js failed to load — PDFs will have limited extraction');
  });

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.bar-fill[data-w]').forEach(b => {
      if (b.style.width === '0%' || !b.style.width) b.style.width = b.dataset.w;
    });
  });
  observer.observe(document.getElementById('content'), { childList: true, subtree: true });

  if (location.protocol === 'file:') {
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.id = 'corsBanner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#1a3a2e,#0d1510);color:#fff;font-size:0.77rem;padding:9px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:monospace;box-shadow:0 3px 20px rgba(0,0,0,0.6);border-bottom:1px solid #2d6a4f;';
      const left = document.createElement('span');
      left.innerHTML = '⚠️ <strong>file:// mode</strong> — AI needs a local server to work. <span style="color:#5dba8a;">Click "Fix Now" for a 30-second setup.</span>';
      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';
      const fixBtn = document.createElement('button');
      fixBtn.textContent = '🔧 Fix Now';
      fixBtn.style.cssText = 'background:#2d6a4f;border:none;color:#fff;padding:4px 14px;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:700;white-space:nowrap;';
      fixBtn.onclick = () => { showLaunchModal(); };
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.75rem;';
      closeBtn.onclick = () => { banner.remove(); };
      btns.appendChild(fixBtn);
      btns.appendChild(closeBtn);
      banner.appendChild(left);
      banner.appendChild(btns);
      document.body.prepend(banner);
    }, 600);
  }
});