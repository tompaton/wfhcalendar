// Persistence management

import { createDeferred, createEffect, createSignal, on, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { throttle } from "@solid-primitives/scheduled";

import styles from './AppSync.module.css';

function createSyncedStore(key, initialState, uiState) {
    // key: string used to identify this store in localStorage
    // initialState: object containing the initial state of the main content
    //   store, this will be synced
    // uiState: object containing the initial state of the UI store, this will
    //   not be synced
    const [state, setState] = createStore(initialState);
    const [ui, setUI] = createStore(uiState);
    const [sync, setSync] = createStore({ url: null, date: null, failed: false, error: '' });
    const [syncActive, setSyncActive] = createSignal(false);

    syncLocalStorateState(key, state, setState);
    syncLocalStorateState(key + '-ui', ui, setUI);
    syncLocalStorateState(key + '-sync', sync, setSync);

    // sync state with server when it changes (but not if sync url/date changes)
    createEffect(
        on(
            () => JSON.stringify(state),
            (content) => syncServerState(content),
            { defer: true }
        )
    );

    function rawSyncServerState(content) {
        if (sync.url) {
            if (!content && sync.failed) {
                console.log('retrying failed sync...');
                content = localStorage[key];
            }

            // console.log(content ? 'syncing (writing)...' : 'syncing...');

            setSyncActive(true);
            getServerState(sync.url, sync.date)
                .then(
                    (result) => {
                        // write back after we reconcile
                        content = null;

                        // console.log('Loaded');
                        setSync('date', result[0]);
                        // console.log('reconciling...');
                        setState(result[1]);
                    })
                .catch((error) => {
                    // console.log(error.message);
                    // fail for 401/403/404 etc.
                    if (error.message.indexOf('304') === -1)
                        setSync({ failed: true, error: error.message });
                    // if we're offline, we need to retry the write later
                    if (error.message.indexOf('Network') !== -1)
                        setSync({ failed: true, error: error.message });
                })
                .finally(() => {
                    if (content) {
                        putServerState(sync.url, content)
                            .then(date => setSync({ date: date, failed: false, error: '' }))
                            .catch((error) => {
                                console.error(error.message);
                                // fail for 401/403/404 etc.
                                // if we're offline, we need to retry the write later
                                setSync({ failed: true, error: error.message });
                            })
                    }
                    setSyncActive(false);
                });
        }
    }

    const syncServerState = throttle(rawSyncServerState, 250);

    bindDocumentEvents(syncServerState);

    // return value acts like a single store that allows access to sync and ui
    // with state.ui and state.sync and setState('ui', ...) and setState('sync', ...)
    // but we can handle each part differently so we don't trigger unnecessary
    // updates

    function setStateProxy(...args) {
        if (args[0] === 'sync') {
            return setSync.apply(null, args.slice(1));
        } else if (args[0] === 'ui') {
            return setUI.apply(null, args.slice(1));
        } else {
            // anything else falls through to content
            setState.apply(null, args);
        }
    }

    const stateProxy = new Proxy(state, {
        get(obj, prop) {
            if (prop === 'sync') {
                return sync;
            }
            if (prop === 'sync_active') {
                return syncActive();
            }
            if (prop === 'ui') {
                return ui;
            }
            // private properties for SyncButton and SyncSettings
            if (prop[0] === '_') {
                if (prop === '_setState') {
                    return setStateProxy;
                }
                if (prop === '_syncServerState') {
                    return syncServerState;
                }
                if (prop === '_generateRandomSyncUrl') {
                    return () => {
                        // random string to uniquely identify this device
                        setSync('url',
                            `https://${key}.tompaton.com/saved/`
                            + Math.random().toString(36).substring(2, 8)
                            + Math.random().toString(36).substring(2, 8));
                    }
                }
            }
            // anything else falls through to content
            return obj[prop];
        }
    });

    return [stateProxy, setStateProxy];
}

function syncLocalStorateState(key, state, setState) {
    // load state from localStorage and trigger save state to localStorage when it changes

    // load state
    if (localStorage[key]) {
        // console.log(`loading ${key}...`);
        setState(JSON.parse(localStorage[key]));
    }

    // trigger save when changed
    function save(content) {
        // console.log(`saving ${key}...`);
        localStorage[key] = content;
    }
    const throttled_save = throttle(save, 250);
    createDeferred(() => throttled_save(JSON.stringify(state)));

}

function bindDocumentEvents(syncServerState) {
    // bind events to handle visibility change and a timer for polling
    // to check for updates from other devices

    // capture and remove previous event listener if any, otherwise vite will keep
    // adding new ones each time the code is reloaded
    if (document._visibilitychangeeventlistener !== undefined) {
        document.removeEventListener('visibilitychange', document._visibilitychangeeventlistener);
    }
    document.addEventListener('visibilitychange', handleVisibilitychange);
    document._visibilitychangeeventlistener = handleVisibilitychange;

    // enable timer polling for changes
    // console.log('enable timer...');
    let poll_timer = window.setInterval(handleTimer, 5000);

    function handleVisibilitychange() {
        // console.log('visibilitychange...', document.visibilityState);
        if (document.visibilityState === 'visible') {
            // enable timer polling for changes
            // console.log('enable timer...');
            poll_timer = window.setInterval(handleTimer, 5000);

            // check for changes when user returns to the page
            syncServerState();
        } else {
            // disable timer polling for changes
            // console.log('clearing timer...');
            window.clearInterval(poll_timer);
        }
    }

    function handleTimer() {
        // console.log('timer...');
        syncServerState();
    }
}

function getServerState(url, date) {
    // console.log('GET');
    // GET using If-Modified-Since header which will return nothing if it
    // hasn't changed
    const config = {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {}
    };
    if (date)
        config.headers['If-Modified-Since'] = date;

    return fetch(url, config)
        .then(response => {
            if (response.status === 200) {
                // console.log('Updated');
                return response.json()
                    .then(data => [response.headers.get("Last-Modified"), data]);
            } else {
                // other status --> 304 no update/404 not found/error
                throw new Error('GET status: ' + response.status)
            }
        })
}

function putServerState(url, body) {
    // console.log('PUT');
    return fetch(
        url,
        {
            method: 'PUT',
            credentials: 'include',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: body
        })
        .then(response => {
            if (response.status === 201 || response.status === 204) {
                // console.log('Saved:' + response.status);
                return response.headers.get("Date");
            } else {
                throw new Error('PUT status: ' + response.status);
            }
        });
}

// Sync management UI

function SyncButton(props) {
    const syncClass = () => {
        if (props.state.sync.url)
            return props.state.sync_active
                ? styles.syncActive
                : props.state.sync.failed
                    ? styles.syncFail
                    : styles.syncOk;
    };
    return (
        <>
            <button classList={{ [syncClass()]: true }}
                onclick={() => document.getElementById('sync_dialog').showModal()}
                title={props.state.sync.url
                    ? (props.state.sync.failed ? "Sync failed (click for settings)" : "Sync enabled (click for settings)")
                    : "Sync disabled (click for settings)"}>
                {props.state.sync.url ? "Synced" : "Not synced"}
            </button>
            <Show when={props.state.sync.url}>
                <button onclick={() => props.state._syncServerState()} title="Refresh state from server">↻</button>
            </Show>
        </>
    );
}

function SyncSettings(props) {
    return (
        <dialog id="sync_dialog">
            <h2>Sync</h2>
            <p>
                Enter sync settings url to share data between devices: <br />
                (contact me to register for free, or provide your own WebDAV url)
            </p>
            <Show when={props.state.sync.url && !props.state.sync.failed}>
                <p>Sync enabled and active.</p>
            </Show>
            <Show when={props.state.sync.url && props.state.sync.failed}>
                <p>Sync enabled, most recent sync failed, will retry.</p>
                <p style={{ color: 'red' }}>{props.state.sync.error}</p>
            </Show>
            <form method="dialog">
                <p>
                    <label for="sync_url">Sharing url</label><br />
                    <input id="sync_url" type="url" value={props.state.sync.url || ''}
                        size={60}
                        onchange={(event) => props.state._setState('sync', 'url', event.target.value)} />
                    <button onclick={(event) => { event.preventDefault(); props.state._generateRandomSyncUrl() }}
                        title="Generate random sync url">new</button>
                </p>
                <button>Close</button>
            </form>
        </dialog>
    );
}

export { createSyncedStore, SyncButton, SyncSettings };