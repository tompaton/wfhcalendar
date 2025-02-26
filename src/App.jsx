import { createStore } from "solid-js/store";
import { batch, createDeferred, createMemo, For, Show } from "solid-js";
import styles from './App.module.css';

const [state, setState] = createStore({
  year: new Date().getFullYear(),
  years: {}, // { year: { month: { day: 'work'|'home'|'leave' } } }
  maybe: {}, // { year: { month: { day: true|false } } }
  last_loc: 'work',
  toolbar: {
    'from_date': null,
    'to_date': null,
    'loc': null,
    'maybe': null,
    'filter': {
      'mode': 'all',
      'day': [false, true, true, true, true, true, false],
    },
  },
  target: 60.0,
  render_mode: 'mobile',
  last_backup: null,
});

function getDayLoc(year, month, day) {
  return state.years[year]?.[month]?.[day] || '';
}

function setDayLoc(year, month, day, loc) {
  setState('years', year, {});
  setState('years', year, month, {});
  setState('years', year, month, day, loc);
  setState('last_loc', loc);
}

function getDayMaybe(year, month, day) {
  return !!state.maybe[year]?.[month]?.[day];
}

function setDayMaybe(year, month, day, maybe) {
  setState('maybe', year, {});
  setState('maybe', year, month, {});
  setState('maybe', year, month, day, maybe);
}

function getRange(get_day_value, from_date, to_date) {
  const value = get_day_value(...getYearMonthDate(from_date));
  for (let date = new Date(from_date.getTime()); date <= to_date; date.setUTCDate(date.getUTCDate() + 1)) {
    if (value !== get_day_value(...getYearMonthDate(date)))
      return null;
  }
  return value;
}

function getMonthTotal(year, month, loc) {
  return Object.values(state.years[year]?.[month] || {})
    .filter((loc_) => loc_ === loc).length;
}

function getCumulativeMonthTotal(year, month, loc) {
  // sum getMonthTotal for all months
  return [...Array(month).keys()].reduce((acc, month) => acc + getMonthTotal(year, month + 1, loc), 0);
}

function getCumulativeMonthTotalPercent() {
  const [year, month, loc, ...locs] = arguments;
  const total = locs.reduce((acc, loc_) => acc + getCumulativeMonthTotal(year, month, loc_), 0);
  return total ? (getCumulativeMonthTotal(year, month, loc) / total * 100).toFixed(1) : '';
}

function getSelectionTotal(from_date, to_date, loc) {
  const from_date_ = newDate(from_date);
  const to_date_ = newDate(to_date);
  let count = 0;
  for (let date = from_date_; date <= to_date_; date.setUTCDate(date.getUTCDate() + 1)) {
    if (getDayLoc(...getYearMonthDate(date)) === loc)
      count++;
  }
  return count;
}

function getSelectionTotalPercent() {
  const [from_date, to_date, loc, ...locs] = arguments;
  const total = locs.reduce((acc, loc_) => acc + getSelectionTotal(from_date, to_date, loc_), 0);
  return total ? (getSelectionTotal(from_date, to_date, loc) / total * 100).toFixed(1) : '';
}

function initSave() {
  if (localStorage.wfhcalendar) {
    setState(JSON.parse(localStorage.wfhcalendar));
  }
  createDeferred(() => {
    console.log('saving...');
    localStorage.wfhcalendar = JSON.stringify(state);
  });
}

