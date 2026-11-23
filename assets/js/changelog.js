(() => {
  'use strict';

  const GITHUB_COMMITS_API = 'https://api.github.com/repos/SuphakornR/event/commits?per_page=20';
  const GH_CACHE_KEY = 'vox_changelog_gh_cache_v1';
  const GH_CACHE_TTL_MS = 5 * 60 * 1000;

  /**
   * Fallback initial release (shown immediately or when opened via file://).
   * On HTTP/GitHub Pages, assets/js/changelog-data.json is loaded and any newer
   * commits on GitHub main are auto-classified into Important/Medium/Minor.
   */
  const FALLBACK_DATA = {
    lastCommit: 'fcb0c925362e3fcac698074f1f51fa7d30523914',
    entries: [
      {
        impact: 'medium',
        title: 'Initial Stage & Hub Release',
        date: '2026-11-23',
        commit: 'fcb0c92',
        items: [
          'แบนเนอร์รองรับหลายภาพพร้อมเลื่อนอัตโนมัติ (คลิกขวาเพื่อเพิ่ม/ลบ/รีเซ็ตภาพ) และแสดงขนาดพิกเซลเมื่อชี้เมาส์',
          'ประกาศผลผู้ชนะแบบจอมืดทั้งหน้า พร้อมข้อความลุ้นทีละจังหวะ เสียงกลอง มาสคอตอันดับ 1–3 และพลุเฉลิมฉลอง',
          'ระบบกติกา/รายละเอียดกิจกรรมแบบเปิด-ปิดลื่นไหลใต้การ์ดกิจกรรม และจัดตารางทีมอัตโนมัติตามจำนวนทีม',
          'รวม Live QR Poll, ตัวจับเวลา, เพลงพื้นหลัง YouTube ต่อเนื่องข้ามหน้า และปุ่มเมนูเวทีพร้อม Auto-Sync'
        ]
      }
    ]
  };

  const IMPACT_META = {
    major: {
      label: 'Important',
      badgeCls: 'bg-[#E74C3C] text-white border-[#111111]'
    },
    medium: {
      label: 'Medium',
      badgeCls: 'bg-[#F4D03F] text-[#111111] border-[#111111]'
    },
    minor: {
      label: 'Minor',
      badgeCls: 'bg-[#F8F6F0] text-[#111111] border-[#111111]'
    }
  };

  function classifyImpact(subjects) {
    const joined = subjects.join('\n');
    if (/(\[major\]|breaking|feat!:|major:|redesign|rewrite|migration)/i.test(joined)) {
      return 'major';
    }
    if (/(\[medium\]|feat:|add\b|improve|optimize|support|auto-|animate|new\b|upgrade|changelog|build version)/i.test(joined)) {
      return 'medium';
    }
    return 'minor';
  }

  function computeReleases(entries) {
    let major = 0;
    let minor = 0;
    let patch = 0;
    return entries.map((entry) => {
      if (entry.impact === 'major') {
        major += 1;
        minor = 0;
        patch = 0;
      } else if (entry.impact === 'medium') {
        minor += 1;
        patch = 0;
      } else {
        patch += 1;
      }
      return {
        ...entry,
        version: `${major}.${minor}.${patch}`
      };
    });
  }

  let releases = computeReleases(FALLBACK_DATA.entries);
  let latestRelease = releases[releases.length - 1];
  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? ''));

  const openBtn = document.getElementById('open-changelog-btn');
  const buildLabelEl = document.getElementById('changelog-build-label');
  const modalEl = document.getElementById('changelog-modal');
  const closeBtn = document.getElementById('close-changelog-btn');
  const modalVerEl = document.getElementById('changelog-modal-version');
  const listEl = document.getElementById('changelog-list');
  const filterBtns = Array.from(document.querySelectorAll('[data-cl-filter]'));

  let activeFilter = 'all';

  function syncVersionLabels() {
    if (buildLabelEl) buildLabelEl.textContent = `v${latestRelease.version}`;
    if (modalVerEl) modalVerEl.textContent = `v${latestRelease.version}`;
  }

  function renderList() {
    if (!listEl) return;
    const ordered = [...releases].reverse().filter((r) => activeFilter === 'all' || r.impact === activeFilter);

    if (!ordered.length) {
      listEl.innerHTML = `
        <div class="bg-white border-2 border-dashed border-[#111111]/35 rounded-xl p-5 text-center text-xs font-semibold text-[#111111]/55">
          ยังไม่มีรายการอัปเดตในระดับนี้
        </div>
      `;
      return;
    }

    listEl.innerHTML = ordered.map((rel) => {
      const isLatest = rel.version === latestRelease.version;
      const meta = IMPACT_META[rel.impact] || IMPACT_META.minor;
      const commitTag = rel.commit ? `<span class="font-mono text-[10px] text-[#111111]/50">#${esc(rel.commit)}</span>` : '';
      return `
        <div class="bg-white border-2 border-[#111111] rounded-xl p-3 shadow-[2px_2px_0px_#111111]">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-1.5">
              <span class="font-display font-black text-xs ${isLatest ? 'bg-[#111111] text-[#F4D03F]' : 'bg-[#F8F6F0] text-[#111111] border border-[#111111]'} px-2 py-0.5 rounded">v${esc(rel.version)}${isLatest ? ' • ล่าสุด' : ''}</span>
              <span class="font-display font-extrabold text-[10px] uppercase tracking-wide border px-1.5 py-0.5 rounded ${meta.badgeCls}">${meta.label}</span>
              ${commitTag}
            </div>
            <span class="text-[11px] font-bold text-[#111111]/55">${esc(rel.title)}${rel.date ? ` • ${esc(rel.date)}` : ''}</span>
          </div>
          <ul class="list-disc pl-4 space-y-1 text-xs leading-relaxed">
            ${(rel.items || []).map((item) => `<li>${esc(item)}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');
  }

  async function fetchRecentGitHubCommits() {
    try {
      const cachedRaw = sessionStorage.getItem(GH_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && (Date.now() - cached.ts) < GH_CACHE_TTL_MS && Array.isArray(cached.commits)) {
          return cached.commits;
        }
      }
    } catch { /* ignore storage errors */ }

    const res = await fetch(GITHUB_COMMITS_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw)) return null;

    const commits = raw.map((c) => ({
      sha: c.sha || '',
      shortSha: (c.sha || '').slice(0, 7),
      date: (c.commit?.author?.date || '').slice(0, 10),
      subject: String(c.commit?.message || '').split('\n')[0].trim()
    }));

    try {
      sessionStorage.setItem(GH_CACHE_KEY, JSON.stringify({ ts: Date.now(), commits }));
    } catch { /* ignore storage errors */ }
    return commits;
  }

  async function loadChangelog() {
    let baseData = FALLBACK_DATA;
    try {
      const res = await fetch(`assets/js/changelog-data.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const parsed = await res.json();
        if (Array.isArray(parsed?.entries) && parsed.entries.length) {
          baseData = parsed;
        }
      }
    } catch {
      // Offline or file:// protocol: keep fallback entries
    }

    let entries = [...baseData.entries];
    try {
      const ghCommits = await fetchRecentGitHubCommits();
      if (Array.isArray(ghCommits) && ghCommits.length) {
        const stopIdx = baseData.lastCommit
          ? ghCommits.findIndex((c) => c.sha === baseData.lastCommit || (baseData.lastCommit.length >= 7 && c.sha.startsWith(baseData.lastCommit)))
          : -1;
        const newerRaw = stopIdx >= 0 ? ghCommits.slice(0, stopIdx) : [];
        const newer = newerRaw.filter((c) => c.subject && !/\[skip ci\]|^chore\(changelog\):/i.test(c.subject));
        if (newer.length) {
          const subjects = newer.map((c) => c.subject);
          entries.push({
            impact: classifyImpact(subjects),
            title: newer.length === 1 ? newer[0].subject : `${newer[0].subject} (+${newer.length - 1} updates)`,
            date: newer[0].date,
            commit: newer[0].shortSha,
            items: subjects
          });
        }
      }
    } catch {
      // GitHub API unavailable or rate-limited: show static entries cleanly
    }

    releases = computeReleases(entries);
    latestRelease = releases[releases.length - 1];
    syncVersionLabels();
    if (modalEl && !modalEl.classList.contains('hidden')) {
      renderList();
    }
  }

  syncVersionLabels();
  loadChangelog();

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.clFilter || 'all';
      filterBtns.forEach((b) => {
        const active = (b.dataset.clFilter || 'all') === activeFilter;
        b.classList.toggle('bg-[#111111]', active);
        b.classList.toggle('text-[#F4D03F]', active);
        b.classList.toggle('bg-white', !active);
        b.classList.toggle('text-[#111111]', !active);
      });
      renderList();
    });
  });

  const openCl = () => {
    renderList();
    modalEl?.classList.remove('hidden');
    modalEl?.classList.add('flex');
    modalEl?.setAttribute('aria-hidden', 'false');
  };

  const closeCl = () => {
    modalEl?.classList.add('hidden');
    modalEl?.classList.remove('flex');
    modalEl?.setAttribute('aria-hidden', 'true');
  };

  openBtn?.addEventListener('click', openCl);
  closeBtn?.addEventListener('click', closeCl);
  modalEl?.addEventListener('click', (e) => { if (e.target === modalEl) closeCl(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl && !modalEl.classList.contains('hidden')) closeCl();
  });

  window.VoxChangelog = Object.freeze({
    getVersion: () => latestRelease.version,
    getReleases: () => releases.map((r) => ({ ...r }))
  });
})();
