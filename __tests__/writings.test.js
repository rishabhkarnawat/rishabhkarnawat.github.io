/**
 * @jest-environment jsdom
 */

const {
  escapeHtml,
  sanitizeSlug,
  sanitizeInternalHref,
  sanitizeExternalUrl,
  writingHref,
  getWritingSlugFromPath,
  getEmbeddedWritingPost,
  renderWritingsList,
  renderWritingArticle,
} = require('../writings/writings');

describe('escapeHtml', () => {
  it('escapes all HTML-sensitive characters', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('converts non-strings', () => {
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(false)).toBe('false');
  });
});

describe('sanitizeSlug', () => {
  it('accepts valid slug with letters, numbers, and dashes', () => {
    expect(sanitizeSlug('my-post-1')).toBe('my-post-1');
  });

  it('rejects empty string', () => {
    expect(sanitizeSlug('')).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(sanitizeSlug(null)).toBeNull();
    expect(sanitizeSlug(undefined)).toBeNull();
  });

  it('rejects non-string', () => {
    expect(sanitizeSlug(42)).toBeNull();
  });

  it('rejects slugs with spaces', () => {
    expect(sanitizeSlug('my post')).toBeNull();
  });

  it('rejects slugs with slashes', () => {
    expect(sanitizeSlug('my/post')).toBeNull();
  });

  it('rejects slugs with dots', () => {
    expect(sanitizeSlug('my.post')).toBeNull();
  });

  it('rejects slugs with underscores', () => {
    expect(sanitizeSlug('my_post')).toBeNull();
  });

  it('accepts uppercase slugs', () => {
    expect(sanitizeSlug('MyPost')).toBe('MyPost');
  });
});

describe('sanitizeInternalHref', () => {
  it('returns the href if it starts with /', () => {
    expect(sanitizeInternalHref('/writings/')).toBe('/writings/');
    expect(sanitizeInternalHref('/writings/my-post/')).toBe('/writings/my-post/');
  });

  it('rejects protocol-relative urls (//)', () => {
    expect(sanitizeInternalHref('//evil.com')).toBe('/writings/');
  });

  it('rejects absolute urls', () => {
    expect(sanitizeInternalHref('https://evil.com')).toBe('/writings/');
  });

  it('rejects relative paths without leading slash', () => {
    expect(sanitizeInternalHref('writings/')).toBe('/writings/');
  });

  it('uses custom fallback', () => {
    expect(sanitizeInternalHref('bad', '/custom/')).toBe('/custom/');
  });

  it('uses default fallback for non-string input', () => {
    expect(sanitizeInternalHref(42)).toBe('/writings/');
  });
});

describe('sanitizeExternalUrl', () => {
  it('accepts https urls', () => {
    expect(sanitizeExternalUrl('https://substack.com/p/post')).toBe(
      'https://substack.com/p/post'
    );
  });

  it('accepts http urls', () => {
    expect(sanitizeExternalUrl('http://example.com')).toBe('http://example.com/');
  });

  it('rejects javascript: urls', () => {
    expect(sanitizeExternalUrl('javascript:void(0)')).toBeNull();
  });

  it('rejects data: urls', () => {
    expect(sanitizeExternalUrl('data:text/html,<h1>hi</h1>')).toBeNull();
  });

  it('rejects empty/null/undefined', () => {
    expect(sanitizeExternalUrl('')).toBeNull();
    expect(sanitizeExternalUrl(null)).toBeNull();
    expect(sanitizeExternalUrl(undefined)).toBeNull();
  });

  it('rejects non-string', () => {
    expect(sanitizeExternalUrl(123)).toBeNull();
  });
});

describe('writingHref', () => {
  it('returns the path for a valid slug', () => {
    expect(writingHref('my-post')).toBe('/writings/my-post/');
  });

  it('returns /writings/ for an invalid slug', () => {
    expect(writingHref('')).toBe('/writings/');
    expect(writingHref(null)).toBe('/writings/');
    expect(writingHref('bad slug')).toBe('/writings/');
  });
});

describe('getWritingSlugFromPath', () => {
  it('extracts slug from a writings path', () => {
    delete window.location;
    window.location = new URL('https://example.com/writings/my-post/');
    expect(getWritingSlugFromPath()).toBe('my-post');
  });

  it('returns null when path is just /writings/', () => {
    delete window.location;
    window.location = new URL('https://example.com/writings/');
    expect(getWritingSlugFromPath()).toBeNull();
  });

  it('returns null when path has no writings segment', () => {
    delete window.location;
    window.location = new URL('https://example.com/about/');
    expect(getWritingSlugFromPath()).toBeNull();
  });

  it('returns null when slug is index.html', () => {
    delete window.location;
    window.location = new URL('https://example.com/writings/index.html');
    expect(getWritingSlugFromPath()).toBeNull();
  });

  it('handles nested paths with writings', () => {
    delete window.location;
    window.location = new URL('https://example.com/site/writings/deep-post/');
    expect(getWritingSlugFromPath()).toBe('deep-post');
  });
});

describe('getEmbeddedWritingPost', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null when no #writing-post-data element exists', () => {
    expect(getEmbeddedWritingPost()).toBeNull();
  });

  it('parses valid JSON from the embedded element', () => {
    const el = document.createElement('script');
    el.id = 'writing-post-data';
    el.type = 'application/json';
    el.textContent = JSON.stringify({ title: 'Test Post', slug: 'test' });
    document.body.appendChild(el);

    const result = getEmbeddedWritingPost();
    expect(result).toEqual({ title: 'Test Post', slug: 'test' });
  });

  it('returns null for invalid JSON', () => {
    const el = document.createElement('div');
    el.id = 'writing-post-data';
    el.textContent = 'not valid json {{{';
    document.body.appendChild(el);

    expect(getEmbeddedWritingPost()).toBeNull();
  });
});