function App() {
  initSave();

  setState('render_mode', window.innerWidth < 1200 ? 'mobile' : 'desktop');
  setState('toolbar', 'filter', {});
  if (state.toolbar.filter.mode === undefined) {
    setState('toolbar', 'filter', 'mode', 'all');
  }
  if (state.toolbar.filter.day === undefined) {
    setState('toolbar', 'filter', 'day', [false, true, true, true, true, true, false]);
  }

  const today = new Date();
  setState('year', today.getFullYear());
  populateToolbar(
    { preventDefault: () => { } },
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate());

  // capture and remove previous event listener if any, otherwise vite will keep
  // adding new ones each time the code is reloaded
  if (document.wfhkeydowneventlistener !== undefined) {
    document.removeEventListener('keydown', document.wfhkeydowneventlistener);
  }
  document.addEventListener('keydown', handleKeydown);
  document.wfhkeydowneventlistener = handleKeydown;

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <h1>WFH Calendar</h1>
        <YearSelector />
        <Menu />
        <ToolBar />
      </header>
      <div class={styles.content}>
        <Show when={state.render_mode === 'mobile'}>
          <MobileCalendar year={state.year} />
        </Show>
        <Show when={state.render_mode !== 'mobile'}>
          <DesktopCalendar year={state.year} />
        </Show>
        <Target year={state.year} />
      </div>
      <footer class={styles.footer}>
        <p>
          Click on a day to select.
          Shift-click to select a range of days.
          Choose work location and click Apply button.
          Ctrl-click to repeat last selection.
          <br />
          Keyboard shortcuts: Arrow keys and <kbd>w</kbd>, <kbd>W</kbd>, <kbd>h</kbd>, <kbd>H</kbd>, <kbd>l</kbd>, <kbd>L</kbd>, <kbd>space</kbd>.
        </p>
        <p>&copy; 2025 <a href="https://tompaton.com">tompaton.com</a></p>
      </footer>
    </div>
  );
}


function YearSelector() {
  return (
    <div class={styles.yearSelector}>
      <button title="Previous" onclick={() => setState('year', state.year - 1)}>&lt;</button>
      <span>{state.year}</span>
      <button title="Next" onclick={() => setState('year', state.year + 1)}>&gt;</button>
    </div>
  );
}

function Menu() {
  const last_backup = () => {
    if (!state.last_backup) return 'Never backed up!';
    const date = new Date(state.last_backup);
    const days_ago = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    return `Last backup ${toIsoDate(date)} (${days_ago} day${days_ago === 1 ? '' : 's'} ago)`;
  };

  return (
    <div class={styles.menu}>
      <button onclick={downloadCSV} title="Download the currently displayed year in CSV format">Download CSV</button>
      <button onclick={backupJSON} title="Download all data in JSON format as a backup">Backup</button>
      <span class={styles.backupDate}>{last_backup()}</span>
      <button onclick={restoreJSON} title="Restore data from a JSON format backup">Restore</button>
    </div>
  );
}

function DesktopCalendar(props) {
  return (
    <table class={styles.calendar}>
      <thead>
        <Headers />
      </thead>
      <tbody>
        <For each={[...Array(12).keys()]}>{(month) => (
          <Month year={props.year} month={month + 1} />
        )}</For>
      </tbody>
    </table>
  );
}

function MobileCalendar(props) {
  return (
    <For each={[...Array(12).keys()]}>{(month) => (
      <>
        <h3>{monthName(month + 1)}</h3>
        <table class={styles.calendar}>
          <thead>
            <Headers2 />
          </thead>
          <tbody>
            <MonthWeek year={props.year} month={month + 1} week={1} />
            <MonthWeek year={props.year} month={month + 1} week={2} />
            <MonthWeek year={props.year} month={month + 1} week={3} />
            <MonthWeek year={props.year} month={month + 1} week={4} />
            <MonthWeek year={props.year} month={month + 1} week={5} />
            <MonthWeek year={props.year} month={month + 1} week={6} />
          </tbody>
        </table>
        <MonthTotals2 year={props.year} month={month + 1} />
      </>
    )}</For>
  );
}

function Headers() {
  function* daysGen() {
    for (let i = 0; i < 6; i++)
      for (let d of ['', 'M', 'T', 'W', 'T', 'F', ''])
        yield d;
  };

  const days = () => [...daysGen()];
  return (
    <>
      <tr>
        <th></th>
        <th colspan={6 * 7}></th>
        <th colspan={3}>Total</th>
        <th colspan={3}>Cumulative</th>
        <th>Percentage</th>
      </tr>
      <tr>
        <th></th>
        <For each={days()}>{(day) => (
          <th>{day}</th>
        )}</For>
        <th>W</th>
        <th>H</th>
        <th>L</th>
        <th>W</th>
        <th>H</th>
        <th>L</th>
        <th>W</th>
      </tr>
    </>
  );
}


