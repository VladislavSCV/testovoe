import { useEffect, useRef, useState } from 'react';

const RING = 201.06;
const FILTERS = [['all', 'Все'], ['active', 'Активные'], ['done', 'Готово']];

const plural = (n, a, b, c) => {
  const m = n % 100, d = n % 10;
  return m > 10 && m < 15 ? c : d === 1 ? a : d > 1 && d < 5 ? b : c;
};

function load() {
  let tasks = [], dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  try {
    tasks = JSON.parse(localStorage.getItem('todo.tasks') || '[]');
    const d = localStorage.getItem('todo.dark');
    if (d !== null) dark = d === '1';
  } catch (e) {}
  return { tasks, dark };
}

// Правка по месту: сохраняется по Enter или потере фокуса (как событие change у input)
function TaskInput({ text, onCommit }) {
  const [value, setValue] = useState(text);
  useEffect(() => setValue(text), [text]);
  const commit = () => { if (value !== text) onCommit(value); };
  return (
    <input
      className="item-text"
      value={value}
      aria-label="Задача"
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

export default function App() {
  const [init] = useState(load);
  const [tasks, setTasks] = useState(init.tasks);
  const [dark, setDark] = useState(init.dark);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const [undo, setUndo] = useState(null);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  const save = next => {
    setTasks(next);
    try { localStorage.setItem('todo.tasks', JSON.stringify(next)); } catch (e) {}
  };
  const remember = (removed, prev) => {
    clearTimeout(timer.current);
    setUndo({ removed, tasks: prev });
    timer.current = setTimeout(() => setUndo(null), 5000);
  };

  const done = tasks.filter(x => x.done).length;
  const total = tasks.length;
  const left = total - done;
  const percent = total ? Math.round(done / total * 100) : 0;
  const shown = tasks.filter(x => filter === 'all' || (filter === 'active' ? !x.done : x.done));
  const counts = { all: total, active: left, done };

  const h = new Date().getHours();
  const greeting = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const dateStr = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const progressText = !total
    ? 'Планов пока нет'
    : left
      ? `Осталось ${left} ${plural(left, 'задача', 'задачи', 'задач')}`
      : 'Всё сделано. Отличная работа!';
  const emptyTitle = filter === 'all' ? 'Свободный день' : filter === 'active' ? 'Всё выполнено' : 'Пока ничего не выполнено';
  const emptyText = filter === 'all' ? 'Добавьте первую задачу выше.' : 'Здесь пока пусто.';

  const add = e => {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    setDraft('');
    if (filter === 'done') setFilter('all');
    save([{ id: Date.now(), text: v, done: false }, ...tasks]);
  };
  const toggle = id => save(tasks.map(y => y.id === id ? { ...y, done: !y.done } : y));
  const remove = x => { save(tasks.filter(y => y.id !== x.id)); remember([x], tasks); };
  const edit = (x, raw) => {
    const v = raw.trim();
    if (v) save(tasks.map(y => y.id === x.id ? { ...y, text: v } : y));
    else remove(x);
  };
  const clearDone = () => { save(tasks.filter(x => !x.done)); remember(tasks.filter(x => x.done), tasks); };
  const doUndo = () => {
    if (!undo) return;
    clearTimeout(timer.current);
    save(undo.tasks);
    setUndo(null);
  };
  const toggleTheme = () => {
    setDark(!dark);
    try { localStorage.setItem('todo.dark', dark ? '0' : '1'); } catch (e) {}
  };

  return (
    <div className={`app${dark ? ' dark' : ''}`}>
      <div className="container">
        <div className="row-between">
          <div className="date">{dateStr}</div>
          <button className="theme-btn" onClick={toggleTheme} aria-label="Переключить тему">
            <span className="theme-icon">{dark ? '☀︎' : '☾'}</span>
            {dark ? 'Светлая' : 'Тёмная'}
          </button>
        </div>

        <div className="row-between">
          <div className="hero-text">
            <h1>{greeting}</h1>
            <div className="progress-text">{progressText}</div>
          </div>
          <div className="ring">
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="32" fill="none" stroke="var(--line)" strokeWidth="7" />
              <circle
                className="ring-fill" cx="38" cy="38" r="32" fill="none" stroke="var(--accent)" strokeWidth="7"
                strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - percent / 100)}
              />
            </svg>
            <div className="ring-label">{percent}%</div>
          </div>
        </div>

        <form className="add-form" onSubmit={add}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Что нужно сделать?"
            aria-label="Новая задача"
            maxLength={140}
          />
          <button className="add-btn" type="submit" aria-label="Добавить задачу">+</button>
        </form>

        <div className="filters">
          {FILTERS.map(([k, label]) => (
            <button key={k} className={`filter-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
              {label}<span className="filter-count">{counts[k]}</span>
            </button>
          ))}
        </div>

        <div className="list">
          {shown.map(x => (
            <div key={x.id} className={`item${x.done ? ' done' : ''}`}>
              <div className="item-sep" />
              <button className="check" onClick={() => toggle(x.id)} aria-label="Отметить выполненной">
                {x.done ? '✓' : ''}
              </button>
              <TaskInput text={x.text} onCommit={v => edit(x, v)} />
              <button className="remove" onClick={() => remove(x)} aria-label="Удалить">×</button>
            </div>
          ))}
          {!shown.length && (
            <div className="empty">
              <div className="empty-icon">✓</div>
              <div className="empty-title">{emptyTitle}</div>
              <div className="empty-text">{emptyText}</div>
            </div>
          )}
        </div>

        <div className="footer">
          <span />
          {done > 0 && <button className="clear-btn" onClick={clearDone}>Очистить выполненные</button>}
        </div>
      </div>

      {undo && (
        <div className="toast">
          <span>{undo.removed.length > 1 ? `Удалено задач: ${undo.removed.length}` : 'Задача удалена'}</span>
          <button onClick={doUndo}>Отменить</button>
        </div>
      )}
    </div>
  );
}
