/**
 * @jest-environment jsdom
 */

const {
  escapeHtml,
  sanitizeProvisionedId,
  resolveProvisionedAssetUrl,
  sanitizeImagePath,
  sanitizeExternalUrl,
  sanitizeCategoryId,
  normalizeProvisionedCategories,
  normalizeProvisionedItems,
  sortItemsByCategory,
  groupItemsByCategory,
  easeOutQuart,
  getItemSlotOffset,
  clamp,
  renderProvisionedGridItem,
  renderProvisionedFilters,
} = require('../provisioned/provisioned');

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('handles all special characters together', () => {
    expect(escapeHtml('<a href="x&y">it\'s</a>')).toBe(
      '&lt;a href=&quot;x&amp;y&quot;&gt;it&#39;s&lt;/a&gt;'
    );
  });

  it('converts non-string values via String()', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('sanitizeProvisionedId', () => {
  it('accepts a valid alphanumeric-dash id', () => {
    expect(sanitizeProvisionedId('my-item-1')).toBe('my-item-1');
  });

  it('rejects empty string', () => {
    expect(sanitizeProvisionedId('')).toBeNull();
  });

  it('rejects null', () => {
    expect(sanitizeProvisionedId(null)).toBeNull();
  });

  it('rejects undefined', () => {
    expect(sanitizeProvisionedId(undefined)).toBeNull();
  });

  it('rejects non-string', () => {
    expect(sanitizeProvisionedId(123)).toBeNull();
  });

  it('rejects ids with special characters', () => {
    expect(sanitizeProvisionedId('my item')).toBeNull();
    expect(sanitizeProvisionedId('my/item')).toBeNull();
    expect(sanitizeProvisionedId('my.item')).toBeNull();
  });

  it('accepts uppercase letters', () => {
    expect(sanitizeProvisionedId('MyItem-ABC')).toBe('MyItem-ABC');
  });
});

describe('resolveProvisionedAssetUrl', () => {
  it('returns empty string for falsy path', () => {
    expect(resolveProvisionedAssetUrl('')).toBe('');
    expect(resolveProvisionedAssetUrl(null)).toBe('');
    expect(resolveProvisionedAssetUrl(undefined)).toBe('');
  });

  it('returns absolute paths unchanged', () => {
    expect(resolveProvisionedAssetUrl('/assets/img.png')).toBe('/assets/img.png');
  });

  it('prepends slash to relative paths', () => {
    expect(resolveProvisionedAssetUrl('assets/img.png')).toBe('/assets/img.png');
  });
});

describe('sanitizeImagePath', () => {
  it('accepts paths starting with assets/provisioned/', () => {
    expect(sanitizeImagePath('assets/provisioned/item/img.png')).toBe(
      'assets/provisioned/item/img.png'
    );
  });

  it('rejects non-string input', () => {
    expect(sanitizeImagePath(123)).toBeNull();
    expect(sanitizeImagePath(null)).toBeNull();
  });

  it('rejects paths not starting with the required prefix', () => {
    expect(sanitizeImagePath('images/photo.png')).toBeNull();
    expect(sanitizeImagePath('/assets/provisioned/img.png')).toBeNull();
  });

  it('rejects paths containing ..', () => {
    expect(sanitizeImagePath('assets/provisioned/../secret.png')).toBeNull();
  });
});

describe('sanitizeExternalUrl', () => {
  it('accepts valid http urls', () => {
    expect(sanitizeExternalUrl('http://example.com')).toBe('http://example.com/');
  });

  it('accepts valid https urls', () => {
    expect(sanitizeExternalUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it('rejects javascript: protocol', () => {
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: protocol', () => {
    expect(sanitizeExternalUrl('data:text/html,<h1>hi</h1>')).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(sanitizeExternalUrl(null)).toBeNull();
    expect(sanitizeExternalUrl(undefined)).toBeNull();
  });

  it('rejects empty string', () => {
    expect(sanitizeExternalUrl('')).toBeNull();
  });

  it('rejects non-string', () => {
    expect(sanitizeExternalUrl(42)).toBeNull();
  });
});

describe('sanitizeCategoryId', () => {
  it('accepts valid category id', () => {
    expect(sanitizeCategoryId('watches')).toBe('watches');
    expect(sanitizeCategoryId('fine-art')).toBe('fine-art');
  });

  it('rejects empty/null/undefined', () => {
    expect(sanitizeCategoryId('')).toBeNull();
    expect(sanitizeCategoryId(null)).toBeNull();
    expect(sanitizeCategoryId(undefined)).toBeNull();
  });

  it('rejects ids with spaces or special chars', () => {
    expect(sanitizeCategoryId('my category')).toBeNull();
    expect(sanitizeCategoryId('cat/sub')).toBeNull();
  });
});

describe('normalizeProvisionedCategories', () => {
  it('returns empty array for null/undefined data', () => {
    expect(normalizeProvisionedCategories(null)).toEqual([]);
    expect(normalizeProvisionedCategories(undefined)).toEqual([]);
  });

  it('returns empty array when categories is not an array', () => {
    expect(normalizeProvisionedCategories({ categories: 'not-array' })).toEqual([]);
  });

  it('filters out categories with invalid ids', () => {
    const data = {
      categories: [
        { id: 'valid-id', title: 'Valid' },
        { id: '', title: 'Empty' },
        { id: null, title: 'Null' },
        { id: 'another', title: 'Another' },
      ],
    };
    const result = normalizeProvisionedCategories(data);
    expect(result).toEqual([
      { id: 'valid-id', title: 'Valid' },
      { id: 'another', title: 'Another' },
    ]);
  });

  it('uses id as title fallback when title is missing or empty', () => {
    const data = {
      categories: [
        { id: 'watches' },
        { id: 'cars', title: '' },
        { id: 'art', title: '   ' },
      ],
    };
    const result = normalizeProvisionedCategories(data);
    expect(result).toEqual([
      { id: 'watches', title: 'watches' },
      { id: 'cars', title: 'cars' },
      { id: 'art', title: 'art' },
    ]);
  });

  it('trims title whitespace', () => {
    const data = { categories: [{ id: 'x', title: '  Trimmed  ' }] };
    expect(normalizeProvisionedCategories(data)[0].title).toBe('Trimmed');
  });
});

describe('normalizeProvisionedItems', () => {
  const categories = [
    { id: 'watches', title: 'Watches' },
    { id: 'cars', title: 'Cars' },
  ];

  it('filters out items with invalid id', () => {
    const data = {
      items: [
        { id: '', image: 'assets/provisioned/x/img.png' },
        { id: 'valid', image: 'assets/provisioned/x/img.png' },
      ],
    };
    const result = normalizeProvisionedItems(data, categories);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('filters out items with invalid image path', () => {
    const data = {
      items: [
        { id: 'item-1', image: 'bad/path.png' },
        { id: 'item-2', image: 'assets/provisioned/x/img.png' },
      ],
    };
    const result = normalizeProvisionedItems(data, categories);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-2');
  });

  it('falls back to first category when item category is invalid', () => {
    const data = {
      items: [{ id: 'item-1', image: 'assets/provisioned/x/img.png', category: 'invalid' }],
    };
    const result = normalizeProvisionedItems(data, categories);
    expect(result[0].category).toBe('watches');
  });

  it('preserves sortIndex based on original array position', () => {
    const data = {
      items: [
        { id: 'a', image: 'assets/provisioned/a/img.png', category: 'watches' },
        { id: 'b', image: 'assets/provisioned/b/img.png', category: 'watches' },
      ],
    };
    const result = normalizeProvisionedItems(data, categories);
    expect(result[0].sortIndex).toBe(0);
    expect(result[1].sortIndex).toBe(1);
  });

  it('defaults missing string fields to empty strings', () => {
    const data = {
      items: [{ id: 'item-1', image: 'assets/provisioned/x/img.png' }],
    };
    const result = normalizeProvisionedItems(data, categories);
    expect(result[0].title).toBe('');
    expect(result[0].description).toBe('');
    expect(result[0].info).toBe('');
  });

  it('trims title, description and info', () => {
    const data = {
      items: [{
        id: 'item-1',
        image: 'assets/provisioned/x/img.png',
        title: '  My Item  ',
        description: '  Desc  ',
        info: '  Info  ',
      }],
    };
    const result = normalizeProvisionedItems(data, categories);
    expect(result[0].title).toBe('My Item');
    expect(result[0].description).toBe('Desc');
    expect(result[0].info).toBe('Info');
  });

  it('returns empty array for null data', () => {
    expect(normalizeProvisionedItems(null, categories)).toEqual([]);
  });
});

describe('sortItemsByCategory', () => {
  const categories = [
    { id: 'watches', title: 'Watches' },
    { id: 'cars', title: 'Cars' },
  ];

  it('sorts items by category rank, then by sortIndex', () => {
    const items = [
      { id: 'c1', category: 'cars', sortIndex: 0 },
      { id: 'w1', category: 'watches', sortIndex: 1 },
      { id: 'w2', category: 'watches', sortIndex: 0 },
    ];
    const sorted = sortItemsByCategory(items, categories);
    expect(sorted.map((i) => i.id)).toEqual(['w2', 'w1', 'c1']);
  });

  it('does not mutate the original array', () => {
    const items = [
      { id: 'c1', category: 'cars', sortIndex: 0 },
      { id: 'w1', category: 'watches', sortIndex: 0 },
    ];
    const original = [...items];
    sortItemsByCategory(items, categories);
    expect(items).toEqual(original);
  });

  it('puts unknown categories at the end', () => {
    const items = [
      { id: 'u1', category: 'unknown', sortIndex: 0 },
      { id: 'w1', category: 'watches', sortIndex: 0 },
    ];
    const sorted = sortItemsByCategory(items, categories);
    expect(sorted[0].id).toBe('w1');
    expect(sorted[1].id).toBe('u1');
  });
});

describe('groupItemsByCategory', () => {
  const categories = [
    { id: 'watches', title: 'Watches' },
    { id: 'cars', title: 'Cars' },
  ];

  it('groups items into their respective categories', () => {
    const items = [
      { id: 'w1', category: 'watches' },
      { id: 'c1', category: 'cars' },
      { id: 'w2', category: 'watches' },
    ];
    const groups = groupItemsByCategory(items, categories);
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe('watches');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].id).toBe('cars');
    expect(groups[1].items).toHaveLength(1);
  });

  it('filters out empty categories', () => {
    const items = [{ id: 'w1', category: 'watches' }];
    const groups = groupItemsByCategory(items, categories);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('watches');
  });

  it('creates an uncategorized group for ungrouped items', () => {
    const items = [
      { id: 'w1', category: 'watches' },
      { id: 'x1', category: 'mystery' },
    ];
    const groups = groupItemsByCategory(items, categories);
    const uncategorized = groups.find((g) => g.id === 'uncategorized');
    expect(uncategorized).toBeDefined();
    expect(uncategorized.items).toHaveLength(1);
    expect(uncategorized.title).toBe('Patrimony');
  });

  it('returns empty array when no items', () => {
    const groups = groupItemsByCategory([], categories);
    expect(groups).toEqual([]);
  });
});

describe('easeOutQuart', () => {
  it('returns 0 at progress 0', () => {
    expect(easeOutQuart(0)).toBe(0);
  });

  it('returns 1 at progress 1', () => {
    expect(easeOutQuart(1)).toBe(1);
  });

  it('returns value between 0 and 1 for mid-range input', () => {
    const result = easeOutQuart(0.5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('produces higher values early (easing-out characteristic)', () => {
    expect(easeOutQuart(0.25)).toBeGreaterThan(0.25);
  });
});

describe('getItemSlotOffset', () => {
  it('returns 0 for the front item', () => {
    expect(getItemSlotOffset(0, 0, 60, 6)).toBe(0);
  });

  it('returns positive offset for the next item', () => {
    expect(getItemSlotOffset(1, 0, 60, 6)).toBe(1);
  });

  it('wraps around for items past half the count', () => {
    const offset = getItemSlotOffset(5, 0, 60, 6);
    expect(offset).toBe(-1);
  });

  it('handles fractional front index from rotation', () => {
    const offset = getItemSlotOffset(0, 30, 60, 6);
    expect(offset).toBe(-0.5);
  });

  it('works with non-zero rotation', () => {
    const offset = getItemSlotOffset(2, 120, 60, 6);
    expect(offset).toBe(0);
  });
});

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns min when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });
});

describe('renderProvisionedGridItem', () => {
  it('renders an article element for items without link', () => {
    const item = {
      id: 'test-item',
      title: 'Test',
      image: 'assets/provisioned/test/img.png',
      link: null,
    };
    const html = renderProvisionedGridItem(item);
    expect(html).toContain('<article');
    expect(html).toContain('data-provisioned-id="test-item"');
    expect(html).toContain('Test');
  });

  it('renders a link element for items with a link', () => {
    const item = {
      id: 'test-item',
      title: 'Test',
      image: 'assets/provisioned/test/img.png',
      link: 'https://example.com',
    };
    const html = renderProvisionedGridItem(item);
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('escapes HTML in title and id', () => {
    const item = {
      id: 'test-item',
      title: '<script>alert("xss")</script>',
      image: 'assets/provisioned/test/img.png',
      link: null,
    };
    const html = renderProvisionedGridItem(item);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('omits title span when title is empty', () => {
    const item = {
      id: 'test-item',
      title: '',
      image: 'assets/provisioned/test/img.png',
      link: null,
    };
    const html = renderProvisionedGridItem(item);
    expect(html).not.toContain('provisioned-item-title');
  });
});

describe('renderProvisionedFilters', () => {
  it('renders an "All" button plus one button per category', () => {
    const categories = [
      { id: 'watches', title: 'Watches' },
      { id: 'cars', title: 'Cars' },
    ];
    const html = renderProvisionedFilters(categories);
    expect(html).toContain('data-filter="all"');
    expect(html).toContain('data-filter="watches"');
    expect(html).toContain('data-filter="cars"');
    expect(html).toContain('Watches');
    expect(html).toContain('Cars');
  });

  it('marks "All" as initially active', () => {
    const html = renderProvisionedFilters([]);
    expect(html).toContain('is-active');
    expect(html).toContain('aria-selected="true"');
  });

  it('escapes category titles', () => {
    const categories = [{ id: 'x', title: '<b>Bold</b>' }];
    const html = renderProvisionedFilters(categories);
    expect(html).not.toContain('<b>Bold</b>');
    expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
  });
});