function Headers2() {
  const days = () => ['', 'M', 'T', 'W', 'T', 'F', ''];
  return (
    <>
      <tr>
        <For each={days()}>{(day) => (
          <th>{day}</th>
        )}</For>
      </tr>
    </>
  );
}

function Month(props) {
  const first = () => newDateYMD(props.year, props.month, 1);
  const leading_blanks = () => first().getDay();
  const trailing_blanks = () => 6 * 7 - daysInMonth(props.year, props.month) - leading_blanks();

  return (
    <tr classList={{ [styles.current]: isThisMonth(props.year, props.month) }}>
      <th>{monthName(props.month)}</th>
      <Blanks count={leading_blanks()} />
      <For each={[...Array(daysInMonth(props.year, props.month)).keys()]}>{
        (day) => (
          <Day year={props.year} month={props.month} day={day + 1} />
        )}</For>
      <Blanks count={trailing_blanks()} />
      <MonthTotals year={props.year} month={props.month} />
    </tr>
  );
}

function MonthWeek(props) {
  const first = () => newDateYMD(props.year, props.month, 1);
  const leading_blanks = () => first().getDay();
  const trailing_blanks = () => {
    if (props.week == 6) return Math.min(7, 6 * 7 - daysInMonth(props.year, props.month) - leading_blanks());
    if (props.week == 5) return Math.max(0, 6 * 7 - daysInMonth(props.year, props.month) - leading_blanks() - 7);
    return 0;
  }
  const weekDays = () => [...Array(daysInMonth(props.year, props.month)).keys()].slice(Math.max(0, (props.week - 1) * 7 - leading_blanks()), props.week * 7 - leading_blanks());
  return (
    <tr classList={{ [styles.current]: isThisMonth(props.year, props.month) }}>
      <Blanks count={props.week == 1 ? leading_blanks() : 0} />
      <For each={weekDays()}>{(day) => (
        <Day year={props.year} month={props.month} day={day + 1} />
      )}</For>
      <Blanks count={trailing_blanks()} />
    </tr>
  );
}

function Blanks(props) {
  return (
    <For each={[...Array(props.count).keys()]}>{() => (
      <td></td>
    )}</For>
  );
}

function Day(props) {

  const tdClass = () => {
    const date = newDateYMD(props.year, props.month, props.day);
    const dayName = date.toLocaleString('default', { weekday: 'short' })[0];
    const weekday = dayName !== 'S';
    const iso_date = toIsoDate(date);
    const result = {
      [styles.day]: true,
      [styles.weekday]: weekday,
      [styles.current]:
        isToday(props.year, props.month, props.day),
      [styles.selection]:
        state.toolbar.from_date <= iso_date
        && iso_date <= state.toolbar.to_date,
      [styles.maybe]: getDayMaybe(props.year, props.month, props.day)
    };
    const loc = getDayLoc(props.year, props.month, props.day);
    if (loc) {
      result[styles[loc]] = true;
    }
    return result;
  };

  return (
    <td classList={tdClass()} onclick={(event) => populateToolbar(event, props.year, props.month, props.day)}>
      <div class={styles.day}>
        <span class={styles.dayNum}>{props.day}</span>
        <span class={styles.dayLoc}>{(getDayLoc(props.year, props.month, props.day) + ' ')[0].toUpperCase()}</span>
      </div>
    </td>
  );
}

