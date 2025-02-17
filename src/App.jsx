import { createStore } from "solid-js/store";
import { createDeferred, For, Show } from "solid-js";
import styles from './App.module.css';

const [state, setState] = createStore({
  year: 2025,
  years: {}, // { year: { month: { day: 'work'|'home'|'leave' } } }
  maybe: {}, // { year: { month: { day: true|false } } }
  last_loc: 'work',
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

function cycleLoc(loc) {
  return { '': 'work', 'work': 'home', 'home': 'leave', 'leave': '' }[loc];
}

function getDayMaybe(year, month, day) {
  return !!state.maybe[year]?.[month + 1]?.[day + 1];
}

function setDayMaybe(year, month, day, maybe) {
  setState('maybe', year, {});
  setState('maybe', year, month + 1, {});
  setState('maybe', year, month + 1, day + 1, maybe);
}

function dayClick(event, year, month, day) {
  event.preventDefault();
  if (event.shiftKey) {
    setDayMaybe(year, month, day, !getDayMaybe(year, month, day));
    return;
  }
  const loc = event.ctrlKey ? state.last_loc : cycleLoc(getDayLoc(year, month, day));
  setDayLoc(year, month, day, loc);
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
          Click on a day to cycle through work, home, leave, or blank.
          Shift-click to toggle "maybe".
          Ctrl-click to repeat last selection.
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
  const date = () => new Date(props.year, props.month, props.day + 1);
  const dayName = () => date().toLocaleString('default', { weekday: 'short' })[0];
  const weekday = () => dayName() !== 'S';
  const dayClass = () => {
    const result = { [styles.day]: weekday() };
    const loc = getDayLoc(props.year, props.month, props.day)
    if (loc) {
      result[styles[loc]] = true;
    }
    if (new Date().getDate() === props.day + 1 && new Date().getMonth() === props.month && new Date().getFullYear() === props.year) {
      result[styles.current] = true;
    }
    if (getDayMaybe(props.year, props.month, props.day)) {
      result[styles.maybe] = true;
    }
    return result;
  };
  return (
    <td classList={dayClass()} onclick={(event) => dayClick(event, props.year, props.month, props.day)}>
      <span class={styles.dayNum}>{props.day + 1}</span>
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
      <input type="date" />&ndash;
      <input type="date" />
      <input type="radio" id="loc_radio1" name="loc_radio" value="" />
      <label for="loc_radio1">Empty</label>
      <input type="radio" id="loc_radio2" name="loc_radio" value="work" />
      <label for="loc_radio2">Work</label>
      <input type="radio" id="loc_radio3" name="loc_radio" value="home" />
      <label for="loc_radio3">Home</label>
      <input type="radio" id="loc_radio4" name="loc_radio" value="leave" />
      <label for="loc_radio4">Leave</label>
      <input type="checkbox" id="maybe_checkbox" value="1" />
      <label for="maybe_checkbox">Maybe</label>
      <button>Apply</button>
    </div>
  );
}

export default App;
