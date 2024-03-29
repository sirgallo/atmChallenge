import { ROUTE, STATUSOK, INFO } from '@core/models/ILog';
import { BaseRoute } from '@core/baseServer/core/models/RouteMappings';


/*
  Global Route Mapping

  Single Source of truth for all routes, with all subRoutes and custom Logs defined here

  Can have multiple routeMappings per project

  Base project will always have a poll route for health checks
*/


export const routeMappings: Record<string, BaseRoute>= {
  poll: {
    key: 'poll',
    name: '/poll',
    subRouteMappings: {
      root: {
        key: 'root',
        name: '/',
        customConsoleMessages: [
          {
            1: { 
              text: '/poll', 
              color: ROUTE 
            },
            2: { 
              text: '200', 
              color: STATUSOK 
            },
            3: { 
              text: 'healthcheck success...', 
              color: INFO 
            }
          }
        ]
      }
    }
  }
}