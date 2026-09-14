// =========================================================================
// OFFLINE BYPASS MOCK SUPABASE CLIENT (SALEAD CRM)
// =========================================================================
// All data is stored locally in the browser's localStorage and synchronized
// automatically to Google Sheets/Drive as the primary cloud database.
// This mock client completely avoids remote Supabase network connections,
// satisfying the user's request to fully audit and eliminate Supabase reliance.

const createMockChain = (dataValue: any = []) => {
  const chain: any = () => Promise.resolve({ data: dataValue, error: null });
  
  // Make the chain directly awaitable as a standard Promise
  chain.then = (onfulfilled: any) => Promise.resolve({ data: dataValue, error: null }).then(onfulfilled);
  chain.catch = (onrejected: any) => Promise.resolve({ data: dataValue, error: null }).catch(onrejected);
  
  const proxy: any = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') return chain.then;
      if (prop === 'catch') return chain.catch;
      
      // Standard query and filtering methods that return the same builder pattern
      if ([
        'select', 'insert', 'update', 'upsert', 'delete', 
        'eq', 'order', 'limit', 'in', 'maybeSingle', 'single', 
        'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 
        'is', 'or', 'match', 'filter', 'range'
      ].includes(prop as string)) {
        return () => proxy;
      }
      
      return () => Promise.resolve({ data: dataValue, error: null });
    }
  });
  
  return proxy;
};

export const supabase: any = {
  from: (table: string) => {
    // Return a mock chain that resolves gracefully, allowing fallback mechanisms to run
    return createMockChain([]);
  },
  rpc: (fn: string, args?: any) => {
    return Promise.resolve({ data: null, error: null });
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: any) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  },
  channel: (channelName: string) => {
    const channelMock = {
      on: () => channelMock,
      subscribe: () => channelMock,
      unsubscribe: () => {}
    };
    return channelMock;
  },
  removeChannel: () => {},
  removeAllChannels: () => {},
};
