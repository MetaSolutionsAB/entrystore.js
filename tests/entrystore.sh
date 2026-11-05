#!/bin/bash
# Runs EntryStore 6 in the foreground with a Solr container next to it, both removed on exit.
# Usage: tests/entrystore.sh <entrystore.properties> <host port>
# The image is metasolutions/entrystore:develop unless ENTRYSTORE_IMAGE is set.

set -eo pipefail

[ $# -eq 2 ] || { echo "Usage: $0 <entrystore.properties> <host port>" >&2; exit 1; }

PROPERTIES="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
PORT="$2"
IMAGE="${ENTRYSTORE_IMAGE:-metasolutions/entrystore:develop}"
NAME="entrystore-js-${PORT}"
CONF_CONTAINER=''

cleanup() {
  # EntryStore first: it still talks to Solr while shutting down.
  docker stop "$NAME" &> /dev/null || true
  docker rm -f "${NAME}-solr" ${CONF_CONTAINER:+"$CONF_CONTAINER"} &> /dev/null || true
  docker network rm "$NAME" &> /dev/null || true
}
cleanup
trap cleanup EXIT

# :develop moves, and a cached copy may still be a 5.x image.
docker pull -q --platform linux/amd64 "$IMAGE" > /dev/null || echo "Could not pull ${IMAGE}, using the local image"

# EntryStore 6 has no embedded Solr. Solr gets the configset shipped in the EntryStore image,
# copied between the containers so that no host directory is mounted.
docker network create "$NAME" > /dev/null
docker create --name "${NAME}-solr" --network "$NAME" --network-alias solr -e SOLR_MODULES=analysis-extras -e SOLR_HEAP=256m \
  solr:10.0.0 solr-precreate entrystore /opt/solr/server/solr/configsets/solr > /dev/null
CONF_CONTAINER=$(docker create --platform linux/amd64 "$IMAGE")
docker cp "$CONF_CONTAINER:/srv/entrystore/solr" - | docker cp - "${NAME}-solr:/opt/solr/server/solr/configsets/"
docker rm "$CONF_CONTAINER" > /dev/null
CONF_CONTAINER=''
docker start "${NAME}-solr" > /dev/null
for i in $(seq 1 60); do
  docker exec "${NAME}-solr" curl -fs -o /dev/null http://localhost:8983/solr/entrystore/admin/ping && break
  if [ "$i" == 60 ]; then
    echo "Solr did not start" >&2
    exit 1
  fi
  sleep 1
done

docker run --platform linux/amd64 --name "$NAME" --rm --network "$NAME" \
  -v "${PROPERTIES}:/srv/entrystore/entrystore.properties:ro" -p "${PORT}:8080" "$IMAGE"
