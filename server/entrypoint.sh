#!/bin/bash
mkdir -p /data/temp_nginx /data/saved
chgrp -R www-data /data/saved && chmod -R g+ws /data/saved
nginx -g "daemon off;"
