const WRITINGS_POSTS_URL = '/writings/posts.json';

const SUBSTACK_LOGO_SVG = `<svg class="writing-substack-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#FF6719" d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.55 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>`;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSlug(slug) {
  if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/i.test(slug)) {
    return null;
  }

  return slug;
}

function sanitizeInternalHref(href, fallback = '/writings/') {
  if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')) {
    return href;
  }

  return fallback;
}

function sanitizeExternalUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchWritingsPosts() {
  const response = await fetch(WRITINGS_POSTS_URL);
  if (!response.ok) {
    throw new Error('Could not load writings.');
  }
  const data = await response.json();
  return data.posts || [];
}

function getEmbeddedWritingPost() {
  const dataEl = document.getElementById('writing-post-data');
  if (!dataEl) {
    return null;
  }

  try {
    return JSON.parse(dataEl.textContent);
  } catch {
    return null;
  }
}

function getWritingSlugFromPath() {
  const parts = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const writingsIndex = parts.lastIndexOf('writings');
  if (writingsIndex === -1 || writingsIndex === parts.length - 1) {
    return null;
  }

  const slug = parts[writingsIndex + 1];
  if (!slug || slug === 'index.html') {
    return null;
  }

  return slug;
}

function writingHref(slug) {
  const safeSlug = sanitizeSlug(slug);
  return safeSlug ? `/writings/${safeSlug}/` : '/writings/';
}

function renderWritingsList(container, posts) {
  const limit = Number(container.dataset.writingsLimit || posts.length);
  const items = posts
    .filter((post) => sanitizeSlug(post.slug))
    .slice(0, limit);

  container.innerHTML = items.map((post) => `
    <a href="${writingHref(post.slug)}" class="item item-link" target="_blank" rel="noopener noreferrer">
      <span class="item-title">${escapeHtml(post.title)}</span>
      <span class="item-desc">${escapeHtml(post.date)}</span>
    </a>
  `).join('');
}

function renderWritingArticle(container, post) {
  document.title = `${post.title} — Rishabh Karnawat`;

  const description = post.subtitle || post.intro?.[0] || post.title;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }

  const introHtml = (post.intro || [])
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');

  const sectionsHtml = (post.sections || [])
    .map((section) => {
      if (section.number != null && section.body != null) {
        return `
      <section class="writing-section">
        <p><span class="writing-section-number">${escapeHtml(section.number)}.</span> <span class="writing-section-title">${escapeHtml(section.title)}</span> ${escapeHtml(section.body)}</p>
      </section>
    `;
      }

      const paragraphsHtml = (section.paragraphs || [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('');

      const subsectionsHtml = (section.subsections || [])
        .map((subsection) => `
        <p class="writing-subsection-title">${escapeHtml(subsection.title)}</p>
        ${(subsection.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      `)
        .join('');

      const listHtml = section.list?.length
        ? `<ul class="writing-list">${section.list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';

      const noteHtml = section.note
        ? `<p class="writing-note">${escapeHtml(section.note)}</p>`
        : '';

      return `
      <section class="writing-section writing-section-essay">
        ${section.title ? `<h2 class="writing-section-heading">${escapeHtml(section.title)}</h2>` : ''}
        ${paragraphsHtml}
        ${subsectionsHtml}
        ${listHtml}
        ${noteHtml}
      </section>
    `;
    })
    .join('');

  const outroHtml = (post.outro || [])
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');

  const backHref = sanitizeInternalHref(container.dataset.writingsBack);
  const substackUrl = sanitizeExternalUrl(post.substackUrl);
  const substackLinkHtml = substackUrl
    ? `<a href="${escapeHtml(substackUrl)}" class="writing-substack-link" target="_blank" rel="noopener noreferrer" aria-label="Read on Substack">
            ${SUBSTACK_LOGO_SVG}
          </a>`
    : '';

  container.innerHTML = `
    <a href="${escapeHtml(backHref)}" class="back-link">&larr; Back to Writings</a>

    <article class="writing-article">
      <header class="writing-article-header">
        <h1 class="writing-article-title">${escapeHtml(post.title)}</h1>
        ${post.subtitle ? `<p class="writing-article-subtitle">${escapeHtml(post.subtitle)}</p>` : ''}
        <div class="writing-article-meta-row">
          <span class="writing-article-meta">${escapeHtml(post.date)}</span>
          ${substackLinkHtml}
        </div>
      </header>

      <div class="writing-article-body">
        ${introHtml}
        ${sectionsHtml}
        ${outroHtml}
      </div>
    </article>
  `;
}

async function initWritings() {
  const listContainers = document.querySelectorAll('[data-writings-list]');
  const articleContainer = document.querySelector('[data-writing-article]');

  if (!listContainers.length && !articleContainer) {
    return;
  }

  if (articleContainer) {
    const embeddedPost = getEmbeddedWritingPost();
    if (embeddedPost) {
      renderWritingArticle(articleContainer, embeddedPost);
    }
  }

  try {
    const posts = await fetchWritingsPosts();

    listContainers.forEach((container) => {
      renderWritingsList(container, posts);
    });

    if (articleContainer && !getEmbeddedWritingPost()) {
      const slug = articleContainer.dataset.writingSlug || getWritingSlugFromPath();
      const post = posts.find((entry) => entry.slug === slug);

      if (!post) {
        const backHref = sanitizeInternalHref(articleContainer.dataset.writingsBack);
        articleContainer.innerHTML = `
          <a href="${escapeHtml(backHref)}" class="back-link">&larr; Back to Writings</a>
          <p class="page-desc">This writing could not be found.</p>
        `;
        return;
      }

      renderWritingArticle(articleContainer, post);
    }
  } catch {
    if (articleContainer && !articleContainer.querySelector('.writing-article')) {
      const backHref = sanitizeInternalHref(articleContainer.dataset.writingsBack);
      articleContainer.innerHTML = `
        <a href="${escapeHtml(backHref)}" class="back-link">&larr; Back to Writings</a>
        <p class="page-desc">Could not load this writing. Please try again later.</p>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWritings);
} else {
  initWritings();
}
