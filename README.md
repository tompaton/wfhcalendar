# WFH Calendar

Yearly calendar to track days worked from home, in the office, on leave etc. 
and provide summary stats.

Uses local storage, so no account is required.

You can optionally configure syncing between devices by entering a url that will 
accept GET/PUT (WebDav). Contact me if you'd like to register to use my server 
for this purpose.

## To-Do

- financial year totals (jul-jun)
- selection to change financial year system (AU/US/UK/...)
- support multiple types of leave, work (for different office locations etc.)
- find and highlight max days between leave
- auto-populate public holidays (from an api?)
- add notes to a day

## Usage

```bash
$ docker-compose build && HOSTNAME=$(hostname) docker-compose up
```

Runs the app in the development mode.<br>
Open [http://localhost:8080](http://localhost:8080) to view it in the browser.

The page will reload if you make edits.<br>

wfhcalendar-web-1 - port 8080 - nginx server that handles WebDAV and proxies to wfhcalendar-dev-1

wfhcalendar-dev-1 - port 3000 - vite.js server that handles hotloading etc.

setting the HOSTNAME environment variable allows access via another device
 
## Deployment

In production the nginx server handles WebDAV and serves the app using static files.

Build and push production container:

```bash
docker-compose --profile prod build
docker-compose --profile prod push

scp production.env production.yml phosphorus:/var/data/wfhcalendar.tompaton.com/
ssh tom@phosphorus "cd /var/data/wfhcalendar.tompaton.com ; docker-compose -f production.yml pull; docker-compose -f production.yml up -d"
```

# Contact

https://tompaton.com/

