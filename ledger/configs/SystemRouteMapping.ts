import { ROUTE, STATUSOK, INFO } from '@core/models/ILog'
import { BaseRoute } from '@core/baseServer/core/models/RouteMappings'

export const systemRouteMapping: Record<string, BaseRoute>= {
  system: {
    key: '',
    name: '/system',
    subRouteMappings: {
      getBalance: {
        key: 'getBalance',
        name: '/getbalance',
        customConsoleMessages: [
          {
            1: { 
              text: '/getbalance', 
              color: ROUTE 
            },
            2: { 
              text: '200', 
              color: STATUSOK 
            },
            3: { 
              text: 'balance retrieved', 
              color: INFO 
            }
          }
        ]
      },
      addFunds: {
        key: 'addFunds',
        name: '/addfunds',
        customConsoleMessages: [
          {
            1: { 
              text: '/gettransactions', 
              color: ROUTE 
            },
            2: { 
              text: '200', 
              color: STATUSOK 
            },
            3: { 
              text: 'funds added', 
              color: INFO 
            }
          }
        ]
      }
    }
  }
}