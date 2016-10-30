#!/bin/bash
set -e
nodejs src/backend.js --serve-http=. --browser=phantomjs --timeout=100000 --frames=/tmp/frames -r ../playground http://localhost/dist/
nodejs src/add-audio.js /tmp/frames/ ~/Downloads/
