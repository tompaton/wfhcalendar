import { createStore } from "solid-js/store";
import { createDeferred, For, createSignal } from "solid-js";
import styles from './App.module.css';

const [state, setState] = createStore({
  year: 2025,
  years: {}, // { year: { month: { day: 'work'|'home'|'leave' } } }
  last_loc: 'work',
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

function dayClick(event, year, month, day) {
  event.preventDefault();
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

function getYearTotal(year, loc) {
  return getCumulativeMonthTotal(year, 11, loc);
}

function getYearTotalPercent() {
  const [year, loc, ...locs] = arguments;
  const total = locs.reduce((acc, loc_) => acc + getYearTotal(year, loc_), 0);
  return total ? (getYearTotal(year, loc) / total * 100).toFixed(1) : '';
}

function getMonthTotalPercent() {
  const [year, month, loc, ...locs] = arguments;
  const total = locs.reduce((acc, loc_) => acc + getMonthTotal(year, month, loc_), 0);
  return total ? (getMonthTotal(year, month, loc) / total * 100).toFixed(1) : '';
}

function getCumulativeMonthTotalPercent() {
  const [year, month, loc, ...locs] = arguments;
  const total = locs.reduce((acc, loc_) => acc + getCumulativeMonthTotal(year, month, loc_), 0);
  return total ? (getCumulativeMonthTotal(year, month, loc) / total * 100).toFixed(1) : '';
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

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <h1>WFH Calendar</h1>
        <YearSelector />
      </header>
      <Calendar year={state.year} />
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

function Calendar(props) {
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

function Month(props) {
  const first = () => new Date(props.year, props.month, 1);
  const leading_blanks = () => first().getDay();
  const monthName = () => first().toLocaleString('default', { month: 'long' });
  const daysInMonth = () => new Date(props.year, props.month + 1, 0).getDate();
  const trailing_blanks = () => 6 * 7 - daysInMonth() - leading_blanks();

  return (
    <tr>
      <th>{monthName()}</th>
      <Blanks count={leading_blanks()} />
      <For each={[...Array(daysInMonth()).keys()]}>{(day) => (
        <Day year={props.year} month={props.month} day={day} />
      )}</For>
      <Blanks count={trailing_blanks()} />
      <MonthTotals year={props.year} month={props.month} />
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

export default App;
