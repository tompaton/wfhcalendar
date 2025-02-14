import { createStore } from "solid-js/store";
import { createDeferred, For, createSignal } from "solid-js";
import styles from './App.module.css';

const [state, setState] = createStore({
  year: 2025,
});


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
    <tr>
      <th></th>
      <For each={days()}>{(day) => (
        <th>{day}</th>
      )}</For>
    </tr>
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
  return (
    <td classList={{ [styles.day]: weekday() }}>
      <span class={styles.dayNum}>{props.day + 1}</span>
    </td>
  );
}

export default App;
