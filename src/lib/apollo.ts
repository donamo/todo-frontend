import { ApolloClient, from, HttpLink, InMemoryCache } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { GRAPHQL_URL } from "./config";
import { logger } from "./logger";

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors?.length) {
    for (const error of graphQLErrors) {
      logger.error("GraphQL hiba", {
        operationName: operation.operationName,
        message: error.message,
        path: error.path,
        extensions: error.extensions,
      });
    }
  }

  if (networkError) {
    logger.error("GraphQL halozati hiba", {
      operationName: operation.operationName,
      error: networkError,
    });
  }
});

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
  credentials: "include",
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});
