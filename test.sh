#!/bin/bash
node src/backend.js -r http://127.0.0.1/testsuite --serve-http ./ -b phantomjs --timeout 300 http://127.0.0.1/dist/ &&  \
node src/backend.js -r http://127.0.0.1/testsuite/multiwindow --serve-http ./ -b phantomjs http://127.0.0.1/dist/ && \
bash -c "! node src/backend.js -r http://127.0.0.1/testsuite/failing --serve-http ./ -b phantomjs http://127.0.0.1/dist/" && \
nodejs src/backend.js -r http://127.0.0.1/playground --serve-http ./ --browser phantomjs --timeout=300  http://127.0.0.1/dist/ && \
echo ok