# Local Deployment

```bash
cd ./SimpleLedger
./startupDev.sh
```

`Deployment is handled in two stages`

1.) Deploy and seed the mongodb replication set w/ the appropriate schemas

2.) Deploy the services and the load balancer


## Architecture

```
  DB Layer:

      replica1        replica2
          \             /
           \           /
              primary
                |
  API Layer:    |  network bridge

  ledger api 1, ledger api 2, ... ledger api N
                |
                |
  Client Layer: |  network bridge

            haproxy lb           
```

## Accessing in Dev

the api layer and db layer are segregated off from the world, with the haproxy being the single
point of entry to access the apis beneath. The haproxy instance will bind to the hostname/ip of the host system
and utilized self signed certs to provide https/ssl access to the cluster. Haproxy handles load balancing requests to available systems, and uses a `least connection` approach when distributing requests.

Backend services have a path prefixed with `b_v1`, which just indicates backend version 1.

Self signed certs can be generated in the `@certs` folder, where directions are given. Since the certs are being generated for the particular hostname running the services, they can be bound directly to the container where haproxy is running.


## Requirements

Make sure that docker engine, as well as docker-compose are installed on your local machine. If you are running mac or windows, docker-desktop includes both. However, this has not been tested on windows (there are a lot of bash files), and has only been tested on CentOs Stream and mac os.