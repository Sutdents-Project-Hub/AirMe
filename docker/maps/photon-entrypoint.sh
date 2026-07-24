#!/bin/sh
set -eu

data_dir="${PHOTON_DATA_DIR:-/data}"
jar_path="${data_dir}/photon.jar"
jar_url="${PHOTON_JAR_URL:-}"
mode="${1:-serve}"

mkdir -p "$data_dir"

download_jar() {
  if [ -f "$jar_path" ]; then
    return
  fi

  if [ -z "$jar_url" ]; then
    echo "PHOTON_JAR_URL is required when photon.jar is not already present." >&2
    exit 78
  fi

  temporary_path="${jar_path}.download"
  rm -f "$temporary_path"
  curl --fail --location --retry 3 --retry-delay 2 "$jar_url" --output "$temporary_path"
  mv "$temporary_path" "$jar_path"
}

bootstrap_database() {
  database_url="${PHOTON_DATABASE_URL:-}"
  if [ -d "${data_dir}/photon_data" ]; then
    echo "Photon database is already available; nothing to download."
    return
  fi

  if [ -z "$database_url" ]; then
    echo "PHOTON_DATABASE_URL is required for the explicit Photon bootstrap step." >&2
    exit 78
  fi

  archive_path="${data_dir}/photon-data.tar.bz2"
  rm -f "$archive_path"
  echo "Downloading Photon database snapshot. This can require substantial disk space."
  curl --fail --location --retry 3 --retry-delay 2 "$database_url" --output "$archive_path"
  bzip2 -dc "$archive_path" | tar -x -C "$data_dir"
  rm -f "$archive_path"

  if [ ! -d "${data_dir}/photon_data" ]; then
    echo "Photon database archive did not create ${data_dir}/photon_data." >&2
    exit 78
  fi
}

download_jar

case "$mode" in
  bootstrap)
    bootstrap_database
    ;;
  serve)
    if [ ! -d "${data_dir}/photon_data" ]; then
      echo "Photon database is missing. Run the explicit photon-bootstrap map setup first." >&2
      exit 78
    fi
    # PHOTON_JAVA_OPTIONS deliberately supports standard JVM option tokenization.
    # shellcheck disable=SC2086
    exec java ${PHOTON_JAVA_OPTIONS:-} -jar "$jar_path" serve
    ;;
  *)
    echo "Unsupported Photon command: $mode" >&2
    exit 64
    ;;
esac
