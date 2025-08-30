#Project setup

## RUN setup.bash

## RUN Un-optimized:

`npm run unoptimized`

## RUN optimized:

`npm run optimized`

## Run Test:

At frist we have to changes 15th line in load.js file:
For un-optimized:
`http://localhost:5000/api/v1/drivers/${driverId}/analytics`
For optimized:
`http://localhost:5002/api/v1/drivers/${driverId}/analytics`
