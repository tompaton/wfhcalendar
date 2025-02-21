import { createStore } from "solid-js/store";
import { batch, createDeferred, For, Show } from "solid-js";
import styles from './App.module.css';

const [state, setState] = createStore({
  year: 2025,
  years: {}, // { year: { month: { day: 'work'|'home'|'leave' } } }
  maybe: {}, // { year: { month: { day: true|false } } }
  last_loc: 'work',
  toolbar: { 'from_date': null, 'to_date': null, 'loc': null, 'maybe': null },
  target: 60.0,
  render_mode: 'mobile'
});

function getDayLoc(year, month, day) {
  return state.years[year]?.[month + 1]?.[day + 1] || '';
}

function setDayLoc(year, month, day, loc) {
  setState('years', year, {});
  setState('years', year, month + 1, {});
  setState('years', year, month + 1, day + 1, loc);
  setState('last_loc', loc);
}

function getDayMaybe(year, month, day) {
  return !!state.maybe[year]?.[month + 1]?.[day + 1];
}

function setDayMaybe(year, month, day, maybe) {
  setState('maybe', year, {});
  setState('maybe', year, month + 1, {});
  setState('maybe', year, month + 1, day + 1, maybe);
}

function getMonthTotal(year, month, loc) {
  return Object.values(state.years[year]?.[month + 1] || {})
    .filter((loc_) => loc_ === loc).length;
}

function getCumulativeMonthTotal(year, month, loc) {
  if (getMonthTotal(year, month, loc) === 0) return 0;
  // sum getMonthTotal for all months
  return [...Array(month + 1).keys()].reduce((acc, month) => acc + getMonthTotal(year, month, loc), 0);
}

function getCumulativeMonthTotalPercent() {
  const [year, month, loc, ...locs] = arguments;
  const total = locs.reduce((acc, loc_) => acc + getCumulativeMonthTotal(year, month, loc_), 0);
  return total ? (getCumulativeMonthTotal(year, month, loc) / total * 100).toFixed(1) : '';
}

