import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

import { tokenStorage } from './storage';

const HTTP_URL = process.env.EXPO_PUBLIC_API_URL;

if (!HTTP_URL) {
  // .env eksikse erken ve anlaşılır hata ver (sessiz başarısızlık yerine).
  console.warn(
    '[graphql] EXPO_PUBLIC_API_URL tanımlı değil. .env dosyanızı oluşturun (.env.example örnek).'
  );
}

// http(s)://host/graphql/  ->  ws(s)://host/graphql/
const WS_URL = (HTTP_URL ?? '').replace(/^http/, 'ws');

/**
 * Auth token'ı session/Apollo context'ten taşımak yerine her istekte
 * AsyncStorage'dan okuyup knox formatında ("Token <key>") ekler.
 */
const authLink = setContext(async (_op, { headers }) => {
  const token = await tokenStorage.get();
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  // Konsola sessizce basmak yerine sınıflandır; UI tarafı message gösterir.
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.warn('[graphql] hata:', err.message);
    }
  }
  if (networkError) {
    console.warn('[graphql] ağ hatası:', networkError.message);
  }
});

const httpLink = new HttpLink({ uri: HTTP_URL });

/**
 * graphql-ws (strawberry.channels GraphQLWSConsumer) üzerinden subscription.
 * Token connectionParams ile gönderilir — backend `_ws_user` bunu bekliyor.
 */
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: async () => {
      const token = await tokenStorage.get();
      return token ? { Authorization: `Token ${token}` } : {};
    },
    // Bağlantı koparsa otomatik tekrar dene
    shouldRetry: () => true,
    retryAttempts: Infinity,
  })
);

// subscription -> WS, query/mutation -> HTTP
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  from([authLink, httpLink])
);

// İç içe (rooms.tables.openOrder, activeOrders[].items vb.) nesnelerin
// normalize cache'te `id` üzerinden doğru eşleşmesi için — bu olmadan bir
// subscription'ın güncellediği Order/Table, başka bir query'nin embedded
// kopyasında yansımayabilir.
const cache = new InMemoryCache({
  typePolicies: {
    OrderType: { keyFields: ['id'] },
    OrderItemType: { keyFields: ['id'] },
    TableType: { keyFields: ['id'] },
    RoomType: { keyFields: ['id'] },
  },
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, splitLink]),
  cache,
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network', errorPolicy: 'all' },
    query: { fetchPolicy: 'network-only', errorPolicy: 'all' },
  },
});