function MonthTotals(props) {
  return (
    <>
      <td>{getMonthTotal(props.year, props.month, 'work') || ''}</td>
      <td>{getMonthTotal(props.year, props.month, 'home') || ''}</td>
      <td>{getMonthTotal(props.year, props.month, 'leave') || ''}</td>
      <td>{getCumulativeMonthTotal(props.year, props.month, 'work') || ''}</td>
      <td>{getCumulativeMonthTotal(props.year, props.month, 'home') || ''}</td>
      <td>{getCumulativeMonthTotal(props.year, props.month, 'leave') || ''}</td>
      <td>{getCumulativeMonthTotalPercent(props.year, props.month, 'work', 'work', 'home')}</td>
    </>
  );
}

function MonthTotals2(props) {
  return (
    <table class={styles.calendar}>
      <thead>
        <tr>
          <th colspan={3}>Total</th>
          <th colspan={3}>Cumulative</th>
          <th>Percentage</th>
        </tr>
        <tr>
          <th>W</th>
          <th>H</th>
          <th>L</th>
          <th>W</th>
          <th>H</th>
          <th>L</th>
          <th>W</th>
        </tr>
      </thead>
      <tbody>
        <MonthTotals year={props.year} month={props.month} />
      </tbody>
    </table>
  );
}

function getTargetTable(total_work, total_home, total_percent) {
  const table = {
    target: {},
    total: {},
    required: {}
  };

  table.total.work = total_work;
  table.total.home = total_home;
  table.target.work = Math.ceil(state.target / 100 * (table.total.work + table.total.home));
  table.target.home = table.total.work + table.total.home - table.target.work;
  table.required.work = table.target.work - table.total.work;
  table.required.home = table.target.home - table.total.home;

  table.total.percent = total_percent;

  return table;
}

function Target(props) {

  const table = createMemo(() => {
    const table = getTargetTable(
      getCumulativeMonthTotal(props.year, 12, 'work'),
      getCumulativeMonthTotal(props.year, 12, 'home'),
      getCumulativeMonthTotalPercent(props.year, 12, 'work', 'work', 'home'));

    if (state.toolbar.from_date !== state.toolbar.to_date)
      table.selection = getTargetTable(
        getSelectionTotal(state.toolbar.from_date, state.toolbar.to_date, 'work'),
        getSelectionTotal(state.toolbar.from_date, state.toolbar.to_date, 'home'),
        getSelectionTotalPercent(state.toolbar.from_date, state.toolbar.to_date, 'work', 'work', 'home'));

    return table;
  });

  return (
    <table class={styles.target}>
      <thead>
        <Show when={table().selection}>
          <tr>
            <th colspan={4}></th>
            <th colspan={3} class={styles.selection}>Selection Total</th>
          </tr>
        </Show>
        <tr>
          <th></th>
          <th>Target</th>
          <th>Actual</th>
          <th>Required</th>
          <Show when={table().selection}>
            <th class={styles.selection}>Target</th>
            <th class={styles.selection}>Actual</th>
            <th class={styles.selection}>Required</th>
          </Show>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Percentage</th>
          <td>
            <input type="number" min={0} max={100} value={state.target}
              onInput={(event) => setState('target', +event.target.value)} />
          </td>
          <td>{table().total.percent}</td>
          <td></td>
          <Show when={table().selection}>
            <td class={styles.selection}></td>
            <td class={styles.selection}>{table().selection.total.percent}</td>
            <td class={styles.selection}></td>
          </Show>
        </tr>
        <tr>
          <th>Work</th>
          <td>{table().target.work}</td>
          <td>{table().total.work}</td>
          <td>{table().required.work}</td>
          <Show when={table().selection}>
            <td class={styles.selection}>{table().selection.target.work}</td>
            <td class={styles.selection}>{table().selection.total.work}</td>
            <td class={styles.selection}>{table().selection.required.work}</td>
          </Show>
        </tr>
        <tr>
          <th>Home</th>
          <td>{table().target.home}</td>
          <td>{table().total.home}</td>
          <td>{table().required.home}</td>
          <Show when={table().selection}>
            <td class={styles.selection}>{table().selection.target.home}</td>
            <td class={styles.selection}>{table().selection.total.home}</td>
            <td class={styles.selection}>{table().selection.required.home}</td>
          </Show>
        </tr>
      </tbody>
    </table>
  );
}


