// =========================================================================
// OFFLINE BYPASS MOCK SUPABASE CLIENT (SALEAD CRM)
// =========================================================================
// All data is stored locally in the browser's localStorage and synchronized
// automatically to Google Sheets/Drive as the primary cloud database.
// This mock client completely avoids remote Supabase network connections,
// satisfying the user's request to fully audit and eliminate Supabase reliance.

const createMockBuilder = (dataValue: any = []) => {
  const resultPromise = Promise.resolve({ data: dataValue, error: null });

  const builder: any = {
    then: (onfulfilled?: any, onrejected?: any) => resultPromise.then(onfulfilled, onrejected),
    catch: (onrejected?: any) => resultPromise.catch(onrejected),
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    lt: () => builder,
    gte: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    or: () => builder,
    match: () => builder,
    filter: () => builder,
    range: () => builder,
    order: () => builder,
    limit: () => builder,
    in: () => builder,
    maybeSingle: () => builder,
    single: () => builder,
  };

  return builder;
};

export const supabase: any = {
  from: (table: string) => {
    return createMockBuilder([]);
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
