import { ApolloError } from '@apollo/client';

/**
 * Apollo/GraphQL/ağ hatasından kullanıcıya gösterilebilir tek bir mesaj çıkarır.
 * Backend UserGenException mesajları graphQLErrors içinde gelir.
 */
export function errorMessage(err: unknown, fallback = 'Bir hata oluştu.'): string {
  if (err instanceof ApolloError) {
    if (err.graphQLErrors?.length) return err.graphQLErrors[0].message;
    if (err.networkError) return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.';
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
