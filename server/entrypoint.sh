#!/bin/bash
mkdir -p /data/temp_nginx /data/saved
chgrp www-data /data/saved && chmod g+ws /data/saved
nginx -g "daemon off;"
