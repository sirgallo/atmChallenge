#!/bin/bash

readonly truthyInput="input should be yes or no"

echo "Init services for first time? (yes or no):"
read startServices

if [ "$startServices" == "yes" ]
then
  echo "starting services for the first time"

  export HOSTNAME
  docker-compose -f docker-compose.mongoreplica.yml up --build -d
  docker exec -it ledgerdb_primary_cont /scripts/rs-init.sh
  
  sleep 20
  docker-compose -f docker-compose.ledger.dev.yml up --build
elif [ "$startServices" == "no" ]
then
  echo "restarting services..."
  export HOSTNAME
  docker-compose -f docker-compose.mongoreplica.yml start

  sleep 20
  docker-compose -f docker-compose.ledger.dev.yml up
else
  echo truthyInput
fi