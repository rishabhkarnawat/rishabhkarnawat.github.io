const WRITINGS_POSTS_URL = '/writings/posts.json';

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
  return `/writings/${slug}/`;
}

function openWritingInNewTab(url) {
  const absoluteUrl = new URL(url, window.location.origin).href;
  const newTab = window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
  if (!newTab) {
    window.location.assign(absoluteUrl);
  }
}

function bindWritingLinks() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-writings-list] a.item-link');
    if (!link) {
      return;
    }

    event.preventDefault();
    openWritingInNewTab(link.getAttribute('href'));
  });
}

function renderWritingsList(container, posts) {
  const limit = Number(container.dataset.writingsLimit || posts.length);
  const items = posts.slice(0, limit);

  container.innerHTML = items.map((post) => `
    <a href="${writingHref(post.slug)}" class="item item-link" target="_blank" rel="noopener noreferrer">
      <span class="item-title">${post.title}</span>
      <span class="item-desc">${post.date}</span>
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
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');

  const sectionsHtml = (post.sections || [])
    .map((section) => `
      <section class="writing-section">
        <p><span class="writing-section-number">${section.number}.</span> <span class="writing-section-title">${section.title}</span> ${section.body}</p>
      </section>
    `)
    .join('');

  const outroHtml = (post.outro || [])
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');

  const backHref = container.dataset.writingsBack || '/writings/';

  container.innerHTML = `
    <a href="${backHref}" class="back-link">&larr; Back to Writings</a>

    <article class="writing-article">
      <header class="writing-article-header">
        <h1 class="writing-article-title">${post.title}</h1>
        ${post.subtitle ? `<p class="writing-article-subtitle">${post.subtitle}</p>` : ''}
        <div class="writing-article-meta-row">
          <span class="writing-article-meta">${post.date}</span>
          <a href="${post.substackUrl}" class="writing-substack-link" target="_blank" rel="noopener noreferrer">
            <span class="social-arrow">↗</span> Read on Substack
          </a>
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
        articleContainer.innerHTML = `
          <a href="${articleContainer.dataset.writingsBack || '/writings/'}" class="back-link">&larr; Back to Writings</a>
          <p class="page-desc">This writing could not be found.</p>
        `;
        return;
      }

      renderWritingArticle(articleContainer, post);
    }
  } catch {
    if (articleContainer && !articleContainer.querySelector('.writing-article')) {
      articleContainer.innerHTML = `
        <a href="${articleContainer.dataset.writingsBack || '/writings/'}" class="back-link">&larr; Back to Writings</a>
        <p class="page-desc">Could not load this writing. Please try again later.</p>
      `;
    }
  }
}

bindWritingLinks();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWritings);
} else {
  initWritings();
}