describe('renderWritingsList', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders links for each valid post', () => {
    const posts = [
      { slug: 'post-1', title: 'First Post', date: '2024-01-01' },
      { slug: 'post-2', title: 'Second Post', date: '2024-02-01' },
    ];
    renderWritingsList(container, posts);

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[0].href).toContain('/writings/post-1/');
    expect(links[0].textContent).toContain('First Post');
    expect(links[0].textContent).toContain('2024-01-01');
  });

  it('respects data-writings-limit attribute', () => {
    container.dataset.writingsLimit = '1';
    const posts = [
      { slug: 'post-1', title: 'First', date: '2024-01-01' },
      { slug: 'post-2', title: 'Second', date: '2024-02-01' },
    ];
    renderWritingsList(container, posts);

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
  });

  it('filters out posts with invalid slugs', () => {
    const posts = [
      { slug: 'valid-post', title: 'Valid', date: '2024-01-01' },
      { slug: 'bad slug', title: 'Invalid', date: '2024-01-02' },
      { slug: '', title: 'Empty', date: '2024-01-03' },
    ];
    renderWritingsList(container, posts);

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Valid');
  });

  it('escapes HTML in titles', () => {
    const posts = [{ slug: 'xss', title: '<img onerror=alert(1)>', date: '2024-01-01' }];
    renderWritingsList(container, posts);
    expect(container.innerHTML).not.toContain('<img onerror');
    expect(container.innerHTML).toContain('&lt;img onerror');
  });
});

describe('renderWritingArticle', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.dataset.writingsBack = '/writings/';
    document.body.innerHTML = '';
    document.body.appendChild(container);

    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = '';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelector('meta[name="description"]')?.remove();
  });

  it('renders the article title', () => {
    renderWritingArticle(container, {
      title: 'My Great Post',
      date: '2024-06-01',
    });
    expect(container.querySelector('.writing-article-title').textContent).toBe('My Great Post');
  });

  it('renders subtitle when present', () => {
    renderWritingArticle(container, {
      title: 'Post',
      subtitle: 'A subtitle',
      date: '2024-06-01',
    });
    expect(container.querySelector('.writing-article-subtitle').textContent).toBe('A subtitle');
  });

  it('omits subtitle element when not present', () => {
    renderWritingArticle(container, {
      title: 'Post',
      date: '2024-06-01',
    });
    expect(container.querySelector('.writing-article-subtitle')).toBeNull();
  });

  it('renders intro paragraphs', () => {
    renderWritingArticle(container, {
      title: 'Post',
      date: '2024-06-01',
      intro: ['First paragraph', 'Second paragraph'],
    });
    const body = container.querySelector('.writing-article-body');
    const paragraphs = body.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders sections with numbered format', () => {
    renderWritingArticle(container, {
      title: 'Post',
      date: '2024-06-01',
      sections: [{ number: 1, title: 'Section One', body: 'Content here' }],
    });
    expect(container.querySelector('.writing-section-number').textContent).toBe('1.');
    expect(container.querySelector('.writing-section-title').textContent).toBe('Section One');
  });

  it('renders sections with paragraphs and subsections', () => {
    renderWritingArticle(container, {
      title: 'Post',
      date: '2024-06-01',
      sections: [{
        title: 'Essay Section',
        paragraphs: ['Para 1'],
        subsections: [{ title: 'Sub', paragraphs: ['Sub para'] }],
        list: ['Item 1', 'Item 2'],
        note: 'A note',
      }],
    });
    expect(container.querySelector('.writing-section-heading').textContent).toBe('Essay Section');
    expect(container.querySelector('.writing-subsection-title').textContent).toBe('Sub');
    expect(container.querySelectorAll('.writing-list li')).toHaveLength(2);
    expect(container.querySelector('.writing-note').textContent).toBe('A note');
  });

  it('renders Substack link when substackUrl is present', () => {
    renderWritingArticle(container, {
      title: 'Post',
      date: '2024-06-01',
      substackUrl: 'https://substack.com/p/post',
    });
    const link = container.querySelector('.writing-substack-link');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://substack.com/p/post');
  });

  it('omits Substack link when substackUrl is absent', () => {
    renderWritingArticle(container, {
      title: 'Post',
      date: '2024-06-01',
    });
    expect(container.querySelector('.writing-substack-link')).toBeNull();
  });

  it('sets the document title', () => {
    renderWritingArticle(container, {
      title: 'Test Title',
      date: '2024-06-01',
    });
    expect(document.title).toBe('Test Title — Rishabh Karnawat');
  });

  it('sets meta description from subtitle', () => {
    renderWritingArticle(container, {
      title: 'Post',
      subtitle: 'My description',
      date: '2024-06-01',
    });
    const meta = document.querySelector('meta[name="description"]');
    expect(meta.getAttribute('content')).toBe('My description');
  });

  it('renders back link using data-writings-back attribute', () => {
    container.dataset.writingsBack = '/custom-back/';
    renderWritingArticle(container, {
      title: 'Post',
      date: '2024-06-01',
    });
    const backLink = container.querySelector('.back-link');
    expect(backLink.getAttribute('href')).toBe('/custom-back/');
  });

  it('escapes HTML in all text content', () => {
    renderWritingArticle(container, {
      title: '<script>alert(1)</script>',
      date: '2024-06-01',
    });
    expect(container.innerHTML).not.toContain('<script>alert(1)</script>');
  });
});