function ToolBar() {
  return (
    <div class={styles.toolBar}>
      <input type="date" name="from_date" value={state.toolbar.from_date}
        min={state.year + '-01-01'} max={state.year + '-12-31'}
        oninput={onToolbarDateChange} />
      &ndash;
      <input type="date" name="to_date" value={state.toolbar.to_date}
        min={state.year + '-01-01'} max={state.year + '-12-31'}
        oninput={onToolbarDateChange} />
      <input type="radio" name="loc_radio" id="loc_radio1"
        value="" checked={state.toolbar.loc === ""}
        onchange={() => setState('toolbar', 'loc', '')} />
      <label for="loc_radio1">Empty</label>
      <input type="radio" name="loc_radio" id="loc_radio2"
        value="work" checked={state.toolbar.loc === "work"}
        onchange={() => setState('toolbar', 'loc', 'work')} />
      <label for="loc_radio2">Work</label>
      <input type="radio" name="loc_radio" id="loc_radio3"
        value="home" checked={state.toolbar.loc === "home"}
        onchange={() => setState('toolbar', 'loc', 'home')} />
      <label for="loc_radio3">Home</label>
      <input type="radio" name="loc_radio" id="loc_radio4"
        value="leave" checked={state.toolbar.loc === "leave"}
        onchange={() => setState('toolbar', 'loc', 'leave')} />
      <label for="loc_radio4">Leave</label>
      <input type="checkbox" id="maybe_checkbox" value="1"
        checked={state.toolbar.maybe}
        onchange={(event) => setState('toolbar', 'maybe', event.target.checked)} />
      <label for="maybe_checkbox">Maybe</label>
      <button onclick={applyToolbar}>Apply</button>

      <ApplyFilter />
    </div>
  );
}

function ApplyFilter() {
  return (
    <span class={styles.filter}>
      <input type="radio" name="filter_radio" id="filter_radio1"
        value="all" checked={state.toolbar.filter?.mode === 'all'}
        onchange={(event) => setState('toolbar', 'filter', 'mode', event.target.value)} />
      <label for="filter_radio1">All</label>
      <input type="radio" name="filter_radio" id="filter_radio2"
        value="empty" checked={state.toolbar.filter?.mode === 'empty'}
        onchange={(event) => setState('toolbar', 'filter', 'mode', event.target.value)} />
      <label for="filter_radio2">Empty only</label>
      <input type="radio" name="filter_radio" id="filter_radio3"
        value="maybe" checked={state.toolbar.filter?.mode === 'maybe'}
        onchange={(event) => setState('toolbar', 'filter', 'mode', event.target.value)} />
      <label for="filter_radio3">Maybe only</label>
      <input type="checkbox" id="filter_day0"
        value="0" checked={state.toolbar.filter?.day?.[0]}
        onchange={(event) => setState('toolbar', 'filter', 'day', 0, event.target.checked)} />
      <label for="filter_day0">S</label>
      <input type="checkbox" id="filter_day1"
        value="1" checked={state.toolbar.filter?.day?.[1]}
        onchange={(event) => setState('toolbar', 'filter', 'day', 1, event.target.checked)} />
      <label for="filter_day1">M</label>
      <input type="checkbox" id="filter_day2"
        value="2" checked={state.toolbar.filter?.day?.[2]}
        onchange={(event) => setState('toolbar', 'filter', 'day', 2, event.target.checked)} />
      <label for="filter_day2">T</label>
      <input type="checkbox" id="filter_day3"
        value="3" checked={state.toolbar.filter?.day?.[3]}
        onchange={(event) => setState('toolbar', 'filter', 'day', 3, event.target.checked)} />
      <label for="filter_day3">W</label>
      <input type="checkbox" id="filter_day4"
        value="4" checked={state.toolbar.filter?.day?.[4]}
        onchange={(event) => setState('toolbar', 'filter', 'day', 4, event.target.checked)} />
      <label for="filter_day4">T</label>
      <input type="checkbox" id="filter_day5"
        value="5" checked={state.toolbar.filter?.day?.[5]}
        onchange={(event) => setState('toolbar', 'filter', 'day', 5, event.target.checked)} />
      <label for="filter_day5">F</label>
      <input type="checkbox" id="filter_day6"
        value="6" checked={state.toolbar.filter?.day?.[6]}
        onchange={(event) => setState('toolbar', 'filter', 'day', 6, event.target.checked)} />
      <label for="filter_day6">S</label>
    </span>
  );
}