function monthName(month) {
  return new Date(2025, month, 1).toLocaleString('default', { month: 'long' });
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

  const today = new Date();
  populateToolbar(
    { preventDefault: () => { } },
    today.getFullYear(), today.getMonth(), today.getDate() - 1);

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
          Keyboard shortcuts: Arrow keys and w, W, h, H, l, L, space.
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

function DesktopCalendar(props) {
  return (
    <table class={styles.calendar}>
      <thead>
        <Headers />
      </thead>
      <tbody>
        <For each={[...Array(12).keys()]}>{(month) => (
          <Month year={props.year} month={month} />
        )}</For>
      </tbody>
    </table>
  );
}

function MobileCalendar(props) {
  return (
    <For each={[...Array(12).keys()]}>{(month) => (
      <>
        <h3>{monthName(month)}</h3>
        <table class={styles.calendar}>
          <thead>
            <Headers2 />
          </thead>
          <tbody>
            <MonthWeek year={props.year} month={month} week={1} />
            <MonthWeek year={props.year} month={month} week={2} />
            <MonthWeek year={props.year} month={month} week={3} />
            <MonthWeek year={props.year} month={month} week={4} />
            <MonthWeek year={props.year} month={month} week={5} />
            <MonthWeek year={props.year} month={month} week={6} />
          </tbody>
        </table>
        <MonthTotals2 year={props.year} month={month} />
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
  const first = () => new Date(props.year, props.month, 1);
  const leading_blanks = () => first().getDay();
  const daysInMonth = () => new Date(props.year, props.month + 1, 0).getDate();
  const trailing_blanks = () => 6 * 7 - daysInMonth() - leading_blanks();
  const currentMonth = () => new Date().getMonth() === props.month && new Date().getFullYear() === props.year;

  return (
    <tr classList={{ [styles.current]: currentMonth() }}>
      <th>{monthName(props.month)}</th>
      <Blanks count={leading_blanks()} />
      <For each={[...Array(daysInMonth()).keys()]}>{(day) => (
        <Day year={props.year} month={props.month} day={day} />
      )}</For>
      <Blanks count={trailing_blanks()} />
      <MonthTotals year={props.year} month={props.month} />
    </tr>
  );
}

function MonthWeek(props) {
  const first = () => new Date(props.year, props.month, 1);
  const leading_blanks = () => first().getDay();
  const daysInMonth = () => new Date(props.year, props.month + 1, 0).getDate();
  const trailing_blanks = () => {
    if (props.week == 6) return Math.min(7, 6 * 7 - daysInMonth() - leading_blanks());
    if (props.week == 5) return Math.max(0, 6 * 7 - daysInMonth() - leading_blanks() - 7);
    return 0;
  }
  const currentMonth = () => new Date().getMonth() === props.month && new Date().getFullYear() === props.year;
  const weekDays = () => [...Array(daysInMonth()).keys()].slice(Math.max(0, (props.week - 1) * 7 - leading_blanks()), props.week * 7 - leading_blanks());
  return (
    <tr classList={{ [styles.current]: currentMonth() }}>
      <Blanks count={props.week == 1 ? leading_blanks() : 0} />
      <For each={weekDays()}>{(day) => (
        <Day year={props.year} month={props.month} day={day} />
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
    const date = new Date(props.year, props.month, props.day + 1);
    const dayName = date.toLocaleString('default', { weekday: 'short' })[0];
    const weekday = dayName !== 'S';
    const iso_date = new Date(props.year, props.month, props.day + 2).toISOString().slice(0, 10);
    const result = {
      [styles.day]: true,
      [styles.weekday]: weekday,
      [styles.current]:
        new Date().getDate() === props.day + 1
        && new Date().getMonth() === props.month
        && new Date().getFullYear() === props.year,
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
        <span class={styles.dayNum}>{props.day + 1}</span>
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

function Target(props) {
  const total_work = () => getCumulativeMonthTotal(props.year, 11, 'work');
  const total_home = () => getCumulativeMonthTotal(props.year, 11, 'home');

  const target_work = () => Math.ceil(state.target / 100 * (total_work() + total_home()));
  const target_home = () => total_work() + total_home() - target_work();

  const required_work = () => target_work() - total_work();
  const required_home = () => target_home() - total_home();

  return (
    <table class={styles.target}>
      <thead>
        <tr>
          <th></th>
          <th>Target</th>
          <th>Actual</th>
          <th>Required</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Percentage</th>
          <td>
            <input type="number" min={0} max={100} value={state.target}
              onInput={(event) => setState('target', +event.target.value)} />
          </td>
          <td>{getCumulativeMonthTotalPercent(props.year, 11, 'work', 'work', 'home')}</td>
          <td></td>
        </tr>
        <tr>
          <th>Work</th>
          <td>{target_work()}</td>
          <td>{total_work()}</td>
          <td>{required_work()}</td>
        </tr>
        <tr>
          <th>Home</th>
          <td>{target_home()}</td>
          <td>{total_home()}</td>
          <td>{required_home()}</td>
        </tr>
      </tbody>
    </table>
  );
}


function ToolBar() {
  return (
    <div class={styles.toolBar}>
      <input type="date" name="from_date" value={state.toolbar.from_date}
        oninput={onToolbarDateChange} />
      &ndash;
      <input type="date" name="to_date" value={state.toolbar.to_date}
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
    </div>
  );
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

  const date = new Date(year, month, day + 2);
  const iso_date = date.toISOString().slice(0, 10);

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
    } else if (iso_date > state.toolbar.from_date && iso_date < state.toolbar.to_date) {
      // shrink selection
      const mid_date = new Date(
        (new Date(state.toolbar.from_date).getTime()
          + new Date(state.toolbar.to_date).getTime()) / 2);

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
  }
}

function pickupRange() {
  // pick up current loc/maybe if all the same
  const from_date = new Date(state.toolbar.from_date);
  const to_date = new Date(state.toolbar.to_date);
  setState('toolbar', 'loc', getRangeLoc(from_date, to_date));
  setState('toolbar', 'maybe', getRangeMaybe(from_date, to_date));
}

function applyToolbar(event) {
  event.preventDefault();

  batch(() => {
    const from_date = new Date(state.toolbar.from_date);
    const to_date = new Date(state.toolbar.to_date);

    for (let date = from_date; date <= to_date; date.setDate(date.getDate() + 1)) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate() - 1;

      if (state.toolbar.loc !== null)
        setDayLoc(year, month, day, state.toolbar.loc);
      if (state.toolbar.maybe !== null)
        setDayMaybe(year, month, day, state.toolbar.maybe);
    }
  });
}

function getRangeLoc(from_date, to_date) {
  const loc = getDayLoc(from_date.getFullYear(), from_date.getMonth(), from_date.getDate() - 1);
  for (let date = from_date; date <= to_date; date.setDate(date.getDate() + 1)) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate() - 1;
    if (loc !== getDayLoc(year, month, day))
      return null;
  }
  return loc;
}

function getRangeMaybe(from_date, to_date) {
  const maybe = getDayMaybe(from_date.getFullYear(), from_date.getMonth(), from_date.getDate() - 1);
  for (let date = from_date; date <= to_date; date.setDate(date.getDate() + 1)) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate() - 1;
    if (maybe !== getDayMaybe(year, month, day))
      return null;
  }
  return maybe;
}

function min_date(date1, date2) {
  return date1 < date2 ? date1 : date2;
}

function max_date(date1, date2) {
  return date1 > date2 ? date1 : date2;
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

function moveIsoDate(iso_date, month_delta, day_delta) {
  const date = new Date(iso_date);
  const year = date.getFullYear();
  const month1 = date.getMonth();
  const month2 = Math.max(0, Math.min(month1 + month_delta, 11));
  const day1 = date.getDate();
  const offset = monthRowOffset(year, month1, month2);
  const day2 = day1 + day_delta + offset;
  const daysinmonth2 = new Date(year, month2 + 1, 0).getDate();
  const day2a = Math.max(1, Math.min(day2, daysinmonth2));
  const date2 = new Date(year, month2, day2a + 1);
  return date2.toISOString().slice(0, 10);
}

function monthRowOffset(year, month1, month2) {
  const date1 = new Date(year, month1, 0);
  const date2 = new Date(year, month2, 0);
  return (date1.getDay() + 1) % 7 - (date2.getDay() + 1) % 7;
}

export default App;
