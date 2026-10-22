#!/usr/bin/env bash
set -e

mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "
  db = db.getSiblingDB('${MONGO_INITDB_DATABASE:-nexaerp}');
  if (!db.getUser('${MONGO_APP_USER}')) {
    db.createUser({
      user: '${MONGO_APP_USER}',
      pwd: '${MONGO_APP_PASSWORD}',
      roles: [
        { role: 'readWrite', db: '${MONGO_INITDB_DATABASE:-nexaerp}' }
      ]
    });
  }
"