function passesFilter(weekday, year, month, day) {
  if (state.toolbar.filter.mode === 'empty'
    && getDayLoc(year, month, day) !== '')
    return false;

  if (state.toolbar.filter.mode === 'maybe'
    && !getDayMaybe(year, month, day))
    return false;

  if (!state.toolbar.filter.day[weekday])
    return false;

  return true;
}

function onToolbarDateChange(event) {
  setState('toolbar', event.target.name, event.target.value);

  if (state.toolbar.from_date > state.toolbar.to_date) {
    setState('toolbar', {
      'to_date': state.toolbar.from_date,
      'from_date': state.toolbar.to_date
    });
  }
}

function populateToolbar(event, year, month, day) {
  event.preventDefault();

  const date = newDateYMD(year, month, day);
  const iso_date = toIsoDate(date);

  if (event.ctrlKey) {
    // set date
    setState('toolbar', 'from_date', iso_date);
    setState('toolbar', 'to_date', iso_date);

    // apply current loc/maybe (format painter)
    setDayLoc(year, month, day, state.toolbar.loc);
    setDayMaybe(year, month, day, state.toolbar.maybe);

  } else if (event.shiftKey) {
    if (iso_date === state.toolbar.from_date || iso_date === state.toolbar.to_date) {
      // back to a single date
      setState('toolbar', 'from_date', iso_date);
      setState('toolbar', 'to_date', iso_date);

      // no filter if single day selected
      setState('toolbar', 'filter', 'mode', 'all');
    } else if (iso_date > state.toolbar.from_date && iso_date < state.toolbar.to_date) {
      // shrink selection
      const mid_date = new Date(
        (Date.parse(state.toolbar.from_date)
          + Date.parse(state.toolbar.to_date)) / 2);

      if (date > mid_date)
        setState('toolbar', 'to_date', iso_date);
      else
        setState('toolbar', 'from_date', iso_date);
    } else {
      // extend selection
      setState('toolbar', 'from_date', min_date(state.toolbar.from_date, iso_date));
      setState('toolbar', 'to_date', max_date(state.toolbar.to_date, iso_date));
    }

    pickupRange();

  } else {
    // single day
    setState('toolbar', 'from_date', iso_date);
    setState('toolbar', 'to_date', iso_date);

    // pick up current loc/maybe
    setState('toolbar', 'loc', getDayLoc(year, month, day));
    setState('toolbar', 'maybe', getDayMaybe(year, month, day));

    // no filter if single day selected
    setState('toolbar', 'filter', 'mode', 'all');
  }
}

function pickupRange() {
  // pick up current loc/maybe if all the same
  const from_date = newDate(state.toolbar.from_date);
  const to_date = newDate(state.toolbar.to_date);
  setState('toolbar', 'loc', getRange(getDayLoc, from_date, to_date));
  setState('toolbar', 'maybe', getRange(getDayMaybe, from_date, to_date));
}

