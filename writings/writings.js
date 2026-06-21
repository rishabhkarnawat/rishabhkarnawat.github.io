const WRITINGS_POSTS_URL = (() => {
  const script = document.currentScript;
  if (script?.src) {
    return new URL('posts.json', script.src).href;
  }
  return '/writings/posts.json';
})();

async function fetchWritingsPosts() {
  const response = await fetch(WRITINGS_POSTS_URL);
  if (!response.ok) {
    throw new Error('Could not load writings.');
  }
  const data = await response.json();
  return data.posts || [];
}

function getWritingSlugFromPath() {
  const parts = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const writingsIndex = parts.lastIndexOf('writings');
  if (writingsIndex === -1 || writingsIndex === parts.length - 1) {
    return null;
  }
  return parts[writingsIndex + 1] || null;
}

function writingHref(slug) {
  const path = window.location.pathname;
  if (path.includes('/writings/')) {
    const depth = path.replace(/\/+$/, '').split('/').length - 2;
    return `${'../'.repeat(Math.max(depth - 1, 0))}${slug}/`;
  }
  return `writings/${slug}/`;
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

  container.innerHTML = `
    <a href="${container.dataset.writingsBack || '../'}" class="back-link">&larr; Back to Writings</a>

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

  try {
    const posts = await fetchWritingsPosts();

    listContainers.forEach((container) => {
      renderWritingsList(container, posts);
    });

    if (articleContainer) {
      const slug = articleContainer.dataset.writingSlug || getWritingSlugFromPath();
      const post = posts.find((entry) => entry.slug === slug);

      if (!post) {
        articleContainer.innerHTML = `
          <a href="${articleContainer.dataset.writingsBack || '../'}" class="back-link">&larr; Back to Writings</a>
          <p class="page-desc">This writing could not be found.</p>
        `;
        return;
      }

      renderWritingArticle(articleContainer, post);
    }
  } catch {
    if (articleContainer) {
      articleContainer.innerHTML = `
        <a href="${articleContainer.dataset.writingsBack || '../'}" class="back-link">&larr; Back to Writings</a>
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
