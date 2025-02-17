# WFH Calendar

Yearly calendar to track days worked from home, in the office, on leave etc. and provide summary stats.

Uses local storage, so no account is required and nothing is sent to any servers.

## To-Do

- financial year totals (jul-jun)
- selection to change financial year system (AU/US/UK/...)
- selection to choose period to total
- dim totals for future months
- highlight final year total
- printable layout
- support multiple types of leave, work (for different office locations etc.)
- deploy to tompaton.com
- push to github
- sync between devices
- find and highlight max days between leave

### edit form/toolbar

add a toolbar to edit locations.
 - date (to/from)
 - location (work/home/leave/empty)
 - maybe (yes/no)
 - [apply]

clicking a day sets the to/from date (to the same value)
shift+clicking a day sets the to/from date (to the end of a range)
the location/maybe values are set to the common value.

ctrl+click still works as a format painter (conceptually, sets the to/from date, 
but doesn't update the location/maybe, then clicks the apply button)

need to highlight selected days

- add notes to a day

### toolbar keyboard mode

- keyboard control
    - arrows to change date
    - shift+arrows to select range
    - w/h/l keys to select location and apply

### toolbar filter mode

- select days of the week that the apply button will affect
- apply to empty only
- apply to maybe only

### other toolbar functions

- export data (to csv)
- backup/restore data (json)
- show date/number of days since last exported/backed up in footer
- auto-populate public holidays (from an api?)

## Usage

In the project directory, first run:

```bash
$ npm install # or pnpm install or yarn install
```

Then you can run:

### `npm run dev` or `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)


# Contact

https://tompaton.com/