function applyToolbar(event) {
  event.preventDefault();

  batch(() => {
    const from_date = newDate(state.toolbar.from_date);
    const to_date = newDate(state.toolbar.to_date);

    for (let date = new Date(from_date.getTime()); date <= to_date; date.setUTCDate(date.getUTCDate() + 1)) {
      const [year, month, day] = getYearMonthDate(date);
      if (!passesFilter(date.getUTCDay(), year, month, day))
        continue;
      if (state.toolbar.loc !== null)
        setDayLoc(year, month, day, state.toolbar.loc);
      if (state.toolbar.maybe !== null)
        setDayMaybe(year, month, day, state.toolbar.maybe);
    }
  });
}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowLeft': {
      event.preventDefault();
      const iso_date = moveIsoDate(state.toolbar.from_date, 0, -1);
      setState('toolbar', 'from_date', iso_date);
      if (!event.shiftKey) {
        setState('toolbar', 'to_date', iso_date);
      }
      pickupRange();
      break;
    }
    case 'ArrowRight': {
      event.preventDefault();
      const iso_date = moveIsoDate(state.toolbar.to_date, 0, +1);
      setState('toolbar', 'to_date', iso_date);
      if (!event.shiftKey) {
        setState('toolbar', 'from_date', iso_date);
      }
      pickupRange();
      break;
    }
    case 'ArrowUp': {
      event.preventDefault();
      const iso_date = moveIsoDate(state.toolbar.from_date, -1, 0);
      setState('toolbar', 'from_date', iso_date);
      if (!event.shiftKey) {
        setState('toolbar', 'to_date', iso_date);
      }
      pickupRange();
      break;
    }
    case 'ArrowDown': {
      event.preventDefault();
      const iso_date = moveIsoDate(state.toolbar.to_date, +1, 0);
      setState('toolbar', 'to_date', iso_date);
      if (!event.shiftKey) {
        setState('toolbar', 'from_date', iso_date);
      }
      pickupRange();
      break;
    }
    case 'Home': {
      event.preventDefault();
      const from_date = newDate(state.toolbar.from_date);
      const [year, month, date] = getYearMonthDate(from_date);
      const first = newDateYMD(year, month, 1);
      const iso_date = toIsoDate(first);
      setState('toolbar', 'from_date', iso_date);
      if (!event.shiftKey) {
        setState('toolbar', 'to_date', iso_date);
      }
      pickupRange();
      break;
    }
    case 'End': {
      event.preventDefault();
      const to_date = newDate(state.toolbar.to_date);
      const [year, month, date] = getYearMonthDate(to_date);
      const last = newDateYMD(year, month + 1, 0);
      const iso_date = toIsoDate(last);
      setState('toolbar', 'to_date', iso_date);
      if (!event.shiftKey) {
        setState('toolbar', 'from_date', iso_date);
      }
      pickupRange();
      break;
    }
    case 'PageUp': {
      event.preventDefault();
      setState('year', state.year - 1);
      const [from_year, from_month, from_day] = getYearMonthDate(newDate(state.toolbar.from_date));
      const [to_year, to_month, to_day] = getYearMonthDate(newDate(state.toolbar.to_date));
      const from_date = newDateYMD(state.year, from_month, from_day);
      const to_date = newDateYMD(state.year, to_month, to_day);
      setState('toolbar', 'from_date', toIsoDate(from_date));
      setState('toolbar', 'to_date', toIsoDate(to_date));
      pickupRange();
      break;
    }
    case 'PageDown': {
      event.preventDefault();
      setState('year', state.year + 1);
      const [from_year, from_month, from_day] = getYearMonthDate(newDate(state.toolbar.from_date));
      const [to_year, to_month, to_day] = getYearMonthDate(newDate(state.toolbar.to_date));
      const from_date = newDateYMD(state.year, from_month, from_day);
      const to_date = newDateYMD(state.year, to_month, to_day);
      setState('toolbar', 'from_date', toIsoDate(from_date));
      setState('toolbar', 'to_date', toIsoDate(to_date));
      pickupRange();
      break;
    }
    case ' ':
      setState('toolbar', { 'loc': '', 'maybe': false });
      applyToolbar(event)
      break;
    case 'w':
      setState('toolbar', { 'loc': 'work', 'maybe': false });
      applyToolbar(event)
      break;
    case 'W':
      setState('toolbar', { 'loc': 'work', 'maybe': true });
      applyToolbar(event)
      break;
    case 'h':
      setState('toolbar', { 'loc': 'home', 'maybe': false });
      applyToolbar(event)
      break;
    case 'H':
      setState('toolbar', { 'loc': 'home', 'maybe': true });
      applyToolbar(event)
      break;
    case 'l':
      setState('toolbar', { 'loc': 'leave', 'maybe': false });
      applyToolbar(event)
      break;
    case 'L':
      setState('toolbar', { 'loc': 'leave', 'maybe': true });
      applyToolbar(event)
      break;
  }
};

