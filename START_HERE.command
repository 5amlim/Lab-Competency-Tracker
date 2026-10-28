#!/bin/bash
cd "$(dirname "$0")" || exit 1
printf 'Opening the Lab Competency Tracker demo at http://localhost:8765\n'
(sleep 1; open "http://localhost:8765") &
python3 -m http.server 8765 --bind 127.0.0.1