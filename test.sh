#!/bin/sh
# Runs the 4 official cases end to end and prints JSON evidence to evidence/
set -e; B=${1:-http://localhost:8080}; mkdir -p evidence
for tc in TC1 TC2 TC3 TC4; do
  id=$(curl -s -XPOST $B/api/run -d "{\"scenario\":\"$tc\"}" | sed 's/.*"id":"\(RUN-[0-9]*\)".*/\1/')
  curl -s -XPOST $B/api/runs/$id/approve > evidence/$tc.json
  echo "$tc: $(sed 's/.*"actual":"\([^"]*\)".*"pass":\([a-z]*\).*/pass=\2  \1/' evidence/$tc.json)"
done