// import/export

function downloadCSV() {
  const csv_content = tableCSV();
  downloadContent(csv_content, 'text/csv', 'wfhcalendar-' + state.year + '.csv');
}

function downloadContent(content, content_type, filename) {
  const blob = new Blob([content], { type: content_type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function tableCSV() {
  const csv = [];
  const table = document.querySelectorAll('table.' + styles.calendar)[0];
  for (let row of table.rows) {
    const csv_row = [];
    for (let cell of row.cells) {
      const text = cell.innerText.split('\n');
      csv_row.push(text[0]);
      csv_row.push((text[1] || '') + (cell.classList.contains(styles.maybe) ? '?' : ''));
      for (let i = 1; i < cell.colSpan; i++) {
        csv_row.push('');
        csv_row.push('');
      }
    }
    csv.push(csv_row.join(','));
  }
  return csv.join('\n');
}

function backupJSON() {
  const backup = JSON.parse(JSON.stringify(state));
  delete backup.year;
  delete backup.last_loc;
  delete backup.toolbar;
  delete backup.render_mode;

  const json_content = JSON.stringify(backup);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
  downloadContent(json_content, 'application/json', 'wfhcalendar-' + timestamp + '.json');
  setState('last_backup', new Date().toISOString());
}

function restoreJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const json_content = event.target.result;
      const backup = JSON.parse(json_content);

      batch(() => {
        setState({ 'years': undefined, 'maybe': undefined });
        setState(backup);
      });
    };
    reader.readAsText(file);
  };
  input.click();
}

// DATE FUNCTIONS

function newDateYMD(year, month, day) {
  // month is 1-12
  return new Date(Date.UTC(year, month - 1, day));
}

function newDate(iso_date) {
  return new Date(Date.parse(iso_date));
}

function getYearMonthDate(date) {
  // month is 1-12
  return [
    date.getFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  ];
}

function isToday(year, month, day) {
  const [year2, month2, day2] = getYearMonthDate(new Date());
  return year === year2 && month === month2 && day === day2;
}

function isThisMonth(year, month) {
  const [year2, month2, day2] = getYearMonthDate(new Date());
  return year === year2 && month === month2;
}

function min_date(date1, date2) {
  return date1 < date2 ? date1 : date2;
}

function max_date(date1, date2) {
  return date1 > date2 ? date1 : date2;
}

function daysInMonth(year, month) {
  return newDateYMD(year, month + 1, 0).getDate();
}

function monthName(month) {
  return newDateYMD(2025, month, 1).toLocaleString('default', { month: 'long' });
}

function moveIsoDate(iso_date, month_delta, day_delta) {
  const date = newDate(iso_date);
  const [year, month1, day1] = getYearMonthDate(date);
  const month2 = Math.max(1, Math.min(month1 + month_delta, 12));
  const offset = monthRowOffset(year, month1, month2);
  const day2 = day1 + day_delta + offset;
  const day2a = Math.max(1, Math.min(day2, daysInMonth(year, month2)));
  const date2 = newDateYMD(year, month2, day2a);
  return toIsoDate(date2);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthRowOffset(year, month1, month2) {
  const date1 = newDateYMD(year, month1, 1);
  const date2 = newDateYMD(year, month2, 1);
  return date1.getUTCDay() - date2.getUTCDay();
}

export default App;
