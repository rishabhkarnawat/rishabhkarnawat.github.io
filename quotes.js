(function () {
  const QUOTES = [
    { text: "All I ask for is an unfair advantage.", author: "Hank Greenberg" },
    { text: "Traveler, there is no path. The path is made by walking.", author: "Antonio Machado" },
    { text: "I look for a place where I'm wise and they're stupid.", author: "Charlie Munger" },
    { text: "It is not the mountain we conquer, but ourselves.", author: "Edmund Hillary" },
    { text: "Do the difficult things while they are easy and do the great things while they are small.", author: "Lao Tzu" },
    { text: "The obstacle is the way.", author: "Marcus Aurelius" },
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
    { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
    { text: "Success is stumbling from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
    { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
    { text: "What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Failure is irrelevant until it's catastrophic.", author: "Elon Musk" },
    { text: "The last easy day was yesterday.", author: "US Navy SEALs" },
    { text: "Never out of the fight.", author: "Indian Armed Forces" },
    { text: "The point of getting rich is so you don't have to need other people, so you don't have to get along with others.", author: "Charlie Munger" },
    { text: "The young man knows the rules, the old man knows the exceptions.", author: "Charlie Munger" },
  ];

  const BOARD_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1" fill="currentColor"/><rect x="3" y="10" width="18" height="4" rx="1" fill="currentColor"/><rect x="3" y="16" width="18" height="4" rx="1" fill="currentColor"/></svg>';
  const LIST_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="5" cy="6" r="1.4" fill="currentColor"/><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="5" cy="18" r="1.4" fill="currentColor"/><rect x="9" y="5" width="11" height="2" rx="1" fill="currentColor"/><rect x="9" y="11" width="11" height="2" rx="1" fill="currentColor"/><rect x="9" y="17" width="11" height="2" rx="1" fill="currentColor"/></svg>';

  const TYPE_SPEED = 34;
  const LIST_TYPE_SPEED = 16;
  const LIST_STAGGER = 170;

  let modal = null;
  let stageEl = null;
  let textEl = null;
  let authorEl = null;
  let listEl = null;
  let listItems = [];
  let currentIndex = 0;
  let generation = 0;
  let listGeneration = 0;
  let previouslyFocused = null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function typeDelay(ch) {
    if (ch === '.' || ch === '?' || ch === '!') {
      return TYPE_SPEED * 7;
    }
    if (ch === ',' || ch === ';' || ch === ':') {
      return TYPE_SPEED * 4;
    }
    return TYPE_SPEED + Math.random() * TYPE_SPEED * 0.6;
  }

  function showQuote(index) {
    currentIndex = ((index % QUOTES.length) + QUOTES.length) % QUOTES.length;
    const quote = QUOTES[currentIndex];

    generation += 1;
    const gen = generation;

    textEl.textContent = '';
    authorEl.textContent = '\u2014 ' + quote.author;
    authorEl.classList.remove('is-visible');
    stageEl.classList.add('is-typing');

    if (prefersReducedMotion) {
      textEl.textContent = quote.text;
      authorEl.classList.add('is-visible');
      stageEl.classList.remove('is-typing');
      return;
    }

    let i = 0;
    const step = () => {
      if (gen !== generation) {
        return;
      }
      if (i < quote.text.length) {
        const ch = quote.text.charAt(i);
        textEl.textContent += ch;
        i += 1;
        window.setTimeout(step, typeDelay(ch));
      } else {
        stageEl.classList.remove('is-typing');
        authorEl.classList.add('is-visible');
      }
    };

    window.setTimeout(step, 260);
  }

  function buildList() {
    listEl.innerHTML = '';
    listItems = [];

    QUOTES.forEach((quote, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'quotes-list-item';

      const textWrap = document.createElement('span');
      textWrap.className = 'quotes-list-textwrap';

      const text = document.createElement('span');
      text.className = 'quotes-list-text';

      const cursor = document.createElement('span');
      cursor.className = 'quotes-list-cursor';
      cursor.setAttribute('aria-hidden', 'true');

      textWrap.appendChild(text);
      textWrap.appendChild(cursor);

      const author = document.createElement('span');
      author.className = 'quotes-list-author';
      author.textContent = '\u2014 ' + quote.author;

      item.appendChild(textWrap);
      item.appendChild(author);
      item.addEventListener('click', () => {
        setView('board');
        showQuote(index);
      });

      listEl.appendChild(item);
      listItems.push({ item, textEl: text, text: quote.text });
    });
  }

  function typeList() {
    listGeneration += 1;
    const gen = listGeneration;

    listItems.forEach((entry) => {
      entry.textEl.textContent = '';
      entry.item.classList.remove('is-typing', 'is-done');
    });

    if (prefersReducedMotion) {
      listItems.forEach((entry) => {
        entry.textEl.textContent = entry.text;
        entry.item.classList.add('is-done');
      });
      return;
    }

    listItems.forEach((entry, index) => {
      window.setTimeout(() => {
        if (gen !== listGeneration) {
          return;
        }
        entry.item.classList.add('is-typing');
        let i = 0;
        const step = () => {
          if (gen !== listGeneration) {
            return;
          }
          if (i < entry.text.length) {
            entry.textEl.textContent += entry.text.charAt(i);
            i += 1;
            window.setTimeout(step, LIST_TYPE_SPEED + Math.random() * LIST_TYPE_SPEED * 0.5);
          } else {
            entry.item.classList.remove('is-typing');
            entry.item.classList.add('is-done');
          }
        };
        step();
      }, index * LIST_STAGGER);
    });
  }

  function setView(view) {
    const isList = view === 'list';
    modal.classList.toggle('is-list-view', isList);
    modal.querySelector('[data-quotes-view="board"]').classList.toggle('is-active', !isList);
    modal.querySelector('[data-quotes-view="list"]').classList.toggle('is-active', isList);

    if (isList) {
      listEl.scrollTop = 0;
      typeList();
    } else {
      listGeneration += 1;
    }
  }

  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'quotes-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Quote bank');

    modal.innerHTML =
      '<div class="quotes-toggle" role="tablist" aria-label="View">' +
      '<button type="button" class="quotes-toggle-btn is-active" data-quotes-view="board" aria-label="Single view">' + BOARD_ICON + '</button>' +
      '<button type="button" class="quotes-toggle-btn" data-quotes-view="list" aria-label="List view">' + LIST_ICON + '</button>' +
      '</div>' +
      '<button type="button" class="quotes-close" aria-label="Close">&times;</button>' +
      '<div class="quotes-stage">' +
      '<div class="quotes-typed" aria-live="polite">' +
      '<span class="quotes-typed-text" data-quotes-text></span>' +
      '<span class="quotes-cursor" aria-hidden="true"></span>' +
      '</div>' +
      '<div class="quotes-author" data-quotes-author></div>' +
      '<div class="quotes-nav">' +
      '<button type="button" class="quotes-nav-btn" data-quotes-prev aria-label="Previous quote">&lsaquo;</button>' +
      '<button type="button" class="quotes-nav-btn" data-quotes-next aria-label="Next quote">&rsaquo;</button>' +
      '</div>' +
      '</div>' +
      '<div class="quotes-list" data-quotes-list></div>';

    document.body.appendChild(modal);

    stageEl = modal.querySelector('.quotes-typed');
    textEl = modal.querySelector('[data-quotes-text]');
    authorEl = modal.querySelector('[data-quotes-author]');
    listEl = modal.querySelector('[data-quotes-list]');

    modal.querySelector('.quotes-close').addEventListener('click', closeModal);
    modal.querySelector('[data-quotes-prev]').addEventListener('click', () => showQuote(currentIndex - 1));
    modal.querySelector('[data-quotes-next]').addEventListener('click', () => showQuote(currentIndex + 1));
    modal.querySelector('[data-quotes-view="board"]').addEventListener('click', () => setView('board'));
    modal.querySelector('[data-quotes-view="list"]').addEventListener('click', () => setView('list'));

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    buildList();
  }

  function onKeyDown(event) {
    if (!modal || modal.hidden) {
      return;
    }
    if (event.key === 'Escape') {
      closeModal();
    } else if (!modal.classList.contains('is-list-view')) {
      if (event.key === 'ArrowLeft') {
        showQuote(currentIndex - 1);
      } else if (event.key === 'ArrowRight') {
        showQuote(currentIndex + 1);
      }
    }
  }

  function openModal() {
    if (!modal) {
      buildModal();
    }

    previouslyFocused = document.activeElement;
    setView('board');
    modal.hidden = false;
    document.body.classList.add('quotes-open');

    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      showQuote(Math.floor(Math.random() * QUOTES.length));
      modal.querySelector('.quotes-close').focus();
    });
  }

  function closeModal() {
    if (!modal || modal.hidden) {
      return;
    }
    generation += 1;
    listGeneration += 1;
    modal.classList.remove('is-open');
    document.body.classList.remove('quotes-open');

    window.setTimeout(() => {
      modal.hidden = true;
    }, 260);

    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  }

  function init() {
    const triggers = document.querySelectorAll('[data-quotes-open]');
    if (!triggers.length) {
      return;
    }

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openModal();
      });
    });

    document.addEventListener('keydown', onKeyDown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
