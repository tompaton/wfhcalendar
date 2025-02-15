# WFH Calendar

Yearly calendar to track days worked from home, in the office, on leave etc. and provide summary stats.

Uses local storage, so no account is required and nothing is sent to any servers.

## To-Do

- popup menu to choose between work location
- financial year totals (jul-jun)
- selection to change financial year system
- printable layout
- highlight today
- support multiple types of leave, work (for different office locations etc.)
- add a "speculative" flag to record a day as "unsure"
    - either unsure in the past which category it belongs in, or
    - unsure in the future what it will be.  
    - this will assist to keep "what if" plans separate from actual records.
- add a description/help to the page
- add footer link to tompaton.com
- deploy to tompaton.com
- export data (to csv)
- backup/restore data (json)
- show date/number of days since last exported/backed up
- phone mode
- sync between devices
- mode to set all unset days to defaults (M/F -> home etc.)

## Help

- click to cycle locations for the day
- ctrl+click to set to same as last work location

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

